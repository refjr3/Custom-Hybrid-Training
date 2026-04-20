import { createClient } from "@supabase/supabase-js";
import { getAccessTokenFromRequest } from "../lib/sessionToken.js";

function avg(arr) {
  const valid = arr.filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + Number(b), 0) / valid.length;
}

export async function computeBaselinesForUser(userId, supabase) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const { data: metrics } = await supabase
    .from("unified_metrics")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startStr)
    .lte("date", endStr);

  if (!metrics?.length) return null;

  const byDate = new Map();
  metrics.forEach((m) => {
    const existing = byDate.get(m.date) || {};
    byDate.set(m.date, {
      readiness_score: m.readiness_score ?? existing.readiness_score,
      hrv_rmssd: m.hrv_rmssd ?? existing.hrv_rmssd,
      resting_hr: m.resting_hr ?? existing.resting_hr,
      sleep_total_min: m.sleep_total_min ?? existing.sleep_total_min,
      sleep_score: m.sleep_score ?? existing.sleep_score,
      sleep_deep_min: m.sleep_deep_min ?? existing.sleep_deep_min,
      sleep_rem_min: m.sleep_rem_min ?? existing.sleep_rem_min,
      sleep_awake_min: m.sleep_awake_min ?? existing.sleep_awake_min,
      z2_minutes: (m.z2_minutes || 0) + (existing.z2_minutes || 0),
    });
  });

  const rows = Array.from(byDate.values());

  const weeklyZ2 = [];
  const sortedDates = Array.from(byDate.keys()).sort();
  for (let i = 0; i < sortedDates.length; i += 7) {
    const weekDates = sortedDates.slice(i, i + 7);
    const weekSum = weekDates.reduce((sum, d) => sum + (byDate.get(d)?.z2_minutes || 0), 0);
    if (weekSum > 0) weeklyZ2.push(weekSum);
  }

  const baselines = {
    user_id: userId,
    baseline_recovery_score: avg(rows.map((r) => r.readiness_score)),
    baseline_hrv_rmssd: avg(rows.map((r) => r.hrv_rmssd)),
    baseline_resting_hr: avg(rows.map((r) => r.resting_hr)),
    baseline_sleep_total_min: avg(rows.map((r) => r.sleep_total_min)),
    baseline_sleep_score: avg(rows.map((r) => r.sleep_score)),
    baseline_sleep_deep_min: avg(rows.map((r) => r.sleep_deep_min)),
    baseline_sleep_rem_min: avg(rows.map((r) => r.sleep_rem_min)),
    baseline_sleep_awake_min: avg(rows.map((r) => r.sleep_awake_min)),
    baseline_z2_weekly_min: avg(weeklyZ2),
    days_of_data: rows.length,
    computed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await supabase.from("user_baselines").upsert(baselines, { onConflict: "user_id" });

  return baselines;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "no_auth" });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "invalid" });

    const baselines = await computeBaselinesForUser(user.id, supabase);
    return res.status(200).json(baselines || { error: "no_data" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
