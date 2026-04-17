import { createClient } from "@supabase/supabase-js";
import { getStravaAccessForRequest, stravaFetchWithToken } from "./tokenCookies.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STRAVA_ATHLETE_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";
const STRAVA_ACTIVITY_ZONES = (id) => `https://www.strava.com/api/v3/activities/${id}/zones`;
const STRAVA_ACTIVITY_STREAM_URL = (activityId) =>
  `https://www.strava.com/api/v3/activities/${activityId}/streams`;

function startOfLocalWeekMonday(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

const getSecondsInZ2Stream = (hrData = [], lower = 133, upper = 148) => {
  let secs = 0;
  for (const hr of hrData) {
    if (Number.isFinite(hr) && hr >= lower && hr <= upper) secs += 1;
  }
  return secs;
};

const formatDateLabel = (isoString) =>
  new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function z2SecondsFromHeartrateZones(zonesJson) {
  if (!Array.isArray(zonesJson)) return null;
  const hrZones = zonesJson.find((z) => z.type === "heartrate");
  const buckets = hrZones?.distribution_buckets;
  if (!Array.isArray(buckets) || buckets.length < 2) return null;
  const z2 = Number(buckets[1]?.time ?? 0) || 0;
  if (!Number.isFinite(z2) || z2 < 0) return null;
  return z2;
}

async function fetchActivitiesInRange(stravaFetch, afterEpoch, beforeEpoch) {
  const all = [];
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const url = new URL(STRAVA_ATHLETE_ACTIVITIES_URL);
    url.searchParams.set("after", String(afterEpoch));
    url.searchParams.set("before", String(beforeEpoch));
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));

    const res = await stravaFetch(url.toString());
    if (!res) return { ok: false, activities: [] };

    const batch = await res.json().catch(() => []);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < perPage) break;
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

async function z2SecondsForActivity(stravaFetch, activity) {
  const id = activity?.id;
  if (!id || !activity?.has_heartrate) return 0;

  const zonesRes = await stravaFetch(STRAVA_ACTIVITY_ZONES(id));
  if (zonesRes) {
    const zonesJson = await zonesRes.json().catch(() => null);
    const fromZones = z2SecondsFromHeartrateZones(zonesJson);
    if (fromZones != null) return fromZones;
  }

  const stream = await fetchHrStream(stravaFetch, id);
  const hrArray = stream?.heartrate?.data;
  if (!Array.isArray(hrArray) || hrArray.length === 0) return 0;
  return getSecondsInZ2Stream(hrArray, 133, 148);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData?.user) return res.status(401).json({ error: "Invalid token" });

  const appUserId = authData.user.id;
  const headerUid = typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : "";
  if (headerUid && headerUid !== appUserId) {
    console.warn("[strava/weekly-z2] x-user-id header does not match JWT user", { headerUid, appUserId });
  }

  const accessToken = await getStravaAccessForRequest(req, res, supabase, appUserId);
  if (!accessToken) {
    return res.status(200).json({ weeklyZ2Minutes: 0, error: "strava_not_connected" });
  }

  const stravaFetch = stravaFetchWithToken(accessToken);

  try {
    const now = new Date();
    const weekStart = startOfLocalWeekMonday(now);
    const afterEpoch = Math.floor(weekStart.getTime() / 1000);
    const beforeEpoch = Math.floor(now.getTime() / 1000) + 2;

    const activitiesRes = await fetchActivitiesInRange(stravaFetch, afterEpoch, beforeEpoch);

    if (!activitiesRes.ok) {
      return res.status(502).json({ error: "strava_activities_failed" });
    }

    const activities = Array.isArray(activitiesRes.activities) ? activitiesRes.activities : [];

    let totalZ2Seconds = 0;
    const summary = [];
    const chunk = 4;
    for (let i = 0; i < activities.length; i += chunk) {
      const slice = activities.slice(i, i + chunk);
      const secsList = await Promise.all(
        slice.map((a) => z2SecondsForActivity(stravaFetch, a))
      );
      for (let j = 0; j < slice.length; j += 1) {
        const a = slice[j];
        const secs = secsList[j] || 0;
        if (secs <= 0) continue;
        totalZ2Seconds += secs;
        summary.push({
          name: a.name || "Activity",
          type: a.type || "Workout",
          date: formatDateLabel(a.start_date_local || a.start_date),
          z2Minutes: Math.round(secs / 60),
        });
      }
    }

    const weeklyZ2Minutes = Math.round(totalZ2Seconds / 60);
    const weeklyZ2Hours = (totalZ2Seconds / 3600).toFixed(1);

    return res.status(200).json({
      weeklyZ2Minutes,
      weeklyZ2Hours,
      activitiesScanned: activities.length,
      totalMinutes: weeklyZ2Minutes,
      targetMinutes: 240,
      activities: summary,
    });
  } catch (err) {
    console.error("[strava/weekly-z2]", err?.message || err);
    return res.status(200).json({ weeklyZ2Minutes: 0, error: err?.message || "fetch_failed" });
  }
}
