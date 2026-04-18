import { createClient } from "@supabase/supabase-js";
import { addCalendarDaysToIsoYmd } from "../../lib/getLocalToday.js";

// Priority waterfalls — user can override via source_preferences
const DEFAULT_PRIORITIES = {
  readiness: ["whoop", "oura", "garmin_body_battery", "apple_health", "manual"],
  hrv: ["whoop", "oura", "garmin", "apple_health"],
  resting_hr: ["whoop", "oura", "garmin", "apple_health"],
  sleep: ["oura", "whoop", "garmin", "apple_health", "manual"],
  activity: ["garmin", "strava", "apple_health", "manual"],
  z2_minutes: ["garmin", "strava", "apple_health", "plan_estimate"],
  body_weight: ["manual", "apple_health", "withings"],
};

const METRIC_FIELDS = {
  readiness: ["readiness_score", "readiness_color"],
  hrv: ["hrv_rmssd"],
  resting_hr: ["resting_hr"],
  sleep: [
    "sleep_total_min",
    "sleep_score",
    "sleep_deep_min",
    "sleep_rem_min",
    "sleep_light_min",
    "sleep_awake_min",
  ],
  activity: ["total_activity_min", "strain"],
  z2_minutes: ["z2_minutes"],
  body_weight: ["body_weight_kg"],
};

function normalizeDateKey(v) {
  if (v == null) return null;
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function resolveDay(date, sourceMap, prefs) {
  const row = { date, sources_used: {} };
  for (const [metric, priorities] of Object.entries(DEFAULT_PRIORITIES)) {
    const userPref = prefs[metric];
    const order = userPref
      ? [userPref, ...priorities.filter((p) => p !== userPref)]
      : priorities;

    for (const source of order) {
      const srcRow = sourceMap.get(source);
      if (!srcRow) continue;

      const fields = METRIC_FIELDS[metric];
      const hasData = fields.some(
        (f) => srcRow[f] !== null && srcRow[f] !== undefined
      );
      if (hasData) {
        for (const f of fields) row[f] = srcRow[f];
        row.sources_used[metric] = source;
        break;
      }
    }
  }
  return row;
}

export async function resolveMetrics(userId, date) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data: rows } = await supabase
    .from("unified_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("source_preferences, connected_sources")
    .eq("user_id", userId)
    .maybeSingle();

  const prefs = profile?.source_preferences || {};
  const sourceMap = new Map();
  (rows || []).forEach((r) => sourceMap.set(r.source, r));

  return resolveDay(date, sourceMap, prefs);
}

export async function resolveMetricsRange(userId, startDate, endDate) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data: rows } = await supabase
    .from("unified_metrics")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("source_preferences")
    .eq("user_id", userId)
    .maybeSingle();

  const prefs = profile?.source_preferences || {};

  const byDate = new Map();
  (rows || []).forEach((r) => {
    const dk = normalizeDateKey(r.date);
    if (!dk) return;
    if (!byDate.has(dk)) byDate.set(dk, new Map());
    byDate.get(dk).set(r.source, r);
  });

  const results = [];
  let d = startDate;
  while (d && d <= endDate) {
    const sourceMap = byDate.get(d) || new Map();
    results.push(resolveDay(d, sourceMap, prefs));
    const next = addCalendarDaysToIsoYmd(d, 1);
    if (!next || next === d) break;
    d = next;
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}
