export default async function handler(req, res) {
  const { code } = req.query;
  const clientId = process.env.VITE_WHOOP_CLIENT_ID;
  const clientSecret = process.env.VITE_WHOOP_CLIENT_SECRET;
  const redirectUri = "https://custom-hybrid-training.vercel.app/api/auth/callback";

  if (!code) {
    return res.redirect(302, "/?error=no_code");
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
        scope: "offline read:recovery read:sleep read:cycles read:profile",
      }).toString(),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      return res.redirect(302, "/?error=no_token");
    }

    // Serve an HTML page that stores the token in localStorage then redirects
    const html = `<!DOCTYPE html>
<html>
<head><title>Connecting...</title></head>
<body>
<script>
  try {
    localStorage.setItem('whoop_access', '${tokens.access_token}');
    localStorage.setItem('whoop_refresh', '${tokens.refresh_token || ""}');
    window.location.href = '/';
  } catch(e) {
    window.location.href = '/?error=storage_failed';
  }
</script>
<p>Connecting your WHOOP...</p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);

  } catch (err) {
    return res.redirect(302, "/?error=exception");
  }
}
