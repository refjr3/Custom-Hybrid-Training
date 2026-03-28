import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TARGET_USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc";
const REQUIRED_SECRET = "triad2026";

const SESSION_MAP = {
  HYROX: "FOR TIME — Hyrox Full Runs Half Stations",
  "Z2 Erg + Mobility": "ZONE 2 — Easy Aerobic",
  "Upper + Z2 Erg Cap": "STRENGTH C — Upper Dominant",
  "Z2 Run + Mobility": "ZONE 2 — Easy Aerobic",
  "Upper Body": "STRENGTH C — Upper Dominant",
  Track: "THRESHOLD — 10x2 Min",
  Threshold: "TEMPO — 20 Min Sustained",
  Benchmark: "RACE SIMULATION — Full HYROX",
  "Long Z2 Run": "LONG RUN — Zone 2 Base",
};

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const PHASES = [
  { id: 0, weeks: [1, 2, 3], block_id: "base_rebuild", label: "Base Rebuild", short: "BASE", color: "#38bdf8", desc: "Re-establish aerobic floor post-Miami. Light HYROX loads, strict Z2 discipline." },
  { id: 1, weeks: [4, 5, 6], block_id: "accumulation", label: "Accumulation", short: "ACCUM", color: "#a3e635", desc: "Volume and HYROX loads climb. Track work introduced. Building the engine." },
  { id: 2, weeks: [7, 8, 9], block_id: "intensification", label: "Intensification", short: "INTENS", color: "#fb923c", desc: "Heavier sleds, faster track, harder threshold sessions. Fatigue managed strictly." },
  { id: 3, weeks: [10, 11, 12], block_id: "peak_test", label: "Peak & Test", short: "PEAK", color: "#f43f5e", desc: "W10-11 max load. W12 deload + full benchmark. Compare everything to Week 1." },
];

const phaseFor = (w) => (w <= 3 ? 0 : w <= 6 ? 1 : w <= 9 ? 2 : 3);

const START_DATE = new Date(2026, 3, 13); // April 13, 2026 — month is 0-indexed

const addDays = (date, days) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const fmtDateLabel = (d) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const fmtWeekRange = (start, end) => `${fmtDateLabel(start)}–${fmtDateLabel(end)}`;

const getWeekStartDate = (weekNum) => addDays(START_DATE, (weekNum - 1) * 7);
const getDayDate = (weekNum, dayIndex) => fmtDateLabel(addDays(getWeekStartDate(weekNum), dayIndex));

const HYROX_ROTATION = [
  "Sled push/pull, compromised running, wall ball finisher",
  "Ski + run intervals, compromised running, wall ball finisher",
  "Sled push/pull, sandbag lunges, wall ball finisher",
  "Ski + row engine work, compromised running, wall ball finisher",
  "Sled push/pull, farmers carry, sandbag lunges, wall ball finisher",
  "Full race simulation — all stations in order, log every split",
];

const SAT_EVEN = [
  "Track: speed work at race pace",
  "Track: race pace intervals, longer reps",
  "Track: mixed pyramid at race pace",
  "Track: race pace + speed reserve work",
  "Track: extended race pace reps",
  "Track benchmark — log all splits vs Week 2",
];

const SAT_ODD = [
  "Threshold run at comfortably hard effort",
  "Threshold erg + run combo",
  "Threshold run, extended duration",
  "Threshold erg intervals + run",
  "Threshold run at race pace effort",
  "Threshold benchmark — log time vs Week 1",
];

const buildWeek = (w) => {
  const p = phaseFor(w);
  const isDeload = w === 12;
  const hyrox = HYROX_ROTATION[Math.min(Math.floor((w - 1) / 2), 5)];
  const satSession = w % 2 === 0
    ? SAT_EVEN[Math.min(Math.floor((w - 1) / 2), 5)]
    : SAT_ODD[Math.min(Math.floor((w - 1) / 2), 5)];
  const satLabel = w % 2 === 0 ? "Track" : "Threshold";

  return {
    week: w,
    phase: p,
    days: [
      {
        day: "MON", label: "HYROX",
        detail: isDeload ? "HYROX: full race simulation — log all splits" : `HYROX: ${hyrox}`,
        green: "Full session, full load.",
        yellow: "Reduce rounds by one. Keep all stations.",
        red: "Full rest.",
      },
      {
        day: "TUE", label: "Z2 Erg + Mobility",
        detail: "Z2 erg to WHOOP strain target — SkiErg / Echo Bike / Row. Dynamic mobility after.",
        green: "Erg to strain target. HR ceiling strict.",
        yellow: "Cut 30–40% short of strain target.",
        red: "Full rest.",
      },
      {
        day: "WED", label: "Upper + Z2 Erg Cap",
        detail: "Upper body lift. Cap with Z2 erg to strain target — SkiErg / Echo Bike / Row. Legs off the floor.",
        green: "Full lift + Z2 cap to strain.",
        yellow: "Full lift. Skip Z2 cap.",
        red: "Full rest.",
      },
      {
        day: "THU", label: "Z2 Run + Mobility",
        detail: "Z2 run to WHOOP strain target. HR ceiling 133–148bpm strict. Static stretch after.",
        green: "Run to strain target. Walk if HR drifts.",
        yellow: "Cut 30–40% short of strain target. Same HR ceiling.",
        red: "Full rest.",
      },
      {
        day: "FRI", label: "Upper Body",
        detail: "Upper body lift only. No cardio. Legs arrive Saturday fresh.",
        green: "Full session.",
        yellow: "Reduce volume 20%. Drop accessories.",
        red: "Full rest.",
      },
      {
        day: "SAT", label: isDeload ? "Benchmark" : satLabel,
        detail: isDeload ? "Benchmark: track + threshold combo. Log everything vs Week 1." : satSession,
        green: "Full output. 5 days from HYROX — take it.",
        yellow: "Convert to Z2 run. Don't force quality on yellow.",
        red: "Full rest.",
      },
      {
        day: "SUN", label: "Long Z2 Run",
        detail: "Long Z2 run to WHOOP strain target. HR ceiling 133–148bpm. Walk breaks as needed.",
        green: "Full duration to strain target.",
        yellow: "Cut 30–40% short. Same HR ceiling.",
        red: "Full rest.",
      },
    ],
  };
};

const WEEKS = Array.from({ length: 12 }, (_, i) => buildWeek(i + 1));

const buildPlanRows = () => {
  const blocks = [];
  const weeks = [];
  const days = [];

  for (const phase of PHASES) {
    blocks.push({
      user_id: TARGET_USER_ID,
      block_id: phase.block_id,
      phase: phase.label,
      label: phase.label,
    });
  }

  for (const weekData of WEEKS) {
    const weekNum = weekData.week;
    const phase = PHASES[weekData.phase];
    const weekStart = getWeekStartDate(weekNum);
    const weekEnd = addDays(weekStart, 6);
    const phaseWeekIdx = (weekNum - 1) % 3;
    const phaseWeekOrder = phaseWeekIdx + 1;
    const weekSlug = `hyrox12_${phase.block_id}_w${phaseWeekOrder}`;

    weeks.push({
      user_id: TARGET_USER_ID,
      week_id: weekSlug,
      block_id: phase.block_id,
      label: `${phase.label.toUpperCase()} WK ${phaseWeekOrder}`,
      dates: fmtWeekRange(weekStart, weekEnd),
      phase: phase.label,
      subtitle: `Week ${weekNum} of 12`,
      week_order: weekNum,
    });

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dayPlan = weekData.days[dayIdx];
      const mappedSession = SESSION_MAP[dayPlan.label] || null;
      days.push({
        user_id: TARGET_USER_ID,
        week_id: weekSlug,
        day_name: DAY_NAMES[dayIdx],
        date_label: getDayDate(weekNum, dayIdx),
        am_session: mappedSession,
        pm_session: null,
        // Exact detail text from HyroxPlan buildWeek() output
        am_session_custom: dayPlan.detail,
        pm_session_custom: null,
        // Use GREEN guidance text from HyroxPlan
        note: dayPlan.green,
        is_race_day: false,
        is_sunday: DAY_NAMES[dayIdx] === "SUN",
        ai_modified: false,
        ai_modification_note: null,
      });
    }
  }

  return { blocks, weeks, days };
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (req.query?.secret !== REQUIRED_SECRET) return res.status(403).json({ error: "Forbidden" });

  try {
    const { blocks, weeks, days } = buildPlanRows();

    const { error: delDaysErr } = await supabase.from("training_days").delete().eq("user_id", TARGET_USER_ID);
    if (delDaysErr) throw new Error(`Failed clearing training_days: ${delDaysErr.message}`);

    const { error: delWeeksErr } = await supabase.from("training_weeks").delete().eq("user_id", TARGET_USER_ID);
    if (delWeeksErr) throw new Error(`Failed clearing training_weeks: ${delWeeksErr.message}`);

    const { error: delBlocksErr } = await supabase.from("training_blocks").delete().eq("user_id", TARGET_USER_ID);
    if (delBlocksErr) throw new Error(`Failed clearing training_blocks: ${delBlocksErr.message}`);

    const { error: blockErr } = await supabase.from("training_blocks").insert(blocks);
    if (blockErr) throw new Error(`Failed inserting training_blocks: ${blockErr.message}`);

    const { error: weekErr } = await supabase.from("training_weeks").insert(weeks);
    if (weekErr) throw new Error(`Failed inserting training_weeks: ${weekErr.message}`);

    const { error: dayErr } = await supabase.from("training_days").insert(days);
    if (dayErr) throw new Error(`Failed inserting training_days: ${dayErr.message}`);

    return res.status(200).json({
      success: true,
      user_id: TARGET_USER_ID,
      blocks_inserted: blocks.length,
      weeks_inserted: weeks.length,
      days_inserted: days.length,
      start_date: fmtDateLabel(START_DATE),
    });
  } catch (err) {
    console.error("[plan/seed-12week] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

