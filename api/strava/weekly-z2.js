import { createClient } from "@supabase/supabase-js";
import { ensureStravaTokensForRequest } from "./stravaClient.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STRAVA_ATHLETE_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";
const STRAVA_ACTIVITY_STREAM_URL = (activityId) =>
  `https://www.strava.com/api/v3/activities/${activityId}/streams`;

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

async function fetchActivities(stravaFetch, afterEpoch, beforeEpoch) {
  const all = [];
  let page = 1;

  while (page <= 10) {
    const url = new URL(STRAVA_ATHLETE_ACTIVITIES_URL);
    url.searchParams.set("after", String(afterEpoch));
    url.searchParams.set("before", String(beforeEpoch));
    url.searchParams.set("per_page", "200");
    url.searchParams.set("page", String(page));

    const res = await stravaFetch(url.toString());
    if (!res) return { ok: false, activities: [] };

    const batch = await res.json().catch(() => []);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }

  return { ok: true, activities: all };
}

async function fetchHrStream(stravaFetch, activityId) {
  const url = new URL(STRAVA_ACTIVITY_STREAM_URL(activityId));
  url.searchParams.set("keys", "heartrate");
  url.searchParams.set("key_by_type", "true");

  const res = await stravaFetch(url.toString());
  if (!res) return null;
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
  const accessProbe = profile?.strava_access_token || wearables.strava_access_token || null;
  const refreshProbe = profile?.strava_refresh_token || wearables.strava_refresh_token || null;

  if (!accessProbe && !refreshProbe) {
    console.warn("[strava/weekly-z2] no stored Strava tokens found", { appUserId });
    return res.status(401).json({ error: "strava_not_connected" });
  }

  const stravaSession = await ensureStravaTokensForRequest({ supabase, appUserId, profile, res });
  if (!stravaSession) {
    console.warn("[strava/weekly-z2] token refresh failed", { appUserId, hasRefreshToken: Boolean(refreshProbe) });
    return res.status(401).json({ error: "strava_reconnect_required" });
  }

  const weekStart = startOfWeekMondayUtc();
  const weekEnd = endOfWeekSundayUtc(weekStart);
  const afterEpoch = Math.floor(weekStart.getTime() / 1000);
  const beforeEpoch = Math.floor(weekEnd.getTime() / 1000);

  const activitiesRes = await fetchActivities(stravaSession.stravaFetch, afterEpoch, beforeEpoch);

  if (!activitiesRes.ok) {
    return res.status(502).json({ error: "strava_activities_failed" });
  }

  const activities = Array.isArray(activitiesRes.activities) ? activitiesRes.activities : [];

  let totalSeconds = 0;
  const summary = [];

  for (const a of activities) {
    const hasHr = Boolean(a?.has_heartrate);
    if (!hasHr || !a?.id) continue;

    const stream = await fetchHrStream(stravaSession.stravaFetch, a.id);
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
    targetMinutes: 240,
    activities: summary,
  });
}
