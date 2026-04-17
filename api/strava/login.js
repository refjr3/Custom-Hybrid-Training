const REDIRECT_URI = "https://custom-hybrid-training.vercel.app/api/strava/callback";
const APP_ORIGIN = "https://custom-hybrid-training.vercel.app";

export default function handler(req, res) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) return res.redirect(302, `${APP_ORIGIN}/?error=strava_missing_env`);

  const state = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  const requestedUid = typeof req.query?.uid === "string" ? req.query.uid.trim() : "";

  const cookies = [
    `strava_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  ];
  if (requestedUid) {
    cookies.push(`strava_uid=${encodeURIComponent(requestedUid)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  }
  res.setHeader("Set-Cookie", cookies);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state,
  });

  return res.redirect(302, `https://www.strava.com/oauth/authorize?${params}`);
}
