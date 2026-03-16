export default async function handler(req, res) {
  const { code, state } = req.query;
  const clientId = process.env.VITE_WHOOP_CLIENT_ID;
  const clientSecret = process.env.VITE_WHOOP_CLIENT_SECRET;
  const redirectUri = "https://custom-hybrid-training.vercel.app/api/auth/callback";

  if (!code) {
    return res.status(400).json({ error: "No authorization code received" });
  }

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
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      return res.status(400).json({ error: "Failed to get access token", details: tokens });
    }

    // Store tokens in secure cookies
    const cookieOpts = "Path=/; HttpOnly; Secure; SameSite=Lax";
    res.setHeader("Set-Cookie", [
      `whoop_access_token=${tokens.access_token}; ${cookieOpts}; Max-Age=3600`,
      `whoop_refresh_token=${tokens.refresh_token}; ${cookieOpts}; Max-Age=2592000`,
    ]);

    // Redirect back to the app
    res.redirect(302, "/?connected=true");
  } catch (err) {
    res.status(500).json({ error: "Token exchange failed", details: err.message });
  }
}
