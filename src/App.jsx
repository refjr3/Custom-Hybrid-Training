import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const C = {
  bg:"#000000", surface:"#111111", card:"#1a1a1a", card2:"#222222",
  border:"#2a2a2a", text:"#ffffff", muted:"#888888", light:"#555555",
  red:"#FF3C00", green:"#00D4A0", yellow:"#FFD600", blue:"#0088FF",
  ff:"'Bebas Neue','Arial Black',sans-serif",
  fm:"'Space Mono',monospace",
  fs:"'Inter',-apple-system,sans-serif",
};

const HR_ZONES = [
  { zone:"Z1", name:"WARM UP",   pct:"69–80%",  bpm:"114–136", color:"#555" },
  { zone:"Z2", name:"EASY",      pct:"80–89%",  bpm:"132–151", color:C.green },
  { zone:"Z3", name:"AEROBIC",   pct:"89–91%",  bpm:"147–154", color:"#FFB800" },
  { zone:"Z4", name:"THRESHOLD", pct:"91–99%",  bpm:"150–168", color:"#FF7700" },
  { zone:"Z5", name:"MAXIMUM",   pct:"99–114%", bpm:"163–194", color:C.red },
];

const SUPPS = [
  { time:"MORNING", color:C.yellow, items:[
    { name:"Beta Alanine", dose:"3.2–6.4g", note:"With breakfast. Tingling is normal.", timing:"AM" },
    { name:"Creatine Monohydrate", dose:"5g", note:"Daily. Any time — just stay consistent.", timing:"ANY" },
    { name:"Whey Protein #1", dose:"25–40g", note:"Post AM workout or with breakfast.", timing:"POST AM" },
  ]},
  { time:"AFTERNOON", color:C.red, items:[
    { name:"Whey Protein #2", dose:"25–40g", note:"Post PM workout or between meals.", timing:"POST PM" },
  ]},
  { time:"NIGHT", color:C.blue, items:[
    { name:"Magnesium Glycinate", dose:"300–400mg", note:"Supports deep sleep and HRV. 30–60 min pre-bed.", timing:"NIGHT" },
    { name:"L-Theanine", dose:"200–400mg", note:"Pairs with magnesium for calm, natural sleep.", timing:"NIGHT" },
    { name:"Sermorelin", dose:"Per Rx", note:"Empty stomach before sleep. Max GH pulse.", timing:"PRE-SLEEP" },
  ]},
  { time:"DAILY TARGETS", color:"#aaa", items:[
    { name:"Protein", dose:"180–215g", note:"~1g per lb lean mass. 2 shakes + meals.", timing:"ALL DAY" },
    { name:"Hydration", dose:"3–4L", note:"Critical for creatine + endurance performance.", timing:"ALL DAY" },
    { name:"LDL / ApoB", dose:"Diet flag", note:"LDL 145 ⚠ · ApoB 103 ⚠ — reduce sat fat.", timing:"EVERY MEAL" },
  ]},
];

const WL = {
  "FOR TIME — Ultimate HYROX": { type:"FOR TIME", duration:"~55 min", tag:"HYROX SIM", accent:C.red, steps:["1km Run","1km Ski Erg","50m Sled Push","1km Run","1km Row Erg","80m Burpee Broad Jump","1km Run","2km Bike Erg","100m Sandbag Lunges","100 Wall Balls","1km Run — FINISH"], note:"Full send. Lap button each station. Track splits — this is your benchmark." },
  "FOR TIME — Hyrox Full Runs Half Stations": { type:"FOR TIME", duration:"~45 min", tag:"HYROX SIM", accent:C.red, steps:["1km Run","500m Ski Erg","1km Run","25m Sled Push","1km Run","25m Sled Pull","1km Run","40m Burpee Broad Jump","1km Run","500m Row Erg","1km Run","100m KB Farmers Carry","1km Run","50m Sandbag Lunges","1km Run","50 Wall Balls"], note:"Full 1km runs, half station distances. Builds run durability between efforts." },
  "FOR TIME — Hyrox Full Send": { type:"FOR TIME", duration:"~50 min", tag:"HYROX SIM", accent:C.red, steps:["1km Run","50 Wall Balls","1km Ski Erg","50m Sled Push","1km Run","60m Burpee Broad Jump","1km Row Erg","100m Sandbag Lunges","1km Run — FINISH"], note:"High-intensity sim. Prioritize the runs — don't blow up on wall balls." },
  "AMRAP 40 — Hyrox Grind": { type:"AMRAP", duration:"40 min", tag:"CONDITIONING", accent:C.red, steps:["800m Run","30 Wall Balls","25m Sled Pull","15 Burpee To Plate","— Repeat for 40 min —"], note:"Count your rounds. AMRAP benchmark — beat it next time." },
  "AMRAP 60 — Ski Row Burpee": { type:"AMRAP", duration:"60 min", tag:"AEROBIC CONDITIONING", accent:C.red, steps:["500m Ski Erg","20m Burpee Broad Jump","500m Row Erg","20m Burpee Broad Jump","— Repeat for 60 min —"], note:"Aerobic monster. Pace the ski erg to sustain quality broad jumps throughout." },
  "EMOM 60 — Hyrox Stations": { type:"EMOM", duration:"60 min", tag:"STATION DRILL", accent:"#aaa", steps:["Every 2 min x 30 rounds:","Min 1 — 350m Ski Erg","Min 2 — 25m Sandbag Lunges","Min 3 — 350m Run","Min 4 — 2:00 Wall Balls","Min 5 — 2:00 Rest"], note:"EMOM keeps you honest. If you can't finish in 2 min, scale the distance." },
  "EMOM 40 — Full Hyrox": { type:"EMOM", duration:"40 min", tag:"STATION DRILL", accent:"#aaa", steps:["Every 1 min x 40 rounds (5 cycles):","Min 1 — 200m Ski Erg","Min 2 — 12 DB Deadlifts","Min 3 — 200m Row Erg","Min 4 — 20m Burpee Broad Jump","Min 5 — 200m Run","Min 6 — 20m Sled Push","Min 7 — 20 Wall Balls","Min 8 — Rest"], note:"8-minute cycle repeated 5x. Every minute has a job." },
  "INTERVAL — 6 Rounds Run Ski Wall Balls": { type:"INTERVAL", duration:"~50 min", tag:"RUNNING QUALITY", accent:C.blue, steps:["6 Rounds — 8:00 on / 2:00 rest:","800m Run","+ 400m Ski Erg","+ Max Wall Balls remaining time","— Full 2:00 rest between rounds —"], note:"480s/120s x 6. The wall balls are the finisher — push them." },
  "STRENGTH A — Full Body Power": { type:"STRENGTH", duration:"65 min", tag:"PUSH DOMINANT", accent:"#aaa", steps:["— LOWER —","Barbell Squat — 4×5 @ 80%+","Bulgarian Split Squat — 3×8/side","Leg Extension — 3×12","— PUSH —","Incline Bench Press — 4×6","Push Press — 3×5 explosive","Lateral Raise — 3×15","Explosive Plyo Push-ups — 3×8","— CORE —","Dead Bug — 3×10/side","Copenhagen Plank — 3×20 sec/side"], note:"Push dominant day. Barbell squat is your anchor — load it." },
  "STRENGTH B — Full Body Pull": { type:"STRENGTH", duration:"65 min", tag:"PULL DOMINANT", accent:"#aaa", steps:["— LOWER —","Barbell Deadlift — 4×4 @ 82%+","Hip Thrust — 4×8 heavy","Hamstring Curl — 3×12","— PULL —","Barbell Rows — 4×6 explosive","Pull-ups — 4×6 weighted","DB Bent Over Row — 3×10/side","Bicep Curls — 3×12","— CARRY —","KB Swings — 4×20 heavy"], note:"Pull dominant day. Deadlift is the anchor. KB swings finish it." },
  "STRENGTH C — Full Body Hybrid": { type:"STRENGTH", duration:"65 min", tag:"SUPERSET FORMAT", accent:"#aaa", steps:["— LOWER —","Romanian Deadlift — 4×6","Leg Extension — 3×12","— SUPERSET —","A1: Overhead DB Press — 4×10","A2: Pull-ups — 4×8","B1: Dips — 3×10","B2: DB Bent Over Row — 3×10/side","C1: Seated Tricep Extension — 3×12","C2: Bicep Curls — 3×12","— EXPLOSIVE —","Explosive Plyo Push-ups — 3×8"], note:"Superset format keeps HR elevated. Rest 60–90 sec between supersets only." },
  "THRESHOLD — 10×2 Min": { type:"THRESHOLD", duration:"45 min", tag:"Z4 · 150–168 BPM", accent:C.blue, steps:["Warm-up — 1.5 mile @ Z2","10 × 2 min @ Z4 (150–168 bpm)","40 sec standing recovery each","Cool-down — 1.5 mile easy","Strides — 4×20 sec at end"], note:"Z4 = 91–99% LTHR = 150–168 bpm on your Garmin. RMR bread-and-butter." },
  "TEMPO — 20 Min Sustained": { type:"TEMPO", duration:"40 min", tag:"Z3–Z4 · 147–168 BPM", accent:C.blue, steps:["Warm-up — 1 mile @ Z2","20 min sustained @ Z3–Z4 (147–162 bpm)","Smooth, controlled effort throughout","Cool-down — 1 mile easy"], note:"Comfortably hard. Short sentences OK, full conversation impossible." },
  "VO2 MAX — Short Intervals": { type:"VO2 MAX", duration:"40 min", tag:"Z5 · 163–194 BPM", accent:C.red, steps:["Warm-up — 1 mile @ Z2","8 × 3 min @ Z5 (163–194 bpm)","3 min active recovery jog each","Cool-down — 1 mile easy"], note:"Z5 = 99–114% LTHR. Only do this when WHOOP is GREEN. Yellow = swap to tempo." },
  "ZONE 2 — Easy Aerobic": { type:"ZONE 2", duration:"30–45 min", tag:"Z2 · 132–151 BPM", accent:C.green, steps:["HR target: Z2 — 132–151 bpm","Conversational pace — full sentences","Cadence: 175–180 spm","Duration: WHOOP dependent","Post-run: 10 min hip mobility"], note:"Walk if HR climbs above 151. No exceptions. This is your aerobic engine." },
  "LONG RUN — Base Builder": { type:"LONG RUN", duration:"75–120 min", tag:"Z2 · 132–151 BPM", accent:C.green, steps:["Full run @ conversational pace","Z2: 132–151 bpm entire run","Fuel: gel every 40–45 min","Hydration: every 20 min","Last 10%: can drift to Z3 (154 bpm)"], note:"Grows 1–2 miles each week. Most important session of the week." },
  "SUNDAY — Mobility Protocol": { type:"MOBILITY", duration:"35–45 min", tag:"ACTIVE RECOVERY", accent:C.green, steps:["— FLOW (15 min) —","Hip flexor — 3×60 sec/side","Hamstring stretch — 3×45 sec/side","Thoracic rotation — 10 reps/side","Pigeon pose — 2×60 sec/side","— FOAM ROLL (10 min) —","Quads, IT band, calves, upper back","— CONTRAST THERAPY —","Cold: 3–5 min ice bath or cold shower","Heat: 10–15 min sauna or hot bath","Repeat 2–3 rounds"], note:"Contrast therapy is the priority — drives HRV up for Monday." },
  "SUNDAY — Plyo & Core": { type:"PLYO + CORE", duration:"45–55 min", tag:"EXPLOSIVE + STABILITY", accent:"#aaa", steps:["— PLYOMETRICS —","Box Jumps — 4×6 max height","Broad Jumps — 4×5 explosive","Depth Drops — 3×5/side","Lateral Bounds — 3×8/side","Single-leg Hop — 3×6/side","— CORE —","Dead Bug — 3×12/side","Copenhagen Plank — 3×25 sec/side","Pallof Press — 3×12/side","Ab Wheel Rollout — 3×10","Hollow Body Hold — 3×30 sec","— CONTRAST THERAPY —","Cold: 3–5 min · Heat: 10–15 min"], note:"Plyo work builds explosive power for HYROX sled and burpee broad jumps." },
  "RECOVERY — Active Reset": { type:"RECOVERY", duration:"30–40 min", tag:"ACTIVE RECOVERY", accent:C.green, steps:["— ACTIVE RECOVERY RUN —","20–25 min very easy jog (HR <120 bpm)","No structure. No pace target.","— CONTRAST THERAPY —","Cold: 3–5 min cold shower or ice bath","Heat: 10–15 min sauna or hot bath","2–3 rounds if available","— WHOOP GATE —","Green >66%: Full protocol","Yellow 35–65%: Run only or therapy only","Red <35%: Therapy only. No run."], note:"Active reset beats total rest. Run flushes legs, contrast therapy resets the nervous system." },
};

const d = (day,date,am,pm,note2a,isRaceDay,isSunday) => ({day,date,am,pm:pm||null,note2a:note2a||null,isRaceDay:!!isRaceDay,isSunday:!!isSunday});
const bw = (id,label,dates,phase,subtitle,days) => ({id,label,dates,phase,subtitle,days});

const taperWeeks = [
  bw("tw1","TAPER WK 1","Mar 15–21","MIAMI TAPER","Moderate Volume · Stay Sharp",[
    d("MON","Mar 16","FOR TIME — Hyrox Full Runs Half Stations",null,"80% effort. Don't race it."),
    d("TUE","Mar 17","THRESHOLD — 10×2 Min",null,"Scale to 6×2. Maintain Z4 quality."),
    d("WED","Mar 18","STRENGTH A — Full Body Power","ZONE 2 — Easy Aerobic","AM strength · PM 30 min Z2."),
    d("THU","Mar 19","TEMPO — 20 Min Sustained",null,"Controlled. Z3–Z4. No Z5."),
    d("FRI","Mar 20","FOR TIME — Hyrox Full Send",null,"Lap every station."),
    d("SAT","Mar 21","LONG RUN — Base Builder",null,"8–9 miles @ Z2. Last long effort before Miami."),
    d("SUN","Mar 22",null,null,"Choose your Sunday session below.",false,true),
  ]),
  bw("tw2","TAPER WK 2","Mar 22–28","MIAMI TAPER","Reduced Volume · Race Sharpness",[
    d("MON","Mar 23","EMOM 40 — Full Hyrox",null,"Controlled EMOM. Keep HR managed."),
    d("TUE","Mar 24","THRESHOLD — 10×2 Min",null,"Scale to 4×2 @ race pace only."),
    d("WED","Mar 25","STRENGTH B — Full Body Pull","ZONE 2 — Easy Aerobic","AM pull · PM 25 min easy."),
    d("THU","Mar 26","TEMPO — 20 Min Sustained",null,"Short and sharp. No Z5 this week."),
    d("FRI","Mar 27","ZONE 2 — Easy Aerobic",null,"15 min shakeout + 3 strides."),
    d("SAT","Mar 28","RECOVERY — Active Reset",null,"High carb dinner. 8+ hrs sleep."),
    d("SUN","Mar 29","RECOVERY — Active Reset",null,"Travel prep. Visualize race. Early bed."),
  ]),
  bw("rw","RACE WEEK","Mar 29–Apr 4","MIAMI RACE","Minimal Load · Peak Freshness",[
    d("MON","Mar 30","ZONE 2 — Easy Aerobic",null,"15 min only. 3 strides. Walk away."),
    d("TUE","Mar 31","RECOVERY — Active Reset",null,"Full rest. Carb load begins."),
    d("WED","Apr 1","RECOVERY — Active Reset",null,"Off feet. High carb. Sleep."),
    d("THU","Apr 2","RECOVERY — Active Reset",null,"Travel day. Electrolytes. Race kit check."),
    d("FRI","Apr 3","RECOVERY — Active Reset",null,"Race eve. Dinner 6pm. Bed 9pm."),
    d("SAT","Apr 4","🏁 RACE DAY — MIAMI",null,"Wake 3hrs early · High carb · 10min jog + 4 strides · EXECUTE",true),
    d("SUN","Apr 5","RECOVERY — Active Reset",null,"Celebrate. High protein. Phase 1 Monday."),
  ]),
];

const makePhase = (num) => {
  const mo = ["","Apr","May","Jun","Jul"][num];
  const px = ["","p1","p2","p3","p4"][num];
  const subs = ["Base Rebuild · Reintroduce Volume","Volume Up · Compromised Runs Longer","Peak Week · Full HYROX Simulation","Deload · Recover & Consolidate"];
  const str  = ["STRENGTH A — Full Body Power","STRENGTH B — Full Body Pull","STRENGTH C — Full Body Hybrid","STRENGTH A — Full Body Power"];
  const hMon = ["FOR TIME — Hyrox Full Runs Half Stations","EMOM 60 — Hyrox Stations","FOR TIME — Ultimate HYROX","AMRAP 40 — Hyrox Grind"];
  const hFri = ["FOR TIME — Hyrox Full Send","AMRAP 40 — Hyrox Grind","AMRAP 60 — Ski Row Burpee","EMOM 40 — Full Hyrox"];
  const thu  = ["TEMPO — 20 Min Sustained","VO2 MAX — Short Intervals","VO2 MAX — Short Intervals","TEMPO — 20 Min Sustained"];
  const lrn  = ["7–8 miles @ Z2. Gel at 40 min.","9–10 miles @ Z2. Gel every 40 min.","11–12 miles @ Z2. Milestone.","8 miles easy. Adaptation happens here."];
  return [0,1,2,3].map(i => bw(
    `${px}w${i+1}`,`PHASE ${num} · WK ${i+1}`,`${mo} ${7+i*7}–${13+i*7}`,`PHASE ${num}`,subs[i],[
      d("MON",`${mo} ${7+i*7}`,hMon[i],null,"Monday HYROX. Lap every station."),
      d("TUE",`${mo} ${8+i*7}`,"THRESHOLD — 10×2 Min",null,"Z4 = 150–168 bpm on your Garmin."),
      d("WED",`${mo} ${9+i*7}`,str[i],"ZONE 2 — Easy Aerobic","AM strength · PM 30 min Z2. 2-a-day."),
      d("THU",`${mo} ${10+i*7}`,thu[i],null,i===1||i===2?"GREEN WHOOP only for VO2 Max.":"Controlled tempo. Z3–Z4."),
      d("FRI",`${mo} ${11+i*7}`,hFri[i],null,"Friday HYROX. Different format than Monday."),
      d("SAT",`${mo} ${12+i*7}`,"LONG RUN — Base Builder",null,lrn[i]),
      d("SUN",`${mo} ${13+i*7}`,null,null,"Choose your Sunday session below.",false,true),
    ]
  ));
};

const BLOCKS = [
  {id:"taper", label:"MIAMI TAPER", weeks:taperWeeks},
  {id:"phase1",label:"PHASE 1",     weeks:makePhase(1)},
  {id:"phase2",label:"PHASE 2",     weeks:makePhase(2)},
  {id:"phase3",label:"PHASE 3",     weeks:makePhase(3)},
  {id:"phase4",label:"PHASE 4",     weeks:makePhase(4)},
];

const getAccent = (name) => {
  if (!name) return C.light;
  if (name.includes("🏁")||name.includes("FOR TIME")||name.includes("AMRAP")||name.includes("VO2")) return C.red;
  if (name.includes("ZONE 2")||name.includes("LONG RUN")||name.includes("RECOVERY")||name.includes("MOBILITY")) return C.green;
  if (name.includes("THRESHOLD")||name.includes("TEMPO")||name.includes("INTERVAL")) return C.blue;
  return "#888";
};

const getTypeLabel = (name) => {
  if (!name) return "CHOOSE";
  if (name.includes("🏁")) return "RACE";
  return WL[name]?.type || name.split(" — ")[0];
};

const whoopColor = (s) => s >= 67 ? C.green : s >= 34 ? C.yellow : C.red;
const whoopLabel = (s) => s >= 67 ? "GREEN" : s >= 34 ? "YELLOW" : "RED";
const whoopMsg   = (s) => s >= 67 ? "Execute today's plan as written" : s >= 34 ? "Reduce intensity 20% · Skip VO2 Max" : "Recovery only · Contrast therapy · Rest";

const Ring = ({ score, size=120, stroke=10, color, label, sublabel }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score,100) / 100) * circ;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e1e" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontFamily:C.ff, fontSize:size*0.28, color, lineHeight:1, letterSpacing:-1 }}>{score}</div>
        {label && <div style={{ fontFamily:C.fm, fontSize:size*0.07, color:C.muted, letterSpacing:2, marginTop:2 }}>{label}</div>}
        {sublabel && <div style={{ fontFamily:C.fm, fontSize:size*0.065, color, letterSpacing:1, marginTop:1 }}>{sublabel}</div>}
      </div>
    </div>
  );
};

const StatPill = ({ label, value, color }) => (
  <div style={{ background:C.card, borderRadius:12, padding:"10px 14px", flex:1, textAlign:"center" }}>
    <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2, marginBottom:4 }}>{label}</div>
    <div style={{ fontFamily:C.ff, fontSize:20, color: color || C.text }}>{value}</div>
  </div>
);

const TodayCard = ({ name, onTap }) => {
  if (!name) return null;
  const w = WL[name];
  if (!w) return null;
  const accent = getAccent(name);
  return (
    <div onClick={onTap} style={{ background:C.card, borderRadius:16, overflow:"hidden", cursor:"pointer", border:`1px solid ${C.border}` }}>
      <div style={{ padding:"14px 16px 12px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ background:`${accent}22`, border:`1px solid ${accent}44`, borderRadius:20, padding:"3px 10px", fontFamily:C.fm, fontSize:8, color:accent, letterSpacing:2 }}>{w.type}</div>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1 }}>{w.duration}</div>
        </div>
        <div style={{ fontFamily:C.ff, fontSize:22, color:C.text, letterSpacing:0.5, marginTop:8, lineHeight:1.1 }}>{name.split(" — ")[1] || name}</div>
        <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2, marginTop:4 }}>{w.tag}</div>
      </div>
      <div style={{ padding:"10px 16px", display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none" }}>
        {w.steps.filter(s => !s.startsWith("—")).slice(0,4).map((s,i) => (
          <div key={i} style={{ background:C.card2, borderRadius:8, padding:"6px 10px", fontFamily:C.fm, fontSize:8, color:C.muted, flexShrink:0 }}>{s}</div>
        ))}
      </div>
    </div>
  );
};

const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return <span key={i}>{parts}{i < lines.length - 1 && <br />}</span>;
  });
};

const AIChat = ({ whoopData, currentWeek, recentActivities, onPlanChange }) => {
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Hey Rafael — I have your WHOOP data, training plan, and biomarkers loaded. What do you need?", planChange:null }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (expanded) messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, expanded]);

  const sendMessage = async () => {
    if ((!input.trim() && !attachment) || loading) return;
    const userMsg = input.trim();
    const currentAttachment = attachment;
    setInput("");
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages(prev => [...prev, { role:"user", content:userMsg || `[${currentAttachment?.name}]`, planChange:null, attachment:currentAttachment }]);
    setLoading(true);
    try {
      const res = await fetch("/api/coach/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          message: userMsg,
          whoopData,
          currentWeek: { id: currentWeek?.id, label: currentWeek?.label, subtitle: currentWeek?.subtitle },
          recentActivities: recentActivities?.slice(0,5),
          attachment: currentAttachment || null,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role:"assistant", content: data.message || "Something went wrong.", planChange: data.planChange || null }]);
    } catch (e) {
      setMessages(prev => [...prev, { role:"assistant", content:"Connection error. Try again.", planChange:null }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (planChange, action) => {
    if (action === "accept") {
      onPlanChange(planChange);
      setMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeStatus:"accepted" } : m));
    } else {
      setMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeStatus:"rejected" } : m));
    }
  };

  if (!expanded) {
    return (
      <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", width:"calc(100% - 40px)", maxWidth:440, zIndex:150 }}>
        <button onClick={() => setExpanded(true)}
          style={{ width:"100%", padding:"14px 20px", background:C.card, border:`1px solid ${C.border}`, borderRadius:16, display:"flex", alignItems:"center", gap:12, cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:`${C.green}22`, border:`1px solid ${C.green}44`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontSize:14 }}>✦</span>
          </div>
          <div style={{ flex:1, textAlign:"left" }}>
            <div style={{ fontFamily:C.ff, fontSize:13, color:C.text, letterSpacing:1 }}>ASK YOUR COACH</div>
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1, marginTop:2 }}>Claude · Powered by Anthropic</div>
          </div>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.green, letterSpacing:2 }}>OPEN ↑</div>
        </button>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:150, background:"rgba(0,0,0,0.95)", display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:`${C.green}22`, border:`1px solid ${C.green}44`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:16 }}>✦</span>
          </div>
          <div>
            <div style={{ fontFamily:C.ff, fontSize:16, color:C.text, letterSpacing:1 }}>AI COACH</div>
            <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:2 }}>● LIVE · WHOOP {whoopData?.recovery?.score ?? "--"}% · Claude</div>
          </div>
        </div>
        <button onClick={() => setExpanded(false)} style={{ background:C.card, border:"none", color:C.muted, width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:14 }}>✕</button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems: m.role==="user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth:"85%", padding:"12px 16px", borderRadius: m.role==="user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role==="user" ? C.green : C.card, color: m.role==="user" ? "#000" : C.text }}>
              {m.attachment?.media_type?.startsWith("image/") && (
                <img src={`data:${m.attachment.media_type};base64,${m.attachment.data}`} alt={m.attachment.name} style={{ width:"100%", borderRadius:8, marginBottom: m.content ? 8 : 0, display:"block" }} />
              )}
              {m.attachment?.media_type === "application/pdf" && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom: m.content ? 8 : 0, background:"rgba(0,0,0,0.15)", borderRadius:8, padding:"6px 10px" }}>
                  <span style={{ fontSize:14 }}>📄</span>
                  <span style={{ fontFamily:C.fm, fontSize:9, letterSpacing:1 }}>{m.attachment.name}</span>
                </div>
              )}
              {m.content && <div style={{ fontFamily:C.fs, fontSize:13, lineHeight:1.6 }}>{renderMarkdown(m.content)}</div>}
            </div>
            {m.planChange && !m.planChangeStatus && (
              <div style={{ maxWidth:"85%", marginTop:8, background:C.card2, borderRadius:12, padding:"12px 14px", border:`1px solid ${C.green}44` }}>
                <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:3, marginBottom:6 }}>PROPOSED CHANGE</div>
                <div style={{ fontFamily:C.ff, fontSize:14, color:C.text, marginBottom:4 }}>{m.planChange.description}</div>
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button onClick={() => handlePlanChange(m.planChange, "accept")} style={{ flex:1, padding:"10px", background:C.green, color:"#000", border:"none", borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:12, letterSpacing:2 }}>ACCEPT</button>
                  <button onClick={() => handlePlanChange(m.planChange, "reject")} style={{ flex:1, padding:"10px", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:12, letterSpacing:2 }}>REJECT</button>
                </div>
              </div>
            )}
            {m.planChange && m.planChangeStatus && (
              <div style={{ fontFamily:C.fm, fontSize:8, color: m.planChangeStatus==="accepted" ? C.green : C.muted, letterSpacing:2, marginTop:4 }}>
                {m.planChangeStatus === "accepted" ? "✓ CHANGE ACCEPTED" : "✕ CHANGE REJECTED"}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", alignItems:"flex-start" }}>
            <div style={{ background:C.card, borderRadius:"16px 16px 16px 4px", padding:"12px 16px" }}>
              <div style={{ fontFamily:C.fm, fontSize:11, color:C.muted, letterSpacing:2 }}>THINKING...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding:"8px 20px 0", display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
        {["What should I do today?","Adjust for my WHOOP score","Log new blood work","How was my last run?"].map((p,i) => (
          <button key={i} onClick={() => setInput(p)} style={{ flexShrink:0, padding:"6px 12px", background:C.card, border:`1px solid ${C.border}`, borderRadius:20, cursor:"pointer", fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1, whiteSpace:"nowrap" }}>{p}</button>
        ))}
      </div>
      {attachment && (
        <div style={{ padding:"0 20px 8px", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
            <span style={{ fontSize:13 }}>{attachment.media_type.startsWith("image/") ? "🖼" : "📄"}</span>
            <span style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:1, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{attachment.name}</span>
            <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", padding:0, fontSize:14, flexShrink:0, lineHeight:1 }}>×</button>
          </div>
        </div>
      )}
      <div style={{ padding:"12px 20px 20px", display:"flex", gap:10, flexShrink:0, alignItems:"flex-end" }}>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display:"none" }} onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => setAttachment({ data: reader.result.split(",")[1], media_type: file.type, name: file.name });
          reader.readAsDataURL(file);
        }} />
        <textarea
          ref={textareaRef}
          value={input}
          rows={1}
          onChange={e => {
            setInput(e.target.value);
            const el = textareaRef.current;
            if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }
          }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask your coach anything..."
          style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 16px", color:C.text, fontFamily:C.fs, fontSize:14, outline:"none", resize:"none", overflow:"hidden", lineHeight:"1.5", maxHeight:120 }}
        />
        <button onClick={() => fileInputRef.current?.click()} style={{ width:36, height:36, background: attachment ? `${C.green}22` : C.card2, border:`1px solid ${attachment ? C.green+"44" : C.border}`, borderRadius:10, cursor:"pointer", color: attachment ? C.green : C.muted, fontSize:16, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }} title="Attach image or PDF">📎</button>
        <button onClick={sendMessage} disabled={loading || (!input.trim() && !attachment)} style={{ width:48, height:48, background: (input.trim() || attachment) ? C.green : C.card, border:"none", borderRadius:12, cursor: (input.trim() || attachment) ? "pointer" : "default", color: (input.trim() || attachment) ? "#000" : C.muted, fontSize:18, flexShrink:0 }}>↑</button>
      </div>
    </div>
  );
};

const SessionModal = ({ name, dayData, sess, weekId, onClose, onSessSwitch, sundayChoice, setSundayChoice }) => {
  if (!name && !dayData?.isSunday && !dayData?.isRaceDay) return null;
  const w = name ? WL[name] : null;
  const accent = name ? getAccent(name) : C.muted;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.97)", overflowY:"auto" }}>
      <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"sticky", top:0, background:C.bg, zIndex:10 }}>
          <div>
            {w && <div style={{ fontFamily:C.fm, fontSize:8, color:accent, letterSpacing:3, marginBottom:6 }}>{w.type} · {w.tag}</div>}
            {dayData?.isRaceDay ? (
              <div style={{ fontFamily:C.ff, fontSize:36, color:C.red, lineHeight:1 }}>RACE DAY<br/>MIAMI 🏁</div>
            ) : w ? (
              <div style={{ fontFamily:C.ff, fontSize:28, color:C.text, letterSpacing:0.5, lineHeight:1.1 }}>{name.split(" — ")[1] || name}</div>
            ) : (
              <div style={{ fontFamily:C.ff, fontSize:24, color:C.muted }}>SUNDAY SESSION</div>
            )}
            {w && <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, marginTop:4 }}>{w.duration}</div>}
          </div>
          <button onClick={onClose} style={{ background:C.card, border:"none", color:C.muted, width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:16 }}>✕</button>
        </div>
        {dayData?.pm && (
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
            {[["am","AM"],["pm","PM"]].map(([s,l]) => (
              <button key={s} onClick={() => onSessSwitch(s)} style={{ flex:1, padding:"12px", fontFamily:C.ff, fontSize:13, letterSpacing:3, background:"transparent", color: sess===s ? C.text : C.muted, border:"none", borderBottom:`2px solid ${sess===s ? accent : "transparent"}`, cursor:"pointer" }}>{l} SESSION</button>
            ))}
          </div>
        )}
        {dayData?.ai_modified && dayData?.ai_modification_note && (
          <div style={{ padding:"14px 20px", background:"#FF770011", borderBottom:`1px solid #FF770033` }}>
            <div style={{ fontFamily:C.fm, fontSize:7, color:"#FF7700", letterSpacing:3, marginBottom:5 }}>⚡ AI ADJUSTMENT</div>
            <div style={{ fontFamily:C.fs, fontSize:13, color:C.text, lineHeight:1.6 }}>{dayData.ai_modification_note}</div>
          </div>
        )}
        {dayData?.isSunday && (
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:12 }}>CHOOSE YOUR SESSION</div>
            <div style={{ display:"flex", gap:10 }}>
              {[["mobility","MOBILITY","+ Contrast Therapy"],["plyo","PLYO + CORE","+ Contrast Therapy"]].map(([key,label,sub]) => (
                <button key={key} onClick={() => setSundayChoice(p => ({...p,[weekId]:key}))} style={{ flex:1, padding:"14px 10px", background: sundayChoice[weekId]===key ? accent : C.card, color: sundayChoice[weekId]===key ? "#000" : C.text, border:`1px solid ${sundayChoice[weekId]===key ? accent : C.border}`, borderRadius:12, cursor:"pointer", fontFamily:C.ff, fontSize:14, letterSpacing:2 }}>
                  {label}<div style={{ fontFamily:C.fm, fontSize:7, color: sundayChoice[weekId]===key ? "#00000088" : C.muted, marginTop:4 }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ padding:"20px", flex:1 }}>
          {dayData?.isRaceDay ? (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {["Wake 3 hrs before gun — calm morning","High carb, low fiber breakfast — no dairy","10 min easy jog + 4 strides","Skip stimulants — the race environment is your caffeine","EXECUTE YOUR PACING STRATEGY — TRUST THE WORK"].map((s,i) => (
                <div key={i} style={{ display:"flex", gap:14, padding:"14px 16px", background: i===4 ? C.red : C.card, borderRadius:12, alignItems:"flex-start" }}>
                  <span style={{ fontFamily:C.ff, fontSize:11, color: i===4?"rgba(255,255,255,0.5)":C.light, minWidth:20, marginTop:1 }}>{String(i+1).padStart(2,"0")}</span>
                  <span style={{ fontFamily:C.fs, fontSize:14, color: i===4?"#fff":C.text, fontWeight: i===4?700:400, lineHeight:1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          ) : w ? (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
                {w.steps.map((s,i) => {
                  const isDivider = s.startsWith("—");
                  return isDivider ? (
                    <div key={i} style={{ fontFamily:C.fm, fontSize:8, color:C.light, letterSpacing:3, padding:"8px 0 2px" }}>{s.replace(/—/g,"").trim()}</div>
                  ) : (
                    <div key={i} style={{ display:"flex", gap:14, padding:"13px 16px", background:C.card, borderRadius:12, borderLeft:`3px solid ${accent}`, alignItems:"flex-start" }}>
                      <span style={{ fontFamily:C.ff, fontSize:11, color:C.light, minWidth:20, marginTop:1 }}>{String(i+1).padStart(2,"0")}</span>
                      <span style={{ fontFamily:C.fs, fontSize:14, color:C.text, lineHeight:1.5 }}>{s}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ background:C.card, borderRadius:12, padding:"14px 16px", borderLeft:`3px solid ${C.border}` }}>
                <div style={{ fontFamily:C.fm, fontSize:8, color:C.red, letterSpacing:3, marginBottom:6 }}>COACH NOTE</div>
                <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted, lineHeight:1.8 }}>{dayData?.note2a || w.note}</div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [nav, setNav]         = useState("today");
  const [blockId, setBlockId] = useState("taper");
  const [weekId, setWeekId]   = useState("tw1");
  const [selDay, setSelDay]   = useState(null);
  const [sess, setSess]       = useState("am");
  const [sundayChoice, setSundayChoice] = useState({});
  const [whoopData, setWhoopData]       = useState(null);
  const [whoopLoading, setWhoopLoading] = useState(true);
  const [whoopConnected, setWhoopConnected] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [biomarkers, setBiomarkers] = useState([]);
  const [planBlocks, setPlanBlocks] = useState(BLOCKS);
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      window.history.replaceState({}, "", "/");
    }
    fetchWhoopData();
    fetchBiomarkers();
    fetchPlan();
  }, []);

  const fetchWhoopData = async () => {
    try {
      const res = await fetch("/api/whoop/recovery");
      if (res.status === 401) {
        setWhoopConnected(false);
        setWhoopLoading(false);
        return;
      }
      const data = await res.json();
      setWhoopData(data);
      setWhoopConnected(true);
    } catch (e) {
      setWhoopConnected(false);
    } finally {
      setWhoopLoading(false);
    }
  };

  const fetchBiomarkers = async () => {
    try {
      const { data } = await supabase.from("biomarkers").select("*").order("date_collected", { ascending:false });
      if (data) setBiomarkers(data);
    } catch (e) {}
  };

  const fetchPlan = async () => {
    try {
      const res = await fetch("/api/plan/days");
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.blocks?.length ?? 0) > 0) {
        setPlanBlocks(data.blocks);
      }
    } catch (e) {
      // silently fall back to hardcoded BLOCKS
    } finally {
      setPlanLoading(false);
    }
  };

  const handlePlanChange = async (planChange) => {
    try {
      const res = await fetch("/api/plan/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planChange),
      });
      if (!res.ok) return;
      await fetchPlan();
    } catch (e) {
      // silently ignore — coach UI already shows accepted state
    }
  };

  const block  = planBlocks.find(b => b.id === blockId) || planBlocks[0];
  const weeks  = block.weeks;
  const week   = weeks.find(w => w.id === weekId) || weeks[0];
  const dayData = selDay ? week.days.find(d => d.day === selDay) : null;

  const getSundayWo = (wid) => {
    const c = sundayChoice[wid];
    return c === "mobility" ? "SUNDAY — Mobility Protocol" : c === "plyo" ? "SUNDAY — Plyo & Core" : null;
  };
  const getEffAm = (d) => d.isSunday ? getSundayWo(weekId) : d.am;
  const modalName = dayData ? (sess === "am" ? getEffAm(dayData) : dayData.pm) : null;

  const rec        = whoopData?.recovery?.score ?? 0;
  const sleep      = whoopData?.sleep?.score ?? 0;
  const strain     = whoopData?.strain?.score ?? 0;
  const hrv        = whoopData?.recovery?.hrv ?? 0;
  const rhr        = whoopData?.recovery?.rhr ?? 0;
  const sleepHours = whoopData?.sleep?.hours ?? 0;
  const sleepEff   = whoopData?.sleep?.efficiency ?? 0;
  const rc         = whoopColor(rec);

  const todayDayNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const todayDayName  = todayDayNames[new Date().getDay()];
  const todayDayData  = week.days.find(d => d.day === todayDayName) || week.days[0];
  const todayAm  = todayDayData ? getEffAm(todayDayData) : null;
  const todayPm  = todayDayData?.pm || null;
  const flaggedBio = biomarkers.filter(b => b.flag === "HIGH" || b.flag === "LOW");

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:C.fs, maxWidth:480, margin:"0 auto", paddingBottom:80 }}>

      {nav === "today" && (
        <div>
          <div style={{ padding:"16px 20px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3 }}>HYBRID PERFORMANCE OS</div>
              <div style={{ fontFamily:C.ff, fontSize:26, letterSpacing:2, lineHeight:1, marginTop:2 }}>FAGUNDO<span style={{ color:C.red }}>.</span></div>
            </div>
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2, textAlign:"right" }}>
              {week.phase}<br/><span style={{ color:C.text }}>{week.label.split("·")[1]?.trim() || week.label}</span>
            </div>
          </div>

          <div style={{ padding:"8px 20px 20px" }}>
            {!whoopConnected && !whoopLoading ? (
              <div style={{ background:C.card, borderRadius:20, padding:"28px 20px", textAlign:"center", border:`1px solid ${C.border}` }}>
                <div style={{ fontFamily:C.ff, fontSize:20, color:C.muted, marginBottom:8 }}>WHOOP NOT CONNECTED</div>
                <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2, marginBottom:16 }}>Connect to see live recovery data</div>
                <a href="/api/auth/login" style={{ display:"inline-block", background:C.green, color:"#000", padding:"12px 28px", fontFamily:C.ff, fontSize:14, letterSpacing:3, textDecoration:"none", borderRadius:8 }}>CONNECT WHOOP</a>
              </div>
            ) : whoopLoading ? (
              <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:200 }}>
                <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2 }}>LOADING...</div>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
                  <Ring score={rec} size={140} stroke={12} color={rc} label="RECOVERY" sublabel={whoopLabel(rec)} />
                </div>
                <div style={{ display:"flex", gap:16, justifyContent:"center", marginBottom:20 }}>
                  <Ring score={sleep} size={80} stroke={8} color={C.blue} label="SLEEP" />
                  <Ring score={Math.round((strain/21)*100)} size={80} stroke={8} color="#FF7700" label="STRAIN" sublabel={`${strain}`} />
                  <Ring score={Math.min(Math.round((sleepHours/9)*100),100)} size={80} stroke={8} color={C.muted} label="HRS" sublabel={`${sleepHours}h`} />
                </div>
                <div style={{ background:`${rc}15`, border:`1px solid ${rc}33`, borderRadius:14, padding:"12px 16px", marginBottom:16 }}>
                  <div style={{ fontFamily:C.fm, fontSize:8, color:rc, letterSpacing:3, fontWeight:700, marginBottom:4 }}>● {whoopLabel(rec)} DAY</div>
                  <div style={{ fontFamily:C.fs, fontSize:13, color:C.text, lineHeight:1.5 }}>{whoopMsg(rec)}</div>
                  <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, marginTop:6 }}>HRV {hrv}ms · RHR {rhr}bpm · Sleep {sleepEff}% efficiency</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <StatPill label="HRV" value={`${hrv}ms`} />
                  <StatPill label="RHR" value={`${rhr}`} />
                  <StatPill label="EFFICIENCY" value={`${sleepEff}%`} />
                </div>
              </>
            )}
          </div>

          <div style={{ padding:"0 20px 20px" }}>
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:12 }}>TODAY · {todayDayName}</div>
            {todayDayData?.isRaceDay ? (
              <div onClick={() => { setSelDay(todayDayName); setSess("am"); }} style={{ background:`${C.red}22`, border:`1px solid ${C.red}44`, borderRadius:16, padding:"20px", textAlign:"center", cursor:"pointer" }}>
                <div style={{ fontFamily:C.ff, fontSize:32, color:C.red }}>🏁 RACE DAY</div>
                <div style={{ fontFamily:C.ff, fontSize:18, color:C.red }}>MIAMI · APR 4</div>
              </div>
            ) : todayDayData?.isSunday ? (
              <div style={{ background:C.card, borderRadius:16, padding:"16px", border:`1px solid ${C.border}` }}>
                <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:12 }}>SUNDAY · CHOOSE</div>
                <div style={{ display:"flex", gap:10 }}>
                  {[["mobility","MOBILITY"],["plyo","PLYO + CORE"]].map(([key,label]) => (
                    <button key={key} onClick={() => setSundayChoice(p => ({...p,[weekId]:key}))} style={{ flex:1, padding:"14px", background: sundayChoice[weekId]===key ? C.green : C.card2, color: sundayChoice[weekId]===key ? "#000" : C.text, border:`1px solid ${sundayChoice[weekId]===key ? C.green : C.border}`, borderRadius:12, cursor:"pointer", fontFamily:C.ff, fontSize:14, letterSpacing:2 }}>{label}</button>
                  ))}
                </div>
                {sundayChoice[weekId] && <div style={{ marginTop:12 }}><TodayCard name={getSundayWo(weekId)} onTap={() => setSelDay(todayDayName)} /></div>}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {todayAm && <TodayCard name={todayAm} onTap={() => { setSelDay(todayDayName); setSess("am"); }} />}
                {todayPm && (
                  <>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, height:1, background:C.border }} />
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3 }}>PM SESSION</div>
                      <div style={{ flex:1, height:1, background:C.border }} />
                    </div>
                    <TodayCard name={todayPm} onTap={() => { setSelDay(todayDayName); setSess("pm"); }} />
                  </>
                )}
              </div>
            )}
          </div>

          {flaggedBio.length > 0 && (
            <div style={{ padding:"0 20px 20px" }}>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>FLAGGED BIOMARKERS</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {flaggedBio.slice(0,3).map((b,i) => (
                  <div key={i} style={{ background:`${C.red}15`, border:`1px solid ${C.red}33`, borderRadius:10, padding:"10px 14px", flex:1, minWidth:90 }}>
                    <div style={{ fontFamily:C.fm, fontSize:7, color:C.red, letterSpacing:2, marginBottom:4 }}>{b.flag} ⚠</div>
                    <div style={{ fontFamily:C.ff, fontSize:16, color:C.text }}>{b.value} {b.unit}</div>
                    <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted }}>{b.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {nav === "plan" && (
        <div>
          <div style={{ padding:"16px 20px 10px" }}>
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>TRAINING BLOCK</div>
            <div style={{ display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none" }}>
              {planBlocks.map(b => (
                <button key={b.id} onClick={() => { setBlockId(b.id); setWeekId(b.weeks[0].id); setSelDay(null); }} style={{ flexShrink:0, padding:"8px 14px", background: blockId===b.id ? C.text : C.card, color: blockId===b.id ? "#000" : C.muted, border:`1px solid ${blockId===b.id ? C.text : C.border}`, borderRadius:20, cursor:"pointer", fontFamily:C.ff, fontSize:11, letterSpacing:2 }}>{b.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", overflowX:"auto", scrollbarWidth:"none", borderBottom:`1px solid ${C.border}`, paddingLeft:20 }}>
            {weeks.map(w => (
              <button key={w.id} onClick={() => { setWeekId(w.id); setSelDay(null); }} style={{ flexShrink:0, padding:"10px 14px", background:"transparent", color: weekId===w.id ? C.text : C.muted, border:"none", borderBottom:`2px solid ${weekId===w.id ? C.green : "transparent"}`, cursor:"pointer", fontFamily:C.fm, fontSize:7, letterSpacing:2, whiteSpace:"nowrap" }}>
                {w.label.includes("·") ? w.label.split("·")[1]?.trim() : w.label}
                <div style={{ fontSize:6, marginTop:2, opacity:0.6 }}>{w.dates}</div>
              </button>
            ))}
          </div>
          <div style={{ padding:"14px 20px 12px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:4, marginBottom:3 }}>{week.phase}</div>
            <div style={{ fontFamily:C.ff, fontSize:24, letterSpacing:1 }}>{week.label}</div>
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, marginTop:3 }}>{week.subtitle}</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:`1px solid ${C.border}` }}>
            {week.days.map((d, i) => {
              const eAm = getEffAm(d);
              const ac  = d.isSunday && !sundayChoice[weekId] ? C.light : getAccent(eAm);
              const isSel = selDay === d.day;
              return (
                <button key={d.day} onClick={() => { setSelDay(isSel ? null : d.day); setSess("am"); }} style={{ background: isSel ? C.card : "transparent", border:"none", borderRight: i<6 ? `1px solid ${C.border}` : "none", borderBottom:`2px solid ${isSel ? ac : "transparent"}`, padding:"12px 4px 10px", cursor:"pointer", textAlign:"center", WebkitTapHighlightColor:"transparent" }}>
                  <div style={{ fontFamily:C.fm, fontSize:7, color: isSel ? C.muted : C.light, letterSpacing:1 }}>{d.day}</div>
                  <div style={{ fontFamily:C.fm, fontSize:6, color:C.light, margin:"2px 0 8px" }}>{d.date.split(" ")[1]}</div>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:ac, margin:"0 auto", opacity: isSel ? 1 : 0.6 }} />
                  <div style={{ fontFamily:C.fm, fontSize:6, color: isSel ? ac : C.light, letterSpacing:1, marginTop:5, lineHeight:1.3 }}>
                    {d.isSunday ? (sundayChoice[weekId] ? sundayChoice[weekId].toUpperCase() : "?") : d.isRaceDay ? "RACE" : getTypeLabel(d.am)}
                  </div>
                  {d.pm && <div style={{ fontFamily:C.fm, fontSize:5, color:C.light, marginTop:2 }}>+PM</div>}
                </button>
              );
            })}
          </div>
          {dayData && (
            <div style={{ margin:"16px 20px", background:C.card, borderRadius:16, overflow:"hidden", border:`1px solid ${C.border}` }}>
              {dayData.isSunday && (
                <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>CHOOSE SESSION</div>
                  <div style={{ display:"flex", gap:8 }}>
                    {[["mobility","MOBILITY"],["plyo","PLYO + CORE"]].map(([key,label]) => (
                      <button key={key} onClick={() => setSundayChoice(p => ({...p,[weekId]:key}))} style={{ flex:1, padding:"12px", background: sundayChoice[weekId]===key ? C.green : C.card2, color: sundayChoice[weekId]===key ? "#000" : C.text, border:`1px solid ${sundayChoice[weekId]===key ? C.green : C.border}`, borderRadius:10, cursor:"pointer", fontFamily:C.ff, fontSize:12, letterSpacing:2 }}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
              {dayData.pm && (
                <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
                  {[["am","AM"],["pm","PM"]].map(([s,l]) => (
                    <button key={s} onClick={() => setSess(s)} style={{ flex:1, padding:"10px", fontFamily:C.ff, fontSize:12, letterSpacing:3, background:"transparent", color: sess===s ? C.text : C.muted, border:"none", borderBottom:`2px solid ${sess===s ? C.green : "transparent"}`, cursor:"pointer" }}>{l} SESSION</button>
                  ))}
                </div>
              )}
              <div style={{ padding:"16px" }}>
                {(() => {
                  const wName = sess === "am" ? getEffAm(dayData) : dayData.pm;
                  const wo = wName ? WL[wName] : null;
                  const ac = wName ? getAccent(wName) : C.muted;
                  if (!wo && !dayData.isRaceDay) return <div style={{ fontFamily:C.ff, fontSize:18, color:C.muted }}>SELECT A SESSION</div>;
                  return (
                    <>
                      {wo && (
                        <>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                            <div style={{ background:`${ac}22`, border:`1px solid ${ac}44`, borderRadius:20, padding:"3px 10px", fontFamily:C.fm, fontSize:7, color:ac, letterSpacing:2 }}>{wo.type}</div>
                            {dayData.pm && <div style={{ background:`${C.red}22`, border:`1px solid ${C.red}44`, borderRadius:20, padding:"3px 10px", fontFamily:C.fm, fontSize:7, color:C.red, letterSpacing:2 }}>2-A-DAY</div>}
                          </div>
                          <div style={{ fontFamily:C.ff, fontSize:22, color:C.text, marginBottom:4, lineHeight:1.1 }}>{wName.split(" — ")[1] || wName}</div>
                          <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2, marginBottom:14 }}>{wo.tag} · {wo.duration}</div>
                        </>
                      )}
                      <button onClick={() => setSelDay(dayData.day)} style={{ width:"100%", padding:"12px", background:ac, color: ac === C.green ? "#000" : "#fff", border:"none", borderRadius:10, cursor:"pointer", fontFamily:C.ff, fontSize:14, letterSpacing:3 }}>VIEW FULL SESSION →</button>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          <div style={{ margin:"0 20px 20px" }}>
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>WEEKLY STRUCTURE</div>
            {[["MON","HYROX SESSION",C.red],["TUE","THRESHOLD RUN",C.blue],["WED","STRENGTH + Z2 PM","#aaa"],["THU","TEMPO / VO2 MAX",C.blue],["FRI","HYROX SESSION",C.red],["SAT","LONG RUN",C.green],["SUN","MOBILITY OR PLYO+CORE",C.green]].map(([day,label,color]) => (
              <div key={day} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }} />
                <span style={{ fontFamily:C.ff, fontSize:13, color, minWidth:36 }}>{day}</span>
                <span style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {nav === "supps" && (
        <div style={{ padding:"20px" }}>
          <div style={{ fontFamily:C.ff, fontSize:28, letterSpacing:2, marginBottom:4 }}>SUPPLEMENTS<span style={{ color:C.red }}>.</span></div>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:20 }}>DAILY PROTOCOL</div>
          {SUPPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:3, height:20, background:group.color, borderRadius:2 }} />
                <div style={{ fontFamily:C.fm, fontSize:8, color:group.color, letterSpacing:3 }}>{group.time}</div>
              </div>
              {group.items.map((item, ii) => (
                <div key={ii} style={{ background:C.card, borderRadius:14, padding:"14px 16px", marginBottom:8, borderLeft:`3px solid ${group.color}44` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <div style={{ fontFamily:C.ff, fontSize:16, letterSpacing:0.5, color:C.text }}>{item.name}</div>
                    <div style={{ background:`${group.color}22`, border:`1px solid ${group.color}44`, borderRadius:20, padding:"3px 10px", fontFamily:C.fm, fontSize:8, color:group.color, letterSpacing:1, flexShrink:0, marginLeft:8 }}>{item.dose}</div>
                  </div>
                  <div style={{ fontFamily:C.fs, fontSize:12, color:C.muted, lineHeight:1.6, marginBottom:6 }}>{item.note}</div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.light, letterSpacing:2 }}>TIMING: {item.timing}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {nav === "stats" && (
        <div style={{ padding:"20px" }}>
          <div style={{ fontFamily:C.ff, fontSize:28, letterSpacing:2, marginBottom:4 }}>MY STATS<span style={{ color:C.green }}>.</span></div>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:20 }}>BODY COMPOSITION + BLOOD PANEL</div>
          {["DXA","BLOOD"].map(cat => {
            const items = biomarkers.filter(b => b.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat} style={{ marginBottom:20 }}>
                <div style={{ fontFamily:C.fm, fontSize:8, color: cat==="DXA" ? C.green : C.red, letterSpacing:3, marginBottom:10 }}>
                  {cat === "DXA" ? "DXA SCAN · FEB 20 2026" : "BLOOD PANEL · DEC 31 2024"}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {items.map((b,i) => (
                    <div key={i} style={{ background:C.card, borderRadius:14, padding:"14px", border: b.flag==="HIGH"||b.flag==="LOW" ? `1px solid ${C.red}33` : `1px solid ${C.border}` }}>
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2, marginBottom:6 }}>{b.label}</div>
                      <div style={{ fontFamily:C.ff, fontSize:18, color: b.flag==="HIGH"||b.flag==="LOW" ? C.red : b.flag==="OPTIMAL"||b.flag==="GOOD" ? C.green : C.text }}>{b.value}{b.unit ? ` ${b.unit}` : ""}</div>
                      {b.flag && <div style={{ fontFamily:C.fm, fontSize:7, color: b.flag==="HIGH"||b.flag==="LOW" ? C.red : b.flag==="OPTIMAL"||b.flag==="GOOD" ? C.green : C.muted, marginTop:4, letterSpacing:1 }}>● {b.flag}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div>
            <div style={{ fontFamily:C.fm, fontSize:8, color:"#aaa", letterSpacing:3, marginBottom:10 }}>HR ZONES · LTHR 165–170 BPM</div>
            {HR_ZONES.map((z, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:C.card, borderRadius:12, marginBottom:6, borderLeft:`3px solid ${z.color}` }}>
                <div style={{ fontFamily:C.ff, fontSize:16, color:z.color, minWidth:32 }}>{z.zone}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:C.ff, fontSize:14, color:C.text }}>{z.name}</div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, marginTop:2 }}>{z.pct} LTHR</div>
                </div>
                <div style={{ fontFamily:C.fm, fontSize:11, color:z.color, fontWeight:700 }}>{z.bpm}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:C.bg, borderTop:`1px solid ${C.border}`, display:"flex", zIndex:100 }}>
        {[["today","⚡","TODAY"],["plan","📅","PLAN"],["supps","💊","SUPPS"],["stats","📊","STATS"]].map(([id,icon,label]) => (
          <button key={id} onClick={() => setNav(id)} style={{ flex:1, padding:"12px 4px 20px", background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <div style={{ fontSize:18 }}>{icon}</div>
            <div style={{ fontFamily:C.fm, fontSize:7, letterSpacing:2, color: nav===id ? C.green : C.muted, fontWeight: nav===id ? 700 : 400 }}>{label}</div>
            {nav===id && <div style={{ width:4, height:4, borderRadius:"50%", background:C.green, marginTop:2 }} />}
          </button>
        ))}
      </div>

      <AIChat whoopData={whoopData} currentWeek={week} recentActivities={recentActivities} onPlanChange={handlePlanChange} />

      {selDay && (
        <SessionModal name={modalName} dayData={dayData} sess={sess} weekId={weekId} onClose={() => setSelDay(null)} onSessSwitch={setSess} sundayChoice={sundayChoice} setSundayChoice={setSundayChoice} />
      )}
    </div>
  );
}
