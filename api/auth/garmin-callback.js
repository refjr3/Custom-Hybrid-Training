import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { code, state } = req.query;
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  const redirectUri = "https://custom-hybrid-training.vercel.app/api/auth/garmin-callback";
  const appBaseUrl = "https://custom-hybrid-training.vercel.app";

  if (!code) return res.redirect(302, "/?error=garmin_no_code");
  if (!clientId || !clientSecret) return res.redirect(302, "/?error=garmin_missing_env");

  const cookieHeader = req.headers.cookie || "";
  const cookieMap = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        return idx === -1 ? [c, ""] : [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      })
  );
  const expectedState = cookieMap.garmin_state;
  const userId = cookieMap.garmin_uid;
  if (!expectedState || !state || expectedState !== state) {
    return res.redirect(302, `${appBaseUrl}/?error=garmin_bad_state`);
  }
  if (!userId) {
    return res.redirect(302, `${appBaseUrl}/?error=garmin_missing_user`);
  }

  try {
    const tokenRes = await fetch("https://connectapi.garmin.com/oauth-service/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) return res.redirect(302, "/?error=garmin_no_token");

    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("connected_wearables")
      .eq("user_id", userId)
      .single();
    if (profileErr && profileErr.code !== "PGRST116") {
      return res.redirect(302, `${appBaseUrl}/?error=garmin_profile_read_failed`);
    }
    const connected = {
      ...(profile?.connected_wearables || {}),
      garmin: true,
      garmin_connected_at: new Date().toISOString(),
      garmin_access_token: tokens.access_token,
      garmin_refresh_token: tokens.refresh_token || null,
      garmin_token_type: tokens.token_type || "Bearer",
      garmin_expires_in: tokens.expires_in || null,
    };
    const { error: upsertErr } = await supabase
      .from("user_profiles")
      .upsert({ user_id: userId, connected_wearables: connected }, { onConflict: "user_id" });
    if (upsertErr) {
      return res.redirect(302, `${appBaseUrl}/?error=garmin_profile_write_failed`);
    }

    const opts = "Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400";
    const optsRefresh = "Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000";
    res.setHeader("Set-Cookie", [
      `garmin_access=${tokens.access_token}; ${opts}`,
      `garmin_refresh=${tokens.refresh_token || ""}; ${optsRefresh}`,
      "garmin_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
      "garmin_uid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    ]);
    return res.redirect(302, `${appBaseUrl}/?garmin_connected=true`);
  } catch (err) {
    return res.redirect(302, `${appBaseUrl}/?error=garmin_exception`);
  }
}
