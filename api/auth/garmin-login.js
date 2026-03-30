export default function handler(req, res) {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const redirectUri = "https://custom-hybrid-training.vercel.app/api/auth/garmin-callback";
  const userId = typeof req.query?.user_id === "string" ? req.query.user_id : "";

  if (!clientId) return res.redirect(302, "https://custom-hybrid-training.vercel.app/?error=garmin_missing_env");

  const state = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

  const authUrl = new URL("https://connect.garmin.com/oauthConfirm");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "activity_read heartrate_read sleep_read");
  authUrl.searchParams.set("state", state);

  const cookieBase = "Path=/; HttpOnly; Secure; SameSite=Lax";
  const cookies = [
    `garmin_state=${state}; ${cookieBase}; Max-Age=600`,
  ];
  if (userId) {
    cookies.push(`garmin_uid=${encodeURIComponent(userId)}; ${cookieBase}; Max-Age=600`);
  }
  res.setHeader("Set-Cookie", cookies);
  res.redirect(302, authUrl.toString());
}
