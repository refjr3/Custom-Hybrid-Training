export default async function handler(req, res) {
  const { code } = req.query;
  const clientId = process.env.VITE_WHOOP_CLIENT_ID;
  const clientSecret = process.env.VITE_WHOOP_CLIENT_SECRET;
  const redirectUri = "https://custom-hybrid-training.vercel.app/api/auth/callback";

  if (!code) return res.redirect(302, "/?error=no_code");

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
    console.log("WHOOP token response:", JSON.stringify(tokens));
    if (!tokens.access_token) return res.redirect(302, "/?error=no_token");

    // Use JSON.stringify to safely encode tokens
    const accessToken = JSON.stringify(tokens.access_token);
    const refreshToken = JSON.stringify(tokens.refresh_token || "");

    const encoded = Buffer.from(tokens.access_token).toString('base64');
const encodedRefresh = Buffer.from(tokens.refresh_token || '').toString('base64');
return res.redirect(302, `/?at=${encoded}&rt=${encodedRefresh}`);

  } catch (err) {
    return res.redirect(302, "/?error=exception&msg=" + encodeURIComponent(err.message));
  }
}
