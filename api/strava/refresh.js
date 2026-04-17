import { parseCookies, refreshStravaWithJson, setStravaAuthCookies } from "./tokenCookies.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const cookies = parseCookies(req.headers.cookie || "");
  const refreshToken = cookies.strava_refresh;
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

  try {
    const tokens = await refreshStravaWithJson(refreshToken);
    if (!tokens?.access_token) return res.status(401).json({ error: "refresh_failed" });
    setStravaAuthCookies(res, tokens);
    return res.status(200).json({ ok: true, access_token: tokens.access_token });
  } catch {
    return res.status(401).json({ error: "refresh_failed" });
  }
}
