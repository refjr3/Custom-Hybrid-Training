import { useState } from "react";

const C = {
  bg:"#f0ece4", card:"#e8e4dc", card2:"#ddd9d0",
  border:"#1a1a1a", text:"#1a1a1a", muted:"#888", light:"#bbb",
  red:"#FF3C00", green:"#2a6a2a",
  ff:"'Bebas Neue','Arial Black',sans-serif",
  fm:"'Space Mono',monospace",
  fs:"'Inter',-apple-system,sans-serif",
};

// ─── HR ZONES (based on LTHR 165–170 bpm) ────────────────
const HR_ZONES = [
  { zone:"Z1", name:"WARM UP",    pct:"69–80%", bpm:"114–136", color:"#aaa" },
  { zone:"Z2", name:"EASY",       pct:"80–89%", bpm:"132–151", color:C.green },
  { zone:"Z3", name:"AEROBIC",    pct:"89–91%", bpm:"147–154", color:"#b87800" },
  { zone:"Z4", name:"THRESHOLD",  pct:"91–99%", bpm:"150–168", color:"#cc6600" },
  { zone:"Z5", name:"MAXIMUM",    pct:"99–114%",bpm:"163–194", color:C.red },
];

// ─── SUPPLEMENTS ─────────────────────────────────────────
const SUPPS = [
  { time:"MORNING", icon:"☀️", items:[
    { name:"Beta Alanine", dose:"3.2–6.4g", note:"Take with breakfast. May cause tingling — normal.", timing:"Pre-workout or AM" },
    { name:"Creatine Monohydrate", dose:"5g", note:"Take consistently daily. Timing doesn't matter — just be consistent.", timing:"Any time" },
    { name:"Whey Protein #1", dose:"25–40g", note:"First shake of the day. Post-morning workout or with breakfast.", timing:"Post AM workout" },
  ]},
  { time:"AFTERNOON / POST-WORKOUT", icon:"💪", items:[
    { name:"Whey Protein #2", dose:"25–40g", note:"Second shake. Post PM workout or between meals to hit protein targets.", timing:"Post PM workout" },
  ]},
  { time:"NIGHT", icon:"🌙", items:[
    { name:"Magnesium Glycinate", dose:"300–400mg", note:"Supports deep sleep and HRV recovery. Take 30–60 min before bed.", timing:"30–60 min before bed" },
    { name:"L-Theanine", dose:"200–400mg", note:"Pairs with magnesium for calm sleep. Non-sedating, promotes natural rest.", timing:"With magnesium" },
    { name:"Sermorelin", dose:"Per protocol", note:"Growth hormone secretagogue. Take on empty stomach before sleep for maximum GH pulse.", timing:"Empty stomach, pre-sleep" },
  ]},
  { time:"NOTES", icon:"📋", items:[
    { name:"Daily Protein Target", dose:"180–215g", note:"~1g per lb lean mass. Split across meals + 2 shakes.", timing:"Throughout day" },
    { name:"Hydration Target", dose:"3–4L water", note:"Critical for creatine efficacy and endurance performance.", timing:"Throughout day" },
    { name:"LDL / ApoB Flag", dose:"Diet focus", note:"LDL 145, ApoB 103 — both flagged HIGH. Reduce saturated fat, increase fiber, omega-3s.", timing:"Every meal" },
  ]},
];

// ─── WORKOUT LIBRARY ─────────────────────────────────────
const WL = {
  // HYROX SESSIONS
  "FOR TIME — Ultimate HYROX": {
    type:"FOR TIME", duration:"~55 min", tag:"HYROX SIM", accent:C.red,
    steps:["1km Run","1km Ski Erg","50m Sled Push","1km Run","1km Row Erg","80m Burpee Broad Jump","1km Run","2km Bike Erg","100m Sandbag Lunges","100 Wall Balls","1km Run — FINISH"],
    note:"Full send. Lap button each station. Track splits — this is your benchmark.",
  },
  "FOR TIME — Hyrox Full Runs Half Stations": {
    type:"FOR TIME", duration:"~45 min", tag:"HYROX SIM", accent:C.red,
    steps:["1km Run","500m Ski Erg","1km Run","25m Sled Push","1km Run","25m Sled Pull","1km Run","40m Burpee Broad Jump","1km Run","500m Row Erg","1km Run","100m KB Farmers Carry","1km Run","50m Sandbag Lunges","1km Run","50 Wall Balls"],
    note:"Full 1km runs, half station distances. Builds run durability between efforts.",
  },
  "FOR TIME — Hyrox Full Send": {
    type:"FOR TIME", duration:"~50 min", tag:"HYROX SIM", accent:C.red,
    steps:["1km Run","50 Wall Balls","1km Ski Erg","50m Sled Push","1km Run","60m Burpee Broad Jump","1km Row Erg","100m Sandbag Lunges","1km Run — FINISH"],
    note:"High-intensity sim. Prioritize the runs — don't blow up on wall balls.",
  },
  "AMRAP 40 — Hyrox Grind": {
    type:"AMRAP", duration:"40 min", tag:"CONDITIONING", accent:C.red,
    steps:["800m Run","30 Wall Balls","25m Sled Pull","15 Burpee To Plate","— Repeat for 40 min —"],
    note:"Count your rounds. AMRAP benchmark — beat it next time.",
  },
  "AMRAP 60 — Ski Row Burpee": {
    type:"AMRAP", duration:"60 min", tag:"AEROBIC CONDITIONING", accent:C.red,
    steps:["500m Ski Erg","20m Burpee Broad Jump","500m Row Erg","20m Burpee Broad Jump","— Repeat for 60 min —"],
    note:"Aerobic monster. Pace the ski erg to sustain quality broad jumps throughout.",
  },
  "EMOM 60 — Hyrox Stations": {
    type:"EMOM", duration:"60 min", tag:"STATION DRILL", accent:C.border,
    steps:["Every 2 min x 30 rounds:","Min 1 — 350m Ski Erg","Min 2 — 25m Sandbag Lunges","Min 3 — 350m Run","Min 4 — 2:00 Wall Balls","Min 5 — 2:00 Rest","— Rotate for 60 min —"],
    note:"EMOM keeps you honest. If you can't finish in 2 min, scale the distance.",
  },
  "EMOM 40 — Full Hyrox": {
    type:"EMOM", duration:"40 min", tag:"STATION DRILL", accent:C.border,
    steps:["Every 1 min x 40 rounds (5 cycles):","Min 1 — 200m Ski Erg","Min 2 — 12 DB Deadlifts","Min 3 — 200m Row Erg","Min 4 — 20m Burpee Broad Jump","Min 5 — 200m Run","Min 6 — 20m Sled Push","Min 7 — 20 Wall Balls","Min 8 — Rest"],
    note:"8-minute cycle repeated 5x. Every minute has a job.",
  },
  // STRENGTH — FULL BODY (3 rotating sessions)
  "STRENGTH A — Full Body Power": {
    type:"STRENGTH", duration:"65 min", tag:"FULL BODY · PUSH DOMINANT", accent:C.border,
    steps:[
      "— LOWER —",
      "Barbell Squat — 4×5 @ 80%+ 1RM",
      "Bulgarian Split Squat — 3×8/side",
      "Leg Extension — 3×12",
      "— PUSH —",
      "Incline Bench Press — 4×6",
      "Push Press — 3×5 explosive",
      "Lateral Raise — 3×15",
      "Explosive Plyo Push-ups — 3×8",
      "— CORE —",
      "Dead Bug — 3×10/side",
      "Copenhagen Plank — 3×20 sec/side",
    ],
    note:"Push dominant day. Barbell squat is your anchor — load it. Plyo push-ups finish the session with explosiveness.",
  },
  "STRENGTH B — Full Body Pull": {
    type:"STRENGTH", duration:"65 min", tag:"FULL BODY · PULL DOMINANT", accent:C.border,
    steps:[
      "— LOWER —",
      "Barbell Deadlift — 4×4 @ 82%+ 1RM",
      "Hip Thrust — 4×8 heavy",
      "Hamstring Curl — 3×12",
      "— PULL —",
      "Barbell Rows — 4×6 explosive",
      "Pull-ups — 4×6 weighted",
      "Dumbbell Bent Over Row — 3×10/side",
      "Bicep Curls — 3×12",
      "— HYROX CARRY —",
      "KB Swings — 4×20 heavy",
    ],
    note:"Pull dominant day. Deadlift is the anchor. KB swings finish it — this is your HYROX structural integrity movement.",
  },
  "STRENGTH C — Full Body Hybrid": {
    type:"STRENGTH", duration:"65 min", tag:"FULL BODY · HYBRID", accent:C.border,
    steps:[
      "— LOWER —",
      "Romanian Deadlift — 4×6 heavy",
      "Leg Extension — 3×12",
      "— PUSH / PULL SUPERSET —",
      "A1: Overhead DB Press — 4×10",
      "A2: Pull-ups — 4×8 bodyweight",
      "B1: Dips — 3×10",
      "B2: Dumbbell Bent Over Row — 3×10/side",
      "C1: Seated Tricep Extension — 3×12",
      "C2: Bicep Curls — 3×12",
      "— EXPLOSIVE —",
      "Explosive Plyo Push-ups — 3×8",
    ],
    note:"Superset format keeps heart rate elevated and saves time. Rest 60–90 sec between supersets only.",
  },
  // RUNNING SESSIONS
  "THRESHOLD — 10×2 Min": {
    type:"THRESHOLD", duration:"45 min", tag:"Z4 · 150–168 BPM", accent:C.border,
    steps:[
      "Warm-up — 1.5 mile @ Z2",
      "10 × 2 min @ Z4 threshold (150–168 bpm)",
      "40 sec standing recovery each rep",
      "Cool-down — 1.5 mile easy",
      "Strides — 4×20 sec at end",
    ],
    note:"Z4 = 91–99% LTHR = 150–168 bpm on your Garmin. This is your bread-and-butter running session.",
  },
  "TEMPO — 20 Min Sustained": {
    type:"TEMPO", duration:"40 min", tag:"Z3–Z4 · 147–168 BPM", accent:C.border,
    steps:[
      "Warm-up — 1 mile @ Z2",
      "20 min sustained tempo @ Z3–Z4 (147–162 bpm)",
      "Focus on smooth, controlled effort",
      "Cool-down — 1 mile easy",
    ],
    note:"Tempo pace = comfortably hard. You can speak short sentences but not hold a conversation. Z3–Z4 boundary.",
  },
  "VO2 MAX — Short Intervals": {
    type:"VO2 MAX", duration:"40 min", tag:"Z5 · 163–194 BPM", accent:C.red,
    steps:[
      "Warm-up — 1 mile @ Z2",
      "8 × 3 min @ Z5 (163–194 bpm)",
      "3 min active recovery jog each",
      "Cool-down — 1 mile easy",
    ],
    note:"Z5 = 99–114% LTHR. Hardest running session of the week. Only do this when WHOOP is green. Skip if yellow.",
  },
  "ZONE 2 — Easy Aerobic": {
    type:"ZONE 2", duration:"30–45 min", tag:"Z2 · 132–151 BPM", accent:C.green,
    steps:[
      "HR target: Z2 — 132–151 bpm",
      "Pace: conversational — full sentences",
      "Cadence: 175–180 spm target",
      "Duration: WHOOP dependent",
      "Post-run: 10 min hip mobility",
    ],
    note:"Based on your Garmin %LTHR zones. Z2 = 80–89% of 165–170 bpm LTHR = 132–151 bpm. Walk if HR climbs above 151.",
  },
  "LONG RUN — Base Builder": {
    type:"LONG RUN", duration:"75–120 min", tag:"Z2 · 132–151 BPM", accent:C.green,
    steps:[
      "Full run @ conversational pace",
      "Z2 target: 132–151 bpm entire run",
      "Fuel: gel every 40–45 min",
      "Hydration: sip every 20 min",
      "Last 10%: can drift to Z3 (up to 154 bpm)",
    ],
    note:"This grows 1–2 miles each week. Most important session of the week. HR discipline is non-negotiable.",
  },
  // SUNDAY OPTIONS
  "SUNDAY — Mobility Protocol": {
    type:"MOBILITY", duration:"35–45 min", tag:"ACTIVE RECOVERY", accent:"#999",
    steps:[
      "— FLOW (15 min) —",
      "Hip flexor flow — 3×60 sec/side",
      "Hamstring stretch — 3×45 sec/side",
      "Thoracic rotation — 10 reps/side",
      "Pigeon pose — 2×60 sec/side",
      "— FOAM ROLL (10 min) —",
      "Quads, IT band, calves, upper back",
      "— CONTRAST THERAPY —",
      "Cold shower or ice bath: 3–5 min",
      "Hot shower or sauna: 10–15 min",
      "Repeat 2–3 rounds if available",
    ],
    note:"Full nervous system reset. Contrast therapy is the priority — it drives HRV up for Monday. Do this even if you skip the mobility flow.",
  },
  "SUNDAY — Plyo & Core": {
    type:"PLYO + CORE", duration:"45–55 min", tag:"EXPLOSIVE + STABILITY", accent:C.border,
    steps:[
      "— PLYOMETRICS (20 min) —",
      "Box Jumps — 4×6 max height",
      "Broad Jumps — 4×5 explosive",
      "Depth Drops — 3×5/side",
      "Lateral Bounds — 3×8/side",
      "Single-leg Hop — 3×6/side",
      "— CORE CIRCUIT (20 min) —",
      "Dead Bug — 3×12/side",
      "Copenhagen Plank — 3×25 sec/side",
      "Pallof Press — 3×12/side",
      "Ab Wheel Rollout — 3×10",
      "Hollow Body Hold — 3×30 sec",
      "— CONTRAST THERAPY —",
      "Cold: 3–5 min · Heat: 10–15 min",
    ],
    note:"Plyo work builds explosive power that transfers directly to HYROX sled and burpee broad jumps. Core stability protects your spine during heavy carry work.",
  },
  "RECOVERY — Active Reset": {
    type:"RECOVERY", duration:"30–40 min", tag:"ACTIVE RECOVERY", accent:"#999",
    steps:[
      "— ACTIVE RECOVERY RUN —",
      "20–25 min very easy jog (HR <120 bpm)",
      "No structure. No pace target.",
      "— CONTRAST THERAPY —",
      "Cold exposure: 3–5 min cold shower or ice bath",
      "Heat: sauna or hot bath 10–15 min",
      "Alternate 2–3 rounds if available",
      "— WHOOP NOTE —",
      "Green >66%: Full protocol above",
      "Yellow 35–65%: Run only or therapy only",
      "Red <35%: Skip run. Therapy only.",
    ],
    note:"Active reset beats total rest. The run flushes the legs, contrast therapy resets the nervous system. Both drive HRV up for tomorrow.",
  },
};

// ─── SCHEDULE BUILDER ────────────────────────────────────
const d = (day, date, am, pm, note2a, isRaceDay, isSunday) =>
  ({ day, date, am, pm:pm||null, note2a:note2a||null, isRaceDay:!!isRaceDay, isSunday:!!isSunday });

const buildWeek = (id, label, dates, phase, subtitle, days) =>
  ({ id, label, dates, phase, subtitle, days });

// New weekly structure:
// MON - HYROX session
// TUE - Threshold
// WED - Strength full body + Z2 PM
// THU - Tempo or VO2 Max
// FRI - HYROX session
// SAT - Long Run
// SUN - Mobility OR Plyo+Core (user chooses) + contrast therapy

const taperWeeks = [
  buildWeek("tw1","TAPER WK 1","Mar 15–21","MIAMI TAPER","Moderate Volume · Stay Sharp",[
    d("MON","Mar 16","FOR TIME — Hyrox Full Runs Half Stations",null,"80% effort only. Don't race it."),
    d("TUE","Mar 17","THRESHOLD — 10×2 Min",null,"Scale to 6×2. Maintain Z4 quality."),
    d("WED","Mar 18","STRENGTH A — Full Body Power","ZONE 2 — Easy Aerobic","AM strength · PM 30 min Z2 flush."),
    d("THU","Mar 19","TEMPO — 20 Min Sustained",null,"Controlled. Z3–Z4 boundary. Don't push into Z5."),
    d("FRI","Mar 20","FOR TIME — Hyrox Full Send",null,"Taper version. Lap every station."),
    d("SAT","Mar 21","LONG RUN — Base Builder",null,"8–9 miles @ Z2. Last long effort before Miami."),
    d("SUN","Mar 22",null,null,"WHOOP governs. Choose your Sunday protocol below.",false,true),
  ]),
  buildWeek("tw2","TAPER WK 2","Mar 22–28","MIAMI TAPER","Reduced Volume · Race Sharpness",[
    d("MON","Mar 23","EMOM 40 — Full Hyrox",null,"Controlled EMOM. Keep HR managed."),
    d("TUE","Mar 24","THRESHOLD — 10×2 Min",null,"Scale to 4×2 @ race pace only."),
    d("WED","Mar 25","STRENGTH B — Full Body Pull","ZONE 2 — Easy Aerobic","AM pull day · PM 25 min easy only."),
    d("THU","Mar 26","TEMPO — 20 Min Sustained",null,"Short and sharp. No Z5 this week."),
    d("FRI","Mar 27","ZONE 2 — Easy Aerobic",null,"15 min shakeout + 3 strides. Done."),
    d("SAT","Mar 28","RECOVERY — Active Reset",null,"Full rest. High carb dinner tonight. 8+ hrs sleep."),
    d("SUN","Mar 29","RECOVERY — Active Reset",null,"Travel prep. Visualize race. Early bed.",false,false),
  ]),
  buildWeek("rw","RACE WEEK","Mar 29–Apr 4","MIAMI RACE","Minimal Load · Peak Freshness",[
    d("MON","Mar 30","ZONE 2 — Easy Aerobic",null,"15 min only. 3 strides. Walk away."),
    d("TUE","Mar 31","RECOVERY — Active Reset",null,"Full rest. Carb load begins."),
    d("WED","Apr 1","RECOVERY — Active Reset",null,"Off feet. High carb. Sleep."),
    d("THU","Apr 2","RECOVERY — Active Reset",null,"Travel day. Electrolytes. Race kit check tonight."),
    d("FRI","Apr 3","RECOVERY — Active Reset",null,"Race eve. Early dinner 6pm. Bed 9pm. No stimulants."),
    d("SAT","Apr 4","🏁 RACE DAY — MIAMI",null,"Wake 3 hrs before gun · High carb low fiber · 10 min jog + 4 strides · EXECUTE",true),
    d("SUN","Apr 5","RECOVERY — Active Reset",null,"Celebrate. Walk. High protein. Phase 1 starts Monday."),
  ]),
];

const makePhase = (num) => {
  const mo = ["","Apr","May","Jun","Jul"][num];
  const px = ["","p1","p2","p3","p4"][num];
  const subs = [
    "Base Rebuild · Reintroduce Volume",
    "Volume Up · Compromised Runs Longer",
    "Peak Week · Full HYROX Simulation",
    "Deload · Recover & Consolidate",
  ];
  const strDays = [
    "STRENGTH A — Full Body Power",
    "STRENGTH B — Full Body Pull",
    "STRENGTH C — Full Body Hybrid",
    "STRENGTH A — Full Body Power",
  ];
  const hyroxMon = [
    "FOR TIME — Hyrox Full Runs Half Stations",
    "EMOM 60 — Hyrox Stations",
    "FOR TIME — Ultimate HYROX",
    "AMRAP 40 — Hyrox Grind",
  ];
  const hyroxFri = [
    "FOR TIME — Hyrox Full Send",
    "AMRAP 40 — Hyrox Grind",
    "AMRAP 60 — Ski Row Burpee",
    "EMOM 40 — Full Hyrox",
  ];
  const thuSessions = [
    "TEMPO — 20 Min Sustained",
    "VO2 MAX — Short Intervals",
    "VO2 MAX — Short Intervals",
    "TEMPO — 20 Min Sustained",
  ];
  const longRunNotes = [
    "7–8 miles @ Z2 (132–151 bpm). Gel at 40 min.",
    "9–10 miles @ Z2. Same HR rules. Gel every 40 min.",
    "11–12 miles @ Z2. Milestone — match pre-Miami peak.",
    "8 miles easy. No pushing. Adaptation happens here.",
  ];

  return [0,1,2,3].map(i => buildWeek(
    `${px}w${i+1}`,
    `PHASE ${num} · WK ${i+1}`,
    `${mo} ${7+i*7}–${13+i*7}`,
    `PHASE ${num}`,
    subs[i],
    [
      d("MON",`${mo} ${7+i*7}`,hyroxMon[i],null,"Monday HYROX session. Lap every station."),
      d("TUE",`${mo} ${8+i*7}`,"THRESHOLD — 10×2 Min",null,"Tuesday threshold. Z4 = 150–168 bpm on your Garmin."),
      d("WED",`${mo} ${9+i*7}`,strDays[i],"ZONE 2 — Easy Aerobic","AM strength · PM 30 min Z2 run. 2-a-day."),
      d("THU",`${mo} ${10+i*7}`,thuSessions[i],null,i===1||i===2?"WHOOP must be green for VO2 Max. Yellow = swap to tempo.":"Controlled tempo. Z3–Z4 boundary."),
      d("FRI",`${mo} ${11+i*7}`,hyroxFri[i],null,"Friday HYROX session. Different format than Monday."),
      d("SAT",`${mo} ${12+i*7}`,"LONG RUN — Base Builder",null,longRunNotes[i]),
      d("SUN",`${mo} ${13+i*7}`,null,null,"Your call — choose Mobility or Plyo+Core below.",false,true),
    ]
  ));
};

const phase1Weeks = makePhase(1);
const phase2Weeks = makePhase(2);
const phase3Weeks = makePhase(3);
const phase4Weeks = makePhase(4);

const BLOCKS = [
  { id:"taper",  label:"MIAMI TAPER", weeks:taperWeeks },
  { id:"phase1", label:"PHASE 1",     weeks:phase1Weeks },
  { id:"phase2", label:"PHASE 2",     weeks:phase2Weeks },
  { id:"phase3", label:"PHASE 3",     weeks:phase3Weeks },
  { id:"phase4", label:"PHASE 4",     weeks:phase4Weeks },
];

const getAccent = (name) => {
  if (!name) return "#ccc";
  if (name.includes("🏁")) return C.red;
  if (name.includes("FOR TIME")||name.includes("AMRAP")) return C.red;
  if (name.includes("ZONE 2")||name.includes("LONG RUN")) return C.green;
  if (name.includes("RECOVERY")||name.includes("MOBILITY")) return "#999";
  if (name.includes("VO2")) return C.red;
  return C.border;
};

const getTypeLabel = (name) => {
  if (!name) return "CHOOSE";
  if (name.includes("🏁")) return "RACE";
  const w = WL[name];
  return w ? w.type : name.split(" — ")[0];
};

// ─── APP ─────────────────────────────────────────────────
export default function App() {
  const [blockId, setBlockId] = useState("taper");
  const [weekId, setWeekId]   = useState("tw1");
  const [selDay, setSelDay]   = useState(null);
  const [sess, setSess]       = useState("am");
  const [statsOpen, setStatsOpen] = useState(false);
  const [menuTab, setMenuTab] = useState(null); // null | "blocks" | "supplements" | "zones"
  const [sundayChoice, setSundayChoice] = useState({}); // { [weekId]: "mobility" | "plyo" }

  const block = BLOCKS.find(b => b.id === blockId);
  const weeks = block.weeks;
  const week  = weeks.find(w => w.id === weekId) || weeks[0];
  const dayData = selDay ? week.days.find(d => d.day === selDay) : null;

  const getSundayWorkout = (wid) => {
    const choice = sundayChoice[wid];
    if (choice === "mobility") return "SUNDAY — Mobility Protocol";
    if (choice === "plyo")     return "SUNDAY — Plyo & Core";
    return null;
  };

  const getEffectiveAm = (d) => {
    if (d.isSunday) return getSundayWorkout(weekId) || null;
    return d.am;
  };

  const wkName = dayData
    ? (sess === "am" ? getEffectiveAm(dayData) : dayData.pm)
    : null;
  const workout = wkName ? WL[wkName] : null;

  const switchBlock = (bid) => {
    setBlockId(bid);
    setSelDay(null);
    setMenuTab(null);
    const b = BLOCKS.find(x => x.id === bid);
    setWeekId(b.weeks[0].id);
  };

  const toggleMenu = (tab) => setMenuTab(prev => prev === tab ? null : tab);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:C.fs, color:C.text, maxWidth:480, margin:"0 auto" }}>

      {/* ══ STICKY HEADER ══ */}
      <div style={{ background:C.bg, borderBottom:`3px solid ${C.border}`, position:"sticky", top:0, zIndex:100 }}>

        {/* Top bar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px 8px" }}>
          <div>
            <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:4, marginBottom:1 }}>HYBRID PERFORMANCE OS</div>
            <div style={{ fontFamily:C.ff, fontSize:30, letterSpacing:2, lineHeight:1 }}>FAGUNDO<span style={{ color:C.red }}>.</span></div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2 }}>WHOOP</div>
              <div style={{ fontFamily:C.ff, fontSize:26, lineHeight:1 }}>69<span style={{ fontSize:13, color:C.red }}>%</span></div>
              <div style={{ fontFamily:C.fm, fontSize:6, color:"#b87800", letterSpacing:1 }}>YELLOW</div>
            </div>
            <button onClick={() => toggleMenu("nav")} style={{ background: menuTab ? C.border : "transparent", border:`1.5px solid ${C.border}`, padding:"8px 12px", cursor:"pointer", fontFamily:C.fm, fontSize:10, color: menuTab ? C.bg : C.text, letterSpacing:1, borderRadius:0 }}>
              {menuTab ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Hamburger menu */}
        {menuTab && (
          <div style={{ borderTop:`1px solid ${C.border}`, background:C.card }}>
            {/* Menu tabs */}
            <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
              {[["blocks","TRAINING"],["supplements","SUPPLEMENTS"],["zones","HR ZONES"]].map(([tab, label]) => (
                <button key={tab} onClick={() => setMenuTab(prev => prev === tab ? "nav" : tab)}
                  style={{ flex:1, padding:"10px 4px", fontFamily:C.ff, fontSize:10, letterSpacing:2, background: menuTab===tab ? C.border : "transparent", color: menuTab===tab ? C.bg : C.muted, border:"none", borderRight:`1px solid ${C.border}`, cursor:"pointer" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Block selector */}
            {menuTab === "blocks" && BLOCKS.map(b => (
              <button key={b.id} onClick={() => switchBlock(b.id)}
                style={{ display:"block", width:"100%", textAlign:"left", padding:"14px 16px", background: blockId===b.id ? C.border : "transparent", color: blockId===b.id ? C.bg : C.text, border:"none", borderBottom:`1px solid ${C.border}`, fontFamily:C.ff, fontSize:15, letterSpacing:3, cursor:"pointer" }}>
                {b.label}
                {blockId===b.id && <span style={{ fontFamily:C.fm, fontSize:7, color:C.red, marginLeft:10, letterSpacing:2 }}>● ACTIVE</span>}
              </button>
            ))}

            {/* Supplements */}
            {menuTab === "supplements" && (
              <div style={{ padding:"16px", maxHeight:380, overflowY:"auto" }}>
                <div style={{ fontFamily:C.ff, fontSize:10, color:C.red, letterSpacing:3, marginBottom:12 }}>DAILY SUPPLEMENT PROTOCOL</div>
                {SUPPS.map((group, gi) => (
                  <div key={gi} style={{ marginBottom:16 }}>
                    <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:8, borderBottom:`1px solid ${C.border}`, paddingBottom:6 }}>
                      {group.icon} {group.time}
                    </div>
                    {group.items.map((item, ii) => (
                      <div key={ii} style={{ marginBottom:8, padding:"10px 12px", background:C.bg, borderLeft:`3px solid ${C.border}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                          <span style={{ fontFamily:C.ff, fontSize:12, letterSpacing:1, color:C.text }}>{item.name}</span>
                          <span style={{ fontFamily:C.fm, fontSize:8, color:C.red, letterSpacing:1, marginLeft:8, flexShrink:0 }}>{item.dose}</span>
                        </div>
                        <div style={{ fontFamily:C.fs, fontSize:10, color:C.muted, lineHeight:1.5, marginBottom:3 }}>{item.note}</div>
                        <div style={{ fontFamily:C.fm, fontSize:7, color:C.light, letterSpacing:2 }}>TIMING: {item.timing}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* HR Zones */}
            {menuTab === "zones" && (
              <div style={{ padding:"16px" }}>
                <div style={{ fontFamily:C.ff, fontSize:10, color:C.red, letterSpacing:3, marginBottom:4 }}>HR ZONES · LTHR 165–170 BPM</div>
                <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2, marginBottom:12 }}>Based on %LTHR · Garmin Default</div>
                {HR_ZONES.map((z, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background:C.bg, borderLeft:`4px solid ${z.color}`, marginBottom:4 }}>
                    <div style={{ fontFamily:C.ff, fontSize:14, color:z.color, minWidth:28 }}>{z.zone}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:C.ff, fontSize:12, color:C.text, letterSpacing:1 }}>{z.name}</div>
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:1 }}>{z.pct} LTHR</div>
                    </div>
                    <div style={{ fontFamily:C.fm, fontSize:10, color:z.color, fontWeight:700 }}>{z.bpm}</div>
                  </div>
                ))}
                <div style={{ marginTop:12, padding:"10px 12px", background:C.card, borderLeft:`3px solid ${C.border}` }}>
                  <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, lineHeight:1.7 }}>
                    Z2 target for all easy runs: <span style={{ color:C.green, fontWeight:700 }}>132–151 bpm</span><br/>
                    Threshold sessions: <span style={{ color:"#cc6600", fontWeight:700 }}>150–168 bpm</span><br/>
                    VO2 Max intervals: <span style={{ color:C.red, fontWeight:700 }}>163–194 bpm</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Week scroller */}
        <div style={{ display:"flex", overflowX:"auto", borderTop:`1px solid ${C.border}`, scrollbarWidth:"none" }}>
          {weeks.map(w => (
            <button key={w.id} onClick={() => { setWeekId(w.id); setSelDay(null); }}
              style={{ flexShrink:0, padding:"9px 12px", background: weekId===w.id ? C.border : "transparent", color: weekId===w.id ? C.bg : C.muted, border:"none", borderRight:`1px solid ${C.border}`, cursor:"pointer", fontFamily:C.fm, fontSize:7, letterSpacing:2, whiteSpace:"nowrap" }}>
              <div style={{ fontWeight:700 }}>{w.label.includes("·") ? w.label.split("·")[1]?.trim() : w.label}</div>
              <div style={{ fontSize:6, marginTop:2, opacity:0.6 }}>{w.dates}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ══ WEEK HERO ══ */}
      <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${C.border}`, background:C.card }}>
        <div style={{ fontFamily:C.fm, fontSize:7, color:C.red, letterSpacing:4, marginBottom:3 }}>{week.phase}</div>
        <div style={{ fontFamily:C.ff, fontSize:26, letterSpacing:1, lineHeight:1 }}>{week.label}</div>
        <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2, marginTop:4 }}>{week.subtitle}</div>
      </div>

      {/* ══ STATS TICKER ══ */}
      <div onClick={() => setStatsOpen(!statsOpen)} style={{ borderBottom:`2px solid ${C.border}`, background:C.bg, cursor:"pointer" }}>
        <div style={{ display:"flex", overflowX:"auto", padding:"9px 16px", gap:0, scrollbarWidth:"none", alignItems:"center" }}>
          {[["BF","15.4%",false],["LM","179.7lb",false],["ALMI","10.7",false],["T","474ng",false],["LDL","145",true],["APO-B","103",true],["GLU","117",true],["VAT","66cm²",false]].map(([k,v,warn],i,arr) => (
            <div key={i} style={{ flexShrink:0, paddingRight:14, marginRight:14, borderRight: i<arr.length-1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2 }}>{k}</div>
              <div style={{ fontFamily:C.ff, fontSize:14, color: warn ? C.red : C.text }}>{v}{warn && <span style={{ fontSize:9, color:C.red }}> ⚠</span>}</div>
            </div>
          ))}
          <div style={{ flexShrink:0, marginLeft:8, fontFamily:C.fm, fontSize:7, color:C.red }}>{statsOpen?"▲":"▼"}</div>
        </div>

        {statsOpen && (
          <div style={{ borderTop:`1px solid ${C.border}`, padding:16 }} onClick={e => e.stopPropagation()}>
            {[
              ["DXA · FEB 20 2026",[["Weight","209.0 lb"],["Body Fat","15.4%"],["Lean Mass","179.74 lb"],["ALMI","10.7 OPTIMAL"],["Bone T-Score","+2.2 OPTIMAL"],["VAT Area","66.1 cm² IDEAL"]]],
              ["BLOOD · DEC 31 2024",[["Testosterone","474 ng/dL"],["LDL-C","145 HIGH ⚠"],["ApoB","103 HIGH ⚠"],["Glucose","117 HIGH ⚠"],["HDL-C","64 GOOD"],["TSH","0.943 NORMAL"]]],
              ["TRAINING",[["Race Sequence","HM → MAR → 70.3 → 140.6"],["Next Race","MIAMI APR 4"],["Z2 Target","132–151 bpm"],["LTHR","165–170 bpm"],["High Intensity","58% ⚠ TOO HIGH"]]],
            ].map(([title, items]) => (
              <div key={title} style={{ marginBottom:14 }}>
                <div style={{ fontFamily:C.ff, fontSize:11, color:C.red, letterSpacing:2, borderBottom:`1px solid ${C.border}`, paddingBottom:5, marginBottom:7 }}>{title}</div>
                {items.map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`0.5px solid ${C.card2}` }}>
                    <span style={{ fontFamily:C.fm, fontSize:7, color:C.muted }}>{k}</span>
                    <span style={{ fontFamily:C.fm, fontSize:7, color: v.includes("⚠")||v.includes("HIGH") ? C.red : C.text }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ DAY GRID ══ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:`3px solid ${C.border}` }}>
        {week.days.map((d, i) => {
          const effectiveAm = getEffectiveAm(d);
          const ac = d.isSunday && !sundayChoice[weekId] ? "#aaa" : getAccent(effectiveAm);
          const isSel = selDay === d.day;
          return (
            <button key={d.day} onClick={() => { setSelDay(isSel ? null : d.day); setSess("am"); }}
              style={{ background: isSel ? C.border : i%2===0 ? C.bg : C.card, border:"none", borderRight: i<6 ? `1px solid ${C.border}` : "none", borderTop:`4px solid ${isSel ? C.red : "transparent"}`, padding:"10px 4px 8px", cursor:"pointer", textAlign:"left", WebkitTapHighlightColor:"transparent", minHeight:80 }}>
              <div style={{ fontFamily:C.fm, fontSize:7, color: isSel ? "#aaa" : C.muted, letterSpacing:2, marginBottom:1 }}>{d.day}</div>
              <div style={{ fontFamily:C.fm, fontSize:6, color: isSel ? "#666" : C.light, marginBottom:7 }}>{d.date.split(" ")[1]}</div>
              {d.isSunday ? (
                <div style={{ fontFamily:C.ff, fontSize:8, color: isSel ? "#fff" : "#aaa", letterSpacing:1, lineHeight:1.3 }}>
                  {sundayChoice[weekId] === "mobility" ? "MOBILITY" : sundayChoice[weekId] === "plyo" ? "PLYO+CORE" : "CHOOSE"}
                </div>
              ) : d.isRaceDay ? (
                <div style={{ fontFamily:C.ff, fontSize:9, color:C.red, letterSpacing:1 }}>RACE</div>
              ) : (
                <div style={{ fontFamily:C.ff, fontSize:8, color: isSel ? "#fff" : ac, letterSpacing:1, lineHeight:1.3 }}>
                  {getTypeLabel(d.am)}
                </div>
              )}
              {d.pm && <div style={{ fontFamily:C.fm, fontSize:5, color: isSel ? "#666" : "#aaa", letterSpacing:1, marginTop:2 }}>+PM</div>}
              <div style={{ height:2, background:ac, marginTop:6, opacity: isSel ? 1 : 0.3, borderRadius:1 }} />
            </button>
          );
        })}
      </div>

      {/* ══ DAY DETAIL ══ */}
      {dayData && (
        <div style={{ background:C.card, borderBottom:`3px solid ${C.border}` }}>

          {/* SUNDAY CHOOSER */}
          {dayData.isSunday && (
            <div style={{ padding:"16px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontFamily:C.ff, fontSize:11, color:C.red, letterSpacing:3, marginBottom:10 }}>SUNDAY · CHOOSE YOUR SESSION</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setSundayChoice(p => ({ ...p, [weekId]:"mobility" }))}
                  style={{ flex:1, padding:"14px 8px", fontFamily:C.ff, fontSize:13, letterSpacing:2, background: sundayChoice[weekId]==="mobility" ? C.border : C.bg, color: sundayChoice[weekId]==="mobility" ? C.bg : C.text, border:`1.5px solid ${C.border}`, cursor:"pointer" }}>
                  MOBILITY<br/><span style={{ fontFamily:C.fm, fontSize:7, color: sundayChoice[weekId]==="mobility" ? "#aaa" : C.muted, letterSpacing:1 }}>+ CONTRAST THERAPY</span>
                </button>
                <button onClick={() => setSundayChoice(p => ({ ...p, [weekId]:"plyo" }))}
                  style={{ flex:1, padding:"14px 8px", fontFamily:C.ff, fontSize:13, letterSpacing:2, background: sundayChoice[weekId]==="plyo" ? C.border : C.bg, color: sundayChoice[weekId]==="plyo" ? C.bg : C.text, border:`1.5px solid ${C.border}`, cursor:"pointer" }}>
                  PLYO + CORE<br/><span style={{ fontFamily:C.fm, fontSize:7, color: sundayChoice[weekId]==="plyo" ? "#aaa" : C.muted, letterSpacing:1 }}>+ CONTRAST THERAPY</span>
                </button>
              </div>
            </div>
          )}

          {/* AM/PM toggle */}
          {dayData.pm && (
            <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
              {[["am","AM SESSION"],["pm","PM SESSION"]].map(([s,label]) => (
                <button key={s} onClick={() => setSess(s)}
                  style={{ flex:1, fontFamily:C.ff, fontSize:12, letterSpacing:3, padding:"11px", background: sess===s ? C.border : "transparent", color: sess===s ? C.bg : C.muted, border:"none", borderBottom: `3px solid ${sess===s ? C.red : "transparent"}`, cursor:"pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding:"18px 16px 14px" }}>
            {/* Header */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:5 }}>
                {dayData.day} · {dayData.date}{dayData.pm ? ` · ${sess.toUpperCase()}` : ""}
              </div>

              {dayData.isRaceDay && sess==="am" ? (
                <div style={{ fontFamily:C.ff, fontSize:34, color:C.red, letterSpacing:2, lineHeight:1 }}>RACE DAY<br/>MIAMI</div>
              ) : workout ? (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7, flexWrap:"wrap" }}>
                    <div style={{ background: workout.accent===C.red ? C.red : C.border, color:C.bg, padding:"4px 10px", fontFamily:C.ff, fontSize:11, letterSpacing:3 }}>{workout.type}</div>
                    {dayData.pm && <div style={{ background:C.red, color:"#fff", padding:"4px 10px", fontFamily:C.ff, fontSize:10, letterSpacing:2 }}>2-A-DAY</div>}
                    <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2 }}>{workout.duration}</div>
                  </div>
                  <div style={{ fontFamily:C.ff, fontSize:27, letterSpacing:1, lineHeight:1.1, color:C.text }}>{(wkName||"").split(" — ")[1] || wkName}</div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2, marginTop:4 }}>{workout.tag}</div>
                </>
              ) : dayData.isSunday && !sundayChoice[weekId] ? (
                <div style={{ fontFamily:C.ff, fontSize:22, color:C.muted }}>SELECT A SESSION ABOVE</div>
              ) : (
                <div style={{ fontFamily:C.ff, fontSize:27, color:C.muted }}>REST DAY</div>
              )}
            </div>

            {/* Steps */}
            {dayData.isRaceDay && sess==="am" ? (
              <div style={{ display:"flex", flexDirection:"column", gap:2, marginBottom:12 }}>
                {["Wake 3 hrs before gun","Pre-race fuel — high carb, low fiber, no dairy","10 min easy jog + 4 strides","Skip stimulants — the race is your caffeine","EXECUTE YOUR PACING STRATEGY"].map((s,i) => (
                  <div key={i} style={{ display:"flex", gap:12, padding:"10px 12px", background: i===4 ? C.red : C.bg, borderLeft:`3px solid ${i===4?C.red:C.border}` }}>
                    <span style={{ fontFamily:C.ff, fontSize:9, color: i===4?"rgba(255,255,255,0.5)":C.muted, minWidth:16 }}>{i+1}</span>
                    <span style={{ fontFamily:C.fs, fontSize:12, color: i===4?"#fff":C.text, fontWeight: i===4?700:400, lineHeight:1.4 }}>{s}</span>
                  </div>
                ))}
              </div>
            ) : workout ? (
              <div style={{ display:"flex", flexDirection:"column", gap:2, marginBottom:12 }}>
                {workout.steps.map((s,i) => {
                  const isDivider = s.startsWith("—");
                  return isDivider ? (
                    <div key={i} style={{ padding:"8px 0 2px", fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3 }}>{s.replace(/—/g,"").trim()}</div>
                  ) : (
                    <div key={i} style={{ display:"flex", gap:12, padding:"10px 12px", background:C.bg, borderLeft:`3px solid ${workout.accent}` }}>
                      <span style={{ fontFamily:C.ff, fontSize:9, color:C.muted, minWidth:16 }}>{i+1}</span>
                      <span style={{ fontFamily:C.fs, fontSize:12, color:C.text, lineHeight:1.4 }}>{s}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Coach note */}
            {workout && (
              <div style={{ padding:"11px 12px", background:C.bg, borderLeft:`3px solid ${C.border}` }}>
                <div style={{ fontFamily:C.ff, fontSize:9, color:C.red, letterSpacing:3, marginBottom:3 }}>COACH NOTE</div>
                <div style={{ fontFamily:C.fs, fontSize:11, color:C.muted, lineHeight:1.8 }}>
                  {dayData.isRaceDay && sess==="am" ? dayData.note2a : dayData.note2a || workout?.note}
                </div>
              </div>
            )}

            <button onClick={() => setSelDay(null)} style={{ marginTop:10, width:"100%", padding:"11px", background:"transparent", border:`1px solid ${C.border}`, fontFamily:C.fm, fontSize:8, letterSpacing:3, color:C.muted, cursor:"pointer" }}>CLOSE ✕</button>
          </div>
        </div>
      )}

      {/* ══ WEEKLY STRUCTURE LEGEND ══ */}
      <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, background:C.card }}>
        <div style={{ fontFamily:C.ff, fontSize:10, letterSpacing:3, color:C.muted, marginBottom:8 }}>WEEKLY STRUCTURE</div>
        {[["MON","HYROX SESSION",C.red],["TUE","THRESHOLD RUN",C.border],["WED","STRENGTH + Z2 PM",C.border],["THU","TEMPO / VO2 MAX",C.border],["FRI","HYROX SESSION",C.red],["SAT","LONG RUN",C.green],["SUN","MOBILITY OR PLYO+CORE","#999"]].map(([day,label,color]) => (
          <div key={day} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 0", borderBottom:`0.5px solid ${C.card2}` }}>
            <span style={{ fontFamily:C.ff, fontSize:11, color, minWidth:32 }}>{day}</span>
            <span style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ══ WHOOP FOOTER ══ */}
      <div style={{ padding:"14px 16px", background:C.bg }}>
        <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:8 }}>WHOOP PROTOCOL</div>
        {[["● GREEN >66%","Execute as written","#2a6a2a"],["● YELLOW 35–65%","Reduce intensity 20% · No VO2 Max","#b87800"],["● RED <35%","Recovery only — contrast therapy","#FF3C00"]].map(([label,sub,color]) => (
          <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:C.card, borderLeft:`3px solid ${color}`, marginBottom:4 }}>
            <span style={{ fontFamily:C.fm, fontSize:7, color, letterSpacing:2, fontWeight:700 }}>{label}</span>
            <span style={{ fontFamily:C.fm, fontSize:7, color:C.muted }}>{sub}</span>
          </div>
        ))}
        <div style={{ fontFamily:C.fm, fontSize:6, color:C.light, letterSpacing:2, marginTop:10, textAlign:"center" }}>GARMIN ACUTE LOAD · CHECK WEEKLY · CHARLOTTE NC</div>
      </div>

    </div>
  );
}
