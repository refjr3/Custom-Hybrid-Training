import { parseWorkoutDetail } from "./parseWorkoutDetail.js";

const sampleA = {
  sessionName: "STRENGTH A — Full Body Power",
  phase: "Base Rebuild",
  workout: { type: "STRENGTH", duration: "65 min" },
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
};

const sampleB = {
  sessionName: "TEMPO — 20 Min Sustained",
  phase: "Peak",
  workout: { type: "TEMPO", duration: "40 min" },
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
};

const sampleC = {
  sessionName: "ZONE 2 — Easy Aerobic",
  phase: "Base Rebuild",
  workout: { type: "ZONE 2", duration: "30–45 min" },
  note: "Z2 Erg + Mobility — Row, Ski or Echo Bike. Cap at WHOOP strain target. HR 133-148bpm. Dynamic mobility after.",
};

const sampleD = {
  sessionName: "HYROX Motion — Group Class",
  phase: "Peak",
  workout: { type: "HYROX", duration: "60 min" },
  note: `Coach-led group class at gym. Just show up and work.
🟢 Full send.
🟡 Full send or skip — no half measures.
🔴 Full rest.`,
};

const parsedA = parseWorkoutDetail(sampleA);
const parsedB = parseWorkoutDetail(sampleB);
const parsedC = parseWorkoutDetail(sampleC);
const parsedD = parseWorkoutDetail(sampleD);

console.log("=== Sample A ===");
console.log(JSON.stringify(parsedA, null, 2));
console.log("\n=== Sample B ===");
console.log(JSON.stringify(parsedB, null, 2));
console.log("\n=== Sample C ===");
console.log(JSON.stringify(parsedC, null, 2));
console.log("\n=== Sample D ===");
console.log(JSON.stringify(parsedD, null, 2));
