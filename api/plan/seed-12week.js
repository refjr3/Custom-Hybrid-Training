import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TARGET_USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc";
const REQUIRED_SECRET = "triad2026";

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const WEEKLY_TEMPLATE = [
  { day: "MON", label: "HYROX", note: "Full rig available. Sleds, lunges, wall balls." },
  { day: "TUE", label: "Z2 Erg/Echo + Mobility", note: "Row, Ski or Echo Bike. Cap at WHOOP strain target. HR 133-148 bpm. Dynamic mobility after." },
  { day: "WED", label: "Upper Lift + Z2 Run", note: "Upper body lift followed by Z2 run. Cap at WHOOP strain target." },
  { day: "THU", label: "Z2 Echo Bike", note: "Echo Bike only. Cap at WHOOP strain target. HR ceiling strict." },
  { day: "FRI", label: "Upper Lift + Recovery", note: "Upper body lift. Focused recovery work after — mobility, soft tissue, breathwork." },
  { day: "SAT", label: "Threshold/Track", note: "Quality session. Full send or skip on yellow WHOOP." },
  { day: "SUN", label: "Long Run", note: "Optional — full rest or long Z2 run. HR 133-148 bpm. Your call based on feel." },
];

const PHASES = [
  { label: "Base Rebuild", weeks: [1, 2, 3], short: "BASE", block_id: "base_rebuild" },
  { label: "Accumulation", weeks: [4, 5, 6], short: "ACCUM", block_id: "accumulation" },
  { label: "Intensification", weeks: [7, 8, 9], short: "INTENS", block_id: "intensification" },
  { label: "Peak & Test", weeks: [10, 11, 12], short: "PEAK", block_id: "peak_test" },
];

const SAT_SESSIONS = {
  1: { label: "Threshold Run", note: "Comfortably hard continuous effort. 20-35 min at threshold HR." },
  2: { label: "Track Workout", note: "Structured intervals at race pace. Log all splits." },
  3: { label: "Threshold Run", note: "Extended threshold. Push duration vs Week 1." },
  4: { label: "Track Workout", note: "Race pace intervals. Longer reps than Week 2." },
  5: { label: "Threshold Run", note: "Threshold + tempo combo. Build duration." },
  6: { label: "Track Workout", note: "Mixed track session. Speed reserve work." },
  7: { label: "Threshold Run", note: "Hard threshold. Race effort for 25-35 min." },
  8: { label: "Track Workout", note: "Fast track intervals. Log vs Week 4." },
  9: { label: "Threshold Run", note: "Race pace threshold. Peak effort." },
  10: { label: "Track Workout", note: "Speed work. Race pace + above." },
  11: { label: "Threshold Run", note: "Final threshold before deload. Log time." },
  12: { label: "Benchmark", note: "BENCHMARK WEEK — log all splits vs Week 1. Track + threshold combo. Compare everything." },
};

const HYROX_NOTES = {
  base: "Your session. Sled push/pull, lunges, wall balls. Technique focus, moderate loads.",
  accum: "Your session. Sled push/pull, lunges, wall balls. Loads climbing, more rounds.",
  intens: "Your session. Sled push/pull, lunges, wall balls. Heavy loads, race intensity.",
  peak: "Your session. Sled push/pull, lunges, wall balls. Race simulation loads. Log splits.",
  benchmark: "BENCHMARK — log all splits vs Week 1.",
};

const SESSION_MAP = {
  HYROX: "FOR TIME — Hyrox Full Runs Half Stations",
  "Z2 Erg/Echo + Mobility": "ZONE 2 — Easy Aerobic",
  "Upper Lift + Z2 Run": "STRENGTH C — Full Body Hybrid",
  "Z2 Echo Bike": "ZONE 2 — Easy Aerobic",
  "Upper Lift + Recovery": "STRENGTH C — Full Body Hybrid",
  "Threshold Run": "TEMPO — 20 Min Sustained",
  "Track Workout": "THRESHOLD — 10×2 Min",
  Benchmark: "THRESHOLD — 10×2 Min",
  "Long Run": "LONG RUN — Base Builder",
};

const START_DATE = new Date("2026-04-13T12:00:00.000Z");

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

const phaseKeyForWeek = (weekNum) => (
  weekNum <= 3 ? "base" : weekNum <= 6 ? "accum" : weekNum <= 9 ? "intens" : "peak"
);

const phaseObjForWeek = (weekNum) => (
  weekNum <= 3 ? PHASES[0] : weekNum <= 6 ? PHASES[1] : weekNum <= 9 ? PHASES[2] : PHASES[3]
);

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

  for (let weekNum = 1; weekNum <= 12; weekNum++) {
    const phaseKey = phaseKeyForWeek(weekNum);
    const phase = phaseObjForWeek(weekNum);
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
      subtitle: `Week ${weekNum} of 12`,
      week_order: weekNum,
    });

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const template = { ...WEEKLY_TEMPLATE[dayIndex] };

      // Saturday on odd weeks is HYROX Motion group class.
      // Even weeks keep the programmed quality (track) session.
      if (dayIndex === 5 && weekNum % 2 === 1) {
        template.label = "HYROX Motion";
        template.note = "Group class — coach-led. Just show up and work.";
      }

      // Override Saturday session by week (for non-Motion Saturdays)
      if (dayIndex === 5) {
        if (template.label !== "HYROX Motion") {
          template.label = SAT_SESSIONS[weekNum].label;
          template.note = SAT_SESSIONS[weekNum].note;
        }
      }

      // Override Monday HYROX note by phase
      if (dayIndex === 0) {
        template.note = weekNum === 12 ? HYROX_NOTES.benchmark : HYROX_NOTES[phaseKey];
      }

      const dayDate = getUtcDateForOffset(weekNum, dayIndex);
      const dateLabel = dayDate.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
      const mappedSession = SESSION_MAP[template.label] || null;

      days.push({
        user_id: TARGET_USER_ID,
        week_id: weekSlug,
        day_name: DAY_NAMES[dayIndex],
        date_label: dateLabel,
        am_session: mappedSession,
        pm_session: null,
        am_session_custom: template.label,
        pm_session_custom: null,
        note: template.note,
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
      phase_week_counts: PHASES.reduce((acc, phase) => {
        acc[phase.label] = phase.weeks.length;
        return acc;
      }, {}),
    });
  } catch (err) {
    console.error("[plan/seed-12week] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

