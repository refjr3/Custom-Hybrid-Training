export default async function handler(req, res) {
  const { code } = req.query;
  const clientId = process.env.VITE_WHOOP_CLIENT_ID;
  const clientSecret = process.env.VITE_WHOOP_CLIENT_SECRET;
  const redirectUri = "https://custom-hybrid-training.vercel.app/api/auth/callback";

  if (!code) return res.redirect(302, "/?error=no_code");
  if (!clientId || !clientSecret) return res.redirect(302, "/?error=missing_env");

  try {
    const tokenRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        scope: "offline read:recovery read:sleep read:cycles read:profile",
      }).toString(),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) return res.redirect(302, "/?error=no_token");

    const opts = "Path=/; HttpOnly; SameSite=Lax; Max-Age=3600";
    const optsRefresh = "Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000";
    res.setHeader("Set-Cookie", [
      `whoop_access=${tokens.access_token}; ${opts}`,
      `whoop_refresh=${tokens.refresh_token || ""}; ${optsRefresh}`,
    ]);
    return res.redirect(302, "/?connected=true");
  } catch (err) {
    return res.redirect(302, "/?error=exception");
  }
}
