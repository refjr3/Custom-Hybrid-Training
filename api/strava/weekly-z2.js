import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_ATHLETE_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";
const STRAVA_ACTIVITY_STREAM_URL = (activityId) =>
  `https://www.strava.com/api/v3/activities/${activityId}/streams`;

const parseCookies = (header = "") => {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(rest.join("=") || "");
  });
  return out;
};

const MASK = "[REDACTED]";
const maskValue = (value) => {
  if (!value) return null;
  const str = String(value);
  if (str.length <= 8) return MASK;
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
};

const startOfWeekMondayUtc = (now = new Date()) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const endOfWeekSundayUtc = (mondayUtc) => {
  const d = new Date(mondayUtc);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const getSecondsInZ2 = (hrData = [], lower = 133, upper = 148) => {
  let secs = 0;
  for (const hr of hrData) {
    if (Number.isFinite(hr) && hr >= lower && hr <= upper) secs += 1;
  }
  return secs;
};

const formatDateLabel = (isoString) =>
  new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const toEpochSeconds = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
  const parsed = new Date(value);
  if (Number.isFinite(parsed.getTime())) return Math.floor(parsed.getTime() / 1000);
  return 0;
};

async function refreshStravaTokens(refreshToken) {
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

async function fetchActivities(accessToken, afterEpoch, beforeEpoch) {
  const all = [];
  let page = 1;

  while (page <= 10) {
    const url = new URL(STRAVA_ATHLETE_ACTIVITIES_URL);
    url.searchParams.set("after", String(afterEpoch));
    url.searchParams.set("before", String(beforeEpoch));
    url.searchParams.set("per_page", "200");
    url.searchParams.set("page", String(page));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return { ok: false, status: res.status, activities: [] };

    const batch = await res.json().catch(() => []);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }

  return { ok: true, status: 200, activities: all };
}

async function fetchHrStream(accessToken, activityId) {
  const url = new URL(STRAVA_ACTIVITY_STREAM_URL(activityId));
  url.searchParams.set("keys", "heartrate");
  url.searchParams.set("key_by_type", "true");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData?.user) return res.status(401).json({ error: "Invalid token" });

  const appUserId = authData.user.id;

  let profile = null;
  let profileErr = null;
  const primaryProfileRes = await supabase
    .from("user_profiles")
    .select("connected_wearables,strava_access_token,strava_refresh_token,strava_token_expires_at")
    .eq("user_id", appUserId)
    .single();
  profile = primaryProfileRes.data || null;
  profileErr = primaryProfileRes.error || null;

  if (profileErr && /strava_(access|refresh)_token|strava_token_expires_at/i.test(profileErr.message || "")) {
    // Backward-compatible path for environments that haven't applied migration 012 yet.
    const fallbackRes = await supabase
      .from("user_profiles")
      .select("connected_wearables")
      .eq("user_id", appUserId)
      .single();
    profile = fallbackRes.data || null;
    profileErr = fallbackRes.error || null;
  }

  console.log("[strava/weekly-z2] profile query result", {
    appUserId,
    hasProfile: Boolean(profile),
    profileErr: profileErr ? { code: profileErr.code, message: profileErr.message } : null,
    hasTopLevelAccessToken: Boolean(profile?.strava_access_token),
    hasTopLevelRefreshToken: Boolean(profile?.strava_refresh_token),
    topLevelExpiresAt: profile?.strava_token_expires_at || null,
    hasConnectedWearables: Boolean(profile?.connected_wearables),
    connectedWearablesKeys: Object.keys(profile?.connected_wearables || {}),
    hasWearablesAccessToken: Boolean(profile?.connected_wearables?.strava_access_token),
    hasWearablesRefreshToken: Boolean(profile?.connected_wearables?.strava_refresh_token),
    wearablesExpiresAt: profile?.connected_wearables?.strava_token_expires_at || null,
    accessTokenPreview: maskValue(profile?.strava_access_token || profile?.connected_wearables?.strava_access_token),
    refreshTokenPreview: maskValue(profile?.strava_refresh_token || profile?.connected_wearables?.strava_refresh_token),
  });

  if (profileErr) return res.status(500).json({ error: "profile_read_failed" });

  const wearables = profile?.connected_wearables || {};
  let accessToken = profile?.strava_access_token || wearables.strava_access_token || null;
  let refreshToken = profile?.strava_refresh_token || wearables.strava_refresh_token || null;
  let expiresAt = toEpochSeconds(profile?.strava_token_expires_at || wearables.strava_token_expires_at);
  const nowEpoch = Math.floor(Date.now() / 1000);

  if (!accessToken && !refreshToken) {
    console.warn("[strava/weekly-z2] no stored Strava tokens found", { appUserId });
    return res.status(401).json({ error: "strava_not_connected" });
  }

  const writeTokenCookies = (tokens) => {
    const base = "Path=/; HttpOnly; Secure; SameSite=Lax";
    res.setHeader("Set-Cookie", [
      `strava_access=${tokens.access_token}; ${base}; Max-Age=86400`,
      `strava_refresh=${tokens.refresh_token || refreshToken || ""}; ${base}; Max-Age=2592000`,
    ]);
  };

  // Refresh token preflight if expired (or about to expire in <60s).
  if (!accessToken || !expiresAt || nowEpoch >= (expiresAt - 60)) {
    const refreshed = await refreshStravaTokens(refreshToken);
    if (!refreshed?.access_token) {
      console.warn("[strava/weekly-z2] token refresh failed", {
        appUserId,
        hasRefreshToken: Boolean(refreshToken),
      });
      return res.status(401).json({ error: "strava_reconnect_required" });
    }
    accessToken = refreshed.access_token;
    refreshToken = refreshed.refresh_token || refreshToken;
    expiresAt = Number(refreshed.expires_at || nowEpoch + Number(refreshed.expires_in || 21600));

    const nextWearables = {
      ...wearables,
      strava: true,
      strava_access_token: accessToken,
      strava_refresh_token: refreshToken,
      strava_token_expires_at: new Date(expiresAt * 1000).toISOString(),
      strava_connected_at: wearables.strava_connected_at || new Date().toISOString(),
    };

    await supabase
      .from("user_profiles")
      .upsert({
        user_id: appUserId,
        connected_wearables: nextWearables,
        strava_access_token: accessToken,
        strava_refresh_token: refreshToken,
        strava_token_expires_at: new Date(expiresAt * 1000).toISOString(),
      }, { onConflict: "user_id" });
    console.log("[strava/weekly-z2] preflight refresh persisted", {
      appUserId,
      tokenExpiresAt: new Date(expiresAt * 1000).toISOString(),
      accessTokenPreview: maskValue(accessToken),
    });
    writeTokenCookies(refreshed);
  }

  const weekStart = startOfWeekMondayUtc();
  const weekEnd = endOfWeekSundayUtc(weekStart);
  const afterEpoch = Math.floor(weekStart.getTime() / 1000);
  const beforeEpoch = Math.floor(weekEnd.getTime() / 1000);

  let activitiesRes = await fetchActivities(accessToken, afterEpoch, beforeEpoch);
  if (activitiesRes.status === 401 && refreshToken) {
    const refreshed = await refreshStravaTokens(refreshToken);
    if (refreshed?.access_token) {
      accessToken = refreshed.access_token;
      refreshToken = refreshed.refresh_token || refreshToken;
      expiresAt = Number(refreshed.expires_at || nowEpoch + Number(refreshed.expires_in || 21600));
      const nextWearables = {
        ...wearables,
        strava: true,
        strava_access_token: accessToken,
        strava_refresh_token: refreshToken,
        strava_token_expires_at: new Date(expiresAt * 1000).toISOString(),
      };
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: appUserId,
          connected_wearables: nextWearables,
          strava_access_token: accessToken,
          strava_refresh_token: refreshToken,
          strava_token_expires_at: new Date(expiresAt * 1000).toISOString(),
        }, { onConflict: "user_id" });
      console.log("[strava/weekly-z2] retry refresh persisted", {
        appUserId,
        tokenExpiresAt: new Date(expiresAt * 1000).toISOString(),
        accessTokenPreview: maskValue(accessToken),
      });
      writeTokenCookies(refreshed);
      activitiesRes = await fetchActivities(accessToken, afterEpoch, beforeEpoch);
    }
  }

  if (!activitiesRes.ok) {
    return res.status(502).json({ error: "strava_activities_failed" });
  }

  const activities = Array.isArray(activitiesRes.activities) ? activitiesRes.activities : [];

  let totalSeconds = 0;
  const summary = [];

  for (const a of activities) {
    const hasHr = Boolean(a?.has_heartrate);
    if (!hasHr || !a?.id) continue;

    const stream = await fetchHrStream(accessToken, a.id);
    const hrArray = stream?.heartrate?.data;
    if (!Array.isArray(hrArray) || hrArray.length === 0) continue;

    const secs = getSecondsInZ2(hrArray, 133, 148);
    totalSeconds += secs;
    summary.push({
      name: a.name || "Activity",
      type: a.type || "Workout",
      date: formatDateLabel(a.start_date_local || a.start_date),
      z2Minutes: Math.round(secs / 60),
    });
  }

  return res.status(200).json({
    totalMinutes: Math.round(totalSeconds / 60),
    targetMinutes: 180,
    activities: summary,
  });
}
