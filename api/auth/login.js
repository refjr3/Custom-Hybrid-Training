export default function handler(req, res) {
  const clientId = process.env.VITE_WHOOP_CLIENT_ID;
  const redirectUri = "https://custom-hybrid-training.vercel.app/api/auth/callback";
  
  const scope = "read:recovery read:sleep read:cycles read:profile offline";
  const state = Math.random().toString(36).substring(2, 15);
  
  const authUrl = new URL("https://api.prod.whoop.com/oauth/oauth2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);

  res.setHeader("Set-Cookie", `whoop_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.redirect(302, authUrl.toString());
}
