import { createClient } from "@supabase/supabase-js";
import { getLocalToday, addCalendarDaysToIsoYmd } from "../../lib/getLocalToday.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const LOOKBACK_DAYS = 30;

const toIsoDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
};

const normalizeIntervalsDate = (value) => {
  if (!value) return null;
  // Intervals wellness ids are already YYYY-MM-DD and should be persisted as-is.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return toIsoDate(value);
};

const num = (v) => {
  if (v == null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeActivitySource = (value) => {
  const s = String(value || "").toLowerCase();
  if (s.includes("strava")) return "strava";
  if (s.includes("garmin")) return "garmin";
  return "intervals";
};

const sourcePriority = (source) => {
  if (source === "strava") return 2;
  if (source === "garmin") return 1;
  return 0;
};

const normalizeList = (body) => {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    if (Array.isArray(body.activities)) return body.activities;
    if (Array.isArray(body.wellness)) return body.wellness;
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

  const today = getLocalToday();
  const rangeOldest = addCalendarDaysToIsoYmd(today, -LOOKBACK_DAYS) || today;
  const base = `https://intervals.icu/api/v1/athlete/${athleteId}`;

  const fetchJson = async (path) => {
    const url = `${base}${path}?oldest=${encodeURIComponent(rangeOldest)}&newest=${encodeURIComponent(today)}`;
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
    const [wellnessList, activitiesList] = await Promise.all([
      fetchJson("/wellness"),
      fetchJson("/activities"),
    ]);

    console.log("[intervals/sync] wellness raw count:", (wellnessList || []).length);
    console.log("[intervals/sync] activities raw count:", (activitiesList || []).length);

    const syncedAt = new Date().toISOString();

    const wellnessRows = (wellnessList || [])
      .map((wellness) => {
        const date = normalizeIntervalsDate(wellness?.id ?? wellness?.date);
        if (!date) return null;
        if (date === today) {
          console.log("[intervals/sync] today wellness:", {
            date: wellness?.id ?? wellness?.date ?? null,
            readiness: wellness?.readiness ?? null,
            hrv: wellness?.hrv ?? null,
            restingHR: wellness?.restingHR ?? null,
            sleepScore: wellness?.sleepScore ?? null,
          });
        }
        const sleep_hours = wellness.sleepSecs ? wellness.sleepSecs / 3600 : null;
        const tsb =
          wellness.ctl != null && wellness.atl != null
            ? Number(wellness.ctl) - Number(wellness.atl)
            : null;
        return {
          user_id: userId,
          date,
          source: "intervals",
          is_primary: true,
          hrv: num(wellness.hrv),
          rhr: num(wellness.restingHR),
          recovery_score: num(wellness.readiness),
          sleep_hours: sleep_hours != null && Number.isFinite(sleep_hours) ? sleep_hours : null,
          sleep_score: num(wellness.sleepScore),
          training_load: num(wellness.atl),
          strain: num(wellness.atl),
          ctl: num(wellness.ctl),
          tsb: Number.isFinite(tsb) ? tsb : null,
          vo2_max: num(wellness.vo2max),
          intervals_synced_at: syncedAt,
        };
      })
      .filter(Boolean);

    let wellnessCount = 0;
    if (wellnessRows.length > 0) {
      console.log("[intervals/sync] wellness rows to upsert:", wellnessRows.length);
      console.log("[intervals/sync] sample row keys:", Object.keys(wellnessRows[0] || {}).sort().join(", "));
      let upsertData;
      let upsertError;
      ({ data: upsertData, error: upsertError } = await supabase
        .from("unified_metrics")
        .upsert(wellnessRows, { onConflict: "user_id,date,source" })
        .select("id"));
      if (
        upsertError
        && (upsertError.code === "42703" || String(upsertError.message || "").includes("sleep_score"))
      ) {
        console.warn("[intervals/sync] retrying unified_metrics upsert without sleep_score (column missing?)");
        const stripped = wellnessRows.map(({ sleep_score: _s, ...rest }) => rest);
        ({ data: upsertData, error: upsertError } = await supabase
          .from("unified_metrics")
          .upsert(stripped, { onConflict: "user_id,date,source" })
          .select("id"));
      }
      console.log(
        "[intervals/sync] unified_metrics upsert:",
        upsertError ? `ERROR ${upsertError.code || ""} ${upsertError.message}` : "success",
        "returned_rows:",
        Array.isArray(upsertData) ? upsertData.length : 0
      );
      if (upsertError) {
        console.error("[intervals/sync] unified_metrics upsert details:", JSON.stringify(upsertError));
        throw new Error(`unified_metrics upsert: ${upsertError.message}`);
      }
      wellnessCount = wellnessRows.length;
    } else {
      console.log("[intervals/sync] wellness rows to upsert: 0 (nothing to write)");
    }

    const rawActivityPayloads = (activitiesList || [])
      .map((activity) => {
        const start = activity.start_date_local || activity.start_date || activity.start || null;
        const activityName = activity.name || activity.type || "Activity";
        const activitySource = normalizeActivitySource(activity.source || "intervals");
        const activityDate = normalizeIntervalsDate(activity.start_date_local || activity.start_date || start);
        return {
          user_id: userId,
          activity_id: String(activity.id ?? activity.activity_id ?? ""),
          activity_type: activity.type || activity.sportType || "workout",
          activity_name: activityName,
          name: activityName,
          date: activityDate,
          start_time: start,
          duration_seconds: num(activity.elapsed_time ?? activity.moving_time ?? activity.duration) ?? 0,
          distance_meters: num(activity.distance ?? activity.distance_meters) ?? 0,
          avg_hr: num(activity.average_heartrate ?? activity.avg_hr ?? activity.averageHr),
          max_hr: num(activity.max_heartrate ?? activity.max_hr),
          calories: num(activity.calories ?? activity.kilojoules),
          source: activitySource,
          raw_data: activity,
        };
      })
      .filter((a) => a.activity_id);

    // If the same workout appears from multiple providers, keep the Strava copy.
    const dedupedBySession = new Map();
    for (const row of rawActivityPayloads) {
      const day = row.date || normalizeIntervalsDate(row.start_time) || "";
      const key = [
        day,
        String(row.activity_type || "").toLowerCase(),
        Math.round(Number(row.duration_seconds || 0)),
        Math.round(Number(row.distance_meters || 0)),
      ].join("|");
      const existing = dedupedBySession.get(key);
      if (!existing || sourcePriority(row.source) > sourcePriority(existing.source)) {
        dedupedBySession.set(key, row);
      }
    }
    const activityPayloads = Array.from(dedupedBySession.values());

    let activitiesCount = 0;
    if (activityPayloads.length > 0) {
      console.log("[intervals/sync] activity rows to upsert:", activityPayloads.length);
      let actData;
      let actErr;
      ({ data: actData, error: actErr } = await supabase
        .from("garmin_activities")
        .upsert(activityPayloads, { onConflict: "activity_id" })
        .select("activity_id"));
      if (
        actErr
        && (actErr.code === "42703"
          || String(actErr.message || "").includes("activity_name")
          || String(actErr.message || "").includes("date"))
      ) {
        // Backward compatible retry if the DB has not yet applied the new columns.
        const stripped = activityPayloads.map(({ activity_name: _n, date: _d, ...rest }) => rest);
        ({ data: actData, error: actErr } = await supabase
          .from("garmin_activities")
          .upsert(stripped, { onConflict: "activity_id" })
          .select("activity_id"));
      }
      console.log(
        "[intervals/sync] garmin_activities upsert:",
        actErr ? `ERROR ${actErr.code || ""} ${actErr.message}` : "success",
        "returned_rows:",
        Array.isArray(actData) ? actData.length : 0
      );
      if (actErr) {
        console.error("[intervals/sync] garmin_activities upsert details:", JSON.stringify(actErr));
        throw new Error(`garmin_activities upsert: ${actErr.message}`);
      }
      activitiesCount = activityPayloads.length;
    }

    return res.status(200).json({
      success: true,
      wellness_synced: wellnessCount,
      activities_synced: activitiesCount,
      date_range: `${rangeOldest} to ${today}`,
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
