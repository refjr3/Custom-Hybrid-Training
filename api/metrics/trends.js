import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DAY_MS = 86400000;

function isoDaysAgo(n) {
  const d = new Date(Date.now() - n * DAY_MS);
  return d.toISOString().split("T")[0];
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Banister-style EWMA: k = 1 - exp(-1/tau) */
function ewmaSeries(dailyLoadsAsc, tau) {
  const k = 1 - Math.exp(-1 / tau);
  let v = 0;
  const out = [];
  for (const load of dailyLoadsAsc) {
    const T = Number(load) || 0;
    v = v * (1 - k) + T * k;
    out.push(v);
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData?.user) return res.status(401).json({ error: "Invalid token" });
  const userId = authData.user.id;

  const cutoff = isoDaysAgo(60);

  const { data: rows, error: mErr } = await supabase
    .from("unified_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("source", "intervals")
    .gte("date", cutoff)
    .order("date", { ascending: true });

  if (mErr) {
    return res.status(500).json({ error: "metrics_query_failed", details: mErr.message });
  }

  const list = Array.isArray(rows) ? rows : [];
  const last42 = list.filter((r) => r?.date >= isoDaysAgo(42));

  const loadsAsc = last42.map((r) => num(r.training_load ?? r.strain ?? r.atl) ?? 0);
  const ctlSeries = ewmaSeries(loadsAsc, 42);
  const atlSeries = ewmaSeries(loadsAsc, 7);
  const n = ctlSeries.length;
  const ctl = n > 0 ? ctlSeries[n - 1] : 0;
  const atl = n > 0 ? atlSeries[n - 1] : 0;
  const tsb = ctl - atl;

  let tsbTone = "neutral";
  if (tsb > 0) tsbTone = "fresh";
  else if (tsb < -10) tsbTone = "fatigued";

  const byDate = new Map(list.map((r) => [String(r.date).slice(0, 10), r]));

  const sliceLast = (days) => {
    const start = isoDaysAgo(days - 1);
    return list.filter((r) => String(r.date).slice(0, 10) >= start);
  };

  const last30 = sliceLast(30);
  const hrv30 = last30.map((r) => {
    const d = String(r.date).slice(0, 10);
    const h = num(r.hrv);
    return { date: d, hrv: h };
  });

  const hrv7Rolling = hrv30.map((_, i) => {
    const slice = hrv30.slice(Math.max(0, i - 6), i + 1);
    const vals = slice.map((x) => x.hrv).filter((x) => x != null && Number.isFinite(x));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });
  const hrv30WithAvg = hrv30.map((row, i) => ({
    ...row,
    hrv7: hrv7Rolling[i] != null ? Math.round(hrv7Rolling[i] * 10) / 10 : null,
  }));

  const readiness30 = last30.map((r) => ({
    date: String(r.date).slice(0, 10),
    readiness: num(r.recovery_score),
  }));

  const last14 = sliceLast(14);
  const sleep14 = last14.map((r) => ({
    date: String(r.date).slice(0, 10),
    sleep_hours: num(r.sleep_hours),
    sleep_score: num(r.sleep_score),
  }));

  const rhr30 = last30.map((r) => ({
    date: String(r.date).slice(0, 10),
    rhr: num(r.rhr),
  }));

  const rhrVals = rhr30.map((r) => r.rhr).filter((x) => x != null && Number.isFinite(x));
  const minRhr = rhrVals.length ? Math.min(...rhrVals) : null;
  const rhrPrDates =
    minRhr == null
      ? []
      : rhr30.filter((r) => r.rhr != null && Number(r.rhr) === minRhr).map((r) => ({ date: r.date, value: r.rhr }));

  const vo2max30 = last30.map((r) => ({
    date: String(r.date).slice(0, 10),
    vo2_max: num(r.vo2_max),
  }));

  const { data: acts, error: aErr } = await supabase
    .from("garmin_activities")
    .select("activity_id, activity_type, name, start_time, duration_seconds, distance_meters, avg_hr, max_hr, calories, source")
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .limit(40);

  if (aErr) {
    return res.status(500).json({ error: "activities_query_failed", details: aErr.message });
  }

  const todayIso = new Date().toISOString().split("T")[0];
  const todayRow = byDate.get(todayIso);
  const currentHrv = num(todayRow?.hrv);

  return res.status(200).json({
    summary: {
      atl: Math.round(atl * 10) / 10,
      ctl: Math.round(ctl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      tsbTone,
    },
    current: {
      hrv: currentHrv,
    },
    hrv30: hrv30WithAvg,
    readiness30,
    sleep14,
    rhr30,
    rhrPrDates,
    vo2max30,
    activities: acts || [],
  });
}
