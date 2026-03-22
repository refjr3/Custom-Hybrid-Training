import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import AuthScreen from "./AuthScreen";
import Onboarding from "./Onboarding";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const C = {
  bg:"#0A0A0A", surface:"#111111",
  card:"rgba(255,255,255,0.04)", card2:"rgba(255,255,255,0.07)",
  cardSolid:"#141414",
  border:"rgba(255,255,255,0.08)", divider:"#444444",
  text:"#FFFFFF", muted:"#888888", light:"#555555",
  red:"#FF3B30", green:"#00D4A0", yellow:"#FFD600", blue:"#0088FF", cyan:"#00F3FF",
  ff:"'Bebas Neue','Arial Black',sans-serif",
  fm:"'Space Mono',monospace",
  fs:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  glass:{ backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)" },
  radius:16,
};
const glow = (color, i=0.3) => `0 0 20px ${color}${Math.round(i*255).toString(16).padStart(2,"0")}, 0 0 60px ${color}${Math.round(i*0.4*255).toString(16).padStart(2,"0")}`;

const HR_ZONES = [
  { zone:"Z1", name:"WARM UP",   pct:"69–80%",  bpm:"114–136", color:"#555" },
  { zone:"Z2", name:"EASY",      pct:"80–89%",  bpm:"132–151", color:C.green },
  { zone:"Z3", name:"AEROBIC",   pct:"89–91%",  bpm:"147–154", color:"#FFB800" },
  { zone:"Z4", name:"THRESHOLD", pct:"91–99%",  bpm:"150–168", color:"#FF7700" },
  { zone:"Z5", name:"MAXIMUM",   pct:"99–114%", bpm:"163–194", color:C.red },
];

// Supplements are now stored in Supabase (see supabase/seed_supplements.sql).
// Color per time group used when rendering the Supplements tab.
const SUPP_GROUP_COLORS = {
  MORNING: C.yellow,
  AFTERNOON: C.red,
  NIGHT: C.blue,
  "DAILY TARGETS": "#aaa",
};

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

const Ring = ({ score, size=120, stroke=10, color, label, sublabel, glowEffect }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score,100) / 100) * circ;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0, filter: glowEffect ? `drop-shadow(0 0 12px ${color}66)` : "none" }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontFamily:C.ff, fontSize:size*0.32, color, lineHeight:1, letterSpacing:-1, fontWeight:700 }}>{score}</div>
        {label && <div style={{ fontFamily:C.fm, fontSize:size*0.065, color:C.muted, letterSpacing:3, marginTop:3, textTransform:"uppercase" }}>{label}</div>}
        {sublabel && <div style={{ fontFamily:C.fm, fontSize:size*0.06, color, letterSpacing:2, marginTop:1, fontWeight:700 }}>{sublabel}</div>}
      </div>
    </div>
  );
};

const StatPill = ({ label, value, color }) => (
  <div style={{ background:C.card, borderRadius:C.radius, padding:"12px 14px", flex:1, textAlign:"center", border:`1px solid ${C.border}`, ...C.glass }}>
    <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6, textTransform:"uppercase" }}>{label}</div>
    <div style={{ fontFamily:C.ff, fontSize:24, color: color || C.cyan, fontWeight:700, letterSpacing:-0.5 }}>{value}</div>
  </div>
);

const TodayCard = ({ name, onTap }) => {
  if (!name) return null;
  const w = WL[name];
  if (!w) return null;
  const accent = getAccent(name);
  return (
    <div onClick={onTap} style={{ background:C.card, borderRadius:C.radius, overflow:"hidden", cursor:"pointer", border:`1px solid ${accent}22`, boxShadow:`0 0 30px ${accent}08`, ...C.glass, transition:"transform 0.1s ease" }}>
      <div style={{ padding:"16px 18px 14px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ background:`${accent}15`, border:`1px solid ${accent}33`, borderRadius:20, padding:"4px 12px", fontFamily:C.fm, fontSize:7, color:accent, letterSpacing:3, textTransform:"uppercase" }}>{w.type}</div>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2 }}>{w.duration}</div>
        </div>
        <div style={{ fontFamily:C.ff, fontSize:26, color:C.text, letterSpacing:0.5, marginTop:10, lineHeight:1.05 }}>{name.split(" — ")[1] || name}</div>
        <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginTop:6, textTransform:"uppercase" }}>{w.tag}</div>
      </div>
      <div style={{ padding:"10px 18px", display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none" }}>
        {w.steps.filter(s => !s.startsWith("—")).slice(0,4).map((s,i) => (
          <div key={i} style={{ background:C.card2, borderRadius:8, padding:"6px 10px", fontFamily:C.fm, fontSize:7, color:C.muted, flexShrink:0, letterSpacing:0.5 }}>{s}</div>
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

const PERSONAS = [
  { id:"grinder",   label:"THE GRINDER",   sub:"Push through · Motivational", color:"#FF3B30" },
  { id:"scientist", label:"THE SCIENTIST", sub:"Data-driven · Clinical", color:"#00F3FF" },
  { id:"sage",      label:"THE SAGE",      sub:"Mindful · RPE-based", color:"#00D4A0" },
];

const AIChat = ({ whoopData, currentWeek, recentActivities, onPlanChange, userName, persona, onPersonaChange }) => {
  const [messages, setMessages] = useState([
    { role:"assistant", content:`Hey ${userName || "there"} — I have your WHOOP data, training plan, and biomarkers loaded. What do you need?`, planChange:null }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [showPersonas, setShowPersonas] = useState(false);
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
          style={{ width:"100%", padding:"14px 20px", background:C.card, border:`1px solid ${C.border}`, borderRadius:C.radius, display:"flex", alignItems:"center", gap:12, cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.5)", ...C.glass }}>
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
    <div style={{ position:"fixed", inset:0, zIndex:150, background:"rgba(10,10,10,0.95)", display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => setShowPersonas(p => !p)} style={{ width:36, height:36, borderRadius:"50%", background:`${C.cyan}15`, border:`1px solid ${C.cyan}33`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <span className={loading ? "pulse" : ""} style={{ fontSize:16, color:C.cyan }}>✦</span>
          </button>
          <div>
            <div style={{ fontFamily:C.ff, fontSize:16, color:C.text, letterSpacing:1 }}>AI COACH</div>
            <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:2 }}>● {(PERSONAS.find(p => p.id === persona)?.label || "THE GRINDER")} · WHOOP {whoopData?.recovery?.score ?? "--"}%</div>
          </div>
        </div>
        <button onClick={() => setExpanded(false)} style={{ background:C.cardSolid, border:"none", color:C.muted, width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:14 }}>✕</button>
      </div>
      {showPersonas && (
        <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:8 }}>
          {PERSONAS.map(p => (
            <button key={p.id} onClick={() => { onPersonaChange(p.id); setShowPersonas(false); }}
              style={{
                flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", textAlign:"center",
                background: persona === p.id ? `${p.color}15` : C.cardSolid,
                border:`1px solid ${persona === p.id ? p.color+"55" : C.border}`,
              }}>
              <div style={{ fontFamily:C.ff, fontSize:11, color: persona === p.id ? p.color : C.text, letterSpacing:1 }}>{p.label}</div>
              <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:1, marginTop:2 }}>{p.sub}</div>
            </button>
          ))}
        </div>
      )}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems: m.role==="user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth:"85%", padding:"12px 16px", borderRadius: m.role==="user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role==="user" ? "rgba(0,243,255,0.15)" : C.card, color: m.role==="user" ? C.text : C.text, border: m.role==="user" ? `1px solid ${C.cyan}33` : `1px solid ${C.border}`, ...C.glass }}>
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
            <div style={{ background:C.card, borderRadius:"16px 16px 16px 4px", padding:"12px 16px", border:`1px solid ${C.border}`, ...C.glass }}>
              <div className="shimmer" style={{ fontFamily:C.fm, fontSize:11, letterSpacing:3 }}>THINKING</div>
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
          style={{ flex:1, background:C.card, border:`1px solid ${C.cyan}22`, borderRadius:12, padding:"12px 16px", color:C.text, fontFamily:C.fs, fontSize:14, outline:"none", resize:"none", overflow:"hidden", lineHeight:"1.5", maxHeight:120, ...C.glass }}
        />
        <button onClick={() => fileInputRef.current?.click()} style={{ width:36, height:36, background: attachment ? `${C.green}22` : C.card2, border:`1px solid ${attachment ? C.green+"44" : C.border}`, borderRadius:10, cursor:"pointer", color: attachment ? C.green : C.muted, fontSize:16, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }} title="Attach image or PDF">📎</button>
        <button onClick={sendMessage} disabled={loading || (!input.trim() && !attachment)} style={{ width:48, height:48, background: (input.trim() || attachment) ? C.green : C.card, border:"none", borderRadius:12, cursor: (input.trim() || attachment) ? "pointer" : "default", color: (input.trim() || attachment) ? "#000" : C.muted, fontSize:18, flexShrink:0 }}>↑</button>
      </div>
    </div>
  );
};

// Render a custom AI-generated session written in simple markdown.
// Supports: ## headers, - / * bullets, **bold**, blank-line separators.
const renderCustomSession = (md, accent) => {
  if (!md) return null;
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Section header
    if (line.startsWith("## ")) {
      out.push(
        <div key={i} style={{ fontFamily:C.fm, fontSize:8, color:accent, letterSpacing:3, padding:"14px 0 4px", marginTop:4 }}>
          {line.slice(3).toUpperCase()}
        </div>
      );
    // Bullet item — gather consecutive bullets into a block
    } else if (line.match(/^[-*] /)) {
      const text = line.slice(2);
      const inlineParts = text.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={j} style={{ color:C.text }}>{p.slice(2,-2)}</strong>
          : p
      );
      out.push(
        <div key={i} style={{ display:"flex", gap:14, padding:"11px 16px", background:C.card, borderRadius:12, borderLeft:`3px solid ${accent}`, marginBottom:6 }}>
          <span style={{ fontFamily:C.ff, fontSize:11, color:C.light, minWidth:20, marginTop:1 }}>{String(out.filter(x=>x).length).padStart(2,"0")}</span>
          <span style={{ fontFamily:C.fs, fontSize:14, color:C.text, lineHeight:1.5 }}>{inlineParts}</span>
        </div>
      );
    // Empty line — small spacer
    } else if (line.trim() === "") {
      out.push(<div key={i} style={{ height:6 }} />);
    // Plain text paragraph with inline bold support
    } else {
      const inlineParts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={j}>{p.slice(2,-2)}</strong>
          : p
      );
      out.push(
        <div key={i} style={{ fontFamily:C.fs, fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:4 }}>
          {inlineParts}
        </div>
      );
    }
    i++;
  }
  return <div style={{ display:"flex", flexDirection:"column", gap:0 }}>{out}</div>;
};

const SessionModal = ({ name, dayData, sess, weekId, onClose, onSessSwitch, sundayChoice, setSundayChoice }) => {
  if (!name && !dayData?.isSunday && !dayData?.isRaceDay) return null;
  const w = name ? WL[name] : null;
  const accent = name ? getAccent(name) : C.muted;
  // Custom AI-generated content takes priority over WL steps when ai_modified is true
  const customContent = sess === "am" ? dayData?.am_session_custom : dayData?.pm_session_custom;
  const showCustom = !!(customContent && dayData?.ai_modified);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(10,10,10,0.97)", overflowY:"auto" }}>
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
          ) : showCustom ? (
            <>
              {renderCustomSession(customContent, accent)}
              {dayData?.note2a && (
                <div style={{ background:C.card, borderRadius:12, padding:"14px 16px", borderLeft:`3px solid ${C.border}`, marginTop:16 }}>
                  <div style={{ fontFamily:C.fm, fontSize:8, color:C.red, letterSpacing:3, marginBottom:6 }}>COACH NOTE</div>
                  <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted, lineHeight:1.8 }}>{dayData.note2a}</div>
                </div>
              )}
            </>
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
  const [planBlocks, setPlanBlocks] = useState([]);
  const [planLoading, setPlanLoading] = useState(true);
  const [supplements, setSupplements] = useState([]);
  const [suppsLoading, setSuppsLoading] = useState(true);
  const [synthesisNote, setSynthesisNote] = useState(null);
  const [bloodworkUploading, setBloodworkUploading] = useState(false);
  const [bloodworkResult, setBloodworkResult] = useState(null);
  const bloodworkInputRef = useRef(null);
  const [coachPersona, setCoachPersona] = useState("grinder");
  const [garminActivities, setGarminActivities] = useState([]);
  const [garminConnected, setGarminConnected] = useState(false);

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [session, setSession]       = useState(null);
  const [profile, setProfile]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialise auth on mount; listen for session changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        supabase
          .from("user_profiles").select("*").eq("user_id", session.user.id).single()
          .then(({ data }) => { setProfile(data || null); setAuthLoading(false); });
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        supabase
          .from("user_profiles").select("*").eq("user_id", session.user.id).single()
          .then(({ data }) => { setProfile(data || null); setAuthLoading(false); });
      } else {
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Data fetches — only run once the user is authenticated and has a profile
  useEffect(() => {
    if (!profile) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") window.history.replaceState({}, "", "/");

    // Check persistent wearable connections from profile
    if (profile.connected_wearables?.whoop) {
      setWhoopConnected(true);
    }
    if (profile.coach_persona) {
      setCoachPersona(profile.coach_persona);
    }
    if (profile.connected_wearables?.garmin) {
      setGarminConnected(true);
    }
    if (params.get("garmin_connected") === "true") {
      setGarminConnected(true);
      window.history.replaceState({}, "", "/");
    }

    fetchWhoopData();
    fetchBiomarkers();
    fetchSupplements();
    fetchPlan(session?.access_token);
    fetchGarminActivities();
  }, [profile]);

  const fetchWhoopData = async () => {
    try {
      const res = await fetch("/api/whoop/recovery");
      if (res.status === 401) {
        // If profile says WHOOP was connected, keep the connected state
        // but mark data as unavailable (token may have expired)
        if (!profile?.connected_wearables?.whoop) {
          setWhoopConnected(false);
        }
        setWhoopLoading(false);
        return;
      }
      const data = await res.json();
      setWhoopData(data);
      setWhoopConnected(true);
    } catch (e) {
      if (!profile?.connected_wearables?.whoop) {
        setWhoopConnected(false);
      }
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

  const fetchSupplements = async () => {
    try {
      const { data } = await supabase.from("supplements").select("*").order("sort_order");
      if (data) setSupplements(data);
    } catch (e) {}
    finally { setSuppsLoading(false); }
  };

  const fetchGarminActivities = async () => {
    try {
      const { data } = await supabase
        .from("garmin_activities")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(5);
      if (data) setGarminActivities(data);
    } catch (_) {}
  };

  // Fix #5: accept token as a parameter so callers always pass the live token —
  // avoids stale-closure reads of session?.access_token captured at definition time.
  const fetchPlan = async (token) => {
    try {
      console.log("[fetchPlan] token present:", !!token, "| token prefix:", token?.slice(0,20));
      const res = await fetch("/api/plan/days", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      console.log("[fetchPlan] status:", res.status);
      const data = await res.json().catch(() => ({}));
      console.log("[fetchPlan] response:", JSON.stringify({
        blocks: data.blocks?.length,
        firstBlock: data.blocks?.[0]?.label,
        firstBlockWeeks: data.blocks?.[0]?.weeks?.length,
        firstWeekDays: data.blocks?.[0]?.weeks?.[0]?.days?.length,
        error: data.error,
      }));
      const hasDays = data.blocks?.some(b => b.weeks?.some(w => w.days?.length > 0));
      console.log("[fetchPlan] hasDays:", hasDays, "| res.ok:", res.ok, "| will update state:", res.ok && hasDays);
      if (res.ok && hasDays) {
        setPlanBlocks(data.blocks);
      }
    } catch (e) {
      console.log("[fetchPlan] caught error:", e.message);
    } finally {
      setPlanLoading(false);
    }
  };

  // Morning Synthesis: runs once per calendar day after WHOOP + plan data load
  useEffect(() => {
    if (!whoopData || planBlocks.length === 0 || !session?.access_token) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("synthesis_date") === today) return;

    const dayNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
    const todayDay = dayNames[new Date().getDay()];
    const currentBlock = planBlocks[0];
    const currentWeek = currentBlock?.weeks?.[0];
    const todayData = currentWeek?.days?.find(d => d.day === todayDay);
    if (!todayData || !currentWeek) {
      localStorage.setItem("synthesis_date", today);
      return;
    }

    const recoveryScore = whoopData?.recovery?.score;
    const sessionName = todayData.am;

    fetch("/api/synthesis/morning", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        recovery_score: recoveryScore,
        session_name: sessionName,
        week_id: currentWeek.id,
        day: todayDay,
      }),
    })
      .then(r => r.json())
      .then(data => {
        localStorage.setItem("synthesis_date", today);
        if (data.modified) {
          setSynthesisNote(data.note);
          fetchPlan(session.access_token);
        }
      })
      .catch(() => {
        localStorage.setItem("synthesis_date", today);
      });
  }, [whoopData, planBlocks]);

  const handlePlanChange = async (planChange) => {
    const token = session?.access_token;
    try {
      if (planChange.type === "add_supplement") {
        console.log("[handlePlanChange] add_supplement:", JSON.stringify(planChange));
        const res = await fetch("/api/supplements/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(planChange),
        });
        const body = await res.json().catch(() => ({}));
        console.log("[handlePlanChange] supplement update status:", res.status, "| body:", JSON.stringify(body));
        if (res.ok) await fetchSupplements();
        return;
      }

      // modify_day — existing plan update logic
      console.log("[handlePlanChange] sending:", JSON.stringify(planChange));
      console.log("[handlePlanChange] token present:", !!token, "| token prefix:", token?.slice(0,20));
      const res = await fetch("/api/plan/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(planChange),
      });
      const body = await res.json().catch(() => ({}));
      console.log("[handlePlanChange] update status:", res.status, "| body:", JSON.stringify(body));
      if (!res.ok) {
        console.log("[handlePlanChange] update FAILED — still calling fetchPlan to confirm DB state");
      } else {
        console.log("[handlePlanChange] update OK — calling fetchPlan");
      }
      await fetchPlan(token);
      console.log("[handlePlanChange] fetchPlan complete");
    } catch (e) {
      console.log("[handlePlanChange] caught error:", e.message);
    }
  };

  const handlePersonaChange = async (newPersona) => {
    setCoachPersona(newPersona);
    try {
      await supabase
        .from("user_profiles")
        .update({ coach_persona: newPersona })
        .eq("user_id", session.user.id);
    } catch (_) {}
  };

  const handleBloodworkUpload = async (file) => {
    if (!file || !session?.access_token) return;
    setBloodworkUploading(true);
    setBloodworkResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(",")[1];
        const res = await fetch("/api/bloodwork/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            attachment: { data: base64, media_type: file.type, name: file.name },
          }),
        });
        const data = await res.json();
        setBloodworkResult(data);
        if (data.inserted) fetchBiomarkers();
        setBloodworkUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setBloodworkResult({ error: e.message });
      setBloodworkUploading(false);
    }
  };

  // ── Auth routing — must come after all hooks ───────────────────────────────
  if (authLoading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:C.bg }}>
        <div className="shimmer" style={{ fontFamily:C.ff, fontSize:24, letterSpacing:6 }}>LOADING</div>
      </div>
    );
  }
  if (!session) return <AuthScreen supabase={supabase} />;
  if (!profile) return <Onboarding supabase={supabase} session={session} onComplete={setProfile} />;

  const block   = planBlocks.find(b => b.id === blockId) || planBlocks[0] || null;
  const weeks   = block?.weeks || [];
  const week    = weeks.find(w => w.id === weekId) || weeks[0] || null;
  const dayData = (selDay && week) ? week.days.find(d => d.day === selDay) : null;

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
  const todayDayData  = week ? (week.days.find(d => d.day === todayDayName) || week.days[0]) : null;
  const todayAm  = todayDayData ? getEffAm(todayDayData) : null;
  const todayPm  = todayDayData?.pm || null;
  const flaggedBio = biomarkers.filter(b => b.flag === "HIGH" || b.flag === "LOW");

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:C.fs, maxWidth:480, margin:"0 auto", paddingBottom:80 }}>

      {nav === "today" && (
        <div>
          <div style={{ padding:"16px 20px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, textTransform:"uppercase" }}>HYBRID PERFORMANCE OS</div>
              <div style={{ fontFamily:C.ff, fontSize:26, letterSpacing:2, lineHeight:1, marginTop:2 }}>{profile?.name?.toUpperCase() || "ATHLETE"}<span style={{ color:C.red }}>.</span></div>
            </div>
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2, textAlign:"right" }}>
              {week?.phase}<br/><span style={{ color:C.text }}>{week?.label?.split("·")[1]?.trim() || week?.label}</span>
            </div>
          </div>

          <div style={{ padding:"8px 20px 20px" }}>
            {!whoopConnected && !whoopLoading ? (
              <div style={{ background:C.card, borderRadius:C.radius, padding:"28px 20px", textAlign:"center", border:`1px solid ${C.border}`, ...C.glass }}>
                <div style={{ fontFamily:C.ff, fontSize:20, color:C.muted, marginBottom:8 }}>WHOOP NOT CONNECTED</div>
                <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2, marginBottom:16 }}>Connect to see live recovery data</div>
                <a href="/api/auth/login" style={{ display:"inline-block", background:C.green, color:"#000", padding:"14px 28px", height:48, boxSizing:"border-box", fontFamily:C.ff, fontSize:14, letterSpacing:2, textDecoration:"none", borderRadius:10, textTransform:"uppercase" }}>CONNECT WHOOP</a>
              </div>
            ) : whoopLoading ? (
              <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:200 }}>
                <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2 }}>LOADING...</div>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
                  <Ring score={rec} size={170} stroke={14} color={rc} label="RECOVERY" sublabel={whoopLabel(rec)} glowEffect />
                </div>
                <div style={{ display:"flex", gap:12, justifyContent:"center", marginBottom:20 }}>
                  <Ring score={sleep} size={80} stroke={8} color={C.blue} label="SLEEP" />
                  <Ring score={Math.round((strain/21)*100)} size={80} stroke={8} color={C.orange || "#FF7700"} label="STRAIN" sublabel={`${strain}`} />
                  <Ring score={Math.min(Math.round((sleepHours/9)*100),100)} size={80} stroke={8} color={C.muted} label="HRS" sublabel={`${sleepHours}h`} />
                </div>
                <div style={{ background:`${rc}10`, border:`1px solid ${rc}22`, borderRadius:C.radius, padding:"14px 18px", marginBottom:16, boxShadow:glow(rc,0.15), ...C.glass }}>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:rc, letterSpacing:3, fontWeight:700, marginBottom:6, textTransform:"uppercase" }}>● {whoopLabel(rec)} DAY</div>
                  <div style={{ fontFamily:C.fs, fontSize:14, color:C.text, lineHeight:1.5 }}>{whoopMsg(rec)}</div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, marginTop:8, letterSpacing:2 }}>HRV {hrv}ms · RHR {rhr}bpm · SLEEP {sleepEff}%</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <StatPill label="HRV" value={`${hrv}ms`} />
                  <StatPill label="RHR" value={`${rhr}`} />
                  <StatPill label="EFFICIENCY" value={`${sleepEff}%`} />
                </div>
              </>
            )}
          </div>

          {synthesisNote && (
            <div style={{ padding:"0 20px 16px" }}>
              <div style={{ background:"#FF770015", border:"1px solid #FF770033", borderRadius:14, padding:"14px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:14 }}>⚡</span>
                  <div style={{ fontFamily:C.fm, fontSize:8, color:"#FF7700", letterSpacing:3, fontWeight:700 }}>ADAPTIVE COACHING</div>
                </div>
                <div style={{ fontFamily:C.fs, fontSize:13, color:C.text, lineHeight:1.5 }}>{synthesisNote}</div>
              </div>
            </div>
          )}

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

          {garminActivities.length > 0 && (
            <div style={{ padding:"0 20px 20px" }}>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:10, textTransform:"uppercase" }}>RECENT ACTIVITIES</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {garminActivities.slice(0,3).map((a,i) => (
                  <div key={i} style={{ background:C.card, borderRadius:C.radius, padding:"12px 16px", border:`1px solid ${C.border}`, ...C.glass }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <div style={{ fontFamily:C.ff, fontSize:15, color:C.text, letterSpacing:1 }}>{a.name || a.activity_type}</div>
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2 }}>
                        {a.start_time ? new Date(a.start_time).toLocaleDateString("en-US",{month:"short",day:"numeric"}).toUpperCase() : ""}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:16 }}>
                      {a.distance_meters > 0 && (
                        <div>
                          <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2 }}>DISTANCE</div>
                          <div style={{ fontFamily:C.ff, fontSize:16, color:C.cyan }}>{(a.distance_meters/1000).toFixed(1)}km</div>
                        </div>
                      )}
                      {a.duration_seconds > 0 && (
                        <div>
                          <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2 }}>DURATION</div>
                          <div style={{ fontFamily:C.ff, fontSize:16, color:C.text }}>{Math.floor(a.duration_seconds/60)}m</div>
                        </div>
                      )}
                      {a.avg_hr > 0 && (
                        <div>
                          <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2 }}>AVG HR</div>
                          <div style={{ fontFamily:C.ff, fontSize:16, color:C.red }}>{a.avg_hr}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {!garminConnected && (
                <a href="/api/auth/garmin-login" style={{ display:"block", marginTop:10, padding:"12px", background:C.card, border:`1px solid ${C.border}`, borderRadius:10, textAlign:"center", fontFamily:C.ff, fontSize:12, color:C.cyan, letterSpacing:2, textDecoration:"none" }}>CONNECT GARMIN</a>
              )}
            </div>
          )}
        </div>
      )}

      {nav === "plan" && planLoading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
          <div style={{ fontFamily:C.ff, fontSize:16, color:C.muted, letterSpacing:4 }}>LOADING PLAN...</div>
        </div>
      )}

      {nav === "plan" && !planLoading && planBlocks.length === 0 && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", textAlign:"center" }}>
          <div style={{ fontFamily:C.ff, fontSize:28, letterSpacing:3, color:C.muted, marginBottom:8 }}>NO TRAINING PLAN FOUND<span style={{ color:C.red }}>.</span></div>
          <div style={{ fontFamily:C.fm, fontSize:9, color:C.light, letterSpacing:2, lineHeight:1.8 }}>
            Your plan hasn't been seeded yet.<br />Contact your coach to get started.
          </div>
        </div>
      )}

      {nav === "plan" && !planLoading && planBlocks.length > 0 && (
        <div>
          <div style={{ padding:"16px 20px 10px" }}>
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>TRAINING BLOCK</div>
            <div style={{ display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none" }}>
              {planBlocks.map(b => (
                <button key={b.id} onClick={() => { setBlockId(b.id); setWeekId(b.weeks[0].id); setSelDay(null); }} style={{ flexShrink:0, padding:"8px 16px", background: blockId===b.id ? C.card : "transparent", color: blockId===b.id ? C.cyan : C.muted, border:"none", borderBottom: blockId===b.id ? `2px solid ${C.cyan}` : "2px solid transparent", borderRadius:0, cursor:"pointer", fontFamily:C.ff, fontSize:12, letterSpacing:2, transition:"all 0.2s" }}>{b.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", overflowX:"auto", scrollbarWidth:"none", borderBottom:`1px solid ${C.border}`, paddingLeft:20 }}>
            {weeks.map(w => (
              <button key={w.id} onClick={() => { setWeekId(w.id); setSelDay(null); }} style={{ flexShrink:0, padding:"10px 14px", background:"transparent", color: weekId===w.id ? C.text : C.muted, border:"none", borderBottom:`2px solid ${weekId===w.id ? C.cyan : "transparent"}`, cursor:"pointer", fontFamily:C.fm, fontSize:7, letterSpacing:2, whiteSpace:"nowrap", transition:"all 0.2s" }}>
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
                <button key={d.day} onClick={() => { setSelDay(isSel ? null : d.day); setSess("am"); }} style={{ background: isSel ? C.card : "transparent", border:"none", borderRight: i<6 ? `1px solid ${C.border}` : "none", borderBottom:`2px solid ${isSel ? C.cyan : "transparent"}`, padding:"12px 4px 10px", cursor:"pointer", textAlign:"center", boxShadow: isSel ? `inset 0 0 16px ${C.cyan}10` : "none", transition:"all 0.15s" }}>
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
            <div style={{ margin:"16px 20px", background:C.card, borderRadius:C.radius, overflow:"hidden", border:`1px solid ${C.border}`, ...C.glass }}>
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
          {suppsLoading ? (
            <div style={{ fontFamily:C.ff, fontSize:14, color:C.muted, letterSpacing:3, textAlign:"center", padding:40 }}>LOADING...</div>
          ) : supplements.length === 0 ? (
            <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2, textAlign:"center", padding:40 }}>No supplements on file.</div>
          ) : (
            // Group rows by time_group, preserving DB sort_order within each group
            Object.entries(
              supplements.reduce((acc, s) => {
                if (!acc[s.time_group]) acc[s.time_group] = [];
                acc[s.time_group].push(s);
                return acc;
              }, {})
            ).map(([group, items]) => {
              const color = SUPP_GROUP_COLORS[group] || "#aaa";
              return (
                <div key={group} style={{ marginBottom:24 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                    <div style={{ fontFamily:C.fm, fontSize:8, color:C.cyan, letterSpacing:3, textTransform:"uppercase", flexShrink:0 }}>{group}</div>
                    <div style={{ flex:1, height:1, background:C.divider }} />
                  </div>
                  {items.map((item) => (
                    <div key={item.id} style={{ background:C.card, borderRadius:C.radius, padding:"14px 16px", marginBottom:8, borderLeft:`3px solid ${color}44`, border:`1px solid ${C.border}`, ...C.glass }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                        <div style={{ fontFamily:C.ff, fontSize:16, letterSpacing:0.5, color:C.text }}>{item.name}</div>
                        <div style={{ background:`${color}22`, border:`1px solid ${color}44`, borderRadius:20, padding:"3px 10px", fontFamily:C.fm, fontSize:8, color, letterSpacing:1, flexShrink:0, marginLeft:8 }}>{item.dose}</div>
                      </div>
                      <div style={{ fontFamily:C.fs, fontSize:12, color:C.muted, lineHeight:1.6, marginBottom:6 }}>{item.note}</div>
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.light, letterSpacing:2 }}>TIMING: {item.timing}</div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      {nav === "stats" && (
        <div style={{ padding:"20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:C.ff, fontSize:28, letterSpacing:2, marginBottom:4 }}>MY STATS<span style={{ color:C.green }}>.</span></div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3 }}>BODY COMPOSITION + BLOOD PANEL</div>
            </div>
            <div>
              <input ref={bloodworkInputRef} type="file" accept="image/*,.pdf" style={{ display:"none" }} onChange={e => { if (e.target.files?.[0]) handleBloodworkUpload(e.target.files[0]); }} />
              <button onClick={() => bloodworkInputRef.current?.click()} disabled={bloodworkUploading}
                style={{ padding:"10px 16px", background: bloodworkUploading ? C.card2 : C.green, color: bloodworkUploading ? C.muted : "#000", border:"none", borderRadius:10, cursor: bloodworkUploading ? "default" : "pointer", fontFamily:C.ff, fontSize:12, letterSpacing:2 }}>
                {bloodworkUploading ? "ANALYZING..." : "UPLOAD LABS"}
              </button>
            </div>
          </div>
          {bloodworkResult && (
            <div style={{ background: bloodworkResult.inserted ? `${C.green}15` : `${C.red}15`, border:`1px solid ${bloodworkResult.inserted ? C.green+"33" : C.red+"33"}`, borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
              <div style={{ fontFamily:C.fm, fontSize:8, color: bloodworkResult.inserted ? C.green : C.red, letterSpacing:2 }}>
                {bloodworkResult.inserted ? `✓ ${bloodworkResult.count} MARKERS EXTRACTED` : bloodworkResult.error || "NO MARKERS FOUND"}
              </div>
            </div>
          )}
          {["DXA","BLOOD"].map(cat => {
            const items = biomarkers.filter(b => b.category === cat);
            if (!items.length) return null;
            const latestDate = items[0]?.date_collected;
            const dateStr = latestDate
              ? new Date(latestDate).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }).toUpperCase()
              : null;
            const catLabel = cat === "DXA" ? "DXA SCAN" : "BLOOD PANEL";
            return (
              <div key={cat} style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ fontFamily:C.ff, fontSize:20, color:C.cyan, letterSpacing:2 }}>{catLabel}</div>
                  {dateStr && <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2 }}>{dateStr}</div>}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {items.map((b,i) => (
                    <div key={i} style={{ background:C.card, borderRadius:C.radius, padding:"14px", border:`1px solid ${C.border}`, borderLeft: b.flag==="HIGH"||b.flag==="LOW" ? `3px solid ${C.red}` : b.flag==="OPTIMAL"||b.flag==="GOOD" ? `3px solid ${C.green}` : `1px solid ${C.border}`, boxShadow: b.flag==="HIGH"||b.flag==="LOW" ? `0 0 16px ${C.red}10` : "none", ...C.glass }}>
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6, textTransform:"uppercase" }}>{b.label}</div>
                      <div style={{ fontFamily:C.ff, fontSize:22, color: b.flag==="HIGH"||b.flag==="LOW" ? C.red : b.flag==="OPTIMAL"||b.flag==="GOOD" ? C.green : C.text, fontWeight:700 }}>{b.value}{b.unit ? ` ${b.unit}` : ""}</div>
                      {b.flag && <div style={{ fontFamily:C.fm, fontSize:7, color: b.flag==="HIGH"||b.flag==="LOW" ? C.red : b.flag==="OPTIMAL"||b.flag==="GOOD" ? C.green : C.muted, marginTop:4, letterSpacing:2 }}>● {b.flag}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ fontFamily:C.ff, fontSize:20, color:C.cyan, letterSpacing:2 }}>HR ZONES</div>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2 }}>LTHR 165–170 BPM</div>
            </div>
            {HR_ZONES.map((z, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:C.card, borderRadius:12, marginBottom:6, borderLeft:`3px solid ${z.color}`, border:`1px solid ${C.border}`, ...C.glass }}>
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

      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:C.bg, borderTop:`1px solid ${C.border}`, display:"flex", zIndex:100, ...C.glass }}>
        {[["today","⚡","TODAY"],["plan","📅","PLAN"],["supps","💊","SUPPS"],["stats","📊","STATS"]].map(([id,icon,label]) => (
          <button key={id} onClick={() => setNav(id)} style={{ flex:1, padding:"10px 4px 22px", background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <div style={{ fontSize:18 }}>{icon}</div>
            <div style={{ fontFamily:C.fm, fontSize:7, letterSpacing:2, color: nav===id ? C.cyan : C.muted, fontWeight: nav===id ? 700 : 400, textTransform:"uppercase" }}>{label}</div>
            {nav===id && <div style={{ width:4, height:4, borderRadius:"50%", background:C.cyan, marginTop:1 }} />}
          </button>
        ))}
      </div>

      <AIChat whoopData={whoopData} currentWeek={week} recentActivities={recentActivities} onPlanChange={handlePlanChange} userName={profile?.name} persona={coachPersona} onPersonaChange={handlePersonaChange} />

      {selDay && (
        <SessionModal name={modalName} dayData={dayData} sess={sess} weekId={weekId} onClose={() => setSelDay(null)} onSessSwitch={setSess} sundayChoice={sundayChoice} setSundayChoice={setSundayChoice} />
      )}
    </div>
  );
}
