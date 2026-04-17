import { parseCookies, refreshStravaToken, applyStravaTokenCookies, toEpochSeconds } from "./stravaClient.js";

/**
 * Strava API GET using HttpOnly cookies only (no Supabase profile).
 * Pre-emptive refresh if expiring in &lt;5 minutes; one 401 retry.
 */
export async function stravaFetchWithCookies(url, req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  let accessToken = cookies.strava_access;
  let refreshToken = cookies.strava_refresh;
  let expiresAt = toEpochSeconds(cookies.strava_expires);
  const nowSec = Math.floor(Date.now() / 1000);

  const apply = async (t) => {
    accessToken = t.access_token;
    refreshToken = t.refresh_token || refreshToken;
    expiresAt = Number(t.expires_at || 0);
    if (res) applyStravaTokenCookies(res, t);
  };

  if (!accessToken && !refreshToken) return null;

  if (!accessToken || (expiresAt && expiresAt - nowSec < 300)) {
    if (!refreshToken) return null;
    const t = await refreshStravaToken(refreshToken);
    if (!t?.access_token) return null;
    await apply(t);
  }

  let response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (response.status === 401 && refreshToken) {
    const t = await refreshStravaToken(refreshToken);
    if (!t?.access_token) return null;
    await apply(t);
    response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  }
  return response.ok ? response : null;
}
