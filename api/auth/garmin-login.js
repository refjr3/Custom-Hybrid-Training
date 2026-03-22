export default function handler(req, res) {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const redirectUri = "https://custom-hybrid-training.vercel.app/api/auth/garmin-callback";

  if (!clientId) return res.redirect(302, "/?error=garmin_missing_env");

  const state = Math.random().toString(36).substring(2, 15);

  const authUrl = new URL("https://connect.garmin.com/oauthConfirm");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "activity_read heartrate_read sleep_read");
  authUrl.searchParams.set("state", state);

  res.setHeader("Set-Cookie", `garmin_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.redirect(302, authUrl.toString());
}
