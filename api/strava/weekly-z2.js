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

function stravaHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

/** Z1–Z5 seconds from Strava heartrate distribution_buckets (index 0 = Z1, …). */
function zoneSecondsFromHeartrateBuckets(zonesJson) {
  if (!Array.isArray(zonesJson)) return null;
  const hrZones = zonesJson.find((z) => z.type === "heartrate");
  const buckets = hrZones?.distribution_buckets;
  if (!Array.isArray(buckets) || buckets.length < 2) return null;
  const pick = (i) => {
    const t = Number(buckets[i]?.time ?? 0);
    return Number.isFinite(t) && t > 0 ? t : 0;
  };
  return {
    z1: pick(0),
    z2: pick(1),
    z3: pick(2),
    z4: pick(3),
    z5: pick(4),
  };
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
  }
}

async function patchStravaLastSync(userId) {
  const { data: prof, error: readErr } = await supabase
    .from("user_profiles")
    .select("connected_sources")
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) {
    console.warn("[strava/weekly-z2] connected_sources read:", readErr.message);
    return;
  }
  const cs =
    typeof prof?.connected_sources === "object" && prof?.connected_sources
      ? prof.connected_sources
      : {};
  const strava = {
    ...(typeof cs.strava === "object" && cs.strava ? cs.strava : {}),
    connected: true,
    last_sync: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("user_profiles")
    .update({ connected_sources: { ...cs, strava } })
    .eq("user_id", userId);
  if (error) {
    console.warn("[strava/weekly-z2] connected_sources update:", error.message);
  }
}

function activityLocalYmd(activity) {
  const raw = activity?.start_date_local || activity?.start_date || "";
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
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

/**
 * Z1–Z5 seconds for one activity (zones API first, then HR stream for Z2 only).
 * @returns {{ z1: number, z2: number, z3: number, z4: number, z5: number, rateLimited: boolean }}
 */
async function zoneMetricsForActivity(accessToken, activity) {
  const id = activity?.id;
  if (!id) {
    return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, rateLimited: false };
  }

  const zonesRes = await fetch(STRAVA_ACTIVITY_ZONES(id), { headers: stravaHeaders(accessToken) });
  if (zonesRes.status === 429) {
    return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, rateLimited: true };
  }
  if (zonesRes.ok) {
    const zonesJson = await zonesRes.json().catch(() => null);
    const packed = zoneSecondsFromHeartrateBuckets(zonesJson);
    if (packed) {
      return { ...packed, rateLimited: false };
    }
  }

  if (!activity?.has_heartrate) {
    return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, rateLimited: false };
  }

  const { rateLimited, stream } = await fetchHrStream(accessToken, id);
  if (rateLimited) return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, rateLimited: true };
  const hrArray = stream?.heartrate?.data;
  if (!Array.isArray(hrArray) || hrArray.length === 0) {
    return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, rateLimited: false };
  }
  const z2 = getSecondsInZ2Stream(hrArray, 133, 148);
  return { z1: 0, z2, z3: 0, z4: 0, z5: 0, rateLimited: false };
}

async function upsertStravaUnifiedDays(supabase, userId, byDate) {
  const entries = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [date, agg] of entries) {
    const payload = {
      user_id: userId,
      date,
      source: "strava",
      total_activity_min: agg.total_activity_min,
      z2_minutes: agg.z2_minutes,
      z3_minutes: agg.z3_minutes,
      z4_plus_minutes: agg.z4_plus_minutes,
      raw_payload: { activities: agg.activities },
      updated_at: new Date().toISOString(),
    };
    const payloadLog = {
      ...payload,
      raw_payload: { activities_count: agg.activities?.length ?? 0 },
    };
    console.log("[strava/weekly-z2] upserting day:", date, "payload:", JSON.stringify(payloadLog));
    const { data: existing, error: readErr } = await supabase
      .from("unified_metrics")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .eq("source", "strava")
      .maybeSingle();
    if (readErr) {
      console.error("[strava/weekly-z2] unified read", date, readErr);
      continue;
    }
    const merged = { ...(existing || {}), ...payload, user_id: userId, date, source: "strava" };
    const { data: upRows, error: upErr } = await supabase
      .from("unified_metrics")
      .upsert(merged, { onConflict: "user_id,date,source" })
      .select("id, user_id, date, source, z2_minutes, total_activity_min");
    console.log(
      "[strava/weekly-z2] upsert result:",
      date,
      Array.isArray(upRows) ? upRows.length : 0,
      "rows, err:",
      upErr?.message,
      upErr?.code,
      upErr?.details
    );
    if (upErr) {
      console.error("[strava/weekly-z2] unified upsert", date, upErr);
    }
  }
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

  const forceFresh =
    typeof req.query?.force === "string" && req.query.force === "1";

  console.log(
    "[strava/weekly-z2] START user:",
    appUserId,
    "forceFresh:",
    forceFresh,
    "fromCache check…"
  );

  let cachedRow = null;
  let cachedMinutes = null;
  try {
    cachedRow = await readZ2CacheRow(appUserId);
    cachedMinutes = normalizedCachedMinutes(cachedRow);
    const ageMin = cacheAgeMinutes(cachedRow);
    if (!forceFresh && cachedMinutes != null && ageMin < 60) {
      console.log(
        "[strava/weekly-z2] RETURNING FROM CACHE — no unified write (ageMin:",
        Math.round(ageMin * 10) / 10,
        "cachedMinutes:",
        cachedMinutes,
        ")"
      );
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
    console.log("[strava/weekly-z2] no Strava access token; strava_not_connected or cache fallback");
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

    console.log(
      "[strava/weekly-z2] week window epoch:",
      afterEpoch,
      "→",
      beforeEpoch,
      "local Monday:",
      weekStart.toISOString()
    );

    const activitiesRes = await fetchActivitiesInRange(accessToken, afterEpoch, beforeEpoch);

    if (activitiesRes.status === 429) {
      console.warn("[weekly-z2] rate limited (activities), returning cache:", cachedMinutes);
      return respondRateLimited(res, cachedMinutes);
    }
    if (!activitiesRes.ok) {
      console.log(
        "[strava/weekly-z2] activities fetch not ok, status:",
        activitiesRes.status,
        "— no unified write"
      );
      return res.status(200).json({
        weeklyZ2Minutes: cachedMinutes ?? 0,
        error: "strava_fetch_failed",
        fromCache: cachedMinutes != null,
      });
    }

    const activities = Array.isArray(activitiesRes.activities) ? activitiesRes.activities : [];
    console.log("[strava/weekly-z2] activities fetched:", activities.length);
    console.log(
      "[strava/weekly-z2] activities with HR:",
      activities.filter((a) => a?.has_heartrate).length
    );

    /** @type {Map<string, { total_activity_min: number, z2_minutes: number, z3_minutes: number, z4_plus_minutes: number, activities: object[] }>} */
    const byDate = new Map();

    let totalZ2Seconds = 0;
    const summary = [];
    const chunk = 4;
    for (let i = 0; i < activities.length; i += chunk) {
      const slice = activities.slice(i, i + chunk);
      const results = await Promise.all(
        slice.map((a) => zoneMetricsForActivity(accessToken, a))
      );
      for (let j = 0; j < slice.length; j += 1) {
        const a = slice[j];
        const metrics = results[j] || {
          z1: 0,
          z2: 0,
          z3: 0,
          z4: 0,
          z5: 0,
          rateLimited: false,
        };
        if (metrics.rateLimited) {
          console.warn("[weekly-z2] rate limited (zones), returning cache:", cachedMinutes);
          return respondRateLimited(res, cachedMinutes);
        }

        const date = activityLocalYmd(a);
        if (date) {
          const movingSec = Number(a.moving_time) || 0;
          const movingMin = Math.round(movingSec / 60);
          const z2Min = Math.round(metrics.z2 / 60);
          const z3Min = Math.round(metrics.z3 / 60);
          const z4PlusMin = Math.round((metrics.z4 + metrics.z5) / 60);

          if (!byDate.has(date)) {
            byDate.set(date, {
              total_activity_min: 0,
              z2_minutes: 0,
              z3_minutes: 0,
              z4_plus_minutes: 0,
              activities: [],
            });
          }
          const agg = byDate.get(date);
          agg.total_activity_min += movingMin;
          agg.z2_minutes += z2Min;
          agg.z3_minutes += z3Min;
          agg.z4_plus_minutes += z4PlusMin;
          agg.activities.push({
            activity_id: a.id,
            name: a.name,
            type: a.type,
            distance_m: a.distance,
            avg_hr: a.average_heartrate,
            moving_min: movingMin,
            z2_minutes: z2Min,
            z3_minutes: z3Min,
            z4_plus_minutes: z4PlusMin,
          });
          console.log(
            "[strava/weekly-z2] adding to byDate:",
            date,
            "activity id:",
            a.id,
            "z2 min:",
            z2Min,
            "moving min:",
            movingMin,
            "agg totals z2/total min:",
            agg.z2_minutes,
            "/",
            agg.total_activity_min
          );
        } else {
          console.log(
            "[strava/weekly-z2] skip byDate (no local YMD): id",
            a?.id,
            "start_date_local:",
            a?.start_date_local,
            "start_date:",
            a?.start_date
          );
        }

        const secs = metrics.z2;
        if (secs > 0) {
          totalZ2Seconds += secs;
          summary.push({
            name: a.name || "Activity",
            type: a.type || "Workout",
            date: formatDateLabel(a.start_date_local || a.start_date),
            z2Minutes: Math.round(secs / 60),
          });
        }
      }
    }

    const weeklyZ2Minutes = Math.round(totalZ2Seconds / 60);
    const weeklyZ2Hours = (totalZ2Seconds / 3600).toFixed(1);

    console.log("[strava/weekly-z2] byDate keys:", Array.from(byDate.keys()));
    console.log("[strava/weekly-z2] about to upsert", byDate.size, "days");

    await upsertStravaUnifiedDays(supabase, appUserId, byDate);
    await patchStravaLastSync(appUserId);

    if (weeklyZ2Minutes > 0) {
      await writeZ2Cache(appUserId, weeklyZ2Minutes);
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
