import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const START_DATE = new Date("2026-04-13T12:00:00.000Z");
const USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc";
const SECRET = "triad2026";

const PHASES = [
  { label: "Base Rebuild", short: "BASE", weeks: [1, 2, 3, 4] },
  { label: "Accumulation", short: "ACCUM", weeks: [5, 6, 7, 8] },
  { label: "Intensification", short: "INTENS", weeks: [9, 10, 11, 12] },
  { label: "Peak", short: "PEAK", weeks: [13, 14, 15, 16] },
  { label: "Sharpen", short: "SHARP", weeks: [17, 18, 19] },
  { label: "Taper", short: "TAPER", weeks: [20] },
  { label: "Race Week", short: "RACE", weeks: [21] },
  { label: "Recovery", short: "RECOV", weeks: [22] },
];

const DELOAD_WEEKS = [4, 8, 12, 16];
const RACE_WEEK = 21;
const RECOVERY_WEEK = 22;

const getPhase = (w) => {
  if (w <= 4) return "base";
  if (w <= 8) return "accum";
  if (w <= 12) return "intens";
  if (w <= 16) return "peak";
  if (w <= 19) return "sharpen";
  if (w === 20) return "taper";
  if (w === 21) return "race";
  return "recovery";
};

const BLOCK_ID_BY_LABEL = {
  "Base Rebuild": "base_rebuild",
  Accumulation: "accumulation",
  Intensification: "intensification",
  Peak: "peak_block",
  Sharpen: "sharpen_block",
  Taper: "taper_block",
  "Race Week": "race_week",
  Recovery: "recovery_block",
};

/** Group class — odd weeks: SAT; even weeks: TUE */
const HYROX_MOTION = {
  label: "HYROX Motion",
  note: `HYROX Motion — coached group class.
Book your slot. Race-specific stations and pacing; log weak links for the next block.`,
};

const HYROX_MON = {
  base_standard: {
    label: "HYROX",
    note: `HYROX — Base Phase (Technique Focus)
4×(200m Run + Sled Push 20m + Wall Balls 10)
Focus: nasal breathing on runs, perfect sled mechanics.
Log time per round. Light loads — technique over pace.`,
  },
  base_brick: {
    label: "HYROX",
    note: `HYROX — Base Phase (Technique Focus)
4×(200m Run + Sled Pull 20m + Wall Balls 10)
Alternate sled direction from standard weeks.
Same focus — technique over pace. Log time per round.`,
  },
  base_deload: {
    label: "HYROX",
    note: `HYROX — Deload (60% Effort)
3×(200m Run + Sled Push 20m + Wall Balls 10)
Recovery week. 60% effort. Absorb the work. No new stimulus.`,
  },

  accum_standard: {
    label: "HYROX",
    note: `HYROX — Accumulation (Volume Climbs)
5×(200m Run + Sled Push 25m + Sandbag Lunge 10m + Wall Balls 15)
Add load vs Base. Sandbag lunges introduced.
Log time per round. Add 1 round vs Base phase.`,
  },
  accum_brick: {
    label: "HYROX",
    note: `HYROX — Accumulation (Compromised Running)
5×(400m Run + Sled Pull 25m + Wall Balls 15)
Longer run segment. Compromised running emphasis begins.
Push the run pace. Log every round.`,
  },
  accum_deload: {
    label: "HYROX",
    note: `HYROX — Deload (60% Effort)
3×(400m Run + Sled Push 20m + Wall Balls 10)
Recovery week. 60% effort. Flush fatigue.`,
  },

  intens_w9: {
    label: "HYROX",
    note: `HYROX — Half Sim (Race Pace)
4 stations at race pace. 500m run between each.
Sled Push 50m → Sandbag Lunge 20m → Wall Balls 20 → SkiErg 500m
Log every split. This is your W9 benchmark.`,
  },
  intens_w10: {
    label: "HYROX",
    note: `HYROX — Heavy Compromised Running
5×(400m Run + Sled Push 50m + Sled Pull 50m + Wall Balls 20)
Race weight on sleds. Heavy loads. Push the pace.
Log every round.`,
  },
  intens_w11: {
    label: "HYROX",
    note: `HYROX — Half Sim (Chase W9 Splits)
4 stations at race pace. 500m run between each.
Sled Push 50m → Sled Pull 50m → Sandbag Lunge 20m → Wall Balls 25
Chase your W9 splits. Log everything.`,
  },
  intens_deload: {
    label: "HYROX",
    note: `HYROX — Deload (70% Effort)
Half sim — 3 stations at 70% effort.
Sled Push 30m → Wall Balls 15 → Sandbag Lunge 10m
Recovery week. Absorb Block 3.`,
  },

  peak_w13: {
    label: "HYROX",
    note: `HYROX — Full Race Simulation (BENCHMARK)
All 8 stations in order at race pace.
1km Run → SkiErg 1000m → Sled Push 50m → Sled Pull 50m →
Burpee Broad Jump 80m → Row 1000m → Farmers Carry 200m →
Sandbag Lunge 100m → Wall Balls 100 reps
LOG EVERY SPLIT. This is your race benchmark.`,
  },
  peak_w14: {
    label: "HYROX",
    note: `HYROX — Max Volume (Race Movements)
6×(400m Run + Sled Push 50m + Wall Balls 25 + Sandbag Lunge 20m)
Max HYROX volume. Heaviest loads. Push pace on runs.
Log every round.`,
  },
  peak_w15: {
    label: "HYROX",
    note: `HYROX — Full Race Simulation (Chase W13)
All 8 stations in order at race pace.
1km Run → SkiErg 1000m → Sled Push 50m → Sled Pull 50m →
Burpee Broad Jump 80m → Row 1000m → Farmers Carry 200m →
Sandbag Lunge 100m → Wall Balls 100 reps
Chase your W13 splits. Race your own clock.`,
  },
  peak_deload: {
    label: "HYROX",
    note: `HYROX — Deload (70% Effort)
4 stations at 70% effort. Active recovery only.
Sled Push 30m → Wall Balls 15 → Sandbag Lunge 10m → SkiErg 250m
Final deload before sharpening.`,
  },

  sharpen_w17: {
    label: "HYROX",
    note: `HYROX — Sharpen (80% Effort)
6 stations at 80% effort. Sharp but not fatiguing.
Sled Push 50m → Sled Pull 50m → Sandbag Lunge 20m →
Wall Balls 20 → SkiErg 500m → Row 500m
Stay fast. Protect the legs.`,
  },
  sharpen_w18: {
    label: "HYROX",
    note: `HYROX — Sharpen (75% Effort)
4 stations only at 75% effort.
Sled Push 50m → Wall Balls 20 → Sandbag Lunge 20m → SkiErg 500m
Stay fast. Do not fatigue. Legs need to be fresh.`,
  },

  sharpen_w19: {
    label: "HYROX",
    note: `HYROX — Final Sharpen (70% Effort)
3 stations only at 70% effort. Keep the feel.
Sled Push 30m → Wall Balls 15 → SkiErg 250m
Protect the legs. Race is 2 weeks away.`,
  },

  taper: {
    label: "HYROX",
    note: `HYROX — Taper (Minimum Dose)
Wall Balls 3×15 fast + Sled Push 2×20m at 60%.
Minimum effective dose. Keep the feel. Nothing more.`,
  },

  race_mon: {
    label: "Easy Flush",
    note: `Race Week — Easy Flush
15 min easy movement only. Walk, easy jog, mobility.
Visualize race execution — especially first 1km strategy.
Mental prep begins today.`,
  },
};

const RECOVERY_SESSIONS = {
  mon: { label: "Active Recovery", note: "Post-race active recovery. Easy walk or light mobility only. Let the body absorb the race." },
  tue: { label: "Rest", note: "Full rest. No training. Eat well, sleep, hydrate." },
  wed: { label: "Active Recovery", note: "20min easy walk or gentle swim if available. No structured training." },
  thu: { label: "Rest", note: "Full rest or light mobility only." },
  fri: { label: "Active Recovery", note: "Easy 20min jog if legs feel ready. No pressure." },
  sat: { label: "Z2 Erg/Echo + Mobility", note: "Return to training — 30min easy erg. HR well below ceiling. Welcome back." },
  sun: { label: "Rest", note: "Full rest. Block complete. Reflect on 22 weeks of work." },
};

const WED_SESSIONS = {
  base: {
    label: "Full Body + Z2 Erg",
    note: `FULL BODY + Z2 ERG — Base Phase (under 80min total)

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

Then Z2 erg cap to strain target. Superset upper block. Under 80min.`,
  },

  accum: {
    label: "Full Body + Z2 Erg",
    note: `FULL BODY + Z2 ERG — Accumulation Phase (under 80min total)

LOWER (25min):
RDL 3×8 @ 65-70% — add load vs Base
Bulgarian Split Squat DB 3×8ea — increase load
Hack Squat 3×10 — moderate load, introduced this phase
Banded Knee Drives 3×12ea — bodyweight, controlled
Single Leg Bent Knee Calf Raise 3×15ea
Standing Weighted Calf Raise 3×20
Squat Hold Calf Raise 3×12

UPPER (35min):
Barbell Floor Press 4×5 — add 2.5-5kg vs Base
Weighted Pull-ups 4×5 — add load
Barbell Row 4×6 — add load
Landmine Press 3×8
Dips 3×10 — add weight if possible
Dead Hang 3×max
DB Lateral Raises 3×15

Then Z2 erg cap to strain target. Under 80min.`,
  },

  intens: {
    label: "Full Body + Z2 Erg",
    note: `FULL BODY + Z2 ERG — Intensification Phase (under 80min total)

LOWER (25min):
RDL 3×8 @ 70-75% — heaviest loads yet
Bulgarian Split Squat DB 3×8ea — heaviest loads
Hack Squat 3×10 — add load
Banded Single Leg Reverse Squat 3×10ea — added this phase
Sandbag Lunge 3×20m — race movement, introduced
Single Leg Bent Knee Calf Raise 3×15ea
Standing Weighted Calf Raise 3×20

UPPER (35min):
Barbell Floor Press 4×5 — peak loads
Weighted Pull-ups 4×5 — peak loads
Barbell Row 4×6 — peak loads
Barbell Shoulder Press 3×8 — replaces Landmine this phase
Dips 3×10 weighted
Dead Hang 3×max
DB Lateral Raises 3×15

Then Z2 erg cap to strain target. Under 80min.`,
  },

  peak: {
    label: "Full Body + Z2 Erg",
    note: `FULL BODY + Z2 ERG — Peak Phase (under 80min total)

LOWER (25min):
RDL 3×8 @ 75% — maintain peak load
Goblet Squat 3×10 — replaces Force Absorption this phase
Hack Squat 3×10 — maintain load
Wall Balls 4×20 — race specificity added to lower block
Sandbag Lunge 3×20m — race movement
Banded Knee Drives 3×12ea
Standing Weighted Calf Raise 3×20

UPPER (35min):
Barbell Floor Press 4×5 — maintain peak
Weighted Pull-ups 4×5 — maintain peak
Barbell Row 4×6 — maintain peak
Barbell Shoulder Press 3×8
Dips 3×10 weighted
Dead Hang 3×max
DB Lateral Raises 3×15

Then Z2 erg cap to strain target. Under 80min.`,
  },

  sharpen: {
    label: "Full Body + Z2 Erg",
    note: `FULL BODY + Z2 ERG — Sharpen Phase (under 60min total)

LOWER (15min):
RDL 2×8 @ 70% — maintain feel, reduce volume
Goblet Squat 2×10
Wall Balls 3×15 — keep race feel

UPPER (25min):
Barbell Floor Press 3×5 @ 80% — maintain strength feel
Weighted Pull-ups 3×5
Barbell Row 3×6
DB Lateral Raises 2×15

Then 15min light Z2 erg. Volume drops significantly.`,
  },

  taper: {
    label: "Full Body + Z2 Erg",
    note: `FULL BODY + Z2 ERG — Taper (Minimum Dose, 30min max)

Barbell Floor Press 2×3 @ 70%
Weighted Pull-ups 2×3
Wall Balls 2×10 — keep race feel
Light Z2 erg 10min only.
Minimum effective dose. Nothing more.`,
  },

  deload: {
    label: "Full Body + Z2 Erg",
    note: `FULL BODY + Z2 ERG — Deload (50% Volume, no erg)

LOWER:
RDL 2×8 @ 60% — light
Bulgarian Split Squat 2×8ea — light
Single Leg Glute Bridge 2×12ea

UPPER:
Barbell Floor Press 2×5 @ 65%
Pull-ups 2×5 bodyweight
Barbell Row 2×6

No Z2 erg. Under 40min. Absorb the work.`,
  },

  race_wed: {
    label: "Shakeout",
    note: `Race Week — Shakeout
20 min easy shakeout + 4 strides at race pace.
Wake up fast-twitch. In and out.
No strength work this week.`,
  },
};

const THU_SESSIONS = {
  z2: {
    label: "Z2 Run + Mobility + Core",
    note: `Z2 RUN + MOBILITY + CORE
HR cap 133-148bpm strict. Walk if HR drifts. Static stretch after.

CORE FINISHER (8-10min):
Dead Bug 3×10ea
Pallof Press 3×12ea
Copenhagen Plank 3×20sec ea
Lying Leg Raises hands over head 3×12

POST-RUN COOLDOWN:
Single Leg Bent Knee Calf Raise 2×15ea
Standing Calf Raise 2×15 — bodyweight only`,
  },

  tempo: {
    label: "Tempo Run + Core",
    note: `TEMPO RUN + CORE — Peak Phase
20min tempo @ comfortably hard effort. HR 155-165.
Push the ceiling. This replaces Z2 — legs should feel it.

CORE FINISHER (8-10min):
Dead Bug 3×10ea
Pallof Press 3×12ea
Copenhagen Plank 3×20sec ea
Lying Leg Raises 3×12

POST-RUN COOLDOWN:
Single Leg Bent Knee Calf Raise 2×15ea
Standing Calf Raise 2×15 — bodyweight only`,
  },

  tempo_sharpen: {
    label: "Tempo Run + Core",
    note: `TEMPO RUN + CORE — Sharpen Phase
15min tempo with 4 strides at race pace at end.
Shorter than Peak tempo. Stay sharp, protect the legs.

CORE FINISHER (6min only):
Dead Bug 2×10ea
Copenhagen Plank 2×20sec ea`,
  },

  taper: {
    label: "Z2 Run + Mobility",
    note: `Taper — Easy Shakeout
15-20 min very easy jog. HR well below ceiling.
No core finisher this week. Legs fresh.`,
  },

  race_thu: {
    label: "Rest",
    note: `Race Week — Full Rest
No training. Pack bags. Prepare nutrition plan.
Logistics day. Rest the body. Sleep is training.`,
  },
};

const FRI_SESSIONS = {
  base: {
    label: "Upper Moderate + Plyos",
    note: `UPPER MODERATE + PLYOS — Base Phase (35min, no cardio)

UPPER:
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×30m
Band Pull-Aparts 3×20
DB Lateral Raises 3×15

PLYOS (coordination focus):
Pogos 3×20
A-skips 3×20m
Broad Jumps 3×5`,
  },

  accum: {
    label: "Upper Moderate + Plyos",
    note: `UPPER MODERATE + PLYOS — Accumulation Phase (35min, no cardio)

UPPER:
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×40m — distance increases
Band Pull-Aparts 3×20
DB Lateral Raises 3×15

PLYOS (power development):
Pogo Box Taps 3×15
Band Resisted Pogo Hops 3×10
Jump Rope 3×1min
Rear Elevated Foot Hops 3×8ea`,
  },

  intens: {
    label: "Upper Moderate + Plyos",
    note: `UPPER MODERATE + PLYOS — Intensification Phase (35min, no cardio)

UPPER:
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×50m — max distance
Seated Straight Leg Lift 3×12 — added
Band Pull-Aparts 3×20
DB Lateral Raises 3×15

PLYOS (reactive speed):
Depth Jumps 4×4 — full rest between
Sprints 4×20m — full rest between
Band Resisted Pogo Hops 3×12`,
  },

  peak: {
    label: "Upper Moderate + Plyos",
    note: `UPPER MODERATE + PLYOS — Peak Phase (35min, no cardio)

UPPER:
KB Strict Press 3×10
Incline DB Bench 3×10
Single Arm KB Row 3×12
Farmers Carry 4×50m — maintain max
Band Pull-Aparts 3×20
DB Lateral Raises 3×15

PLYOS (neural sharpness — max effort, full rest):
Depth Jumps 3×4 — max intent
Broad Jump into Sprint 3×3 — full rest between
Sprints 4×30m — full rest between`,
  },

  sharpen: {
    label: "Upper Moderate + Plyos",
    note: `UPPER MODERATE + PLYOS — Sharpen Phase (25min, reduced volume)

UPPER:
KB Strict Press 2×10
Incline DB Bench 2×10
Farmers Carry 3×30m — reduce distance
Band Pull-Aparts 2×20

PLYOS (50% volume, keep speed):
Depth Jumps 2×3
Sprints 3×20m — full rest`,
  },

  taper: {
    label: "Upper Moderate",
    note: `Taper — Minimum Dose (20min max)
KB Strict Press 2×8
Incline DB Bench 2×8
No carries. No plyos.
In and out. Minimum effective dose.`,
  },

  deload: {
    label: "Upper Moderate",
    note: `Deload — Upper Moderate (Light, 25min)
KB Strict Press 2×10 light
Incline DB Bench 2×10 light
Single Arm KB Row 2×12 light
Farmers Carry 2×30m light
No plyos on deload.`,
  },

  race_fri: {
    label: "Travel + Shakeout",
    note: `Race Week — Travel Day + Shakeout
Travel to Washington DC.
15-20 min very easy jog at venue. Scope the course.
Hydrate aggressively. Sleep is the priority tonight.
No strength work.`,
  },
};

const SAT_SESSIONS = {
  1: { label: "Threshold", note: "Threshold Run W1 — establish baseline. 20min comfortably hard. HR 155-165. Log avg HR and time." },
  2: { label: "Track / Threshold", note: "Track W2 — Apr 25 = 8k Race. Treat as track / threshold quality session. Race it. Log all splits." },
  3: { label: "Threshold", note: "Threshold Run W3 — push duration vs W1. 22-25min. Log avg HR and time." },
  4: { label: "Easy Run", note: "Deload — Easy Z2 Run 20-30min. No quality work this week." },
  5: { label: "Threshold", note: "Threshold Run W5 — 25-30min comfortably hard. Build duration. Log avg HR." },
  6: { label: "Track", note: "Track W6 — 6×400m at race pace. 90sec rest. Log all splits vs W2." },
  7: { label: "Threshold", note: "Threshold Run W7 — 30min extended threshold. Push the ceiling. Log avg HR." },
  8: { label: "Easy Run", note: "Deload — Easy Z2 Run 20-30min. No quality work." },
  9: { label: "Threshold", note: "Threshold Run W9 — 30min + 2km race pace finish. Log splits." },
  10: { label: "Track", note: "Track W10 — 8×400m at race pace. 75sec rest. Log all splits vs W6." },
  11: { label: "Threshold", note: "Threshold Run W11 — 30min extended. BENCHMARK. Log time vs W9." },
  12: { label: "Easy Run", note: "Deload — Easy Z2 Run 20-30min. No quality work." },
  13: { label: "Threshold", note: "Threshold Run W13 — 30min race pace effort. Peak phase. Log vs W11." },
  14: { label: "Track", note: "Track W14 — 10×400m at race pace. 60sec rest. Log all splits vs W10." },
  15: { label: "Threshold", note: "Threshold Run W15 — 30min peak effort. Final big threshold. Log vs W13." },
  16: { label: "Easy Run", note: "Final Deload — Easy Z2 Run 15-20min. Very easy. Rest up." },
  17: { label: "Threshold", note: "Sharpen — Threshold Run 20min. Stay sharp. Do not race it. Protect the legs." },
  18: { label: "Track", note: "Sharpen — Track 4×400m sharp. 90sec rest. Fast not fatiguing. Log vs W14." },
  19: { label: "Shakeout", note: "Taper — 15min easy with 4 strides. Just wake up the legs. Nothing more." },
  20: { label: "Easy Run", note: "Taper — 20min very easy Z2. Protect the legs. Race is next week." },
  21: {
    label: "RACE DAY — HYROX Solo",
    note: "AMAZFIT HYROX WASHINGTON DC — Men's Solo Open. Sep 5. Trust the taper. Trust the 22 weeks. Run first 1km conservative. Log every split.",
  },
  22: { label: "Recovery Run", note: "Post-race — easy 20-30min jog if legs allow. Otherwise full rest." },
};

const SUN_SESSIONS = {
  long_run: {
    base: { label: "Long Z2 Run", note: "Long Z2 Run — 50-60min. HR cap 133-148bpm strict. Walk if HR drifts." },
    accum: { label: "Long Z2 Run", note: "Long Z2 Run — 60-70min. Build duration. HR cap 133-148bpm strict." },
    intens: { label: "Long Z2 Run", note: "Long Z2 Run — 70-80min. Longest block yet. HR cap 133-148bpm strict." },
    peak: { label: "Long Z2 Run", note: "Long Z2 Run — 80-90min. Peak aerobic volume. HR cap 133-148bpm strict." },
    sharpen: { label: "Long Z2 Run", note: "Long Z2 Run — 50-60min. Back off vs Peak. Protect the legs." },
    taper: { label: "Long Z2 Run", note: "Taper — 25-30min easy Z2. Final longer run before race week." },
    deload: { label: "Long Z2 Run", note: "Deload — 30-40min easy Z2 only. Rest and absorb." },
  },

  brick: {
    base: { label: "20/20/20 Brick", note: "20/20/20 Brick — Echo Bike Z2 → Run Z2 → SkiErg Z2. Order fixed. All at 133-148bpm. 60min total." },
    accum: { label: "20/20/25 Brick", note: "20/20/25 Brick — Echo Bike 20min Z2 → Run 20min Z2 → SkiErg 25min Z2. Build duration. All at 133-148bpm." },
    intens: {
      label: "25/25/25 Brick",
      note: `25/25/25 Brick — Echo Bike 25min Z2 → Run 25min Z2 → SkiErg 25min Z2. All at 133-148bpm. 75min total.
WALL BALL FINISHER: 3×15 wall balls with wet hands immediately after. No rest before starting.`,
    },
    peak: {
      label: "30/30/30 Brick",
      note: `30/30/30 Brick — Echo Bike 30min Z2 → Run 30min Z2 → SkiErg 30min Z2. All at 133-148bpm. 90min total.
WALL BALL FINISHER: 4×20 wall balls with wet hands. Simulate race finish conditions.`,
    },
    sharpen: { label: "20/20/20 Brick", note: "20/20/20 Brick — Back to base duration. Echo Bike → Run → SkiErg. Sharpen not fatigue. All at 133-148bpm." },
    taper: { label: "20/20/20 Brick", note: "Taper brick — 15/15/15 easy only. HR well below ceiling. Race week next." },
    deload: { label: "20/20/20 Brick", note: "Deload Brick — 15/15/15 easy only. Well below strain target. Flush fatigue." },
  },

  race_sun: {
    label: "RACE DAY — HYROX Doubles",
    note: "AMAZFIT HYROX WASHINGTON DC — Men's Doubles Open. Partner race. Split stations strategically. Running legs matter most. B race — enjoy the day.",
  },
};

const TUE_SESSIONS = {
  standard: { label: "Z2 Erg/Echo + Mobility", note: "Z2 Erg + Mobility — Row, Ski or Echo Bike. Cap at WHOOP strain target. HR 133-148bpm. Dynamic mobility after." },
  brick: { label: "Z2 Run + Mobility", note: "Z2 Run + Mobility — HR cap 133-148bpm. Static stretch after. Cap at WHOOP strain target." },
  deload: { label: "Z2 Erg/Echo + Mobility", note: "Deload — 20min easy erg. HR well below ceiling. Flush the legs." },
  race: { label: "Rest", note: "Race Week — Full Rest. No training. Trust the taper." },
};

const WL_MAP = {
  HYROX: "FOR TIME — Hyrox Full Runs Half Stations",
  "Easy Flush": "RECOVERY — Active Reset",
  "Z2 Erg/Echo + Mobility": "ZONE 2 — Easy Aerobic",
  "Z2 Run + Mobility": "ZONE 2 — Easy Aerobic",
  "Z2 Run + Mobility + Core": "ZONE 2 — Easy Aerobic",
  "Full Body + Z2 Erg": "STRENGTH A — Full Body Power",
  "Upper Moderate + Plyos": "STRENGTH C — Upper Dominant",
  "Upper Moderate": "STRENGTH C — Upper Dominant",
  Threshold: "THRESHOLD — 10x2 Min",
  "Track / Race": "THRESHOLD — 10x2 Min",
  "Track / Threshold": "THRESHOLD — 10x2 Min",
  "HYROX Motion": "EMOM 60 — Hyrox Stations",
  Track: "THRESHOLD — 10x2 Min",
  "Tempo Run + Core": "TEMPO — 20 Min Sustained",
  Shakeout: "RECOVERY — Active Reset",
  "Easy Run": "ZONE 2 — Easy Aerobic",
  "Long Z2 Run": "LONG RUN — Zone 2 Base",
  "20/20/20 Brick": "ZONE 2 — Easy Aerobic",
  "20/20/25 Brick": "ZONE 2 — Easy Aerobic",
  "25/25/25 Brick": "ZONE 2 — Easy Aerobic",
  "30/30/30 Brick": "ZONE 2 — Easy Aerobic",
  "RACE DAY — HYROX Solo": "RACE SIMULATION — Full HYROX",
  "RACE DAY — HYROX Doubles": "RACE SIMULATION — Full HYROX",
  "Travel + Shakeout": "RECOVERY — Active Reset",
  Rest: "RECOVERY — Active Reset",
  "Active Recovery": "RECOVERY — Active Reset",
  "Recovery Run": "ZONE 2 — Easy Aerobic",
};

const PLAN_BLOCKS = [
  { label: "Base Rebuild", short: "BASE", week_start: 1, week_end: 4 },
  { label: "Accumulation", short: "ACCUM", week_start: 5, week_end: 8 },
  { label: "Intensification", short: "INTENS", week_start: 9, week_end: 12 },
  { label: "Peak", short: "PEAK", week_start: 13, week_end: 16 },
  { label: "Sharpen", short: "SHARP", week_start: 17, week_end: 19 },
  { label: "Taper", short: "TAPER", week_start: 20, week_end: 20 },
  { label: "Race Week", short: "RACE", week_start: 21, week_end: 21 },
  { label: "Recovery", short: "RECOV", week_start: 22, week_end: 22 },
];

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

const mapWorkoutLibraryKey = (label) => WL_MAP[label] || "ZONE 2 — Easy Aerobic";

const RECOVERY_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const sessionForDay = (weekNum, dayIndex) => {
  const isOdd = weekNum % 2 !== 0;
  const isDeload = DELOAD_WEEKS.includes(weekNum);
  const isRaceWeek = weekNum === RACE_WEEK;
  const phase = getPhase(weekNum);

  let session = { label: "Rest", note: "Rest day." };

  if (weekNum === RECOVERY_WEEK) {
    const key = RECOVERY_DAY_KEYS[dayIndex];
    return RECOVERY_SESSIONS[key];
  }

  if (isRaceWeek) {
    if (dayIndex === 0) session = HYROX_MON.race_mon;
    else if (dayIndex === 1) session = TUE_SESSIONS.race;
    else if (dayIndex === 2) session = WED_SESSIONS.race_wed;
    else if (dayIndex === 3) session = THU_SESSIONS.race_thu;
    else if (dayIndex === 4) session = FRI_SESSIONS.race_fri;
    else if (dayIndex === 5) session = { label: SAT_SESSIONS[RACE_WEEK].label, note: SAT_SESSIONS[RACE_WEEK].note };
    else if (dayIndex === 6) session = SUN_SESSIONS.race_sun;
  } else if (isDeload) {
    if (dayIndex === 0) {
      if (phase === "base") session = HYROX_MON.base_deload;
      else if (phase === "accum") session = HYROX_MON.accum_deload;
      else if (phase === "intens") session = HYROX_MON.intens_deload;
      else session = HYROX_MON.peak_deload;
    } else if (dayIndex === 1) session = TUE_SESSIONS.deload;
    else if (dayIndex === 2) session = WED_SESSIONS.deload;
    else if (dayIndex === 3) {
      session = { ...THU_SESSIONS.z2, note: "Deload — 20min easy jog. HR well below ceiling. Easy. Recovery." };
    } else if (dayIndex === 4) session = FRI_SESSIONS.deload;
    else if (dayIndex === 5) session = { label: SAT_SESSIONS[weekNum].label, note: SAT_SESSIONS[weekNum].note };
    else if (dayIndex === 6) {
      session = isOdd ? SUN_SESSIONS.long_run.deload : SUN_SESSIONS.brick.deload;
    }
  } else {
    if (dayIndex === 0) {
      if (phase === "base") session = isOdd ? HYROX_MON.base_standard : HYROX_MON.base_brick;
      else if (phase === "accum") session = isOdd ? HYROX_MON.accum_standard : HYROX_MON.accum_brick;
      else if (phase === "intens") {
        if (weekNum === 9) session = HYROX_MON.intens_w9;
        else if (weekNum === 10) session = HYROX_MON.intens_w10;
        else session = HYROX_MON.intens_w11;
      } else if (phase === "peak") {
        if (weekNum === 13) session = HYROX_MON.peak_w13;
        else if (weekNum === 14) session = HYROX_MON.peak_w14;
        else session = HYROX_MON.peak_w15;
      } else if (phase === "sharpen") {
        if (weekNum === 17) session = HYROX_MON.sharpen_w17;
        else if (weekNum === 18) session = HYROX_MON.sharpen_w18;
        else session = HYROX_MON.sharpen_w19;
      } else if (phase === "taper") session = HYROX_MON.taper;
    } else if (dayIndex === 1) {
      session = isOdd ? TUE_SESSIONS.standard : HYROX_MOTION;
    } else if (dayIndex === 2) {
      session = WED_SESSIONS[phase] || WED_SESSIONS.base;
    } else if (dayIndex === 3) {
      if (phase === "peak") session = THU_SESSIONS.tempo;
      else if (phase === "sharpen") session = THU_SESSIONS.tempo_sharpen;
      else if (phase === "taper") session = THU_SESSIONS.taper;
      else session = THU_SESSIONS.z2;
    } else if (dayIndex === 4) {
      if (phase === "taper") session = FRI_SESSIONS.taper;
      else if (phase === "sharpen") session = FRI_SESSIONS.sharpen;
      else session = FRI_SESSIONS[phase] || FRI_SESSIONS.base;
    } else if (dayIndex === 5) {
      session = isOdd
        ? HYROX_MOTION
        : { label: SAT_SESSIONS[weekNum].label, note: SAT_SESSIONS[weekNum].note };
    } else if (dayIndex === 6) {
      session = isOdd
        ? SUN_SESSIONS.long_run[phase] || SUN_SESSIONS.long_run.base
        : SUN_SESSIONS.brick[phase] || SUN_SESSIONS.brick.base;
    }
  }

  return session;
};

const buildPlanRows = () => {
  const blocks = PLAN_BLOCKS.map((b, i) => ({
    user_id: USER_ID,
    block_id: BLOCK_ID_BY_LABEL[b.label],
    phase: b.label,
    label: b.label,
    block_order: i + 1,
  }));

  const weeks = [];
  const days = [];

  for (let weekNum = 1; weekNum <= 22; weekNum++) {
    const phaseObj = PHASES.find((p) => p.weeks.includes(weekNum));
    const weekInPhase = phaseObj.weeks.indexOf(weekNum) + 1;
    const blockId = BLOCK_ID_BY_LABEL[phaseObj.label];
    const weekId = `hyrox22_${blockId}_w${weekInPhase}`;
    const isOdd = weekNum % 2 !== 0;
    const weekType = weekNum === RECOVERY_WEEK ? "RECOVERY" : isOdd ? "STANDARD" : "BRICK";

    weeks.push({
      user_id: USER_ID,
      week_id: weekId,
      block_id: blockId,
      label: `${phaseObj.label.toUpperCase()} WK ${weekInPhase}`,
      dates: fmtWeekRange(weekNum),
      phase: phaseObj.label,
      subtitle: `Week ${weekNum} of 22 · ${weekType}`,
      week_order: weekNum,
    });

    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const session = sessionForDay(weekNum, dayIndex);
      const dayDate = getUtcDateForOffset(weekNum, dayIndex);
      const dateLabel = dayDate.toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
      });
      const dayName = dayNames[dayIndex];
      const mappedSession = mapWorkoutLibraryKey(session.label);
      const isRaceDay =
        weekNum === RACE_WEEK && (dayIndex === 5 || dayIndex === 6) && String(session.label).startsWith("RACE DAY");

      days.push({
        user_id: USER_ID,
        week_id: weekId,
        day_name: dayName,
        date_label: dateLabel,
        am_session: mappedSession,
        pm_session: null,
        am_session_custom: session.label,
        pm_session_custom: null,
        note: `${session.note}\n\nWEEK TYPE: ${weekType}`,
        is_race_day: isRaceDay,
        is_sunday: dayName === "SUN",
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

    const { error: profileErr } = await supabase
      .from("user_profiles")
      .update({
        target_race_date: "2026-09-05",
        target_race_name: "Amazfit HYROX Washington DC — Men's Solo",
        races: [
          { name: "Amazfit HYROX Washington DC — Men's Solo", date: "2026-09-05", is_primary: true },
          { name: "Amazfit HYROX Washington DC — Men's Doubles", date: "2026-09-06", is_primary: false },
        ],
      })
      .eq("user_id", USER_ID);
    if (profileErr) throw new Error(`Failed updating user_profiles: ${profileErr.message}`);

    const firstMon = getUtcDateForOffset(1, 0);
    return res.status(200).json({
      success: true,
      user_id: USER_ID,
      blocks_seeded: blocks.length,
      weeks_seeded: weeks.length,
      days_seeded: days.length,
      start_date: fmtDateLabel(START_DATE),
      first_monday: fmtDateLabel(firstMon),
      first_monday_iso: fmtIsoDate(firstMon),
      week_1_range: fmtWeekRange(1),
      week_21_range: fmtWeekRange(21),
      week_22_range: fmtWeekRange(22),
      phase_week_counts: PLAN_BLOCKS.reduce((acc, b) => {
        acc[b.label] = b.week_end - b.week_start + 1;
        return acc;
      }, {}),
    });
  } catch (err) {
    console.error("[plan/seed-20week] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
