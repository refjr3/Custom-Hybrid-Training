import { createClient } from "@supabase/supabase-js";
import { getStravaAccessForRequest } from "./tokenCookies.js";

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

function stravaHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function readZ2CacheRow(userId) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("strava_z2_minutes, strava_z2_cached_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[strava/weekly-z2] cache read:", error.message);
    return null;
  }
  return data;
}

function cacheAgeMinutes(cached) {
  if (!cached?.strava_z2_cached_at) return 999;
  const ms = new Date(cached.strava_z2_cached_at).getTime();
  if (!Number.isFinite(ms)) return 999;
  return (Date.now() - ms) / 1000 / 60;
}

function normalizedCachedMinutes(row) {
  if (row?.strava_z2_minutes == null) return null;
  const n = Number(row.strava_z2_minutes);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

async function writeZ2Cache(userId, weeklyZ2Minutes) {
  const { error } = await supabase
    .from("user_profiles")
    .update({
      strava_z2_minutes: weeklyZ2Minutes,
      strava_z2_cached_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) {
    console.warn("[strava/weekly-z2] cache write:", error.message);
  } else {
    console.log("[weekly-z2] cached:", weeklyZ2Minutes, "for user:", userId);
  }
}

async function respondRateLimited(res, fallbackMinutes) {
  if (fallbackMinutes != null) {
    return res.status(200).json({
      weeklyZ2Minutes: fallbackMinutes,
      fromCache: true,
      rateLimited: true,
    });
  }
  return res.status(200).json({ weeklyZ2Minutes: 0, error: "strava_rate_limited" });
}

async function fetchActivitiesInRange(accessToken, afterEpoch, beforeEpoch) {
  const all = [];
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const url = new URL(STRAVA_ATHLETE_ACTIVITIES_URL);
    url.searchParams.set("after", String(afterEpoch));
    url.searchParams.set("before", String(beforeEpoch));
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));

    const r = await fetch(url.toString(), { headers: stravaHeaders(accessToken) });
    if (r.status === 429) return { ok: false, activities: [], status: 429 };
    if (!r.ok) return { ok: false, activities: [], status: r.status };

    const batch = await r.json().catch(() => []);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return { ok: true, activities: all, status: 200 };
}

async function fetchHrStream(accessToken, activityId) {
  const url = new URL(STRAVA_ACTIVITY_STREAM_URL(activityId));
  url.searchParams.set("keys", "heartrate");
  url.searchParams.set("key_by_type", "true");

  const res = await fetch(url.toString(), { headers: stravaHeaders(accessToken) });
  if (res.status === 429) return { rateLimited: true, stream: null };
  if (!res.ok) return { rateLimited: false, stream: null };
  const stream = await res.json().catch(() => null);
  return { rateLimited: false, stream };
}

async function z2SecondsForActivity(accessToken, activity) {
  const id = activity?.id;
  const label = `${activity?.name || "?"} (${activity?.type || "?"}) id=${id}`;
  if (!id) {
    console.log("[weekly-z2] skip (no id):", label);
    return { seconds: 0, rateLimited: false };
  }
  if (!activity?.has_heartrate) {
    console.log("[weekly-z2] skip (no HR):", label);
    return { seconds: 0, rateLimited: false };
  }

  const zonesRes = await fetch(STRAVA_ACTIVITY_ZONES(id), { headers: stravaHeaders(accessToken) });
  console.log("[weekly-z2] zones status for", activity?.name || id, ":", zonesRes.status);
  if (zonesRes.status === 429) return { seconds: 0, rateLimited: true };
  if (zonesRes.ok) {
    const zonesJson = await zonesRes.json().catch(() => null);
    const hrZones = Array.isArray(zonesJson) ? zonesJson.find((z) => z.type === "heartrate") : null;
    const bucketLen = hrZones?.distribution_buckets?.length;
    console.log(
      "[weekly-z2] hrZones found:",
      !!hrZones,
      "buckets:",
      bucketLen,
      "| raw types:",
      Array.isArray(zonesJson) ? zonesJson.map((z) => z?.type).join(",") : typeof zonesJson
    );
    const fromZones = z2SecondsFromHeartrateZones(zonesJson);
    if (fromZones != null) {
      console.log("[weekly-z2] Z2 seconds (zones) for", activity?.name || id, ":", fromZones);
      return { seconds: fromZones, rateLimited: false };
    }
  }

  const { rateLimited, stream } = await fetchHrStream(accessToken, id);
  if (rateLimited) return { seconds: 0, rateLimited: true };
  const hrArray = stream?.heartrate?.data;
  const hrLen = Array.isArray(hrArray) ? hrArray.length : 0;
  console.log("[weekly-z2] stream HR samples for", activity?.name || id, ":", hrLen);
  if (!Array.isArray(hrArray) || hrArray.length === 0) return { seconds: 0, rateLimited: false };
  const streamSecs = getSecondsInZ2Stream(hrArray, 133, 148);
  console.log("[weekly-z2] Z2 seconds (stream) for", activity?.name || id, ":", streamSecs);
  return { seconds: streamSecs, rateLimited: false };
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

  let cachedRow = null;
  let cachedMinutes = null;
  try {
    cachedRow = await readZ2CacheRow(appUserId);
    cachedMinutes = normalizedCachedMinutes(cachedRow);
    const ageMin = cacheAgeMinutes(cachedRow);
    if (cachedMinutes != null) {
      console.log("[weekly-z2] cache age:", Math.round(ageMin), "min, value:", cachedMinutes);
    }
    if (cachedMinutes != null && ageMin < 15) {
      return res.status(200).json({
        weeklyZ2Minutes: cachedMinutes,
        fromCache: true,
      });
    }
  } catch (e) {
    console.warn("[weekly-z2] cache read failed:", e?.message || e);
  }

  const accessToken = await getStravaAccessForRequest(req, res, supabase, appUserId);
  if (!accessToken) {
    if (cachedMinutes != null) {
      return res.status(200).json({
        weeklyZ2Minutes: cachedMinutes,
        fromCache: true,
      });
    }
    return res.status(200).json({ weeklyZ2Minutes: 0, error: "strava_not_connected" });
  }

  try {
    const now = new Date();
    const weekStart = startOfLocalWeekMonday(now);
    const afterEpoch = Math.floor(weekStart.getTime() / 1000);
    const beforeEpoch = Math.floor(now.getTime() / 1000) + 2;

    const activitiesRes = await fetchActivitiesInRange(accessToken, afterEpoch, beforeEpoch);

    if (activitiesRes.status === 429) {
      console.warn("[weekly-z2] rate limited (activities), returning cache:", cachedMinutes);
      return respondRateLimited(res, cachedMinutes);
    }
    if (!activitiesRes.ok) {
      return res.status(200).json({
        weeklyZ2Minutes: cachedMinutes ?? 0,
        error: "strava_fetch_failed",
        fromCache: cachedMinutes != null,
      });
    }

    const activities = Array.isArray(activitiesRes.activities) ? activitiesRes.activities : [];
    const withHr = activities.filter((a) => a?.has_heartrate);
    console.log("[weekly-z2] activities this week:", activities.length);
    console.log("[weekly-z2] activities with HR:", withHr.length);

    let totalZ2Seconds = 0;
    const summary = [];
    const chunk = 4;
    for (let i = 0; i < activities.length; i += chunk) {
      const slice = activities.slice(i, i + chunk);
      const results = await Promise.all(
        slice.map((a) => z2SecondsForActivity(accessToken, a))
      );
      for (let j = 0; j < slice.length; j += 1) {
        const a = slice[j];
        const { seconds: secs, rateLimited } = results[j] || { seconds: 0, rateLimited: false };
        if (rateLimited) {
          console.warn("[weekly-z2] rate limited (zones), returning cache:", cachedMinutes);
          return respondRateLimited(res, cachedMinutes);
        }
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
    console.log(
      "[weekly-z2] total Z2 seconds:",
      totalZ2Seconds,
      "= minutes:",
      weeklyZ2Minutes
    );

    if (weeklyZ2Minutes > 0) {
      await writeZ2Cache(appUserId, weeklyZ2Minutes);
    } else {
      console.warn("[weekly-z2] not writing Supabase cache for 0 minutes (preserve last good cache)");
    }

    return res.status(200).json({
      weeklyZ2Minutes,
      weeklyZ2Hours,
      activitiesScanned: activities.length,
      totalMinutes: weeklyZ2Minutes,
      targetMinutes: 240,
      activities: summary,
      fromCache: false,
    });
  } catch (err) {
    console.error("[strava/weekly-z2]", err?.message || err);
    return res.status(200).json({
      weeklyZ2Minutes: cachedMinutes ?? 0,
      error: err?.message || "fetch_failed",
      fromCache: cachedMinutes != null,
    });
  }
}
