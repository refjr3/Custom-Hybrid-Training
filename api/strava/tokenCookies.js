/** Minimal Strava cookie + refresh helpers (no per-request Supabase upserts). */

export function parseCookies(header = "") {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) out[trimmed] = "";
    else out[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
  }
  return out;
}

export function setStravaAuthCookies(res, tokens, existingRefreshFallback = "") {
  const base = "Path=/; HttpOnly; Secure; SameSite=Lax";
  const exp = Number(tokens.expires_at || 0);
  const refresh = tokens.refresh_token || existingRefreshFallback || "";
  res.setHeader("Set-Cookie", [
    `strava_access=${tokens.access_token}; ${base}; Max-Age=21600`,
    `strava_refresh=${refresh}; ${base}; Max-Age=31536000`,
    `strava_expires=${exp}; Path=/; Secure; SameSite=Lax; Max-Age=31536000`,
  ]);
}

export async function refreshStravaWithJson(refreshToken) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) return null;
  const t = await r.json().catch(() => ({}));
  return t?.access_token ? t : null;
}

/**
 * Returns a valid Strava access token: cookies first, optional Supabase profile
 * when userId is provided, refresh + Set-Cookie if expiring.
 */
export async function getStravaAccessForRequest(req, res, supabase, userId) {
  const jar = parseCookies(req.headers?.cookie || "");
  let accessToken = jar.strava_access || null;
  let refreshToken = jar.strava_refresh || null;
  let expiresAt = parseInt(jar.strava_expires || "0", 10) || 0;

  if ((!accessToken || !refreshToken) && supabase && userId) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("connected_wearables,strava_access_token,strava_refresh_token,strava_token_expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    const w = profile?.connected_wearables || {};
    accessToken = accessToken || profile?.strava_access_token || w.strava_access_token || null;
    refreshToken = refreshToken || profile?.strava_refresh_token || w.strava_refresh_token || null;
    if (profile?.strava_token_expires_at) {
      const ms = new Date(profile.strava_token_expires_at).getTime();
      if (Number.isFinite(ms)) expiresAt = Math.floor(ms / 1000);
    }
  }

  if (!refreshToken) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (!accessToken || !expiresAt || expiresAt - nowSec < 300) {
    const t = await refreshStravaWithJson(refreshToken);
    if (!t?.access_token) return null;
    if (res) setStravaAuthCookies(res, t, refreshToken);
    accessToken = t.access_token;
  }

  return accessToken;
}

export function stravaFetchWithToken(accessToken) {
  return async (url, init = {}) => {
    const r = await fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${accessToken}` },
    });
    return r.ok ? r : null;
  };
}
