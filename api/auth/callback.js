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
    if (!tokens.access_token) return res.redirect(302, "/?error=no_token");

    const at = Buffer.from(tokens.access_token).toString('base64');
    const rt = Buffer.from(tokens.refresh_token || '').toString('base64');

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(`<!DOCTYPE html>
<html><head><title>Connecting...</title>
<script>
window.onload = function() {
  try {
    var at = atob('${at}');
    var rt = atob('${rt}');
    window.localStorage.setItem('whoop_access', at);
    window.localStorage.setItem('whoop_refresh', rt);
    window.location.replace('/');
  } catch(e) {
    document.body.innerHTML = 'Error: ' + e.message;
  }
};
</script>
</head>
<body style="background:#000;color:#fff;font-family:monospace;padding:40px;text-align:center;">
<p>Connecting WHOOP...</p>
</body></html>`);

  } catch (err) {
    return res.redirect(302, "/?error=exception");
  }
}
