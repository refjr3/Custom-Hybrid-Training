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

    // Use JSON.stringify to safely encode tokens
    const accessToken = JSON.stringify(tokens.access_token);
    const refreshToken = JSON.stringify(tokens.refresh_token || "");

    const html = `<!DOCTYPE html>
<html>
<head><title>Connecting WHOOP...</title></head>
<body style="background:#000;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;">
<div style="text-align:center;">
  <p style="font-size:18px;letter-spacing:3px;">CONNECTING WHOOP...</p>
  <p id="status" style="font-size:12px;color:#555;margin-top:8px;"></p>
</div>
<script>
  (function() {
    try {
      var access = ${accessToken};
      var refresh = ${refreshToken};
      localStorage.setItem('whoop_access', access);
      localStorage.setItem('whoop_refresh', refresh);
      document.getElementById('status').textContent = 'Token stored. Redirecting...';
      setTimeout(function() {
        window.location.href = '/';
      }, 500);
    } catch(e) {
      document.getElementById('status').textContent = 'Error: ' + e.message;
      setTimeout(function() {
        window.location.href = '/?error=storage_failed';
      }, 2000);
    }
  })();
</script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);

  } catch (err) {
    return res.redirect(302, "/?error=exception&msg=" + encodeURIComponent(err.message));
  }
}
