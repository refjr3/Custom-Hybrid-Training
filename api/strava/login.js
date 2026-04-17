import { STRAVA_APP_BASE_URL, STRAVA_OAUTH_REDIRECT_URI } from "./stravaOAuthConfig.js";

export default function handler(req, res) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = STRAVA_OAUTH_REDIRECT_URI;
  const requestedUid = typeof req.query?.uid === "string" ? req.query.uid.trim() : "";

  console.log("[strava/login] redirect_uri:", redirectUri);
  console.log("[strava/login] STRAVA_REDIRECT_URI env:", process.env.STRAVA_REDIRECT_URI || "(unset, using default)");
  console.log("[strava/login] VITE_APP_URL env:", process.env.VITE_APP_URL || "(unset)");
  console.log("[strava/login] client_id:", clientId ? `${String(clientId).slice(0, 4)}…` : "(missing)");

  if (!clientId) {
    return res.redirect(302, `${STRAVA_APP_BASE_URL}/?error=strava_missing_env`);
  }

  const state = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  const authUrl = new URL("https://www.strava.com/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("approval_prompt", "auto");
  authUrl.searchParams.set("scope", "read,activity:read_all");
  authUrl.searchParams.set("state", state);

  const cookies = [
    `strava_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  ];
  if (requestedUid) {
    cookies.push(`strava_uid=${encodeURIComponent(requestedUid)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  }
  res.setHeader("Set-Cookie", cookies);
  return res.redirect(302, authUrl.toString());
}
