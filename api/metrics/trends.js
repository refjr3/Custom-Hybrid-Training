import { createClient } from "@supabase/supabase-js";
import {
  getLocalToday,
  formatEasternYmdFromDate,
  addCalendarDaysToIsoYmd,
} from "../../lib/getLocalToday.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DAY_ORDER = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };

function isoDaysAgo(n) {
  const today = getLocalToday();
  return today ? addCalendarDaysToIsoYmd(today, -n) : null;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function dateLabelToIso(dateLabel) {
  if (!dateLabel || typeof dateLabel !== "string") return null;
  const y = parseInt(String(getLocalToday() || "").slice(0, 4), 10) || new Date().getFullYear();
  const parsed = new Date(`${dateLabel.trim()} ${y}`);
  if (!Number.isFinite(parsed.getTime())) return null;
  return formatEasternYmdFromDate(parsed);
}

function parseIsoYmd(iso) {
  if (!iso || typeof iso !== "string") return null;
  const [yy, mm, dd] = iso.split("-").map(Number);
  if (!yy || !mm || !dd) return null;
  const dt = new Date(yy, mm - 1, dd);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

/** Monday (YYYY-MM-DD) of the calendar week containing `iso` (Mon–Sun, local). */
function mondayOfCalendarWeekContainingIso(iso) {
  const d = parseIsoYmd(iso);
  if (!d) return null;
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sundayAfterMondayIso(monIso) {
  const d = parseIsoYmd(monIso);
  if (!d) return null;
  d.setDate(d.getDate() + 6);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function activityDateIso(a) {
  if (!a?.start_time) return null;
  return String(a.start_time).slice(0, 10);
}

function fmtMmSs(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function fmtShortDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00Z`);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isPlannedTrainingDay(day) {
  return !!(
    day.am_session
    || day.pm_session
    || day.am_session_custom
    || day.pm_session_custom
  );
}

function plannedLabel(day) {
  if (day.am_session_custom) return String(day.am_session_custom).split("\n")[0].slice(0, 48);
  if (day.pm_session_custom) return String(day.pm_session_custom).split("\n")[0].slice(0, 48);
  return day.am_session || day.pm_session || "";
}

function isRunActivity(a) {
  const t = String(a?.activity_type || "").toLowerCase().replace(/\s/g, "");
  return ["run", "trailrun", "virtualrun", "running", "trailrunning", "treadmillrunning"].includes(t)
    || t.includes("run");
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

function findCurrentWeekDayRows(dayRows, todayIso) {
  if (!Array.isArray(dayRows) || !dayRows.length) return [];
  const weekMon = mondayOfCalendarWeekContainingIso(todayIso);
  const weekSun = weekMon ? sundayAfterMondayIso(weekMon) : null;
  if (!weekMon || !weekSun) return [];

  const byWeek = new Map();
  for (const d of dayRows) {
    const wid = d.week_id || "_";
    if (!byWeek.has(wid)) byWeek.set(wid, []);
    byWeek.get(wid).push(d);
  }
  let chosen = null;
  for (const [, days] of byWeek) {
    const isos = days.map((x) => dateLabelToIso(x.date_label)).filter(Boolean);
    if (!isos.length) continue;
    if (isos.some((iso) => iso >= weekMon && iso <= weekSun)) {
      chosen = days;
      break;
    }
  }
  if (!chosen) return [];
  return [...chosen].sort(
    (a, b) => (DAY_ORDER[a.day_name] ?? 99) - (DAY_ORDER[b.day_name] ?? 99)
  );
}

function buildComplianceWeek(currentWeekDays, activities, todayIso) {
  const today = todayIso || getLocalToday();
  const rows = (currentWeekDays || []).map((day) => {
    const date_iso = dateLabelToIso(day.date_label);
    const planned = isPlannedTrainingDay(day);
    const activity = activities.find((a) => activityDateIso(a) === date_iso);
    const completed = Boolean(activity);
    const duration_min =
      activity?.duration_seconds != null
        ? Math.round(Number(activity.duration_seconds) / 60)
        : null;
    return {
      day: day.day_name,
      date_iso,
      planned,
      planned_label: plannedLabel(day) || null,
      actual: activity?.activity_type || null,
      completed,
      duration: duration_min,
    };
  });

  const days = rows.map((d) => {
    if (!d.date_iso) {
      return { ...d, status: "rest" };
    }
    if (d.date_iso > today) {
      return { ...d, status: "future" };
    }
    if (d.date_iso < today && d.planned && !d.completed) {
      return { ...d, status: "missed" };
    }
    if (d.completed) {
      return { ...d, status: "completed" };
    }
    if (!d.planned) {
      return { ...d, status: "rest" };
    }
    return { ...d, status: "pending" };
  });

  const pastPlanned = days.filter((x) => x.date_iso && x.date_iso < today && x.planned);
  const pastPlannedDone = days.filter((x) => x.date_iso && x.date_iso < today && x.planned && x.completed);
  const percent =
    pastPlanned.length > 0 ? Math.round((pastPlannedDone.length / pastPlanned.length) * 100) : null;

  let insight = "Add a plan and log activities to see compliance.";
  if (pastPlanned.length === 0) {
    insight = "Week just started. First session coming up.";
  } else if (percent === 100) {
    insight = "Perfect so far. Stay the course.";
  } else if (percent >= 70) {
    insight = "On track. Don't let the week slip.";
  } else if (percent >= 40) {
    insight = "Falling behind. Prioritize quality sessions.";
  } else {
    insight = "Rough week. Focus on what's left.";
  }

  return { percent, days, insight };
}

function buildPersonalRecords(activities, unifiedAll) {
  const runs = (activities || []).filter(isRunActivity);
  const byDuration = (a, b) => Number(a.duration_seconds) - Number(b.duration_seconds);

  const fastest5k = [...runs]
    .filter((a) => a.distance_meters >= 4800 && a.distance_meters <= 5200)
    .sort(byDuration)[0];
  const fastest10k = [...runs]
    .filter((a) => a.distance_meters >= 9800 && a.distance_meters <= 10200)
    .sort(byDuration)[0];
  const longestRun = [...runs].sort((a, b) => Number(b.distance_meters) - Number(a.distance_meters))[0];

  const um = Array.isArray(unifiedAll) ? unifiedAll : [];
  const hrvRows = um.filter((m) => num(m.hrv) != null);
  const bestHrv = [...hrvRows].sort((a, b) => num(b.hrv) - num(a.hrv))[0];
  const rhrRows = um.filter((m) => num(m.rhr) != null && num(m.rhr) > 30);
  const lowestRhr = [...rhrRows].sort((a, b) => num(a.rhr) - num(b.rhr))[0];

  const rows = [
    {
      key: "fastest_5k",
      label: "FASTEST 5K",
      value: fastest5k ? fmtMmSs(fastest5k.duration_seconds) : null,
      sub: fastest5k ? fmtShortDate(activityDateIso(fastest5k)) : null,
    },
    {
      key: "fastest_10k",
      label: "FASTEST 10K",
      value: fastest10k ? fmtMmSs(fastest10k.duration_seconds) : null,
      sub: fastest10k ? fmtShortDate(activityDateIso(fastest10k)) : null,
    },
    {
      key: "longest_run",
      label: "LONGEST RUN",
      value: longestRun
        ? `${(Number(longestRun.distance_meters) / 1000).toFixed(1)}km`
        : null,
      sub: longestRun ? fmtShortDate(activityDateIso(longestRun)) : null,
    },
    {
      key: "best_hrv",
      label: "BEST HRV",
      value: bestHrv ? `${Math.round(num(bestHrv.hrv) * 10) / 10}ms` : null,
      sub: bestHrv ? fmtShortDate(String(bestHrv.date).slice(0, 10)) : null,
    },
    {
      key: "lowest_rhr",
      label: "LOWEST RHR",
      value: lowestRhr ? `${Math.round(num(lowestRhr.rhr))}bpm` : null,
      sub: lowestRhr ? fmtShortDate(String(lowestRhr.date).slice(0, 10)) : null,
    },
  ];

  return rows.map((r) => ({
    ...r,
    displayValue: r.value != null ? r.value : "—",
    displaySub: r.value != null ? r.sub : "sync more activities",
  }));
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
  const todayIso = getLocalToday();

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
    .limit(180);

  if (aErr) {
    return res.status(500).json({ error: "activities_query_failed", details: aErr.message });
  }

  const activities = (acts || []).map((a) => ({
    ...a,
    date: activityDateIso(a),
  }));

  const { data: dayRows, error: dErr } = await supabase
    .from("training_days")
    .select("week_id, day_name, date_label, am_session, pm_session, am_session_custom, pm_session_custom")
    .eq("user_id", userId);

  if (dErr) {
    return res.status(500).json({ error: "training_days_query_failed", details: dErr.message });
  }

  const currentWeekDayRows = findCurrentWeekDayRows(dayRows || [], todayIso);
  const complianceWeek = buildComplianceWeek(currentWeekDayRows, activities, todayIso);

  const { data: allMetrics, error: uAllErr } = await supabase
    .from("unified_metrics")
    .select("date, hrv, rhr, source")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(400);

  if (uAllErr) {
    return res.status(500).json({ error: "unified_metrics_all_query_failed", details: uAllErr.message });
  }

  const personalRecordRows = buildPersonalRecords(activities, allMetrics || []);

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
    activities,
    complianceWeek,
    personalRecordRows,
  });
}
