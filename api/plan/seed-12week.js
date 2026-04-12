import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const START_DATE = new Date("2026-04-13T12:00:00.000Z");
const USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc";
const SECRET = "triad2026";

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const TEMPLATE_A = [
  "MON — HYROX + Plyos",
  "TUE — Z2 Erg + Mobility",
  "WED — Full Body Lift + Z2 Erg",
  "THU — Z2 Run + Mobility + Core",
  "FRI — Upper Moderate",
  "SAT — Threshold/Track",
  "SUN — Long Z2 Run (optional)",
];

const TEMPLATE_B = [
  "MON — Z2 Erg + Mobility",
  "TUE — Threshold/Track",
  "WED — Z2 Run + Mobility + Core",
  "THU — Full Body Lift + Z2 Erg",
  "FRI — Upper Moderate",
  "SAT — HYROX Motion",
  "SUN — 20/20/20 Brick (optional)",
];

const BLOCKS = [
  { label: "Base Rebuild", short: "BASE", phase: "base", order: 1, weeks: [1, 2, 3] },
  { label: "Accumulation", short: "ACCUM", phase: "accum", order: 2, weeks: [4, 5, 6] },
  { label: "Intensification", short: "INTENS", phase: "intens", order: 3, weeks: [7, 8, 9] },
  { label: "Peak & Test", short: "PEAK", phase: "peak", order: 4, weeks: [10, 11, 12] },
];

const BLOCK_ID_BY_PHASE = {
  "Base Rebuild": "base_rebuild",
  "Accumulation": "accumulation",
  "Intensification": "intensification",
  "Peak & Test": "peak_test",
};

const HYROX_SESSION = {
  base: `HYROX + PLYOS — Phase 1
HYROX: Light sled loads. Technique focus. Sleds, lunges, wall balls. Full rig.
PLYOS: Pogos 3×20, A-skips 3×20m, High knees 3×20m, Broad jumps 3×5`,

  accum: `HYROX + PLYOS — Phase 2
HYROX: Moderate-heavy loads. Add stations. Volume climbing.
PLYOS: Box jumps 4×5, Single leg bounds 3×6ea, Lateral hurdle hops 3×8, Bounding 3×20m`,

  intens: `HYROX + PLYOS — Phase 3
HYROX: Heaviest loads. Full station complexity. Race intensity.
PLYOS: Depth drops into sprint 4×4, Reactive single leg hops 3×8, Resisted bounds 3×10`,

  peak: `HYROX + PLYOS — Phase 4
HYROX: Race simulation loads. Log every split.
PLYOS: Box jumps 3×4 max effort, Broad jump into sprint 3×3 — full rest between sets`,

  deload: `HYROX — Deload Week
Cut all volume 50%. Light loads only. No plyos.`,
};

const FULL_BODY = {
  base: `FULL BODY + Z2 ERG — Phase 1 (under 80min total)

LOWER (25min):
RDL 3×8 @ 60-65% — controlled descent, full hip hinge
Bulgarian Split Squat DB 3×8ea — moderate weight, full range
Single Leg Glute Bridge 3×12ea — bodyweight
Force Absorption Drop to Split Squat 3×5ea — bodyweight
Single Leg Bent Knee Calf Raise 3×15ea — bodyweight, slow
Standing Weighted Calf Raise 3×20 — light load
Squat Hold Calf Raise 3×12 — pole overhead, squat position, rise to toes

UPPER (35min):
Barbell Floor Press 4×5
Weighted Pull-ups 4×5
Barbell Row 4×6
Landmine Press 3×8
Dips 3×10
Dead Hang 3×max
DB Lateral Raises 3×15

Then Z2 erg cap to strain target. Superset upper block to stay under 80min.`,

  accum: `FULL BODY + Z2 ERG — Phase 2 (under 80min total)

LOWER (25min):
RDL 3×8 — add load vs Phase 1
Bulgarian Split Squat DB 3×8ea — add load
DB Step Ups 3×10ea
Force Absorption Drop to Split Squat 3×6ea — light load
Single Leg Glute Bridge 3×12ea — add load or elevate foot
Single Leg Bent Knee Calf Raise 3×15ea — add load
Standing Weighted Calf Raise 3×20 — add load
Squat Hold Calf Raise 3×12 — add load

UPPER (35min):
Barbell Floor Press 4×5 — add load
Weighted Pull-ups 4×5 — add load
Barbell Row 4×6 — add load
Landmine Press 3×8
Dips 3×10
Dead Hang 3×max
DB Lateral Raises 3×15

Then Z2 erg cap to strain target. Superset upper block to stay under 80min.`,

  intens: `FULL BODY + Z2 ERG — Phase 3 (under 80min total)

LOWER (25min):
RDL 3×8 — heaviest loads
Bulgarian Split Squat DB 3×8ea — heaviest loads
DB Step Ups 3×10ea — add load
Force Absorption Drop to Split Squat 3×6ea — moderate load
Depth Jumps 3×5 — full rest between sets
Single Leg Glute Bridge 3×12ea — weighted
Single Leg Bent Knee Calf Raise 3×15ea — heaviest load, slow tempo
Standing Weighted Calf Raise 3×20 — heaviest load
Squat Hold Calf Raise 3×12 — heaviest load

UPPER (35min):
Barbell Floor Press 4×5 — heaviest loads
Weighted Pull-ups 4×5 — heaviest loads
Barbell Row 4×6 — heaviest loads
Landmine Press 3×8
Weighted Dips 3×10
Dead Hang 3×max
DB Lateral Raises 3×15

Then Z2 erg cap to strain target. Superset upper block to stay under 80min.`,

  peak: `FULL BODY + Z2 ERG — Phase 4 (under 80min total)

LOWER (25min):
RDL 3×8 — maintain Phase 3 loads
Bulgarian Split Squat DB 3×8ea — maintain loads
DB Step Ups 3×10ea — maintain loads
Force Absorption Drop to Split Squat 3×5ea — maintain
Depth Jumps 3×4 — max effort, full rest between
Single Leg Glute Bridge 3×12ea — weighted
Single Leg Bent Knee Calf Raise 3×15ea — maintain loads
Standing Weighted Calf Raise 3×20 — maintain loads
Squat Hold Calf Raise 3×12 — maintain loads

UPPER (35min):
Barbell Floor Press 4×5 — maintain loads
Weighted Pull-ups 4×5 — maintain loads
Barbell Row 4×6 — maintain loads
Landmine Press 3×8
Weighted Dips 3×10
Dead Hang 3×max
DB Lateral Raises 3×15

Then Z2 erg cap to strain target. Superset upper block to stay under 80min.`,

  deload: `FULL BODY + Z2 ERG — Deload (under 50min total)

LOWER:
RDL 2×8 — 50% load
Bulgarian Split Squat DB 2×8ea — 50% load
Single Leg Glute Bridge 2×12ea — bodyweight
Single Leg Bent Knee Calf Raise 2×15ea — bodyweight only
Standing Weighted Calf Raise 2×15 — bodyweight only
No depth jumps, no step ups

UPPER:
Barbell Floor Press 2×5 — 50% load
Weighted Pull-ups 2×5
Barbell Row 2×6 — 50% load
Landmine Press 2×8

Light Z2 erg cap after. Under 50min total.`,
};

const Z2_ERG = `Z2 ERG + MOBILITY
Row, Ski Erg or Echo Bike. Cap at WHOOP strain target. HR 133-148bpm strict.
Dynamic mobility after.
POST-SESSION COOLDOWN: Single Leg Bent Knee Calf Raise 2×15ea, Standing Calf Raise 2×15 — bodyweight only.`;

const Z2_RUN_CORE = `Z2 RUN + MOBILITY + CORE
HR cap 133-148bpm strict. Walk if HR drifts. Static stretch after.
CORE FINISHER (8-10min):
Dead Bug 3×10ea
Pallof Press 3×12ea
Copenhagen Plank 3×20sec ea
Ab Wheel Rollout 3×8
POST-RUN COOLDOWN: Single Leg Bent Knee Calf Raise 2×15ea, Standing Calf Raise 2×15 — bodyweight only.`;

const UPPER_MODERATE = {
  base: `UPPER MODERATE — Phase 1 (35min, no cardio)
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×30m
Band Pull-Aparts 3×20
DB Lateral Raises 3×15`,

  accum: `UPPER MODERATE — Phase 2 (35min, no cardio)
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×40m
Band Pull-Aparts 3×20
DB Lateral Raises 3×15`,

  intens: `UPPER MODERATE — Phase 3 (35min, no cardio)
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×50m
Band Pull-Aparts 3×20
DB Lateral Raises 3×15`,

  peak: `UPPER MODERATE — Phase 4 (35min, no cardio)
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×50m
Band Pull-Aparts 3×20
DB Lateral Raises 3×15`,

  deload: `UPPER MODERATE — Deload (20min, no cardio)
KB Strict Press 2×10
Incline DB Bench 2×10
Single Arm KB Row 2×12
Farmers Carry 2×30m`,
};

const THRESHOLD_TRACK = {
  1: "THRESHOLD RUN — W1 Baseline. 20-25min comfortably hard. Log avg HR and time. This is your Week 1 benchmark.",
  3: "THRESHOLD RUN — W3. Push duration vs W1. 25-30min. Log avg HR and time.",
  5: "THRESHOLD RUN — W5. Extended duration. 30-35min. Log avg HR.",
  7: "THRESHOLD RUN — W7. Hardest yet. 35min race effort. Log avg HR and time.",
  9: "THRESHOLD RUN — W9. Peak effort. 35min. Log vs W7.",
  11: "THRESHOLD RUN — W11. Final quality session. 30min. Log vs W9.",
  2: "TRACK SESSION — W2. 6×400m at race pace. Full rest between. Log all splits.",
  4: "TRACK SESSION — W4. 8×400m or 4×800m at race pace. Log all splits.",
  6: "TRACK SESSION — W6. Mixed pyramid — 400/800/1200/800/400 at race pace. Log splits.",
  8: "TRACK SESSION — W8. Long reps — 3×1200m + 3×400m at race pace. Log vs W4.",
  10: "TRACK SESSION — W10. Speed reserve — 10×400m fast. Log vs W6.",
  12: "BENCHMARK — W12. Track + threshold combo. Log EVERYTHING vs W1. Compare all splits, HR, times.",
};

const HYROX_MOTION = "HYROX MOTION — Group class. Coach-led. Just show up and work.";

const SUNDAY = {
  standard: "LONG Z2 RUN — Optional. To WHOOP strain target. HR cap 133-148bpm strict. Walk if HR drifts. Green: full duration. Yellow: cut 30-40%. Red: full rest.",
  brick: "20/20/20 BRICK — Optional. 20min Echo Bike Z2 → 20min Run Z2 → 20min SkiErg Z2. Order fixed. All at 133-148bpm. Green: full 60min. Yellow: cut each block 30-40%. Red: full rest.",
  deload: "Optional easy walk or full rest. No structured session.",
};

const WL_MAP = {
  "HYROX + Plyos": "FOR TIME — Hyrox Full Runs Half Stations",
  "Z2 Erg + Mobility": "ZONE 2 — Easy Aerobic",
  "Full Body + Z2 Erg": "STRENGTH A — Full Body Power",
  "Z2 Run + Mobility + Core": "ZONE 2 — Easy Aerobic",
  "Upper Moderate": "STRENGTH C — Upper Dominant",
  "Threshold/Track": "THRESHOLD — 10x2 Min",
  "HYROX Motion": "FOR TIME — Hyrox Full Runs Half Stations",
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

const phaseKeyForWeek = (weekNum, isDeload) =>
  isDeload ? "deload" : weekNum <= 3 ? "base" : weekNum <= 6 ? "accum" : weekNum <= 9 ? "intens" : "peak";

const phaseIndexForWeek = (weekNum) =>
  weekNum <= 3 ? 0 : weekNum <= 6 ? 1 : weekNum <= 9 ? 2 : 3;

const thresholdTrackLabelForWeek = (weekNum) => {
  const note = THRESHOLD_TRACK[weekNum] || "Threshold/Track";
  return note.split("—")[0].trim();
};

const mapWorkoutLibraryKey = (label) => {
  if (WL_MAP[label]) return WL_MAP[label];
  if (label.startsWith("THRESHOLD RUN") || label.startsWith("TRACK SESSION") || label.startsWith("BENCHMARK")) {
    return WL_MAP["Threshold/Track"];
  }
  return null;
};

const buildWeekDays = (weekNum, phaseKey, isBrick, isDeload) => {
  const days = isBrick
    ? [
        { day: "MON", label: "Z2 Erg + Mobility", note: Z2_ERG },
        { day: "TUE", label: "Threshold/Track", note: THRESHOLD_TRACK[weekNum] },
        { day: "WED", label: "Z2 Run + Mobility + Core", note: Z2_RUN_CORE },
        { day: "THU", label: "Full Body + Z2 Erg", note: FULL_BODY[phaseKey] },
        { day: "FRI", label: "Upper Moderate", note: UPPER_MODERATE[phaseKey] },
        { day: "SAT", label: "HYROX Motion", note: HYROX_MOTION },
        { day: "SUN", label: "20/20/20 Brick", note: isDeload ? SUNDAY.deload : SUNDAY.brick },
      ]
    : [
        { day: "MON", label: "HYROX + Plyos", note: HYROX_SESSION[phaseKey] },
        { day: "TUE", label: "Z2 Erg + Mobility", note: Z2_ERG },
        { day: "WED", label: "Full Body + Z2 Erg", note: FULL_BODY[phaseKey] },
        { day: "THU", label: "Z2 Run + Mobility + Core", note: Z2_RUN_CORE },
        { day: "FRI", label: "Upper Moderate", note: UPPER_MODERATE[phaseKey] },
        { day: "SAT", label: thresholdTrackLabelForWeek(weekNum), note: THRESHOLD_TRACK[weekNum] },
        { day: "SUN", label: "Long Z2 Run", note: isDeload ? SUNDAY.deload : SUNDAY.standard },
      ];

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayDate = getUtcDateForOffset(weekNum, dayIndex);
    days[dayIndex].date_label = dayDate.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
    });
  }

  return days;
};

const buildPlanRows = () => {
  const blocks = [];
  const weeks = [];
  const days = [];

  for (const phaseDef of BLOCKS) {
    blocks.push({
      user_id: USER_ID,
      block_id: BLOCK_ID_BY_PHASE[phaseDef.label],
      phase: phaseDef.label,
      label: phaseDef.label,
      order: phaseDef.order,
    });
  }

  for (let weekNum = 1; weekNum <= 12; weekNum++) {
    const isBrick = weekNum % 2 !== 0;
    const isDeload = weekNum === 12;
    const phaseKey = phaseKeyForWeek(weekNum, isDeload);
    const phaseIndex = phaseIndexForWeek(weekNum);
    const phaseDef = BLOCKS[phaseIndex];
    const weekType = isBrick ? "BRICK" : "STANDARD";
    const phaseWeekOrder = phaseDef.weeks.indexOf(weekNum) + 1;
    const blockId = BLOCK_ID_BY_PHASE[phaseDef.label];
    const weekId = `hyrox12_${blockId}_w${phaseWeekOrder}`;

    weeks.push({
      user_id: USER_ID,
      week_id: weekId,
      block_id: blockId,
      label: `${phaseDef.label.toUpperCase()} WK ${phaseWeekOrder}`,
      dates: fmtWeekRange(weekNum),
      phase: phaseDef.label,
      subtitle: `Week ${weekNum} of 12 · ${weekType}`,
      week_order: weekNum,
    });

    const weekDays = buildWeekDays(weekNum, phaseKey, isBrick, isDeload);
    for (const day of weekDays) {
      const mappedSession = mapWorkoutLibraryKey(day.label);
      days.push({
        user_id: USER_ID,
        week_id: weekId,
        day_name: day.day,
        date_label: day.date_label,
        am_session: mappedSession,
        pm_session: null,
        am_session_custom: day.label,
        pm_session_custom: null,
        note: `${day.note}\n\nWEEK TYPE: ${weekType}`,
        is_race_day: false,
        is_sunday: day.day === "SUN",
        ai_modified: false,
        ai_modification_note: null,
      });
    }
  }

  return { blocks, weeks, days };
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (req.query?.secret !== SECRET) return res.status(403).json({ error: "Forbidden" });

  try {
    const { blocks, weeks, days } = buildPlanRows();

    const { error: delDaysErr } = await supabase.from("training_days").delete().eq("user_id", USER_ID);
    if (delDaysErr) throw new Error(`Failed clearing training_days: ${delDaysErr.message}`);

    const { error: delWeeksErr } = await supabase.from("training_weeks").delete().eq("user_id", USER_ID);
    if (delWeeksErr) throw new Error(`Failed clearing training_weeks: ${delWeeksErr.message}`);

    const { error: delBlocksErr } = await supabase.from("training_blocks").delete().eq("user_id", USER_ID);
    if (delBlocksErr) throw new Error(`Failed clearing training_blocks: ${delBlocksErr.message}`);

    const { error: blockErr } = await supabase.from("training_blocks").insert(blocks);
    if (blockErr) throw new Error(`Failed inserting training_blocks: ${blockErr.message}`);

    const { error: weekErr } = await supabase.from("training_weeks").insert(weeks);
    if (weekErr) throw new Error(`Failed inserting training_weeks: ${weekErr.message}`);

    const { error: dayErr } = await supabase.from("training_days").insert(days);
    if (dayErr) throw new Error(`Failed inserting training_days: ${dayErr.message}`);

    return res.status(200).json({
      success: true,
      user_id: USER_ID,
      templates: { odd: TEMPLATE_B, even: TEMPLATE_A },
      blocks_seeded: blocks.length,
      weeks_seeded: weeks.length,
      days_seeded: days.length,
      start_date: fmtDateLabel(START_DATE),
      first_monday: fmtDateLabel(getUtcDateForOffset(1, 0)),
      first_monday_iso: fmtIsoDate(getUtcDateForOffset(1, 0)),
      week_1_range: fmtWeekRange(1),
      week_4_range: fmtWeekRange(4),
      phase_week_counts: BLOCKS.reduce((acc, phase) => {
        acc[phase.label] = phase.weeks.length;
        return acc;
      }, {}),
    });
  } catch (err) {
    console.error("[plan/seed-12week] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
