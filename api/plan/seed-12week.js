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

const LABEL_DETAIL = {
  HYROX:
    "Compromised HYROX simulation. Alternate 1k runs with station efforts. Build sustainable race pace under fatigue.",
  "Z2 Erg + Mobility":
    "45-60 min zone 2 erg (Ski/Row/Bike) + 15 min mobility reset. Keep breathing controlled and conversational.",
  "Upper + Z2 Erg Cap":
    "Upper body strength superset work, then capped 20-30 min zone 2 erg flush. Leave reps in reserve.",
  "Z2 Run + Mobility":
    "Easy zone 2 run focused on economy, followed by tissue quality and range-of-motion mobility work.",
  "Upper Body":
    "Upper dominant strength session. Prioritize quality pushes/pulls and trunk stability with controlled tempo.",
  Track:
    "Structured track intervals. Hit quality reps with complete recoveries and consistent pacing across all rounds.",
  Threshold:
    "Continuous or broken threshold effort. Stay just below redline, maintain rhythm, and finish strong.",
  Benchmark:
    "Benchmark test session at race intent. Track splits, transitions, and station execution for comparison.",
  "Long Z2 Run":
    "Progressive long aerobic run in zone 2. Fuel and hydrate consistently, preserve relaxed mechanics.",
};

const LABEL_GREEN_RULE = {
  HYROX: "GREEN: Execute as prescribed at race-intent quality.",
  "Z2 Erg + Mobility": "GREEN: Extend duration up to +10 min if HR remains controlled.",
  "Upper + Z2 Erg Cap": "GREEN: Add one quality top set and keep erg cap smooth.",
  "Z2 Run + Mobility": "GREEN: Keep full aerobic volume and complete mobility flow.",
  "Upper Body": "GREEN: Load primary lifts to RPE 7-8 with strict form.",
  Track: "GREEN: Hit target paces and keep every rep technically clean.",
  Threshold: "GREEN: Hold steady threshold line; no surging early.",
  Benchmark: "GREEN: Full benchmark effort; log splits and station transitions.",
  "Long Z2 Run": "GREEN: Complete full long run with fueling every 35-45 min.",
};

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const PHASES = [
  {
    block_id: "base_rebuild",
    label: "Base Rebuild",
    weeks: 3,
    template: ["HYROX", "Z2 Erg + Mobility", "Upper + Z2 Erg Cap", "Track", "Upper Body", "Long Z2 Run", "Z2 Run + Mobility"],
  },
  {
    block_id: "accumulation",
    label: "Accumulation",
    weeks: 3,
    template: ["HYROX", "Track", "Upper + Z2 Erg Cap", "Threshold", "HYROX", "Long Z2 Run", "Z2 Run + Mobility"],
  },
  {
    block_id: "intensification",
    label: "Intensification",
    weeks: 3,
    template: ["HYROX", "Track", "Upper Body", "Threshold", "HYROX", "Benchmark", "Z2 Run + Mobility"],
  },
  {
    block_id: "peak_test",
    label: "Peak & Test",
    weeks: 3,
    template: ["HYROX", "Z2 Erg + Mobility", "Upper Body", "Threshold", "Benchmark", "Long Z2 Run", "Z2 Run + Mobility"],
  },
];

const START_DATE = new Date("2026-04-13T00:00:00.000Z"); // Monday

const addDays = (date, days) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const monthShort = (d) => d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
const dayNum = (d) => d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
const fmtDateLabel = (d) => `${monthShort(d)} ${dayNum(d)}`;
const fmtWeekRange = (start, end) => `${fmtDateLabel(start)}–${fmtDateLabel(end)}`;

const buildPlanRows = () => {
  const blocks = [];
  const weeks = [];
  const days = [];

  let globalWeekOrder = 1;
  let weekStart = new Date(START_DATE);

  for (const phase of PHASES) {
    blocks.push({
      user_id: TARGET_USER_ID,
      block_id: phase.block_id,
      phase: phase.label,
      label: phase.label,
    });

    for (let phaseWeekIdx = 0; phaseWeekIdx < phase.weeks; phaseWeekIdx++) {
      const weekEnd = addDays(weekStart, 6);
      const weekSlug = `hyrox12_${phase.block_id}_w${phaseWeekIdx + 1}`;
      const weekLabel = `${phase.label.toUpperCase()} WK ${phaseWeekIdx + 1}`;

      weeks.push({
        user_id: TARGET_USER_ID,
        week_id: weekSlug,
        block_id: phase.block_id,
        label: weekLabel,
        dates: fmtWeekRange(weekStart, weekEnd),
        phase: phase.label,
        subtitle: `Week ${globalWeekOrder} of 12`,
        week_order: globalWeekOrder,
      });

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const dayDate = addDays(weekStart, dayIdx);
        const label = phase.template[dayIdx];
        const amSession = SESSION_MAP[label] || null;
        const detail = LABEL_DETAIL[label] || `${label} session details from HYROX plan.`;
        const greenRule = LABEL_GREEN_RULE[label] || "GREEN: Execute session as prescribed.";

        days.push({
          user_id: TARGET_USER_ID,
          week_id: weekSlug,
          day_name: DAY_NAMES[dayIdx],
          date_label: fmtDateLabel(dayDate),
          am_session: amSession,
          pm_session: null,
          am_session_custom: detail,
          pm_session_custom: null,
          note: greenRule,
          is_race_day: false,
          is_sunday: DAY_NAMES[dayIdx] === "SUN",
          ai_modified: false,
          ai_modification_note: null,
        });
      }

      weekStart = addDays(weekStart, 7);
      globalWeekOrder += 1;
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

