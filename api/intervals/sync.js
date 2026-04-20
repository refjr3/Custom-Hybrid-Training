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

const resolveActivityName = (activity) =>
  (typeof activity?.name === "string" && activity.name.trim())
  || (typeof activity?.icu_name === "string" && activity.icu_name.trim())
  || activity?.activity_name
  || activity?.description
  || activity?.title
  || activity?.type
  || activity?.sportType
  || "Activity";

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

    const syncedAt = new Date().toISOString();

    const wellnessRows = (wellnessList || [])
      .map((wellness) => {
        const date = normalizeIntervalsDate(wellness?.id ?? wellness?.date);
        if (!date) return null;
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
      if (upsertError) {
        console.error("[intervals/sync] unified_metrics upsert details:", JSON.stringify(upsertError));
        throw new Error(`unified_metrics upsert: ${upsertError.message}`);
      }
      wellnessCount = wellnessRows.length;
    }

    const rawActivityPayloads = (activitiesList || [])
      .map((activity) => {
        const start = activity.start_date_local || activity.start_date || activity.start || null;
        const activityName = resolveActivityName(activity);
        const activitySource = normalizeActivitySource(activity.source || "intervals");
        const activityDate = normalizeIntervalsDate(activity.start_date_local || activity.start_date || start);
        const durationRaw =
          num(activity.moving_time ?? activity.elapsed_time ?? activity.duration) ?? 0;
        return {
          user_id: userId,
          activity_id: String(activity.id ?? activity.activity_id ?? ""),
          activity_type:
            activity.type || activity.sportType || activity.sport || activity.activityType || "workout",
          activity_name: activityName,
          name: activityName,
          date: activityDate,
          start_time: start,
          duration_seconds: Math.round(Number(durationRaw) || 0),
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
          || String(actErr.message || "").includes("date")
          || /Could not find the 'name' column/i.test(String(actErr.message || ""))
          || /column "name"/i.test(String(actErr.message || "")))
      ) {
        const msg = String(actErr.message || "");
        const errMsg = msg.toLowerCase();
        const missingActivityName = errMsg.includes("activity_name");
        const missingDate = errMsg.includes("date");
        const missingName =
          /Could not find the 'name' column/i.test(msg)
          || /column "name"/i.test(msg)
          || (errMsg.includes("'name'") && !errMsg.includes("activity_name"));
        if (missingName) {
          console.warn("[intervals/sync] retrying garmin_activities upsert without name (run migrations/024_garmin_activities_name.sql)");
        }
        const stripped = activityPayloads.map((row) => {
          const next = { ...row };
          if (missingActivityName) delete next.activity_name;
          if (missingDate) delete next.date;
          if (missingName) delete next.name;
          return next;
        });
        ({ data: actData, error: actErr } = await supabase
          .from("garmin_activities")
          .upsert(stripped, { onConflict: "activity_id" })
          .select("activity_id"));
      }
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
