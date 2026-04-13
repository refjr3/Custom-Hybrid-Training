import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const LOOKBACK_DAYS = 7;

const toIsoDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeList = (body) => {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    if (Array.isArray(body.activities)) return body.activities;
    if (Array.isArray(body.wellness)) return body.wellness;
    if (Array.isArray(body.fitness)) return body.fitness;
    if (Array.isArray(body.items)) return body.items;
    if (Array.isArray(body.results)) return body.results;
    return Object.entries(body).map(([key, val]) => {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        return { ...val, id: val.id ?? key };
      }
      return { id: key, value: val };
    });
  }
  return [];
};

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData?.user) return res.status(401).json({ error: "Invalid token" });
  const userId = authData.user.id;

  const athleteId = process.env.INTERVALS_ATHLETE_ID?.trim();
  const apiKey = process.env.INTERVALS_API_KEY?.trim();
  if (!athleteId || !apiKey) {
    return res.status(503).json({ error: "intervals_missing_env", success: false });
  }

  // Basic auth: username literal "API_KEY", password = the key value
  const auth = Buffer.from(`API_KEY:${apiKey}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  console.log("[intervals/sync] athleteId:", athleteId);
  console.log("[intervals/sync] apiKey present:", true, "length:", apiKey.length);

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const base = `https://intervals.icu/api/v1/athlete/${athleteId}`;

  const fetchJson = async (path) => {
    const url = `${base}${path}?oldest=${encodeURIComponent(sevenDaysAgo)}&newest=${encodeURIComponent(today)}`;
    const r = await fetch(url, { headers });
    const text = await r.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
    if (!r.ok) {
      const err = new Error(`Intervals ${path}: ${r.status} ${text?.slice(0, 200) || ""}`);
      err.status = r.status;
      throw err;
    }
    return normalizeList(body);
  };

  try {
    const [wellnessList, activitiesList, fitnessList] = await Promise.all([
      fetchJson("/wellness"),
      fetchJson("/activities"),
      fetchJson("/fitness"),
    ]);

    const fitnessByDate = new Map();
    for (const row of fitnessList) {
      const d = toIsoDate(row?.id ?? row?.date ?? row?.day);
      if (d) fitnessByDate.set(d, row);
    }

    const syncedAt = new Date().toISOString();

    const wellnessRows = (wellnessList || [])
      .map((wellness) => {
        const date = toIsoDate(wellness?.id ?? wellness?.date);
        if (!date) return null;
        const fit = fitnessByDate.get(date) || {};
        const sleepSecs = num(wellness.sleepSecs);
        return {
          user_id: userId,
          date,
          source: "intervals",
          is_primary: true,
          hrv: num(wellness.hrvSDNN ?? wellness.hrv),
          rhr: num(wellness.restingHR),
          sleep_hours: sleepSecs != null && sleepSecs > 0 ? sleepSecs / 3600 : null,
          recovery_score: num(wellness.score),
          training_load: num(wellness.atl),
          vo2_max: num(wellness.vo2max),
          atl: num(wellness.atl ?? fit.atl),
          ctl: num(fit.ctl ?? wellness.ctl),
          tsb: num(fit.tsb ?? fit.form ?? wellness.tsb),
          intervals_synced_at: syncedAt,
        };
      })
      .filter(Boolean);

    let wellnessCount = 0;
    if (wellnessRows.length > 0) {
      const { error: wErr } = await supabase
        .from("unified_metrics")
        .upsert(wellnessRows, { onConflict: "user_id,date,source" });
      if (wErr) throw new Error(`unified_metrics upsert: ${wErr.message}`);
      wellnessCount = wellnessRows.length;
    }

    const activityPayloads = (activitiesList || [])
      .map((activity) => {
        const start =
          activity.start_date_local || activity.start_date || activity.start || null;
        return {
          user_id: userId,
          activity_id: String(activity.id ?? activity.activity_id ?? ""),
          activity_type: activity.type || activity.sportType || "workout",
          name: activity.name || activity.type || "Activity",
          start_time: start,
          duration_seconds: Math.round(
            num(activity.elapsed_time ?? activity.moving_time ?? activity.duration) || 0
          ),
          distance_meters: num(activity.distance ?? activity.distance_meters) || 0,
          avg_hr: Math.round(
            num(activity.average_heartrate ?? activity.avg_hr ?? activity.averageHr) || 0
          ),
          max_hr: Math.round(num(activity.max_heartrate ?? activity.max_hr) || 0),
          calories: Math.round(num(activity.calories) || 0),
          source: "intervals",
          raw_data: activity,
        };
      })
      .filter((a) => a.activity_id);

    let activitiesCount = 0;
    if (activityPayloads.length > 0) {
      const { error: aErr } = await supabase
        .from("garmin_activities")
        .upsert(activityPayloads, { onConflict: "activity_id" });
      if (aErr) throw new Error(`garmin_activities upsert: ${aErr.message}`);
      activitiesCount = activityPayloads.length;
    }

    return res.status(200).json({
      success: true,
      wellness_synced: wellnessCount,
      activities_synced: activitiesCount,
      date_range: `${sevenDaysAgo} to ${today}`,
      last_synced_at: syncedAt,
    });
  } catch (err) {
    console.error("[intervals/sync]", err);
    return res.status(500).json({
      success: false,
      error: "intervals_sync_failed",
      details: err.message,
    });
  }
}
