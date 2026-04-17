/** Shared Strava OAuth + persistence for Vercel serverless routes. */

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

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

export async function refreshStravaToken(refreshToken) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: String(clientId),
      client_secret: String(clientSecret),
      grant_type: "refresh_token",
      refresh_token: String(refreshToken),
    }).toString(),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  if (!data?.access_token) return null;
  return data;
}

/** HttpOnly access/refresh; expires is not HttpOnly so clients can preflight if needed. */
export function applyStravaTokenCookies(res, tokens) {
  const base = "Path=/; HttpOnly; Secure; SameSite=Lax";
  const exp = Number(tokens.expires_at || 0);
  const refresh = tokens.refresh_token || "";
  res.setHeader("Set-Cookie", [
    `strava_access=${tokens.access_token}; ${base}; Max-Age=21600`,
    `strava_refresh=${refresh}; ${base}; Max-Age=31536000`,
    `strava_expires=${exp}; Path=/; Secure; SameSite=Lax; Max-Age=31536000`,
  ]);
}

export function toEpochSeconds(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 1e12) return Math.floor(numeric / 1000);
  const parsed = new Date(value);
  if (Number.isFinite(parsed.getTime())) return Math.floor(parsed.getTime() / 1000);
  return 0;
}

export async function persistStravaTokensToProfile(supabase, appUserId, wearablesBase, tokens) {
  const expiresAt = Number(tokens.expires_at || 0);
  const nextWearables = {
    ...(wearablesBase || {}),
    strava: true,
    strava_access_token: tokens.access_token,
    strava_refresh_token: tokens.refresh_token || wearablesBase?.strava_refresh_token || null,
    strava_token_expires_at: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
    strava_connected_at: wearablesBase?.strava_connected_at || new Date().toISOString(),
  };
  await supabase.from("user_profiles").upsert(
    {
      user_id: appUserId,
      connected_wearables: nextWearables,
      strava_access_token: tokens.access_token,
      strava_refresh_token: tokens.refresh_token || wearablesBase?.strava_refresh_token || null,
      strava_token_expires_at: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
    },
    { onConflict: "user_id" },
  );
}

/**
 * Ensures a valid access token (pre-emptive refresh if &lt;5m left), returns a fetch()
 * that retries once on 401 with refresh + persist + Set-Cookie.
 */
export async function ensureStravaTokensForRequest({ supabase, appUserId, profile, res }) {
  let wearables = { ...(profile?.connected_wearables || {}) };
  let accessToken = profile?.strava_access_token || wearables.strava_access_token || null;
  let refreshToken = profile?.strava_refresh_token || wearables.strava_refresh_token || null;
  let expiresAt = toEpochSeconds(profile?.strava_token_expires_at || wearables.strava_token_expires_at);
  const nowSec = Math.floor(Date.now() / 1000);

  if (!accessToken && !refreshToken) return null;

  const applyTokens = async (t) => {
    accessToken = t.access_token;
    refreshToken = t.refresh_token || refreshToken;
    expiresAt = Number(t.expires_at || nowSec + Number(t.expires_in || 21600));
    if (res) applyStravaTokenCookies(res, t);
    await persistStravaTokensToProfile(supabase, appUserId, wearables, t);
    wearables = {
      ...wearables,
      strava: true,
      strava_access_token: accessToken,
      strava_refresh_token: refreshToken,
      strava_token_expires_at: new Date(expiresAt * 1000).toISOString(),
      strava_connected_at: wearables.strava_connected_at || new Date().toISOString(),
    };
  };

  if (!accessToken || (expiresAt && expiresAt - nowSec < 300)) {
    const t = await refreshStravaToken(refreshToken);
    if (!t?.access_token) return null;
    await applyTokens(t);
  }

  return {
    get accessToken() {
      return accessToken;
    },
    /** Returns fetch Response or null if failed after retry. */
    async stravaFetch(url, init = {}) {
      const headers = { ...(init.headers || {}), Authorization: `Bearer ${accessToken}` };
      let r = await fetch(url, { ...init, headers });
      if (r.status === 401 && refreshToken) {
        const t = await refreshStravaToken(refreshToken);
        if (!t?.access_token) return null;
        await applyTokens(t);
        r = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${accessToken}` } });
      }
      return r.ok ? r : null;
    },
  };
}
