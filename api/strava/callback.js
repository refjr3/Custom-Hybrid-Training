import { createClient } from "@supabase/supabase-js";
import { parseCookies, setStravaAuthCookies } from "./tokenCookies.js";
import { resolvePublicOrigin } from "./publicOrigin.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const appOrigin = resolvePublicOrigin(req);
  const redirectUri = `${appOrigin}/api/strava/callback`;

  const { code, error, state: stateRaw } = req.query;
  const state = Array.isArray(stateRaw) ? stateRaw[0] : stateRaw;

  if (error) return res.redirect(302, `${appOrigin}/?error=strava_${error}`);
  if (!code) return res.redirect(302, `${appOrigin}/?error=strava_no_code`);

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.redirect(302, `${appOrigin}/?error=strava_missing_env`);
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const expectedState = cookies.strava_state;
  const targetUserId = typeof cookies.strava_uid === "string" ? cookies.strava_uid.trim() : "";
  if (!expectedState || !state || expectedState !== String(state)) {
    return res.redirect(302, `${appOrigin}/?error=strava_bad_state`);
  }

  try {
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok || !tokens?.access_token) {
      console.error("[strava/callback] no access_token:", tokens);
      return res.redirect(302, `${appOrigin}/?error=strava_no_token`);
    }

    setStravaAuthCookies(res, tokens);
    res.appendHeader("Set-Cookie", "strava_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    res.appendHeader("Set-Cookie", "strava_uid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");

    const expiresAt = Number(tokens.expires_at || 0);
    const expiresIso = expiresAt ? new Date(expiresAt * 1000).toISOString() : null;

    try {
      if (!targetUserId) {
        console.warn("[strava/callback] no strava_uid cookie; skipping Supabase (tokens still in cookies)");
      } else {
        const { data: existingProfile, error: readErr } = await supabase
          .from("user_profiles")
          .select("user_id,connected_wearables")
          .eq("user_id", targetUserId)
          .single();

        if (readErr || !existingProfile) {
          console.warn("[strava/callback] profile read skipped", readErr?.message || "no row");
        } else {
          const existingWearables = existingProfile?.connected_wearables || {};
          const connected = {
            ...existingWearables,
            strava: true,
            strava_connected_at: new Date().toISOString(),
            strava_athlete_id: tokens?.athlete?.id || null,
            strava_access_token: tokens.access_token,
            strava_refresh_token: tokens.refresh_token || null,
            strava_token_expires_at: expiresIso,
          };

          await supabase
            .from("user_profiles")
            .update({
              connected_wearables: connected,
              strava_access_token: tokens.access_token,
              strava_refresh_token: tokens.refresh_token || null,
              strava_token_expires_at: expiresIso,
            })
            .eq("user_id", targetUserId);
        }
      }
    } catch (dbErr) {
      console.warn("[strava/callback] supabase save failed (non-fatal):", dbErr?.message || dbErr);
    }

    return res.redirect(302, `${appOrigin}/?strava=connected`);
  } catch (err) {
    console.error("[strava/callback] error:", err?.message || err);
    return res.redirect(302, `${appOrigin}/?error=strava_exception`);
  }
}
