import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DEFAULT_LOOKBACK_DAYS = 35;

const toIsoDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
};

const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const pickFirstNumber = (obj, keys) => {
  for (const key of keys) {
    const v = numberOrNull(obj?.[key]);
    if (v !== null) return v;
  }
  return null;
};

const normalizeSleepHours = (value) => {
  const n = numberOrNull(value);
  if (n === null) return null;
  if (n > 10000) return n / 3600;
  if (n > 100) return n / 60;
  return n;
};

const normalizeDurationSeconds = (value) => {
  const n = numberOrNull(value);
  if (n === null) return 0;
  if (n > 100000) return Math.round(n / 1000);
  return Math.round(n);
};

const normalizeDistanceMeters = (value) => {
  const n = numberOrNull(value);
  if (n === null) return 0;
  if (n > 1000) return n;
  return n * 1000;
};

const authHeaders = (apiKey, mode = "apikey") => {
  if (mode === "basic") {
    return {
      Authorization: `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString("base64")}`,
      Accept: "application/json",
    };
  }
  return {
    Authorization: `ApiKey API_KEY:${apiKey}`,
    Accept: "application/json",
  };
};

async function requestIntervalsJson(url, apiKey) {
  const attempts = [authHeaders(apiKey, "apikey"), authHeaders(apiKey, "basic")];
  let lastError = null;

  for (const headers of attempts) {
    const res = await fetch(url, { headers });
    const body = await res.json().catch(() => null);
    if (res.ok) return body;
    lastError = {
      status: res.status,
      body,
    };
    if (![401, 403].includes(res.status)) break;
  }

  throw new Error(
    `Intervals request failed: ${lastError?.status || "unknown"} ${lastError?.body?.message || ""}`.trim()
  );
}

async function fetchIntervalsResource(baseUrl, apiKey, paths, oldest) {
  let lastErr = null;
  for (const path of paths) {
    const url = new URL(`${baseUrl}${path}`);
    if (oldest) url.searchParams.set("oldest", oldest);
    try {
      const data = await requestIntervalsJson(url.toString(), apiKey);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.items)) return data.items;
      if (Array.isArray(data?.results)) return data.results;
      return [];
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) {
    console.warn("[intervals/sync] resource fetch failed", lastErr.message);
  }
  return [];
}

const buildDateMap = (wellnessRows, activityRows, fitnessRows) => {
  const byDate = new Map();
  const ensure = (date) => {
    if (!date) return null;
    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        hrv: null,
        rhr: null,
        sleep_hours: null,
        recovery_score: null,
        strain: 0,
        active_calories: 0,
        steps: 0,
        duration_seconds: 0,
        distance_meters: 0,
        avg_hr_sum: 0,
        avg_hr_weight: 0,
        atl: null,
        ctl: null,
        tsb: null,
      });
    }
    return byDate.get(date);
  };

  for (const row of wellnessRows || []) {
    const date = toIsoDate(row?.id || row?.date || row?.updated || row?.created);
    const bucket = ensure(date);
    if (!bucket) continue;
    bucket.hrv = pickFirstNumber(row, ["hrv", "lnHrv", "hrvScore", "hrv_ms"]) ?? bucket.hrv;
    bucket.rhr = pickFirstNumber(row, ["restingHr", "resting_hr", "rhr", "restingHeartrate"]) ?? bucket.rhr;
    const sleepHours = normalizeSleepHours(
      pickFirstNumber(row, ["sleep", "sleep_hours", "sleepSecs", "sleepSeconds", "sleepDuration", "sleepMinutes"])
    );
    bucket.sleep_hours = sleepHours ?? bucket.sleep_hours;
    bucket.recovery_score = pickFirstNumber(row, ["recovery", "recovery_score", "readiness", "wellness"]) ?? bucket.recovery_score;
  }

  for (const row of activityRows || []) {
    const date = toIsoDate(row?.start_date_local || row?.start_date || row?.start || row?.date);
    const bucket = ensure(date);
    if (!bucket) continue;

    const duration = normalizeDurationSeconds(
      pickFirstNumber(row, ["duration", "duration_seconds", "moving_time", "elapsed_time", "movingSeconds"])
    );
    const distance = normalizeDistanceMeters(
      pickFirstNumber(row, ["distance", "distance_meters", "meters", "distanceKm"])
    );
    const avgHr = pickFirstNumber(row, ["avg_hr", "average_heartrate", "averageHr", "hr"]);
    const trainingLoad = pickFirstNumber(row, ["training_load", "icu_training_load", "relative_effort", "trimp", "strain"]);
    const calories = pickFirstNumber(row, ["calories", "active_calories", "kcal"]);
    const steps = pickFirstNumber(row, ["steps"]);

    bucket.duration_seconds += duration;
    bucket.distance_meters += distance;
    bucket.strain += trainingLoad || 0;
    bucket.active_calories += calories || 0;
    bucket.steps += steps || 0;
    if (avgHr !== null && duration > 0) {
      bucket.avg_hr_sum += avgHr * duration;
      bucket.avg_hr_weight += duration;
    }
  }

  for (const row of fitnessRows || []) {
    const date = toIsoDate(row?.id || row?.date || row?.day);
    const bucket = ensure(date);
    if (!bucket) continue;
    bucket.atl = pickFirstNumber(row, ["atl", "fatigue", "load", "shortTermLoad"]) ?? bucket.atl;
    bucket.ctl = pickFirstNumber(row, ["ctl", "fitness", "longTermLoad"]) ?? bucket.ctl;
    bucket.tsb = pickFirstNumber(row, ["tsb", "form"]) ?? bucket.tsb;
  }

  return [...byDate.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
};

const baseUnifiedRow = (userId, syncedAt, row, isPrimary) => ({
  user_id: userId,
  date: row.date,
  source: "intervals",
  is_primary: isPrimary,
  hrv: row.hrv,
  rhr: row.rhr,
  recovery_score: row.recovery_score,
  sleep_hours: row.sleep_hours,
  strain: row.strain ? Math.round(row.strain * 10) / 10 : null,
  steps: row.steps ? Math.round(row.steps) : null,
  active_calories: row.active_calories ? Math.round(row.active_calories) : null,
  training_load: row.ctl ?? row.atl ?? row.strain ?? null,
  intervals_synced_at: syncedAt,
});

const extendedUnifiedRow = (userId, syncedAt, row, isPrimary) => ({
  ...baseUnifiedRow(userId, syncedAt, row, isPrimary),
  duration_seconds: row.duration_seconds ? Math.round(row.duration_seconds) : null,
  distance_meters: row.distance_meters ? Math.round(row.distance_meters) : null,
  avg_hr: row.avg_hr_weight > 0 ? Math.round(row.avg_hr_sum / row.avg_hr_weight) : null,
  atl: row.atl,
  ctl: row.ctl,
  tsb: row.tsb,
});

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData?.user) return res.status(401).json({ error: "Invalid token" });
  const userId = authData.user.id;

  const athleteId = process.env.INTERVALS_ATHLETE_ID;
  const apiKey = process.env.INTERVALS_API_KEY;
  if (!athleteId || !apiKey) {
    return res.status(500).json({ error: "intervals_missing_env" });
  }

  const oldest = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const baseUrl = `https://intervals.icu/api/v1/athlete/${athleteId}`;

  try {
    const [wellnessRows, activityRows, fitnessRows] = await Promise.all([
      fetchIntervalsResource(baseUrl, apiKey, ["/wellness-bulk", "/wellness"], oldest),
      fetchIntervalsResource(baseUrl, apiKey, ["/activities"], oldest),
      fetchIntervalsResource(baseUrl, apiKey, ["/fitness", "/fitnesses", "/fitness-fatigue-form"], oldest),
    ]);

    const rowsByDate = buildDateMap(wellnessRows, activityRows, fitnessRows);
    if (rowsByDate.length === 0) {
      return res.status(200).json({
        success: true,
        synced: false,
        reason: "no_intervals_rows",
        last_synced_at: new Date().toISOString(),
      });
    }

    const syncedAt = new Date().toISOString();
    const latestDate = rowsByDate[0]?.date;
    const extendedRows = rowsByDate.map((row) => extendedUnifiedRow(userId, syncedAt, row, row.date === latestDate));

    let upsertError = null;
    const extendedUpsert = await supabase
      .from("unified_metrics")
      .upsert(extendedRows, { onConflict: "user_id,date,source" });
    upsertError = extendedUpsert.error || null;

    if (upsertError) {
      const baseRows = rowsByDate.map((row) => baseUnifiedRow(userId, syncedAt, row, row.date === latestDate));
      const fallback = await supabase
        .from("unified_metrics")
        .upsert(baseRows, { onConflict: "user_id,date,source" });
      if (fallback.error) {
        throw new Error(`unified_metrics_upsert_failed: ${fallback.error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      synced: true,
      user_id: userId,
      source: "intervals",
      rows_upserted: rowsByDate.length,
      wellness_count: wellnessRows.length,
      activity_count: activityRows.length,
      fitness_count: fitnessRows.length,
      latest_date: latestDate,
      last_synced_at: syncedAt,
      week_1_sat_hint: rowsByDate.find((r) => r.date === "2026-04-18")
        ? "metrics_found"
        : "no_metrics_for_week1_sat",
    });
  } catch (err) {
    console.error("[intervals/sync] error", err);
    return res.status(500).json({ error: "intervals_sync_failed", details: err.message });
  }
}
