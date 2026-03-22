import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { code } = req.query;
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  const redirectUri = "https://custom-hybrid-training.vercel.app/api/auth/garmin-callback";

  if (!code) return res.redirect(302, "/?error=garmin_no_code");
  if (!clientId || !clientSecret) return res.redirect(302, "/?error=garmin_missing_env");

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

    const opts = "Path=/; HttpOnly; SameSite=Lax; Max-Age=86400";
    const optsRefresh = "Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000";
    res.setHeader("Set-Cookie", [
      `garmin_access=${tokens.access_token}; ${opts}`,
      `garmin_refresh=${tokens.refresh_token || ""}; ${optsRefresh}`,
    ]);
    return res.redirect(302, "/?garmin_connected=true");
  } catch (err) {
    return res.redirect(302, "/?error=garmin_exception");
  }
}
