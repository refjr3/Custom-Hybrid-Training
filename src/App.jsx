import { useState } from "react";

// ─────────────────────────────────────────
// WORKOUT LIBRARY (Roxfit-style)
// ─────────────────────────────────────────
const WORKOUTS = {
  // CONDITIONING / HYROX SESSIONS
  "FOR TIME — Ultimate HYROX": {
    type: "FOR TIME",
    duration: "~55 min",
    tag: "HYROX SIM",
    color: "#FFD600",
    steps: [
      "1km Run",
      "1km Ski Erg",
      "50m Sled Push",
      "1km Run",
      "1km Row Erg",
      "80m Burpee Broad Jump",
      "1km Run",
      "2km Bike Erg",
      "100m Sandbag Lunges",
      "100 Wall Balls",
      "1km Run — FINISH",
    ],
    note: "Full send. Lap button each station. Track your splits — this is your benchmark.",
  },
  "FOR TIME — Hyrox Full Runs Half Stations": {
    type: "FOR TIME",
    duration: "~45 min",
    tag: "HYROX SIM",
    color: "#FFD600",
    steps: [
      "1km Run",
      "500m Ski Erg",
      "1km Run",
      "25m Sled Push",
      "1km Run",
      "25m Sled Pull",
      "1km Run",
      "40m Burpee Broad Jump",
      "1km Run",
      "500m Row Erg",
      "1km Run",
      "100m KB Farmers Carry",
      "1km Run",
      "50m Sandbag Lunges",
      "1km Run",
      "50 Wall Balls",
    ],
    note: "Full 1km runs, half station distances. Builds run durability between efforts.",
  },
  "FOR TIME — Hyrox Full Send": {
    type: "FOR TIME",
    duration: "~50 min",
    tag: "HYROX SIM",
    color: "#FFD600",
    steps: [
      "1km Run",
      "50 Wall Balls",
      "1km Ski Erg",
      "50m Sled Push",
      "1km Run",
      "60m Burpee Broad Jump",
      "1km Row Erg",
      "100m Sandbag Lunges",
      "1km Run — FINISH",
    ],
    note: "High-intensity sim. Prioritize the runs — don't blow up on wall balls.",
  },
  "AMRAP 40 — Hyrox Grind": {
    type: "AMRAP",
    duration: "40 min",
    tag: "CONDITIONING",
    color: "#FF4D00",
    steps: [
      "800m Run",
      "30 Wall Balls",
      "25m Sled Pull",
      "15 Burpee To Plate",
      "— Repeat for 40 min —",
    ],
    note: "Count your rounds. This is your AMRAP benchmark — beat it next time.",
  },
  "AMRAP 60 — Ski Row Burpee": {
    type: "AMRAP",
    duration: "60 min",
    tag: "AEROBIC CONDITIONING",
    color: "#FF4D00",
    steps: [
      "500m Ski Erg",
      "20m Burpee Broad Jump",
      "500m Row Erg",
      "20m Burpee Broad Jump",
      "— Repeat for 60 min —",
    ],
    note: "Aerobic monster. Pace the ski erg to sustain quality broad jumps throughout.",
  },
  "EMOM 60 — Hyrox Stations": {
    type: "EMOM",
    duration: "60 min",
    tag: "STATION DRILL",
    color: "#00C2FF",
    steps: [
      "Every 2 min x 30 rounds:",
      "Min 1: 350m Ski Erg",
      "Min 2: 25m Sandbag Lunges",
      "Min 3: 350m Run",
      "Min 4: 2:00 Wall Balls",
      "Min 5: 2:00 Rest",
      "— Rotate for 60 min —",
    ],
    note: "EMOM keeps you honest. If you can't finish in 2 min, scale the distance.",
  },
  "EMOM 40 — Full Hyrox": {
    type: "EMOM",
    duration: "40 min",
    tag: "STATION DRILL",
    color: "#00C2FF",
    steps: [
      "Every 1 min x 40 rounds (5 rounds through):",
      "Min 1: 200m Ski Erg",
      "Min 2: 12 DB Deadlifts",
      "Min 3: 200m Row Erg",
      "Min 4: 20m Burpee Broad Jump",
      "Min 5: 200m Run",
      "Min 6: 20m Sled Push",
      "Min 7: 20 Wall Balls",
      "Min 8: Rest",
    ],
    note: "8-minute cycle repeated 5x. Every minute has a job. Stay disciplined.",
  },
  "INTERVAL — 6 Rounds Run Ski Wall Balls": {
    type: "INTERVAL",
    duration: "~50 min",
    tag: "RUNNING QUALITY",
    color: "#00C2FF",
    steps: [
      "6 Rounds — 8:00 on / 2:00 rest:",
      "800m Run",
      "+ 400m Ski Erg",
      "+ Max Wall Balls remaining time",
      "— Full 2:00 rest between rounds —",
    ],
    note: "Interval 480s/120s x 6. The wall balls are the finisher — push them.",
  },
  // STRENGTH SESSIONS
  "STRENGTH A — Heavy Lower": {
    type: "STRENGTH",
    duration: "60 min",
    tag: "HEAVY LOWER",
    color: "#FF4D00",
    steps: [
      "Back Squat — 4×5 @ 80%+ 1RM",
      "Romanian Deadlift — 4×6 heavy",
      "Weighted Pull-ups — 4×5",
      "Reverse Lunge — 3×8/side loaded",
      "Copenhagen Plank — 3×20 sec/side",
      "Dead Bug — 3×10/side",
    ],
    note: "Strength is the foundation. No grinding reps. If form breaks, drop weight.",
  },
  "STRENGTH B — Structural Integrity": {
    type: "STRENGTH",
    duration: "50 min",
    tag: "HYROX STRENGTH",
    color: "#FF4D00",
    steps: [
      "Sandbag Carry — 5×25m @ 70–80 lbs",
      "Sled Pull — 4×25m heavy",
      "Bulgarian Split Squat — 4×8/side",
      "KB Farmers Carry — 4×30m max load",
      "KB Swings — 4×20 heavy",
      "Box Jumps — 3×8 explosive",
    ],
    note: "This session never leaves the program. It's what keeps you strong through endurance build.",
  },
  "STRENGTH C — Upper Power": {
    type: "STRENGTH",
    duration: "55 min",
    tag: "UPPER BODY",
    color: "#FF4D00",
    steps: [
      "Bench Press — 4×5 @ 80% 1RM",
      "Pendlay Row — 4×6 explosive",
      "Push Press — 3×5 heavy",
      "Ring Rows — 3×10",
      "Dumbbell Z-Press — 3×10",
      "Plyo Push-ups — 3×8",
      "Hollow Body Hold — 3×30 sec",
    ],
    note: "Upper day has explosive work built in. Push press and plyo push-ups are your plyometric stimulus.",
  },
  // RUNNING SESSIONS
  "THRESHOLD — 10×2 Min": {
    type: "THRESHOLD",
    duration: "45 min",
    tag: "RUNNING QUALITY",
    color: "#00C2FF",
    steps: [
      "Warm-up — 1.5 mile easy",
      "10 × 2 min @ threshold pace",
      "40 sec standing recovery each",
      "Cool-down — 1.5 mile easy",
      "Strides — 4×20 sec at end",
    ],
    note: "RMR bread-and-butter session. Threshold = the pace you could hold for ~1 hour. Not a sprint.",
  },
  "FARTLEK — 30 Min": {
    type: "FARTLEK",
    duration: "35 min",
    tag: "RUNNING VARIETY",
    color: "#00C2FF",
    steps: [
      "Warm-up — 10 min easy",
      "Fartlek: 1 min hard / 2 min easy × 8",
      "Hard = 5k effort, Easy = Zone 2",
      "Cool-down — 5 min easy",
    ],
    note: "Unstructured intensity. Run by feel, not pace. Great for aerobic-anaerobic transition work.",
  },
  "HILL REPEATS": {
    type: "INTERVALS",
    duration: "40 min",
    tag: "EXPLOSIVE RUNNING",
    color: "#00C2FF",
    steps: [
      "Warm-up — 1 mile easy",
      "10 × 60 sec uphill hard",
      "Walk back recovery each rep",
      "Cool-down — 1 mile easy",
    ],
    note: "Hill work builds power and running economy. This directly transfers to HYROX sled work.",
  },
  "ZONE 2 — Easy Aerobic": {
    type: "ZONE 2",
    duration: "40–60 min",
    tag: "AEROBIC BASE",
    color: "#888",
    steps: [
      "HR cap: Zone 2 (130–145 bpm)",
      "Pace: conversational — you can speak full sentences",
      "Cadence: 175–180 spm target",
      "Duration: WHOOP dependent",
      "Post-run: 10 min hip mobility",
    ],
    note: "If HR climbs above Zone 2, walk until it drops. No exceptions. This is 80% of your aerobic engine.",
  },
  "LONG RUN — Base Builder": {
    type: "LONG RUN",
    duration: "75–120 min",
    tag: "WEEKLY ANCHOR",
    color: "#888",
    steps: [
      "Full run @ conversational pace",
      "Zone 2 only — HR below 150 bpm",
      "Fuel: gel every 40–45 min",
      "Hydration: every 20 min",
      "Last 10%: can push to Zone 3",
    ],
    note: "This grows by 1–2 miles each week. It is the most important session of the week.",
  },
  "MOBILITY — Full Recovery": {
    type: "RECOVERY",
    duration: "25–30 min",
    tag: "ACTIVE RECOVERY",
    color: "#333",
    steps: [
      "Hip flexor stretch — 3×60 sec/side",
      "Hamstring flow — 10 min",
      "Thoracic rotation — foam roll + twist",
      "Ankle circles — 2×20/side",
      "Calf/achilles — 3×45 sec/side",
      "Optional: 20 min easy walk",
    ],
    note: "WHOOP Red day prescription. Non-negotiable on red. Optional add-on on yellow.",
  },
};

// ─────────────────────────────────────────
// TAPER BLOCK
// ─────────────────────────────────────────
const taperWeeks = [
  {
    id: "tw1", label: "TAPER WK 1", dates: "Mar 15–21", phase: "MIAMI TAPER",
    subtitle: "Moderate Volume · Stay Sharp",
    days: [
      { day: "MON", date: "Mar 16", am: "STRENGTH A — Heavy Lower", pm: null, note2a: null },
      { day: "TUE", date: "Mar 17", am: "ZONE 2 — Easy Aerobic", pm: null, note2a: null },
      { day: "WED", date: "Mar 18", am: "FOR TIME — Hyrox Full Runs Half Stations", pm: null, note2a: "Taper version — keep effort 80%. Don't race it." },
      { day: "THU", date: "Mar 19", am: "STRENGTH B — Structural Integrity", pm: "ZONE 2 — Easy Aerobic", note2a: "AM heavy · PM 25 min easy only" },
      { day: "FRI", date: "Mar 20", am: "THRESHOLD — 10×2 Min", pm: null, note2a: "Scale to 6×2 if legs feel heavy" },
      { day: "SAT", date: "Mar 21", am: "LONG RUN — Base Builder", pm: null, note2a: "8–9 miles. Last long effort before Miami." },
      { day: "SUN", date: "Mar 22", am: "MOBILITY — Full Recovery", pm: null, note2a: "WHOOP governs. Green = walk + yoga. Red = full rest." },
    ],
  },
  {
    id: "tw2", label: "TAPER WK 2", dates: "Mar 22–28", phase: "MIAMI TAPER",
    subtitle: "Reduced Volume · Race Sharpness",
    days: [
      { day: "MON", date: "Mar 23", am: "STRENGTH A — Heavy Lower", pm: null, note2a: "Drop to 3×5 @ 70%. Move well, not heavy." },
      { day: "TUE", date: "Mar 24", am: "ZONE 2 — Easy Aerobic", pm: null, note2a: "25 min only. Short and done." },
      { day: "WED", date: "Mar 25", am: "THRESHOLD — 10×2 Min", pm: null, note2a: "Scale to 4×2 @ race pace. Sharpness only." },
      { day: "THU", date: "Mar 26", am: "MOBILITY — Full Recovery", pm: null, note2a: "No training load today." },
      { day: "FRI", date: "Mar 27", am: "ZONE 2 — Easy Aerobic", pm: null, note2a: "15 min shakeout + 3 strides. Done." },
      { day: "SAT", date: "Mar 28", am: "MOBILITY — Full Recovery", pm: null, note2a: "Full rest. High carb dinner. 8+ hrs sleep." },
      { day: "SUN", date: "Mar 29", am: "MOBILITY — Full Recovery", pm: null, note2a: "Travel prep. Visualize race. Early bed." },
    ],
  },
  {
    id: "rw", label: "RACE WEEK", dates: "Mar 29–Apr 4", phase: "MIAMI RACE",
    subtitle: "Minimal Load · Peak Freshness",
    days: [
      { day: "MON", date: "Mar 30", am: "ZONE 2 — Easy Aerobic", pm: null, note2a: "15 min only. 3 strides. Walk away." },
      { day: "TUE", date: "Mar 31", am: "MOBILITY — Full Recovery", pm: null, note2a: "Full rest. Carb load begins." },
      { day: "WED", date: "Apr 1", am: "MOBILITY — Full Recovery", pm: null, note2a: "Off feet. High carb. Sleep." },
      { day: "THU", date: "Apr 2", am: "MOBILITY — Full Recovery", pm: null, note2a: "Travel day. Electrolytes all day. Race kit check tonight." },
      { day: "FRI", date: "Apr 3", am: "MOBILITY — Full Recovery", pm: null, note2a: "Race eve. Early dinner 6pm. Bed by 9pm. No stimulants." },
      {
        day: "SAT", date: "Apr 4",
        am: "🏁 RACE DAY — MIAMI",
        pm: null,
        note2a: "Wake 3 hrs before gun · High carb low fiber breakfast · 10 min jog + 4 strides · EXECUTE",
        isRaceDay: true,
      },
      { day: "SUN", date: "Apr 5", am: "MOBILITY — Full Recovery", pm: null, note2a: "Celebrate. Walk. High protein. Phase 1 starts Monday." },
    ],
  },
];

// ─────────────────────────────────────────
// PHASE 1 BLOCK — 4 weeks
// ─────────────────────────────────────────
const phase1Weeks = [
  {
    id: "p1w1", label: "PHASE 1 · WK 1", dates: "Apr 7–13", phase: "PHASE 1",
    subtitle: "Base Rebuild · Reintroduce Volume",
    days: [
      { day: "MON", date: "Apr 7", am: "STRENGTH A — Heavy Lower", pm: "ZONE 2 — Easy Aerobic", note2a: "AM lift · PM 30 min easy. First 2-a-day post-Miami." },
      { day: "TUE", date: "Apr 8", am: "INTERVAL — 6 Rounds Run Ski Wall Balls", pm: null, note2a: "Scale to 4 rounds if legs are dead from Monday." },
      { day: "WED", date: "Apr 9", am: "STRENGTH B — Structural Integrity", pm: "ZONE 2 — Easy Aerobic", note2a: "AM structural · PM 25 min Zone 2 flush." },
      { day: "THU", date: "Apr 10", am: "FOR TIME — Hyrox Full Runs Half Stations", pm: null, note2a: "First real HYROX sim post-Miami. Lap every station." },
      { day: "FRI", date: "Apr 11", am: "STRENGTH C — Upper Power", pm: "THRESHOLD — 10×2 Min", note2a: "AM upper · PM threshold. Classic 2-a-day." },
      { day: "SAT", date: "Apr 12", am: "LONG RUN — Base Builder", pm: null, note2a: "7–8 miles. Zone 2. Gel at 40 min." },
      { day: "SUN", date: "Apr 13", am: "MOBILITY — Full Recovery", pm: null, note2a: "WHOOP: Green = 30 min swim. Yellow = mobility. Red = full rest." },
    ],
  },
  {
    id: "p1w2", label: "PHASE 1 · WK 2", dates: "Apr 14–20", phase: "PHASE 1",
    subtitle: "Volume Up · Compromised Runs Longer",
    days: [
      { day: "MON", date: "Apr 14", am: "STRENGTH A — Heavy Lower", pm: "ZONE 2 — Easy Aerobic", note2a: "Load increases 2–5% from Week 1." },
      { day: "TUE", date: "Apr 15", am: "EMOM 60 — Hyrox Stations", pm: null, note2a: "Full 60 min EMOM. Pace the ski erg to sustain quality." },
      { day: "WED", date: "Apr 16", am: "STRENGTH B — Structural Integrity", pm: "FARTLEK — 30 Min", note2a: "AM structural · PM fartlek. Run by feel." },
      { day: "THU", date: "Apr 17", am: "FOR TIME — Hyrox Full Send", pm: null, note2a: "FOR TIME. Lap button every station. Beat your Week 1 time." },
      { day: "FRI", date: "Apr 18", am: "STRENGTH C — Upper Power", pm: "THRESHOLD — 10×2 Min", note2a: "Add 2 reps vs Week 1 if feeling strong." },
      { day: "SAT", date: "Apr 19", am: "LONG RUN — Base Builder", pm: null, note2a: "9–10 miles. Same Zone 2 rules. Gel every 40 min." },
      { day: "SUN", date: "Apr 20", am: "MOBILITY — Full Recovery", pm: null, note2a: "Green = easy swim or row 20 min. Yellow/Red = full rest." },
    ],
  },
  {
    id: "p1w3", label: "PHASE 1 · WK 3", dates: "Apr 21–27", phase: "PHASE 1",
    subtitle: "Peak Week · Full HYROX Simulation",
    days: [
      { day: "MON", date: "Apr 21", am: "STRENGTH A — Heavy Lower", pm: "ZONE 2 — Easy Aerobic", note2a: "Peak strength week. 5×5 squats today." },
      { day: "TUE", date: "Apr 22", am: "AMRAP 60 — Ski Row Burpee", pm: null, note2a: "60 min aerobic monster. Count rounds. Steady pace." },
      { day: "WED", date: "Apr 23", am: "STRENGTH B — Structural Integrity", pm: "HILL REPEATS", note2a: "AM structural · PM hills. Power transfer session." },
      { day: "THU", date: "Apr 24", am: "FOR TIME — Ultimate HYROX", pm: null, note2a: "Full HYROX simulation. Your hardest session of Phase 1. Benchmark this time." },
      { day: "FRI", date: "Apr 25", am: "STRENGTH C — Upper Power", pm: "THRESHOLD — 10×2 Min", note2a: "Peak threshold — 10 full reps. Stay disciplined on 40 sec rest." },
      { day: "SAT", date: "Apr 26", am: "LONG RUN — Base Builder", pm: null, note2a: "11–12 miles. You match your pre-Miami peak. Milestone." },
      { day: "SUN", date: "Apr 27", am: "MOBILITY — Full Recovery", pm: null, note2a: "Peak week recovery. Whatever WHOOP says — listen to it." },
    ],
  },
  {
    id: "p1w4", label: "PHASE 1 · WK 4", dates: "Apr 28–May 4", phase: "PHASE 1",
    subtitle: "Deload · Recover & Consolidate",
    days: [
      { day: "MON", date: "Apr 28", am: "STRENGTH A — Heavy Lower", pm: null, note2a: "3×5 @ 70%. Move well. No new stimulus." },
      { day: "TUE", date: "Apr 29", am: "EMOM 40 — Full Hyrox", pm: null, note2a: "Deload conditioning. EMOM keeps intensity honest." },
      { day: "WED", date: "Apr 30", am: "STRENGTH B — Structural Integrity", pm: "ZONE 2 — Easy Aerobic", note2a: "Light carry work · 25 min easy run." },
      { day: "THU", date: "May 1", am: "AMRAP 40 — Hyrox Grind", pm: null, note2a: "Shorter AMRAP. Deload conditioning session." },
      { day: "FRI", date: "May 2", am: "MOBILITY — Full Recovery", pm: "THRESHOLD — 10×2 Min", note2a: "Scale to 6×2. Deload threshold." },
      { day: "SAT", date: "May 3", am: "LONG RUN — Base Builder", pm: null, note2a: "8 miles easy. No pushing. Adaptation happens here." },
      { day: "SUN", date: "May 4", am: "MOBILITY — Full Recovery", pm: null, note2a: "End of Phase 1. Phase 2 loads up next Monday." },
    ],
  },
];

// ─────────────────────────────────────────
// TYPE COLORS
// ─────────────────────────────────────────
const getWorkoutColor = (name) => {
  if (!name) return "#1a1a1a";
  if (name.includes("🏁")) return "#FF4D00";
  if (name.includes("FOR TIME") || name.includes("AMRAP")) return "#FFD600";
  if (name.includes("EMOM") || name.includes("INTERVAL") || name.includes("THRESHOLD") || name.includes("FARTLEK") || name.includes("HILL")) return "#00C2FF";
  if (name.includes("STRENGTH")) return "#FF4D00";
  if (name.includes("ZONE 2") || name.includes("LONG RUN")) return "#4CAF50";
  if (name.includes("MOBILITY") || name.includes("RECOVERY")) return "#444";
  return "#888";
};

const getTypeLabel = (name) => {
  if (!name) return "";
  const w = WORKOUTS[name];
  return w ? w.type : name.split(" — ")[0];
};

export default function App() {
  const [activeBlock, setActiveBlock] = useState("taper");
  const [activeWeekId, setActiveWeekId] = useState("tw1");
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSession, setSelectedSession] = useState("am"); // 'am' | 'pm'

  const weeks = activeBlock === "taper" ? taperWeeks : phase1Weeks;
  const activeWeek = weeks.find((w) => w.id === activeWeekId) || weeks[0];

  const handleBlockSwitch = (b) => {
    setActiveBlock(b);
    setSelectedDay(null);
    setActiveWeekId(b === "taper" ? "tw1" : "p1w1");
  };

  const dayData = selectedDay ? activeWeek.days.find((d) => d.day === selectedDay) : null;
  const workout = dayData
    ? WORKOUTS[selectedSession === "am" ? dayData.am : dayData.pm]
    : null;
  const workoutName = dayData ? (selectedSession === "am" ? dayData.am : dayData.pm) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#E8E4DC", fontFamily: "'Courier New', Courier, monospace" }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #1c1c1c", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 5, color: "#444", marginBottom: 3 }}>ELITE HYBRID PERFORMANCE OS</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>FAGUNDO</div>
          <div style={{ fontSize: 8, color: "#333", letterSpacing: 3, marginTop: 2 }}>209LB · 15.4%BF · ALMI 10.7 · BONE T+2.2</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["taper", "MIAMI TAPER"], ["phase1", "PHASE 1"]].map(([b, label]) => (
            <button key={b} onClick={() => handleBlockSwitch(b)} style={{
              background: activeBlock === b ? "#E8E4DC" : "transparent",
              border: `1px solid ${activeBlock === b ? "#E8E4DC" : "#2a2a2a"}`,
              color: activeBlock === b ? "#000" : "#444",
              padding: "7px 14px", fontSize: 9, letterSpacing: 2,
              cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── WEEK TABS ── */}
      <div style={{ display: "flex", gap: 2, padding: "10px 20px", overflowX: "auto", borderBottom: "1px solid #141414" }}>
        {weeks.map((w) => (
          <button key={w.id} onClick={() => { setActiveWeekId(w.id); setSelectedDay(null); }} style={{
            background: activeWeekId === w.id ? "#141414" : "transparent",
            border: `1px solid ${activeWeekId === w.id ? "#2a2a2a" : "transparent"}`,
            color: activeWeekId === w.id ? "#E8E4DC" : "#333",
            padding: "8px 12px", fontSize: 8, letterSpacing: 2,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", fontWeight: 700,
          }}>
            {w.label}
            <div style={{ fontSize: 7, color: "#333", marginTop: 2, letterSpacing: 1 }}>{w.dates}</div>
          </button>
        ))}
      </div>

      {/* ── WEEK META ── */}
      <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid #141414" }}>
        <div style={{ fontSize: 8, letterSpacing: 4, color: activeBlock === "taper" ? "#FFD600" : "#FF4D00", marginBottom: 3 }}>{activeWeek.phase}</div>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 1 }}>{activeWeek.label} <span style={{ fontSize: 9, color: "#333", letterSpacing: 2, fontWeight: 400 }}>{activeWeek.dates}</span></div>
        <div style={{ fontSize: 8, color: "#444", letterSpacing: 2, marginTop: 3 }}>{activeWeek.subtitle}</div>
      </div>

      {/* ── DAY GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: "#141414" }}>
        {activeWeek.days.map((d) => {
          const amColor = getWorkoutColor(d.am);
          const pmColor = d.pm ? getWorkoutColor(d.pm) : null;
          const isSelected = selectedDay === d.day;
          return (
            <button key={d.day} onClick={() => { setSelectedDay(isSelected ? null : d.day); setSelectedSession("am"); }} style={{
              background: isSelected ? "#141414" : "#0c0c0c",
              border: "none",
              borderTop: `2px solid ${isSelected ? amColor : "transparent"}`,
              padding: "12px 8px 10px", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
            }}>
              <div style={{ fontSize: 8, color: "#333", letterSpacing: 2 }}>{d.day}</div>
              <div style={{ fontSize: 7, color: "#222", marginBottom: 6 }}>{d.date}</div>

              {/* AM block */}
              <div style={{ marginBottom: d.pm ? 4 : 0 }}>
                <div style={{ fontSize: 7, color: amColor, letterSpacing: 1, fontWeight: 700, lineHeight: 1.3 }}>
                  {d.isRaceDay ? "🏁 RACE" : getTypeLabel(d.am)}
                </div>
                <div style={{ height: 2, background: amColor, opacity: 0.4, borderRadius: 1, marginTop: 4 }} />
              </div>

              {/* PM block */}
              {d.pm && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 6, color: "#333", letterSpacing: 1, marginBottom: 2 }}>PM</div>
                  <div style={{ fontSize: 7, color: pmColor, letterSpacing: 1, fontWeight: 700, lineHeight: 1.3 }}>
                    {getTypeLabel(d.pm)}
                  </div>
                  <div style={{ height: 2, background: pmColor, opacity: 0.4, borderRadius: 1, marginTop: 4 }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── DAY DETAIL ── */}
      {dayData && (
        <div style={{ background: "#0c0c0c", borderBottom: "1px solid #1a1a1a" }}>

          {/* AM/PM Toggle */}
          {dayData.pm && (
            <div style={{ display: "flex", borderBottom: "1px solid #141414" }}>
              {[["am", "AM SESSION"], ["pm", "PM SESSION"]].map(([s, label]) => (
                <button key={s} onClick={() => setSelectedSession(s)} style={{
                  flex: 1, background: selectedSession === s ? "#141414" : "transparent",
                  border: "none", borderBottom: `2px solid ${selectedSession === s ? getWorkoutColor(s === "am" ? dayData.am : dayData.pm) : "transparent"}`,
                  color: selectedSession === s ? "#E8E4DC" : "#333",
                  padding: "10px", fontSize: 9, letterSpacing: 3, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                }}>{label}</button>
              ))}
            </div>
          )}

          <div style={{ padding: "20px 20px 16px" }}>
            {/* Workout Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 8, letterSpacing: 4, color: workout ? getWorkoutColor(workoutName) : "#444", marginBottom: 4 }}>
                  {dayData.day} · {dayData.date} {dayData.pm ? `· ${selectedSession.toUpperCase()}` : ""}
                </div>
                {dayData.isRaceDay && selectedSession === "am" ? (
                  <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1, color: "#FF4D00" }}>🏁 RACE DAY — MIAMI</div>
                ) : workout ? (
                  <>
                    <div style={{ fontSize: 9, color: getWorkoutColor(workoutName), letterSpacing: 3, marginBottom: 4 }}>{workout.type}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>{workoutName.split(" — ")[1] || workoutName}</div>
                    <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                      <span style={{ fontSize: 8, color: "#444", letterSpacing: 2 }}>{workout.duration}</span>
                      <span style={{ fontSize: 8, color: "#333", letterSpacing: 2 }}>· {workout.tag}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>REST</div>
                )}
              </div>
              <button onClick={() => setSelectedDay(null)} style={{
                background: "none", border: "1px solid #1a1a1a", color: "#333",
                padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 9, letterSpacing: 2,
              }}>CLOSE</button>
            </div>

            {/* Steps */}
            {dayData.isRaceDay && selectedSession === "am" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {["Wake 3 hrs before gun — calm morning", "Pre-race fuel — high carb, low fiber, no dairy", "10 min easy jog + 4 strides", "Skip stimulants — the race is your caffeine", "EXECUTE YOUR PACING STRATEGY"].map((s, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#111", borderLeft: `2px solid #FF4D00`, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "#D0CCC6", letterSpacing: 0.5 }}>{s}</span>
                  </div>
                ))}
              </div>
            ) : workout ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
                {workout.steps.map((s, i) => {
                  const isDivider = s.startsWith("—");
                  const isHeader = s.endsWith(":");
                  return (
                    <div key={i} style={{
                      padding: isDivider ? "6px 14px" : "10px 14px",
                      background: isDivider || isHeader ? "transparent" : "#111",
                      borderLeft: isDivider || isHeader ? "none" : `2px solid ${getWorkoutColor(workoutName)}`,
                      opacity: isDivider || isHeader ? 0.4 : 1,
                    }}>
                      <span style={{ fontSize: isDivider || isHeader ? 9 : 11, color: isDivider || isHeader ? "#444" : "#D0CCC6", letterSpacing: 1 }}>{s}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Coach note */}
            <div style={{ padding: "10px 14px", background: "#111", borderLeft: "2px solid #1e1e1e", fontSize: 10, color: "#444", letterSpacing: 1, lineHeight: 1.8 }}>
              <span style={{ color: "#2a2a2a", marginRight: 8 }}>COACH ›</span>
              {dayData.isRaceDay && selectedSession === "am"
                ? dayData.note2a
                : selectedSession === "pm" && dayData.note2a && dayData.pm
                  ? `PM NOTE: ${dayData.note2a?.split("·").pop()?.trim() || workout?.note}`
                  : dayData.note2a || workout?.note}
            </div>

            {/* 2-a-day badge */}
            {dayData.pm && (
              <div style={{ marginTop: 10, padding: "6px 12px", background: "#111", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FFD600" }} />
                <span style={{ fontSize: 8, letterSpacing: 3, color: "#555" }}>2-A-DAY · {dayData.note2a?.split("·")[0]?.trim()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LEGEND ── */}
      <div style={{ padding: "16px 20px", display: "flex", gap: 20, flexWrap: "wrap", borderTop: "1px solid #141414" }}>
        {[
          ["FOR TIME / AMRAP", "#FFD600"],
          ["EMOM / THRESHOLD / INTERVALS", "#00C2FF"],
          ["STRENGTH", "#FF4D00"],
          ["ZONE 2 / LONG RUN", "#4CAF50"],
          ["RECOVERY", "#444"],
        ].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 7, letterSpacing: 2, color: "#333" }}>{label}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
          {[["GREEN >66%", "#4CAF50"], ["YELLOW 35–65%", "#FFD600"], ["RED <35%", "#FF4D00"]].map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
              <span style={{ fontSize: 7, letterSpacing: 2, color: "#333" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
