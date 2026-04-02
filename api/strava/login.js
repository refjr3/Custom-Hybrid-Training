const APP_BASE_URL = "https://custom-hybrid-training.vercel.app";

export default function handler(req, res) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI || `${APP_BASE_URL}/api/strava/callback`;

  if (!clientId) {
    return res.redirect(302, `${APP_BASE_URL}/?error=strava_missing_env`);
  }

  const state = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  const authUrl = new URL("https://www.strava.com/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("approval_prompt", "auto");
  authUrl.searchParams.set("scope", "activity:read_all");
  authUrl.searchParams.set("state", state);

  res.setHeader(
    "Set-Cookie",
    `strava_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );
  return res.redirect(302, authUrl.toString());
}
