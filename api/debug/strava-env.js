export default function handler(req, res) {
  console.warn("[DEPRECATED] /api/debug/strava-env — debug-only; remove or protect in production.");
  res.status(200).json({
    has_client_id: !!process.env.STRAVA_CLIENT_ID,
    has_client_secret: !!process.env.STRAVA_CLIENT_SECRET,
    has_redirect_uri: !!process.env.STRAVA_REDIRECT_URI,
    redirect_uri_value: process.env.STRAVA_REDIRECT_URI || "not set",
    client_id_length: process.env.STRAVA_CLIENT_ID?.length || 0,
    client_id_first3: process.env.STRAVA_CLIENT_ID?.slice(0, 3) || "none",
    node_env: process.env.NODE_ENV,
  });
}
