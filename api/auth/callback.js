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

    // Pass tokens back via URL params (stored in localStorage by the app)
    const params = new URLSearchParams({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || "",
      connected: "true",
    });

    return res.redirect(302, `/?${params.toString()}`);
  } catch (err) {
    return res.redirect(302, "/?error=exception");
  }
}
