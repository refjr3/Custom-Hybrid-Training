import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TARGET_USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc";
const REQUIRED_SECRET = "triad2026";

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const START_DATE = new Date("2026-04-13T12:00:00.000Z");

// STANDARD WEEKS (odd: 1,3,5,7,9,11)
const STANDARD_TEMPLATE = [
  { day: "MON", label: "HYROX + Plyos" },
  { day: "TUE", label: "Z2 Erg + Mobility" },
  { day: "WED", label: "Upper Heavy + Z2 Erg" },
  { day: "THU", label: "Z2 Run + Mobility" },
  { day: "FRI", label: "Upper Moderate" },
  { day: "SAT", label: "Threshold" },
  { day: "SUN", label: "Long Z2 Run" },
];

// BRICK WEEKS (even: 2,4,6,8,10,12)
const BRICK_TEMPLATE = [
  { day: "MON", label: "HYROX + Plyos" },
  { day: "TUE", label: "Z2 Run + Mobility" },
  { day: "WED", label: "Upper Heavy + Z2 Erg" },
  { day: "THU", label: "Z2 Run + Mobility" },
  { day: "FRI", label: "Upper Moderate" },
  { day: "SAT", label: "Track" },
  { day: "SUN", label: "20/20/20 Brick" },
];

const PHASE_LABELS = [
  { weeks: [1, 2, 3], label: "Base Rebuild", short: "BASE", block_id: "base_rebuild" },
  { weeks: [4, 5, 6], label: "Accumulation", short: "ACCUM", block_id: "accumulation" },
  { weeks: [7, 8, 9], label: "Intensification", short: "INTENS", block_id: "intensification" },
  { weeks: [10, 11, 12], label: "Peak & Test", short: "PEAK", block_id: "peak_test" },
];

const PLYOS = {
  base: "Plyos: Pogos 3×20, A-skips 3×20m, High knees 3×20m, Broad jumps 3×5",
  accum: "Plyos: Box jumps 4×5, Single leg bounds 3×6ea, Lateral hurdle hops 3×8, Bounding 3×20m",
  intens: "Plyos: Depth drops into sprint 4×4, Reactive single leg hops 3×8, Resisted bounds 3×10",
  peak: "Plyos: Box jumps 3×4 max effort, Broad jump into sprint 3×3 — full rest between sets",
  deload: "No plyos this week.",
};

const HYROX = {
  base: "HYROX: Light sled loads. Establish baseline. Technique focus. Full rig.",
  accum: "HYROX: Moderate-heavy loads. Add stations. Volume climbing.",
  intens: "HYROX: Heaviest loads. Full station complexity. Race intensity.",
  peak: "HYROX: Peak load. Maintain intensity. Log splits.",
  deload: "HYROX: Deload — cut volume 50%. Light loads only.",
};

const UPPER_HEAVY = {
  base: `Upper Heavy (establish baseline loads):
Barbell Floor Press 4×5
Weighted Pull-ups 4×5
Barbell Row 4×6
Landmine Press 3×8
Dips 3×10
Dead Hang 3×max
DB Lateral Raises 3×15
Then Z2 erg cap to strain target. Superset to keep under 60min.`,
  accum: `Upper Heavy (add load to all barbell movements):
Barbell Floor Press 4×5
Weighted Pull-ups 4×5
Barbell Row 4×6
Landmine Press 3×8
Dips 3×10
Dead Hang 3×max
DB Lateral Raises 3×15
Then Z2 erg cap to strain target. Superset to keep under 60min.`,
  intens: `Upper Heavy (max strength — heaviest loads):
Barbell Floor Press 4×5
Weighted Pull-ups 4×5
Barbell Row 4×6
Landmine Press 3×8
Weighted Dips 3×10
Dead Hang 3×max
DB Lateral Raises 3×15
Then Z2 erg cap to strain target. Superset to keep under 60min.`,
  peak: `Upper Heavy (maintain intensity):
Barbell Floor Press 4×5
Weighted Pull-ups 4×5
Barbell Row 4×6
Landmine Press 3×8
Weighted Dips 3×10
Dead Hang 3×max
DB Lateral Raises 3×15
Then Z2 erg cap to strain target. Superset to keep under 60min.`,
  deload: `Upper Heavy (deload — cut volume 50%):
Barbell Floor Press 2×5
Weighted Pull-ups 2×5
Barbell Row 2×6
Landmine Press 2×8
Then light Z2 erg cap. Under 40min total.`,
};

const UPPER_MODERATE = {
  base: `Upper Moderate (establish baseline):
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×30m
Band Pull-Aparts 3×20
DB Lateral Raises 3×15
No cardio. Done in 35min.`,
  accum: `Upper Moderate (add load, carry to 40m):
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×40m
Band Pull-Aparts 3×20
DB Lateral Raises 3×15
No cardio. Done in 35min.`,
  intens: `Upper Moderate (heaviest loads, carry to 50m):
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×50m
Band Pull-Aparts 3×20
DB Lateral Raises 3×15
No cardio. Done in 35min.`,
  peak: `Upper Moderate (maintain intensity):
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×50m
Band Pull-Aparts 3×20
DB Lateral Raises 3×15
No cardio. Done in 35min.`,
  deload: `Upper Moderate (deload — cut volume 50%):
KB Strict Press 2×10
Incline DB Bench 2×10
Single Arm KB Row 2×12
Farmers Carry 2×30m
No cardio. Done in 20min.`,
};

const SAT_SESSIONS = {
  1: { label: "Threshold", note: "Threshold Run W1 — establish baseline. 20-25min comfortably hard. Log avg HR and time." },
  2: { label: "Track", note: "Track W2 — intro session. 6×400m at race pace. Full rest between. Log all splits." },
  3: { label: "Threshold", note: "Threshold Run W3 — push duration vs W1. 25-30min. Log avg HR and time." },
  4: { label: "Track", note: "Track W4 — volume up. 8×400m or 4×800m at race pace. Log all splits." },
  5: { label: "Threshold", note: "Threshold Run W5 — extended duration. 30-35min. Log avg HR." },
  6: { label: "Track", note: "Track W6 — mixed pyramid. 400/800/1200/800/400 at race pace. Log splits." },
  7: { label: "Threshold", note: "Threshold Run W7 — hardest yet. 35min race effort. Log avg HR and time." },
  8: { label: "Track", note: "Track W8 — long reps. 3×1200m + 3×400m at race pace. Log vs W4." },
  9: { label: "Threshold", note: "Threshold Run W9 — peak effort. 35min. Log vs W7." },
  10: { label: "Track", note: "Track W10 — speed reserve. 10×400m fast. Log vs W6." },
  11: { label: "Threshold", note: "Threshold Run W11 — final quality session. 30min. Log vs W9." },
  12: { label: "Benchmark", note: "BENCHMARK W12 — track + threshold combo. Log EVERYTHING vs W1. Compare all splits." },
};

const SUNDAY = {
  standard: "Long Z2 Run — to WHOOP strain target. HR cap 133–148bpm strict. Walk if HR drifts. Green: full duration. Yellow: cut 30-40%. Red: full rest.",
  brick: "20/20/20 Brick — 20min Echo Bike Z2 → 20min Run Z2 → 20min SkiErg Z2. Order fixed. All at 133–148bpm. Green: full 60min. Yellow: cut each block 30-40%. Red: full rest.",
  deload: "Optional easy walk or full rest. No structured session this week.",
};

const WL_MAP = {
  "HYROX + Plyos": "FOR TIME — Hyrox Full Runs Half Stations",
  "Z2 Erg + Mobility": "ZONE 2 — Easy Aerobic",
  "Z2 Run + Mobility": "ZONE 2 — Easy Aerobic",
  "Upper Heavy + Z2 Erg": "STRENGTH A — Full Body Power",
  "Upper Moderate": "STRENGTH C — Upper Dominant",
  "Threshold": "THRESHOLD — 10x2 Min",
  "Track": "THRESHOLD — 10x2 Min",
  "Benchmark": "RACE SIMULATION — Full HYROX",
  "Long Z2 Run": "LONG RUN — Zone 2 Base",
  "20/20/20 Brick": "ZONE 2 — Easy Aerobic",
};

const getUtcDateForOffset = (weekNum, dayIndex = 0) => {
  const d = new Date(START_DATE);
  d.setUTCDate(d.getUTCDate() + ((weekNum - 1) * 7) + dayIndex);
  return d;
};

const fmtDateLabel = (d) =>
  d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

const fmtIsoDate = (d) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmtWeekRange = (weekNum) => {
  const weekStart = getUtcDateForOffset(weekNum, 0);
  const weekEnd = getUtcDateForOffset(weekNum, 6);
  return `${fmtDateLabel(weekStart)} – ${fmtDateLabel(weekEnd)}`;
};

const phaseKeyForWeek = (weekNum, isDeload) => (
  isDeload ? "deload" : weekNum <= 3 ? "base" : weekNum <= 6 ? "accum" : weekNum <= 9 ? "intens" : "peak"
);

const phaseObjForWeek = (weekNum) => (
  weekNum <= 3 ? PHASE_LABELS[0] : weekNum <= 6 ? PHASE_LABELS[1] : weekNum <= 9 ? PHASE_LABELS[2] : PHASE_LABELS[3]
);

const buildPlanRows = () => {
  const blocks = [];
  const weeks = [];
  const days = [];

  for (const phase of PHASE_LABELS) {
    blocks.push({
      user_id: TARGET_USER_ID,
      block_id: phase.block_id,
      phase: phase.label,
      label: phase.label,
    });
  }

  for (let weekNum = 1; weekNum <= 12; weekNum++) {
    const isOdd = weekNum % 2 !== 0;
    const isDeload = weekNum === 12;
    const phaseKey = phaseKeyForWeek(weekNum, isDeload);
    const phase = phaseObjForWeek(weekNum);
    const template = isOdd ? STANDARD_TEMPLATE : BRICK_TEMPLATE;
    const weekType = isOdd ? "STANDARD" : "BRICK";
    const phaseWeekIdx = (weekNum - 1) % 3;
    const phaseWeekOrder = phaseWeekIdx + 1;
    const weekSlug = `hyrox12_${phase.block_id}_w${phaseWeekOrder}`;

    weeks.push({
      user_id: TARGET_USER_ID,
      week_id: weekSlug,
      block_id: phase.block_id,
      label: `${phase.label.toUpperCase()} WK ${phaseWeekOrder}`,
      dates: fmtWeekRange(weekNum),
      phase: phase.label,
      subtitle: `Week ${weekNum} of 12 · ${weekType}`,
      week_order: weekNum,
    });

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayDate = getUtcDateForOffset(weekNum, dayIndex);
      const dateLabel = dayDate.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

      let sessionLabel = template[dayIndex].label;
      let sessionNote = "";

      switch (dayIndex) {
        case 0:
          sessionNote = `${HYROX[phaseKey]}\n${PLYOS[phaseKey]}`;
          break;
        case 1:
          sessionNote = isOdd
            ? "Z2 Erg + Mobility — Row, Ski or Echo Bike. Cap at WHOOP strain target. Dynamic mobility after."
            : "Z2 Run + Mobility — HR cap 133–148bpm. Static stretch after.";
          break;
        case 2:
          sessionNote = UPPER_HEAVY[phaseKey];
          break;
        case 3:
          sessionNote = "Z2 Run + Mobility — HR cap 133–148bpm strict. Static stretch after.";
          break;
        case 4:
          sessionNote = UPPER_MODERATE[phaseKey];
          break;
        case 5:
          sessionLabel = SAT_SESSIONS[weekNum].label;
          sessionNote = SAT_SESSIONS[weekNum].note;
          break;
        case 6:
          sessionNote = isDeload ? SUNDAY.deload : isOdd ? SUNDAY.standard : SUNDAY.brick;
          break;
        default:
          break;
      }

      const mappedSession = WL_MAP[sessionLabel] || null;
      const weekTypeNote = `\n\nWEEK TYPE: ${weekType}`;

      days.push({
        user_id: TARGET_USER_ID,
        week_id: weekSlug,
        day_name: DAY_NAMES[dayIndex],
        date_label: dateLabel,
        am_session: mappedSession,
        pm_session: null,
        am_session_custom: sessionLabel,
        pm_session_custom: null,
        note: `${sessionNote}${weekTypeNote}`,
        is_race_day: false,
        is_sunday: DAY_NAMES[dayIndex] === "SUN",
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
      blocks_seeded: blocks.length,
      weeks_seeded: weeks.length,
      days_seeded: days.length,
      start_date: fmtDateLabel(START_DATE),
      first_monday: fmtDateLabel(getUtcDateForOffset(1, 0)),
      first_monday_iso: fmtIsoDate(getUtcDateForOffset(1, 0)),
      week_1_range: fmtWeekRange(1),
      week_4_range: fmtWeekRange(4),
      phase_week_counts: PHASE_LABELS.reduce((acc, phase) => {
        acc[phase.label] = phase.weeks.length;
        return acc;
      }, {}),
    });
  } catch (err) {
    console.error("[plan/seed-12week] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
