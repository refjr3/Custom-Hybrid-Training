import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import AuthScreen from "./AuthScreen";
import Onboarding from "./Onboarding";
import PlanBuilder from "./PlanBuilder";

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

const stripPlanChange = (text) =>
  text ? text.replace(/<plan_change>[\s\S]*?<\/plan_change>/g, "").replace(/<clarifying_questions>[\s\S]*?<\/clarifying_questions>/g, "").trim() : text;

const parseClarifyingQuestions = (text) => {
  if (!text) return null;
  const match = text.match(/<clarifying_questions>([\s\S]*?)<\/clarifying_questions>/);
  if (!match) return null;
  try {
    const jsonMatch = match[1].match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch?.[0] || match[1]);
  } catch (_) { return null; }
};

const normalizeClarifyingQuestions = (questions) =>
  (Array.isArray(questions) ? questions : []).map((q, idx) => ({
    ...q,
    id: String(q?.id || `q_${idx}`),
    options: Array.isArray(q?.options) ? q.options : [],
    branches: q?.branches && typeof q.branches === "object" ? q.branches : null,
  }));

const getClarifyingFlow = (questions, selectionsById) => {
  const normalized = normalizeClarifyingQuestions(questions);
  const byId = new Map(normalized.map((q) => [q.id, q]));
  if (normalized.length === 0) return { normalized, byId, sequence: [] };

  const root = normalized[0];
  const rootSelection = selectionsById[root.id] || [];
  const selectedRoot = rootSelection[0];

  if (root.branches) {
    if (!selectedRoot) return { normalized, byId, sequence: [root.id] };
    const rawBranchIds = Array.isArray(root.branches[selectedRoot]) ? root.branches[selectedRoot] : [];
    const branchIds = rawBranchIds
      .map((id) => String(id))
      .filter((id) => byId.has(id));
    return { normalized, byId, sequence: [root.id, ...branchIds] };
  }

  return { normalized, byId, sequence: normalized.map((q) => q.id) };
};

const renderMarkdown = (text) => {
  if (!text) return null;
  const clean = stripPlanChange(text);
  const lines = clean.split('\n');
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

const createSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const PLAN_BUILDER_DISMISS_KEY = "plan_builder_dismiss_until";

const makeInitialChatMessages = (userName) => ([
  { role:"assistant", content:`Hey ${userName || "there"} — I have your WHOOP data, training plan, and biomarkers loaded. What do you need?`, planChange:null }
]);

const AIChat = ({ whoopData, currentWeek, recentActivities, onPlanChange, userName, persona, onPersonaChange, proactiveBadge, authToken }) => {
  const [messages, setMessages] = useState(makeInitialChatMessages(userName));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [showPersonas, setShowPersonas] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatCqSelections, setChatCqSelections] = useState({});
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState(() => new Set());
  const [answeredQuestionValues, setAnsweredQuestionValues] = useState({});
  const [autoSubmittedQuestionBlocks, setAutoSubmittedQuestionBlocks] = useState(() => new Set());
  const [answeredQuestions, setAnsweredQuestions] = useState({});
  const [pendingReview, setPendingReview] = useState(null);
  const [chatSessionId, setChatSessionId] = useState(createSessionId);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const toggleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      setInput(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  useEffect(() => {
    if (expanded) messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, expanded]);

  const startFreshSession = () => {
    setMessages(makeInitialChatMessages(userName));
    setChatCqSelections({});
    setAnsweredQuestionIds(new Set());
    setAnsweredQuestionValues({});
    setAutoSubmittedQuestionBlocks(new Set());
    setAnsweredQuestions({});
    setPendingReview(null);
    setInput("");
    setAttachment(null);
    setShowPersonas(false);
    setLoading(false);
    setChatSessionId(createSessionId());
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const submitClarifyingAnswers = (messageIndex, answers) => {
    if (!answers?.trim()) return;
    setMessages(prev => prev.map((mm, mi) => mi === messageIndex ? { ...mm, cqSubmitted:true } : mm));
    setMessages(prev => [...prev, { role:"user", content:answers, planChange:null }]);
    setLoading(true);
    fetch("/api/coach/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json", ...(authToken ? {"Authorization":`Bearer ${authToken}`} : {})},
      body: JSON.stringify({
        message: answers,
        whoopData,
        currentWeek:{ id:currentWeek?.id, label:currentWeek?.label, subtitle:currentWeek?.subtitle },
        recentActivities:recentActivities?.slice(0,5),
        session_id: chatSessionId,
      }),
    }).then(r=>r.json()).then(data => {
      const cqs2 = parseClarifyingQuestions(data.message);
      setMessages(prev => [...prev, { role:"assistant", content:data.message||"Something went wrong.", planChange:data.planChange||null, clarifyingQuestions:cqs2 }]);
    }).catch(() => {
      setMessages(prev => [...prev, { role:"assistant", content:"Connection error. Try again.", planChange:null }]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (loading) return;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m?.clarifyingQuestions || m.cqSubmitted) continue;
      const msgKey = `chat_${i}`;
      if (autoSubmittedQuestionBlocks.has(msgKey)) continue;
      const normalizedAll = normalizeClarifyingQuestions(m.clarifyingQuestions);
      if (normalizedAll.length === 0) continue;
      const answered = answeredQuestions[msgKey] || [];
      const remaining = normalizedAll.filter((q) => !answeredQuestionIds.has(q.id) || answered.includes(q.id));
      if (remaining.length > 0) continue;

      const answers = normalizedAll.map((q) => {
        const sel = answeredQuestionValues[q.id] || [];
        return `${q?.question?.replace("?","")}:  ${sel.join(", ") || "Not specified"}`;
      }).join(". ");

      setAutoSubmittedQuestionBlocks((prev) => {
        const next = new Set(prev);
        next.add(msgKey);
        return next;
      });
      submitClarifyingAnswers(i, answers);
      break;
    }
  }, [messages, loading, answeredQuestions, answeredQuestionIds, answeredQuestionValues, autoSubmittedQuestionBlocks]);

  const sendMessage = async () => {
    if ((!input.trim() && !attachment) || loading) return;
    const userMsg = input.trim();
    const currentAttachment = attachment;
    const activeSessionId = chatSessionId || createSessionId();
    if (!chatSessionId) setChatSessionId(activeSessionId);
    setInput("");
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages(prev => [...prev, { role:"user", content:userMsg || `[${currentAttachment?.name}]`, planChange:null, attachment:currentAttachment }]);
    setLoading(true);
    try {
      if (currentAttachment && !currentAttachment.data) {
        setMessages(prev => [...prev, { role:"assistant", content:"File upload failed — please try again.", planChange:null }]);
        setLoading(false);
        return;
      }
      const res = await fetch("/api/coach/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json", ...(authToken ? { "Authorization":`Bearer ${authToken}` } : {}) },
        body: JSON.stringify({
          message: userMsg,
          whoopData,
          currentWeek: { id: currentWeek?.id, label: currentWeek?.label, subtitle: currentWeek?.subtitle },
          recentActivities: recentActivities?.slice(0,5),
          attachment: currentAttachment || null,
          session_id: activeSessionId,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setMessages(prev => [...prev, { role:"assistant", content:`Error: ${errData.error || "Request failed"}. Try again.`, planChange:null }]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const cqs = parseClarifyingQuestions(data.message);
      setMessages(prev => [...prev, { role:"assistant", content: data.message || "Something went wrong.", planChange: data.planChange || null, clarifyingQuestions: cqs }]);
    } catch (e) {
      setMessages(prev => [...prev, { role:"assistant", content:"Connection error. Try again.", planChange:null }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (planChange, action) => {
    if (action === "accept") {
      setMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeStatus:"applying" } : m));
      console.log("[AIChat] APPLY TO PLAN — sending to onPlanChange:", JSON.stringify(planChange));
      try {
        const result = await onPlanChange(planChange);
        const count = result?.modifiedCount ?? (planChange.type === "remap_week" ? (planChange.days?.length || 0) : 1);
        const confirmedWeeks = planChange.type === "remap_week" && result?.weeksUpdated
          ? Object.entries(result.weeksUpdated)
          : [];
        const perWeekHint = confirmedWeeks.length > 0
          ? `\n\n**Confirmed writes:**\n${confirmedWeeks.map(([weekName, weekCount]) => `- ${weekName}: ${weekCount}`).join("\n")}`
          : "";
        setMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeStatus:"accepted" } : m));
        setMessages(prev => [...prev, { role:"assistant", content:`✓ **Plan updated** — ${count} session${count>1?"s":""} modified.${perWeekHint}`, planChange:null }]);
      } catch (e) {
        console.error("[AIChat] APPLY failed:", e);
        setMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeStatus:null } : m));
        const errMsg = e?.message || "Plan update failed — tap to retry";
        setMessages(prev => [...prev, { role:"assistant", content:errMsg, planChange:null }]);
      }
    } else {
      setMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeStatus:"rejected" } : m));
    }
  };

  if (!expanded) {
    return (
      <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", width:"calc(100% - 40px)", maxWidth:440, zIndex:150 }}>
        <button onClick={() => { startFreshSession(); setExpanded(true); }}
          style={{ width:"100%", padding:"14px 20px", background:C.card, border:`1px solid ${C.border}`, borderRadius:C.radius, display:"flex", alignItems:"center", gap:12, cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.5)", ...C.glass }}>
          <div style={{ position:"relative", width:32, height:32, borderRadius:"50%", background:`${C.cyan}15`, border:`1px solid ${C.cyan}33`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontSize:14, color:C.cyan }}>✦</span>
            {proactiveBadge > 0 && (
              <div style={{ position:"absolute", top:-4, right:-4, width:16, height:16, borderRadius:"50%", background:C.red, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontFamily:C.fm, fontSize:8, color:"#fff", fontWeight:700 }}>{proactiveBadge}</span>
              </div>
            )}
          </div>
          <div style={{ flex:1, textAlign:"left" }}>
            <div style={{ fontFamily:C.ff, fontSize:13, color:C.text, letterSpacing:1 }}>ASK YOUR COACH</div>
            <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2, marginTop:2 }}>Claude · Powered by Anthropic</div>
          </div>
          <div style={{ fontFamily:C.fm, fontSize:7, color:C.cyan, letterSpacing:2 }}>OPEN ↑</div>
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
      {isRecording && (
        <div style={{ padding:"8px 20px", background:`${C.red}15`, borderBottom:`1px solid ${C.red}33`, display:"flex", alignItems:"center", gap:8 }}>
          <span className="pulse" style={{ color:C.red, fontSize:10 }}>●</span>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.red, letterSpacing:3 }}>RECORDING — TAP MIC TO STOP</div>
        </div>
      )}
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
            {m.clarifyingQuestions && !m.cqSubmitted && (
              <div style={{ maxWidth:"90%", marginTop:8, width:"100%" }}>
                {(() => {
                  const normalizedAll = normalizeClarifyingQuestions(m.clarifyingQuestions);
                  const msgKey = `chat_${i}`;
                  const answered = answeredQuestions[msgKey] || [];
                  const normalized = normalizedAll.filter((q) => !answeredQuestionIds.has(q.id) || answered.includes(q.id));
                  const selectionsById = Object.fromEntries(
                    normalized.map((q) => [q.id, chatCqSelections[`${msgKey}_${q.id}`] || []])
                  );
                  const { byId, sequence } = getClarifyingFlow(normalized, selectionsById);
                  const nextQuestionId = sequence.find((qid) => !answered.includes(qid)) || null;
                  const activeQuestion = nextQuestionId ? byId.get(nextQuestionId) : null;
                  const activeSelection = activeQuestion ? (selectionsById[activeQuestion.id] || []) : [];
                  const allAnswered = sequence.length > 0 && sequence.every((qid) => answered.includes(qid));
                  const questionIdx = activeQuestion ? Math.min(answered.length + 1, sequence.length) : sequence.length;

                  return (
                    <>
                      {sequence.length > 0 && (
                        <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2, marginBottom:6 }}>
                          Question {questionIdx} of {sequence.length}
                        </div>
                      )}

                      {activeQuestion && (
                        <div style={{ background:C.card, borderRadius:12, padding:"12px 14px", marginBottom:6, border:`1px solid ${C.border}`, ...C.glass }}>
                          <div style={{ fontFamily:C.fs, fontSize:13, color:C.text, marginBottom:10, lineHeight:1.4 }}>{activeQuestion.question}</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                            {activeQuestion.options.map((opt, oi) => {
                              const on = activeSelection.includes(opt);
                              return (
                                <button key={oi} onClick={() => {
                                  setChatCqSelections((prev) => {
                                    const key = `${msgKey}_${activeQuestion.id}`;
                                    const cur = prev[key] || [];
                                    let next = [];
                                    if (activeQuestion.type === "single_select") {
                                      next = [opt];
                                    } else {
                                      next = on ? cur.filter((x) => x !== opt) : [...cur, opt];
                                    }
                                    return { ...prev, [key]: next };
                                  });
                                }} style={{
                                  padding:"6px 12px", borderRadius:20, cursor:"pointer",
                                  background: on ? `${C.cyan}22` : C.cardSolid,
                                  border: `1px solid ${on ? C.cyan : C.border}`,
                                  fontFamily:C.fm, fontSize:10, color: on ? C.cyan : C.muted, letterSpacing:1,
                                }}>{opt}</button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {activeQuestion && (
                        <button
                          onClick={() => {
                            if (activeSelection.length === 0) return;
                            const selectedNow = [...activeSelection];
                            setAnsweredQuestions((prev) => {
                              const cur = prev[msgKey] || [];
                              if (cur.includes(activeQuestion.id)) return prev;
                              return { ...prev, [msgKey]: [...cur, activeQuestion.id] };
                            });
                            setAnsweredQuestionIds((prev) => {
                              const next = new Set(prev);
                              next.add(activeQuestion.id);
                              return next;
                            });
                            setAnsweredQuestionValues((prev) => ({ ...prev, [activeQuestion.id]: selectedNow }));
                          }}
                          disabled={activeSelection.length === 0}
                          style={{ width:"100%", padding:"12px", background:activeSelection.length ? C.cyan : C.cardSolid, color:activeSelection.length ? "#000" : C.muted, border:"none", borderRadius:10, cursor:activeSelection.length ? "pointer" : "default", fontFamily:C.ff, fontSize:13, letterSpacing:2, marginTop:4 }}
                        >
                          CONFIRM ANSWER →
                        </button>
                      )}

                      {allAnswered && (
                        <button onClick={() => {
                          const answers = sequence.map((qid) => {
                            const q = byId.get(qid);
                            const sel = selectionsById[qid] || [];
                            return `${q?.question?.replace("?","")}:  ${sel.join(", ") || "Not specified"}`;
                          }).join(". ");
                          submitClarifyingAnswers(i, answers);
                        }} style={{ width:"100%", padding:"12px", background:C.cyan, color:"#000", border:"none", borderRadius:10, cursor:"pointer", fontFamily:C.ff, fontSize:13, letterSpacing:2, marginTop:4 }}>FINAL CONFIRM →</button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            {m.cqSubmitted && <div style={{ fontFamily:C.fm, fontSize:8, color:C.green, letterSpacing:2, marginTop:4 }}>✓ ANSWERS SENT</div>}
            {m.planChange && !m.planChangeStatus && (
              <div style={{ maxWidth:"85%", marginTop:8, background:C.card2, borderRadius:12, padding:"12px 14px", border:`1px solid ${C.green}44` }}>
                <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:3, marginBottom:6 }}>PROPOSED CHANGE</div>
                <div style={{ fontFamily:C.ff, fontSize:14, color:C.text, marginBottom:4 }}>{m.planChange.description}</div>
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button onClick={() => setPendingReview({ planChange:m.planChange, msgIdx:i })} style={{ flex:1, padding:"10px", background:C.green, color:"#000", border:"none", borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:12, letterSpacing:2 }}>REVIEW CHANGES</button>
                  <button onClick={() => handlePlanChange(m.planChange, "reject")} style={{ flex:1, padding:"10px", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:12, letterSpacing:2 }}>DISMISS</button>
                </div>
              </div>
            )}
            {m.planChange && m.planChangeStatus && (
              <div style={{ fontFamily:C.fm, fontSize:8, color: m.planChangeStatus==="accepted" ? C.green : m.planChangeStatus==="applying" ? C.cyan : C.muted, letterSpacing:2, marginTop:4 }}>
                {m.planChangeStatus === "accepted" ? "✓ APPLIED TO PLAN" : m.planChangeStatus === "applying" ? "APPLYING..." : "✕ DISMISSED"}
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
            {attachment.media_type?.startsWith("image/") ? (
              <img src={`data:${attachment.media_type};base64,${attachment.data}`} alt="" style={{ width:28, height:28, borderRadius:4, objectFit:"cover", flexShrink:0 }} />
            ) : (
              <span style={{ fontSize:13 }}>📄</span>
            )}
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
          reader.onload = () => { try { setAttachment({ data: reader.result.split(",")[1], media_type: file.type, name: file.name }); } catch(_) { setMessages(prev => [...prev, { role:"assistant", content:"Failed to read file. Try a smaller image or PDF.", planChange:null }]); } };
          reader.onerror = () => setMessages(prev => [...prev, { role:"assistant", content:"File upload failed. Please try again.", planChange:null }]);
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
        <button onClick={toggleVoice} style={{ width:36, height:36, background: isRecording ? `${C.red}22` : C.card2, border:`1px solid ${isRecording ? C.red+"44" : C.border}`, borderRadius:10, cursor:"pointer", color: isRecording ? C.red : C.muted, fontSize:16, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }} title={isRecording ? "Stop recording" : "Voice input"}>
          {isRecording ? <span className="pulse" style={{ fontSize:14 }}>●</span> : "🎙"}
        </button>
        <button onClick={sendMessage} disabled={loading || (!input.trim() && !attachment)} style={{ width:48, height:48, background: (input.trim() || attachment) ? C.green : C.card, border:"none", borderRadius:12, cursor: (input.trim() || attachment) ? "pointer" : "default", color: (input.trim() || attachment) ? "#000" : C.muted, fontSize:18, flexShrink:0 }}>↑</button>
      </div>
      {pendingReview && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(10,10,10,0.97)", display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>
          <div style={{ padding:"20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontFamily:C.ff, fontSize:20, color:C.cyan, letterSpacing:2 }}>REVIEW CHANGES</div>
            <button onClick={() => setPendingReview(null)} style={{ background:C.cardSolid, border:"none", color:C.muted, width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:14 }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
            {(() => {
              const pc = pendingReview.planChange;
              const days = pc.type === "remap_week" ? (pc.days || []) : [{ day:pc.day, changes:pc.changes }];
              return days.map((d, di) => (
                <div key={di} style={{ background:C.card, borderRadius:C.radius, padding:"14px 16px", marginBottom:10, border:`1px solid ${C.border}`, ...C.glass }}>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:8 }}>{d.day || "SESSION"}</div>
                  <div style={{ display:"flex", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2, marginBottom:4 }}>CURRENT</div>
                      <div style={{ fontFamily:C.fs, fontSize:12, color:C.muted, lineHeight:1.5 }}>{d.changes?.am_session || d.changes?.note || "Current session"}</div>
                    </div>
                    <div style={{ width:1, background:C.border }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:C.fm, fontSize:6, color:C.cyan, letterSpacing:2, marginBottom:4 }}>PROPOSED</div>
                      <div style={{ fontFamily:C.fs, fontSize:12, color:C.cyan, lineHeight:1.5 }}>{pc.description}</div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
          <div style={{ padding:"16px 20px 24px" }}>
            <button onClick={async () => { await handlePlanChange(pendingReview.planChange, "accept"); setPendingReview(null); }} style={{ width:"100%", padding:"16px", background:C.green, color:"#000", border:"none", borderRadius:12, cursor:"pointer", fontFamily:C.ff, fontSize:16, letterSpacing:3, marginBottom:10 }}>APPLY TO PLAN</button>
            <button onClick={() => { handlePlanChange(pendingReview.planChange, "reject"); setPendingReview(null); }} style={{ width:"100%", padding:"10px", background:"transparent", color:C.muted, border:"none", cursor:"pointer", fontFamily:C.fm, fontSize:9, letterSpacing:2 }}>CANCEL</button>
          </div>
        </div>
      )}
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

const SESSION_TYPES = ["ZONE 2","THRESHOLD","HYROX","STRENGTH","TEMPO","VO2 MAX","RECOVERY","MOBILITY","RACE"];
const BLOCK_TYPES = ["FOR TIME","AMRAP","EMOM","INTERVALS","GENERAL"];
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const SessionModal = ({ name, dayData, sess, weekId, onClose, onSessSwitch, sundayChoice, setSundayChoice, supabase, session: authSession, onSaved }) => {
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editBlocks, setEditBlocks] = useState([]);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);

  if (!name && !dayData?.isSunday && !dayData?.isRaceDay) return null;
  const w = name ? WL[name] : null;
  const accent = name ? getAccent(name) : C.muted;
  const customContent = sess === "am" ? dayData?.am_session_custom : dayData?.pm_session_custom;
  const showCustom = !!(customContent && dayData?.ai_modified);
  const currentBlocks = sess === "am" ? dayData?.am_session_blocks : dayData?.pm_session_blocks;
  const hasManualEdits = Array.isArray(currentBlocks) && currentBlocks.some((b) => b?.is_modified);
  const sessionStatus = hasManualEdits
    ? { label: "MODIFIED", color: C.yellow }
    : { label: "AI GENERATED", color: C.cyan };

  const enterEdit = () => {
    setEditName(name || "");
    setEditType(w?.type || "");
    setEditDuration(w?.duration?.replace(/[^0-9]/g,"") || "");
    setEditNote(dayData?.note2a || w?.note || "");
    const existing = sess === "am" ? dayData?.am_session_blocks : dayData?.pm_session_blocks;
    if (existing && existing.length > 0) {
      setEditBlocks(JSON.parse(JSON.stringify(existing)));
    } else if (w?.steps) {
      setEditBlocks([{
        id:uid(), type:"GENERAL", duration:null, rounds:null, order:0,
        exercises: w.steps.filter(s => !s.startsWith("—")).map((s,i) => ({ id:uid(), name:s, sets:null, reps:null, note:null })),
        is_ai_generated: !!dayData?.ai_modified, is_modified:false,
      }]);
    } else {
      setEditBlocks([]);
    }
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!supabase || !authSession?.access_token || !dayData) return;
    setSaving(true);
    const blocksKey = sess === "am" ? "am_session_blocks" : "pm_session_blocks";
    const ordered = editBlocks.map((b,i) => ({ ...b, order:i }));
    const manuallyEditedBlocks = ordered.map((b) => ({ ...b, is_modified: true, is_ai_generated: false }));
    const update = {
      [blocksKey]: manuallyEditedBlocks,
      note: editNote,
      ai_modified: false,
      ai_modification_note: null,
    };
    try {
      // weekId is the UUID from training_weeks; training_days.week_id is the slug
      // Look up the slug first, then update training_days
      const { data: weekRow } = await supabase
        .from("training_weeks").select("week_id").eq("id", weekId).single();
      const wkSlug = weekRow?.week_id || weekId;
      const { error } = await supabase
        .from("training_days")
        .update(update)
        .eq("week_id", wkSlug)
        .eq("day_name", dayData.day);
      if (error) throw error;
      setToast("✓ Saved");
      setTimeout(() => { setToast(null); setEditMode(false); if (onSaved) onSaved(); }, 1200);
    } catch (e) {
      setToast("Save failed: " + e.message);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const addBlock = () => {
    setEditBlocks(prev => [...prev, {
      id:uid(), type:"GENERAL", duration:20, rounds:null, order:prev.length,
      exercises:[{ id:uid(), name:"New exercise", sets:3, reps:"10", note:null }],
      is_ai_generated:false, is_modified:true,
    }]);
  };

  const dupBlock = (idx) => {
    const b = editBlocks[idx];
    const nb = { ...JSON.parse(JSON.stringify(b)), id:uid(), is_ai_generated:false, is_modified:true };
    setEditBlocks(prev => [...prev.slice(0,idx+1), nb, ...prev.slice(idx+1)]);
  };

  const delBlock = (idx) => setEditBlocks(prev => prev.filter((_,i) => i !== idx));

  const updateBlock = (idx, updates) => {
    setEditBlocks(prev => prev.map((b,i) => {
      if (i !== idx) return b;
      return { ...b, ...updates, is_modified:true };
    }));
  };

  const addExercise = (blockIdx) => {
    updateBlock(blockIdx, {
      exercises: [...editBlocks[blockIdx].exercises, { id:uid(), name:"", sets:3, reps:"10", note:null }],
    });
  };

  const updateExercise = (blockIdx, exIdx, updates) => {
    const exs = editBlocks[blockIdx].exercises.map((e,i) => i === exIdx ? { ...e, ...updates } : e);
    updateBlock(blockIdx, { exercises:exs });
  };

  const delExercise = (blockIdx, exIdx) => {
    updateBlock(blockIdx, { exercises:editBlocks[blockIdx].exercises.filter((_,i) => i !== exIdx) });
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); };
  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) return;
    setEditBlocks(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    setDragIdx(null);
  };

  const inputStyle = { padding:"10px 12px", background:C.cardSolid, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontFamily:C.fs, fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" };

  if (editMode) {
    return (
      <div style={{ position:"fixed", inset:0, zIndex:200, background:C.bg, overflowY:"auto" }}>
        <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:C.bg, zIndex:10 }}>
            <div style={{ fontFamily:C.ff, fontSize:18, color:C.cyan, letterSpacing:2 }}>EDIT SESSION</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setEditMode(false)} style={{ padding:"8px 14px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:11, color:C.muted, letterSpacing:2 }}>CANCEL</button>
              <button onClick={saveEdit} disabled={saving} style={{ padding:"8px 14px", background:C.green, border:"none", borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:11, color:"#000", letterSpacing:2 }}>{saving ? "..." : "SAVE"}</button>
            </div>
          </div>

          <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:4 }}>SESSION NAME</div>
              <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6 }}>TYPE</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {SESSION_TYPES.map(t => (
                  <button key={t} onClick={() => setEditType(t)} style={{ padding:"5px 10px", borderRadius:16, cursor:"pointer", background: editType===t ? `${C.cyan}22` : C.cardSolid, border:`1px solid ${editType===t ? C.cyan : C.border}`, fontFamily:C.fm, fontSize:8, color: editType===t ? C.cyan : C.muted, letterSpacing:1 }}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:4 }}>DURATION</div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} style={{ ...inputStyle, width:80 }} />
                  <span style={{ fontFamily:C.fm, fontSize:9, color:C.muted }}>min</span>
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:4 }}>NOTE</div>
              <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={2} style={{ ...inputStyle, resize:"vertical" }} />
            </div>
          </div>

          <div style={{ padding:"0 20px" }}>
            <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:10 }}>WORKOUT BLOCKS</div>
            {editBlocks.map((block, bi) => (
              <div key={block.id} draggable onDragStart={() => handleDragStart(bi)} onDragOver={e => handleDragOver(e, bi)} onDrop={() => handleDrop(bi)}
                style={{ background:C.card, borderRadius:12, padding:"12px", marginBottom:8, border:`1px solid ${dragIdx===bi ? C.cyan+"55" : C.border}`, ...C.glass }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ cursor:"grab", color:C.light, fontSize:14 }}>⠿</span>
                    <div style={{ fontFamily:C.ff, fontSize:14, color:C.text, letterSpacing:1 }}>{block.type}</div>
                    {block.is_ai_generated && !block.is_modified && <span style={{ fontFamily:C.fm, fontSize:6, color:C.cyan, letterSpacing:2, background:`${C.cyan}15`, padding:"2px 6px", borderRadius:8 }}>AI</span>}
                    {block.is_modified && <span style={{ fontFamily:C.fm, fontSize:6, color:C.yellow, letterSpacing:2, background:`${C.yellow}15`, padding:"2px 6px", borderRadius:8 }}>MODIFIED</span>}
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={() => setExpandedBlock(expandedBlock === bi ? null : bi)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13, padding:4 }}>✏️</button>
                    <button onClick={() => dupBlock(bi)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13, padding:4 }}>📋</button>
                    <button onClick={() => delBlock(bi)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:13, padding:4 }}>🗑</button>
                  </div>
                </div>

                {expandedBlock !== bi && (
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    {block.exercises.slice(0,4).map((ex,ei) => (
                      <div key={ei} style={{ fontFamily:C.fs, fontSize:11, color:C.muted, lineHeight:1.4 }}>
                        {ex.name}{ex.sets ? ` · ${ex.sets}×${ex.reps||""}` : ""}{ex.note ? ` — ${ex.note}` : ""}
                      </div>
                    ))}
                    {block.exercises.length > 4 && <div style={{ fontFamily:C.fm, fontSize:9, color:C.light }}>+{block.exercises.length-4} more</div>}
                  </div>
                )}

                {expandedBlock === bi && (
                  <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:8 }}>
                    <div style={{ display:"flex", gap:6 }}>
                      {BLOCK_TYPES.map(bt => (
                        <button key={bt} onClick={() => updateBlock(bi, { type:bt })} style={{ padding:"4px 8px", borderRadius:12, cursor:"pointer", background:block.type===bt ? `${C.cyan}22` : C.cardSolid, border:`1px solid ${block.type===bt ? C.cyan : C.border}`, fontFamily:C.fm, fontSize:7, color:block.type===bt ? C.cyan : C.muted }}>{bt}</button>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2, marginBottom:2 }}>DURATION</div>
                        <input type="number" value={block.duration||""} onChange={e => updateBlock(bi,{duration:parseInt(e.target.value)||null})} style={{ ...inputStyle, fontSize:11 }} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2, marginBottom:2 }}>ROUNDS</div>
                        <input type="number" value={block.rounds||""} onChange={e => updateBlock(bi,{rounds:parseInt(e.target.value)||null})} style={{ ...inputStyle, fontSize:11 }} />
                      </div>
                    </div>
                    {block.exercises.map((ex,ei) => (
                      <div key={ex.id} style={{ display:"flex", gap:4, alignItems:"flex-start" }}>
                        <div style={{ flex:2 }}><input value={ex.name} onChange={e => updateExercise(bi,ei,{name:e.target.value})} placeholder="Exercise" style={{ ...inputStyle, fontSize:11 }} /></div>
                        <div style={{ width:40 }}><input type="number" value={ex.sets||""} onChange={e => updateExercise(bi,ei,{sets:parseInt(e.target.value)||null})} placeholder="S" style={{ ...inputStyle, fontSize:11, textAlign:"center" }} /></div>
                        <div style={{ width:50 }}><input value={ex.reps||""} onChange={e => updateExercise(bi,ei,{reps:e.target.value})} placeholder="Reps" style={{ ...inputStyle, fontSize:11, textAlign:"center" }} /></div>
                        <button onClick={() => delExercise(bi,ei)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:11, padding:4, marginTop:6 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => addExercise(bi)} style={{ padding:"6px", background:"transparent", border:`1px dashed ${C.border}`, borderRadius:6, cursor:"pointer", fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2 }}>+ ADD EXERCISE</button>
                  </div>
                )}
              </div>
            ))}
            <button onClick={addBlock} style={{ width:"100%", padding:"12px", background:"transparent", border:`1px dashed ${C.cyan}44`, borderRadius:12, cursor:"pointer", fontFamily:C.ff, fontSize:12, color:C.cyan, letterSpacing:2, marginBottom:20 }}>+ ADD BLOCK</button>
          </div>
        </div>
        {toast && (
          <div style={{ position:"fixed", bottom:40, left:"50%", transform:"translateX(-50%)", background:C.cardSolid, border:`1px solid ${C.green}44`, borderRadius:10, padding:"10px 20px", zIndex:300 }}>
            <div style={{ fontFamily:C.fm, fontSize:9, color:C.green, letterSpacing:2 }}>{toast}</div>
          </div>
        )}
      </div>
    );
  }

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
            {!dayData?.isRaceDay && (name || customContent) && (
              <div
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  background: `${sessionStatus.color}22`,
                  border: `1px solid ${sessionStatus.color}44`,
                  borderRadius: 20,
                  padding: "3px 10px",
                  fontFamily: C.fm,
                  fontSize: 7,
                  color: sessionStatus.color,
                  letterSpacing: 2,
                }}
              >
                {sessionStatus.label}
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={enterEdit} style={{ background:C.card, border:`1px solid ${C.border}`, color:C.cyan, width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>✏️</button>
            <button onClick={onClose} style={{ background:C.card, border:"none", color:C.muted, width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:16 }}>✕</button>
          </div>
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
  const [showEntrance, setShowEntrance] = useState(false);
  const [garminActivities, setGarminActivities] = useState([]);
  const [garminConnected, setGarminConnected] = useState(false);
  const [proactiveMessages, setProactiveMessages] = useState([]);
  const [proactiveBadge, setProactiveBadge] = useState(0);
  const [weeklyReview, setWeeklyReview] = useState(null);
  const [showReadinessBreakdown, setShowReadinessBreakdown] = useState(false);
  const [unifiedMetrics, setUnifiedMetrics] = useState([]);
  const [labOpen, setLabOpen] = useState(false);
  const [labMessages, setLabMessages] = useState([]);
  const [labInput, setLabInput] = useState("");
  const [labLoading, setLabLoading] = useState(false);
  const [scenarioChanges, setScenarioChanges] = useState([]);
  const [showLabReview, setShowLabReview] = useState(false);
  const [labToast, setLabToast] = useState(null);
  const [planBuilderOpen, setPlanBuilderOpen] = useState(false);
  const [planBuilderDismissUntil, setPlanBuilderDismissUntil] = useState(0);
  const [labContext, setLabContext] = useState("");
  const [labTargetDay, setLabTargetDay] = useState(null);
  const [cqSelections, setCqSelections] = useState({});
  const [labAnsweredQuestions, setLabAnsweredQuestions] = useState({});
  const [labSessionId, setLabSessionId] = useState(createSessionId);
  const dataFetched = useRef(false);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        supabase
          .from("user_profiles").select("*").eq("user_id", newSession.user.id).single()
          .then(({ data }) => {
            setProfile(prev => {
              if (prev?.user_id === data?.user_id) return prev;
              return data || null;
            });
            setAuthLoading(false);
          });
      } else {
        setProfile(null);
        dataFetched.current = false;
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(PLAN_BUILDER_DISMISS_KEY);
    const ts = Number(raw);
    if (Number.isFinite(ts) && ts > 0) {
      setPlanBuilderDismissUntil(ts);
    }
  }, []);

  // Data fetches — only run once per session when profile is first loaded
  useEffect(() => {
    if (!profile || dataFetched.current) return;
    dataFetched.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") window.history.replaceState({}, "", "/");

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
    fetchUnifiedMetrics();
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
        .limit(20);
      if (data) setGarminActivities(data);
    } catch (_) {}
  };

  const fetchUnifiedMetrics = async () => {
    try {
      const { data } = await supabase
        .from("unified_metrics")
        .select("*")
        .order("date", { ascending: false })
        .limit(90);
      if (data) setUnifiedMetrics(data);
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

  // Proactive Coaching: check HRV trend + Sunday weekly review
  useEffect(() => {
    if (!whoopData || !session?.access_token) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("proactive_date") === today) return;

    const checkProactive = async () => {
      const msgs = [];
      const hrv = whoopData?.recovery?.hrv;
      if (hrv) {
        const storedHrvs = JSON.parse(localStorage.getItem("hrv_history") || "[]");
        storedHrvs.push({ date: today, value: hrv });
        const recent = storedHrvs.slice(-7);
        localStorage.setItem("hrv_history", JSON.stringify(recent));

        if (recent.length >= 3) {
          const last3 = recent.slice(-3).map(h => h.value);
          const declining = last3.every((v, i) => i === 0 || v < last3[i - 1]);
          if (declining) {
            try {
              const res = await fetch("/api/coaching/proactive", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
                body: JSON.stringify({ type: "hrv_trend", hrv_values: last3 }),
              });
              const data = await res.json();
              if (data.messages?.length) msgs.push(...data.messages);
            } catch (_) {}
          }
        }
      }

      if (new Date().getDay() === 0) {
        try {
          const currentWeekDays = (planBlocks[0]?.weeks?.[0]?.days) || [];
          const planned = currentWeekDays.filter(d => d.am).length;
          const completed = currentWeekDays.filter(d => {
            const dd = d.date?.split(" ")[0];
            return garminActivities.some(a => a.start_time?.startsWith(dd || "___"));
          }).length;
          const res = await fetch("/api/coaching/proactive", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
            body: JSON.stringify({
              type: "weekly_review",
              week_summary: {
                recovery: whoopData?.recovery?.score,
                hrv: whoopData?.recovery?.hrv,
                strain: whoopData?.strain?.score,
                sleep: whoopData?.sleep?.score,
                sessions_planned: planned,
                sessions_completed: completed,
                compliance: planned > 0 ? Math.round((completed/planned)*100) : 0,
                activities: garminActivities.slice(0, 7).map(a => ({ type: a.activity_type, distance: a.distance_meters, duration: a.duration_seconds, name: a.name })),
              },
            }),
          });
          const data = await res.json();
          if (data.messages?.length) {
            const reviewMsg = data.messages.find(m => m.content);
            if (reviewMsg) setWeeklyReview(reviewMsg.content);
            msgs.push(...data.messages);
          }
        } catch (_) {}
      }

      localStorage.setItem("proactive_date", today);
      if (msgs.length > 0) {
        setProactiveMessages(msgs);
        setProactiveBadge(msgs.length);
      }
    };

    checkProactive();
  }, [whoopData]);

  const labSend = async (msg) => {
    if (!msg?.trim() || labLoading) return;
    setLabMessages(prev => [...prev, { role:"user", content:msg }]);
    setLabInput("");
    setLabLoading(true);
    try {
      const week = (planBlocks[0]?.weeks || [])[0];
      const scenarioCtx = scenarioChanges.length > 0
        ? `\n\nALREADY ACCEPTED IN THIS SESSION:\n${scenarioChanges.map((c,i) => `${i+1}. ${c.description}`).join("\n")}\nBuild on top of these. Do not contradict them.`
        : "";
      const res = await fetch("/api/coach/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          message: `[SCENARIO MODE] ${msg}${scenarioCtx}\n\nRespond with a full plan adjustment proposal. Include a <plan_change> block if applicable.`,
          whoopData,
          currentWeek: week ? { id:week.id, label:week.label, subtitle:week.subtitle } : null,
          recentActivities: garminActivities.slice(0,3),
          scenarioChanges: scenarioChanges.length > 0 ? scenarioChanges : undefined,
          session_id: labSessionId,
        }),
      });
      const data = await res.json();
      if (data.planChange?.day) {
        const wk = week?.label?.split("·")[1]?.trim() || week?.label || "";
        setLabContext(`${wk} · ${data.planChange.day}`);
        setLabTargetDay(data.planChange.day);
      }
      const cqs = parseClarifyingQuestions(data.message);
      setLabMessages(prev => [...prev, { role:"assistant", content:data.message, planChange:data.planChange, clarifyingQuestions:cqs }]);
    } catch (e) {
      setLabMessages(prev => [...prev, { role:"assistant", content:"Connection error. Try again." }]);
    } finally {
      setLabLoading(false);
    }
  };

  const handleLabAccept = (planChange) => {
    setScenarioChanges(prev => [...prev, planChange]);
    setLabMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeAccepted:true } : m));
  };

  const labApplyAll = async () => {
    try {
      for (const change of scenarioChanges) {
        await handlePlanChange(change);
      }
    } catch (e) {
      setLabToast(e?.message || "Failed to apply queued changes — tap to retry");
      setTimeout(() => setLabToast(null), 5000);
      return;
    }
    setScenarioChanges([]);
    setLabMessages([]);
    setShowLabReview(false);
    setLabOpen(false);
  };

  const labDiscard = () => {
    setScenarioChanges([]);
    setLabMessages([]);
    setCqSelections({});
    setLabAnsweredQuestions({});
    setShowLabReview(false);
    setLabOpen(false);
  };

  const labClose = () => {
    setLabOpen(false);
    setLabTargetDay(null);
    if (scenarioChanges.length > 0) {
      setLabToast(`${scenarioChanges.length} change${scenarioChanges.length>1?"s":""} saved in queue — tap to review`);
      setTimeout(() => setLabToast(null), 5000);
    }
  };

  const handlePlanChange = async (planChange) => {
    const token = session?.access_token;
    const normalizeWeekKey = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const resolveActualWeekCount = (weeksUpdated, expectedWeekRef) => {
      const expectedNorm = normalizeWeekKey(expectedWeekRef);
      for (const [actualWeekRef, actualCount] of Object.entries(weeksUpdated || {})) {
        const actualNorm = normalizeWeekKey(actualWeekRef);
        if (!actualNorm) continue;
        if (actualNorm === expectedNorm || actualNorm.includes(expectedNorm) || expectedNorm.includes(actualNorm)) {
          return Number(actualCount) || 0;
        }
      }
      return 0;
    };
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
        if (!res.ok) throw new Error(body.error || "Supplement update failed — tap to retry");
        if (res.ok) await fetchSupplements();
        return { modifiedCount: 1 };
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

      if (!res.ok) throw new Error(body.error || "Plan update failed — tap to retry");

      let modifiedCount = 0;
      let confirmedWeeksUpdated = null;
      if (planChange.type === "remap_week") {
        const expectedWeekCounts = {};
        const fallbackWeekRef = planChange.week_id || "CURRENT WEEK";
        for (const dayChange of (planChange.days || [])) {
          const targetWeekRef = dayChange?.week_id || fallbackWeekRef;
          expectedWeekCounts[targetWeekRef] = (expectedWeekCounts[targetWeekRef] || 0) + 1;
        }

        const weeksUpdated = body.weeks_updated || {};
        confirmedWeeksUpdated = weeksUpdated;
        for (const [weekRef, expectedCount] of Object.entries(expectedWeekCounts)) {
          const actualCount = resolveActualWeekCount(weeksUpdated, weekRef);
          if (actualCount === 0) {
            throw new Error(`Week ${weekRef} failed to update — tap to retry`);
          }
          if (actualCount !== expectedCount) {
            throw new Error(`Week ${weekRef} updated ${actualCount}/${expectedCount} sessions — tap to retry`);
          }
          modifiedCount += actualCount;
        }

        if (typeof body.total === "number" && body.total !== modifiedCount) {
          throw new Error("Write confirmation mismatch — tap to retry");
        }
      } else {
        modifiedCount = Array.isArray(body.updated) ? body.updated.length : 0;
        if (modifiedCount === 0) {
          throw new Error(`Week ${planChange.week_id || "selected week"} failed to update — tap to retry`);
        }
      }

      console.log("[handlePlanChange] update confirmed — calling fetchPlan");
      await fetchPlan(token);
      console.log("[handlePlanChange] fetchPlan complete");
      return { modifiedCount, weeksUpdated: confirmedWeeksUpdated };
    } catch (e) {
      console.log("[handlePlanChange] caught error:", e.message);
      throw e;
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
  if (!profile) return <Onboarding supabase={supabase} session={session} onComplete={(p) => { setShowEntrance(true); setTimeout(() => setShowEntrance(false), 2800); setProfile(p); }} />;

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
  const noPlanLoaded = !planLoading && planBlocks.length === 0;
  const planBuilderDismissed = noPlanLoaded && Date.now() < planBuilderDismissUntil;
  const showNoPlanState = noPlanLoaded && !planBuilderDismissed;

  const dismissPlanBuilderFor24h = () => {
    const until = Date.now() + (24 * 60 * 60 * 1000);
    setPlanBuilderDismissUntil(until);
    localStorage.setItem(PLAN_BUILDER_DISMISS_KEY, String(until));
  };

  const openPlanBuilder = () => {
    setPlanBuilderOpen(true);
  };

  const NoPlanState = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontFamily: C.ff, fontSize: 28, letterSpacing: 3, color: C.muted, marginBottom: 8 }}>
          NO TRAINING PLAN FOUND<span style={{ color: C.red }}>.</span>
        </div>
        <div style={{ fontFamily: C.fm, fontSize: 9, color: C.light, letterSpacing: 2, lineHeight: 1.8, marginBottom: 16 }}>
          Build your personalized training structure now, or dismiss this reminder for 24 hours.
        </div>
        <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={openPlanBuilder}
            style={{
              padding: "12px 14px",
              background: C.green,
              color: "#000",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: C.ff,
              fontSize: 14,
              letterSpacing: 2,
            }}
          >
            BUILD MY PLAN
          </button>
          <button
            onClick={dismissPlanBuilderFor24h}
            style={{
              padding: "10px 12px",
              background: "transparent",
              color: C.muted,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: C.fm,
              fontSize: 10,
              letterSpacing: 2,
            }}
          >
            I'LL DO IT LATER
          </button>
        </div>
      </div>
    );
  };

  const DismissedNoPlanState = () => (
    <div style={{ margin: "20px", padding: "14px 16px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <div style={{ fontFamily: C.fm, fontSize: 8, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>
        PLAN BUILDER REMINDER DISMISSED FOR 24H
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={openPlanBuilder}
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "transparent",
            color: C.cyan,
            border: `1px solid ${C.cyan}44`,
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: C.fm,
            fontSize: 10,
            letterSpacing: 2,
          }}
        >
          BUILD MY PLAN
        </button>
        <button
          onClick={() => {
            localStorage.removeItem(PLAN_BUILDER_DISMISS_KEY);
            setPlanBuilderDismissUntil(0);
          }}
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "transparent",
            color: C.muted,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: C.fm,
            fontSize: 10,
            letterSpacing: 2,
          }}
        >
          SHOW FULL STATE
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:C.fs, maxWidth:480, margin:"0 auto", paddingBottom:80 }}>
      {showEntrance && (
        <div style={{ position:"fixed", inset:0, zIndex:9999, background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", animation:"entrance-fade 2.8s ease forwards" }}>
          <div style={{ fontSize:64, animation:"entrance-scale 1s cubic-bezier(.175,.885,.32,1.275) forwards", transform:"scale(0)" }}>△</div>
          <div style={{ fontFamily:C.fm, fontSize:10, color:C.cyan, letterSpacing:6, marginTop:20, opacity:0, animation:"entrance-text 0.8s ease 0.6s forwards" }}>HYBRID PERFORMANCE OS</div>
          <style>{`
            @keyframes entrance-scale { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.1);opacity:1} 100%{transform:scale(1);opacity:1} }
            @keyframes entrance-text { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
            @keyframes entrance-fade { 0%,70%{opacity:1} 100%{opacity:0;pointer-events:none} }
          `}</style>
        </div>
      )}

      {nav === "today" && showNoPlanState && <NoPlanState />}

      {nav === "today" && noPlanLoaded && planBuilderDismissed && <DismissedNoPlanState />}

      {nav === "today" && !noPlanLoaded && (
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

          {(() => {
            const recScore = whoopData ? Math.min(100, Math.max(0, whoopData.recovery?.score || 0)) : null;
            const currentWeekDays = (planBlocks[0]?.weeks?.[0]?.days) || [];
            const plannedSessions = currentWeekDays.filter(d => d.am).length;
            const completedSessions = currentWeekDays.filter(d => {
              const dd = d.date?.split(" ")[0];
              return garminActivities.some(a => a.start_time?.startsWith(dd || "___"));
            }).length;
            const complianceScore = plannedSessions > 0 ? Math.round((completedSessions / plannedSessions) * 100) : 50;
            const vo2Vals = unifiedMetrics.filter(m => m.vo2_max).slice(0, 5);
            const vo2Score = vo2Vals.length >= 2 ? (Number(vo2Vals[0].vo2_max) >= Number(vo2Vals[vo2Vals.length-1].vo2_max) ? 80 : 50) : 50;
            const sleepScore = whoopData?.sleep?.score || 50;
            const flaggedCount = biomarkers.filter(b => b.flag === "HIGH" || b.flag === "LOW").length;
            const bioScore = Math.max(0, 100 - flaggedCount * 20);
            const components = [
              { label:"RECOVERY TREND", score: recScore ?? 50, weight:0.30, color: (recScore??50) >= 67 ? C.green : (recScore??50) >= 34 ? C.yellow : C.red },
              { label:"COMPLIANCE", score: complianceScore, weight:0.25, color: complianceScore >= 80 ? C.green : complianceScore >= 50 ? C.yellow : C.red },
              { label:"VO2 MAX TREND", score: vo2Score, weight:0.20, color: vo2Score >= 70 ? C.green : vo2Score >= 40 ? C.yellow : C.red },
              { label:"SLEEP QUALITY", score: sleepScore, weight:0.15, color: sleepScore >= 70 ? C.green : sleepScore >= 40 ? C.yellow : C.red },
              { label:"BIOMARKERS", score: bioScore, weight:0.10, color: bioScore >= 70 ? C.green : bioScore >= 40 ? C.yellow : C.red },
            ];
            const readiness = Math.round(components.reduce((s,c) => s + c.score * c.weight, 0));
            const rColor = readiness >= 75 ? C.green : readiness >= 50 ? C.yellow : C.red;
            return (
              <div style={{ padding:"0 20px 16px" }}>
                <button onClick={() => setShowReadinessBreakdown(p => !p)} style={{ width:"100%", background:C.card, borderRadius:C.radius, padding:"16px 18px", border:`1px solid ${rColor}22`, cursor:"pointer", textAlign:"left", boxShadow:glow(rColor,0.1), ...C.glass }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:4 }}>RACE READINESS</div>
                      <div style={{ fontFamily:C.ff, fontSize:36, color:rColor, fontWeight:700, lineHeight:1 }}>{readiness}</div>
                    </div>
                    <Ring score={readiness} size={56} stroke={5} color={rColor} />
                  </div>
                </button>
                {showReadinessBreakdown && (
                  <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:4 }}>
                    {components.map((c,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:C.card, borderRadius:8, border:`1px solid ${C.border}` }}>
                        <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2, flex:1 }}>{c.label} ({Math.round(c.weight*100)}%)</div>
                        <div style={{ width:60, height:4, borderRadius:2, background:C.cardSolid, overflow:"hidden" }}>
                          <div style={{ width:`${c.score}%`, height:"100%", background:c.color, borderRadius:2 }} />
                        </div>
                        <div style={{ fontFamily:C.ff, fontSize:14, color:c.color, minWidth:28, textAlign:"right" }}>{c.score}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {garminActivities.length > 0 && (
            <div style={{ padding:"0 20px 16px" }}>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:8, textTransform:"uppercase" }}>LAST ACTIVITY</div>
              {(() => {
                const a = garminActivities[0];
                return (
                  <div style={{ background:C.card, borderRadius:C.radius, padding:"14px 16px", border:`1px solid ${C.border}`, ...C.glass }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <div style={{ fontFamily:C.ff, fontSize:17, color:C.text, letterSpacing:1 }}>{a.name || a.activity_type}</div>
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2 }}>
                        {a.start_time ? new Date(a.start_time).toLocaleDateString("en-US",{month:"short",day:"numeric"}).toUpperCase() : ""}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:16 }}>
                      {a.distance_meters > 0 && <div><div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2 }}>DISTANCE</div><div style={{ fontFamily:C.ff, fontSize:20, color:C.cyan }}>{(a.distance_meters/1000).toFixed(1)}km</div></div>}
                      {a.duration_seconds > 0 && <div><div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2 }}>DURATION</div><div style={{ fontFamily:C.ff, fontSize:20, color:C.text }}>{Math.floor(a.duration_seconds/60)}m</div></div>}
                      {a.avg_hr > 0 && <div><div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2 }}>AVG HR</div><div style={{ fontFamily:C.ff, fontSize:20, color:C.red }}>{a.avg_hr}</div></div>}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {weeklyReview && new Date().getDay() === 0 && (
            <div style={{ padding:"0 20px 16px" }}>
              <div style={{ background:`${C.cyan}06`, border:`1px solid ${C.cyan}22`, borderRadius:C.radius, padding:"16px 18px", ...C.glass }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:16 }}>📊</span>
                  <div style={{ fontFamily:C.ff, fontSize:16, color:C.cyan, letterSpacing:2 }}>WEEKLY REVIEW</div>
                </div>
                <div style={{ fontFamily:C.fs, fontSize:13, color:C.text, lineHeight:1.7 }}>{renderMarkdown(weeklyReview)}</div>
              </div>
            </div>
          )}

          {proactiveMessages.length > 0 && (
            <div style={{ padding:"0 20px 16px" }}>
              {proactiveMessages.map((m, i) => (
                <div key={i} style={{ background:`${C.cyan}08`, border:`1px solid ${C.cyan}22`, borderRadius:C.radius, padding:"14px 16px", marginBottom:i < proactiveMessages.length-1 ? 8 : 0, ...C.glass }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:14, color:C.cyan }}>✦</span>
                    <div style={{ fontFamily:C.fm, fontSize:7, color:C.cyan, letterSpacing:3, textTransform:"uppercase" }}>COACH INSIGHT</div>
                  </div>
                  <div style={{ fontFamily:C.fs, fontSize:13, color:C.text, lineHeight:1.6 }}>{m.content}</div>
                </div>
              ))}
            </div>
          )}

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

      {nav === "plan" && showNoPlanState && <NoPlanState />}

      {nav === "plan" && noPlanLoaded && planBuilderDismissed && <DismissedNoPlanState />}

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
              const isToday = d.day === todayDayName;
              const isLabTarget = labOpen && labTargetDay === d.day;
              return (
                <button key={d.day} onClick={() => { setSelDay(isSel ? null : d.day); setSess("am"); }} style={{ background: isSel ? C.card : "transparent", border: isLabTarget ? `1px solid ${C.cyan}88` : isToday ? `1px solid ${C.cyan}44` : "none", borderRight: i<6 && !isToday && !isLabTarget ? `1px solid ${C.border}` : undefined, borderBottom:`2px solid ${isSel ? C.cyan : "transparent"}`, borderLeft: isLabTarget ? `3px solid ${C.cyan}` : undefined, padding:"12px 4px 10px", cursor:"pointer", textAlign:"center", boxShadow: isLabTarget ? `inset 0 0 20px ${C.cyan}15` : isSel ? `inset 0 0 16px ${C.cyan}10` : isToday ? `inset 0 0 12px ${C.cyan}08` : "none", transition:"all 0.15s" }}>
                  <div style={{ fontFamily:C.fm, fontSize:7, color: isToday ? C.cyan : isSel ? C.muted : C.light, letterSpacing:1, fontWeight: isToday ? 700 : 400 }}>{d.day}</div>
                  <div style={{ fontFamily:C.fm, fontSize:6, color: isToday ? C.cyan : C.light, margin:"2px 0 8px" }}>{d.date.split(" ")[1]}</div>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:ac, margin:"0 auto", opacity: isSel ? 1 : 0.6 }} />
                  <div style={{ fontFamily:C.fm, fontSize:6, color: isSel ? ac : C.light, letterSpacing:1, marginTop:5, lineHeight:1.3 }}>
                    {d.isSunday ? (sundayChoice[weekId] ? sundayChoice[weekId].toUpperCase() : "?") : d.isRaceDay ? "RACE" : getTypeLabel(d.am)}
                  </div>
                  {d.pm && <div style={{ fontFamily:C.fm, fontSize:5, color:C.light, marginTop:2 }}>+PM</div>}
                  {(() => {
                    const dayDate = d.date;
                    const hasActivity = garminActivities.some(a => a.start_time && a.start_time.startsWith(dayDate?.split(" ")[0] || "___"));
                    return hasActivity
                      ? <div style={{ fontSize:8, color:C.green, marginTop:2 }}>✓</div>
                      : d.am ? <div style={{ fontSize:8, color:C.light, marginTop:2 }}>—</div> : null;
                  })()}
                  {isToday && <div style={{ width:4, height:4, borderRadius:"50%", background:C.cyan, margin:"3px auto 0" }} />}
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
          <div style={{ marginTop:24, marginBottom:24, marginLeft:20, marginRight:20 }}>
            <button onClick={() => { setLabOpen(true); setLabMessages([]); setCqSelections({}); setLabAnsweredQuestions({}); setLabSessionId(createSessionId()); const wk = week?.label?.split("·")[1]?.trim() || week?.label || ""; const selD = selDay || todayDayName; setLabContext(`${wk} · ${selD}`); setLabTargetDay(selD); }}
              style={{ width:"100%", padding:"14px", background:`${C.cyan}08`, border:`1px solid ${C.cyan}22`, borderRadius:C.radius, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, ...C.glass }}>
              <span style={{ fontSize:16 }}>🧪</span>
              <span style={{ fontFamily:C.ff, fontSize:14, color:C.cyan, letterSpacing:2 }}>RUN A SCENARIO</span>
            </button>
          </div>
          <div style={{ margin:"0 20px 20px" }}>
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>WEEKLY STRUCTURE</div>
            {(week?.days || []).map((d) => {
              const selectedSunday = sundayChoice[week?.id || weekId];
              const sundaySession = d.isSunday
                ? (selectedSunday === "mobility"
                  ? "SUNDAY — Mobility Protocol"
                  : selectedSunday === "plyo"
                    ? "SUNDAY — Plyo & Core"
                    : null)
                : null;

              const primarySession = d.isRaceDay ? "🏁 RACE DAY" : (d.isSunday ? sundaySession : (d.am || d.pm));
              const color = d.isRaceDay ? C.red : (primarySession ? getAccent(primarySession) : C.light);

              let label = "REST";
              if (d.isRaceDay) {
                label = "RACE DAY";
              } else if (d.isSunday) {
                label = selectedSunday === "mobility" ? "MOBILITY PROTOCOL"
                  : selectedSunday === "plyo" ? "PLYO + CORE"
                  : "CHOOSE SUNDAY SESSION";
              } else if (primarySession) {
                label = getTypeLabel(primarySession);
                if (d.pm) label = `${label} + PM`;
              }

              return (
                <div key={d.day} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }} />
                  <span style={{ fontFamily:C.ff, fontSize:13, color, minWidth:36 }}>{d.day}</span>
                  <span style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1 }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {nav === "supps" && (
        <div style={{ padding:"20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:C.ff, fontSize:28, letterSpacing:2, marginBottom:4 }}>SUPPLEMENTS<span style={{ color:C.red }}>.</span></div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3 }}>DAILY PROTOCOL</div>
            </div>
            {supplements.length > 0 && (
              <button onClick={() => {
                const canvas = document.createElement("canvas");
                const W = 800, pad = 40;
                const groups = {};
                supplements.forEach(s => { if (!groups[s.time_group]) groups[s.time_group] = []; groups[s.time_group].push(s); });
                const groupKeys = Object.keys(groups);
                const totalItems = supplements.length;
                const H = 200 + totalItems * 50 + groupKeys.length * 40 + 80;
                canvas.width = W; canvas.height = H;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#0A0A0A"; ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = "#00F3FF"; ctx.font = "bold 32px 'Arial Black', sans-serif";
                ctx.fillText("MY SUPPLEMENT STACK", pad, 60);
                ctx.fillStyle = "#888"; ctx.font = "12px monospace";
                ctx.fillText((profile?.name || "ATHLETE").toUpperCase() + " · DAILY PROTOCOL", pad, 85);
                let y = 120;
                const gcols = { MORNING:"#FFD600", AFTERNOON:"#FF3B30", NIGHT:"#0088FF", "DAILY TARGETS":"#888" };
                groupKeys.forEach(g => {
                  ctx.fillStyle = gcols[g] || "#888"; ctx.font = "bold 14px monospace"; ctx.fillText(g, pad, y); y += 28;
                  groups[g].forEach(s => {
                    ctx.fillStyle = "rgba(255,255,255,0.06)";
                    ctx.beginPath(); ctx.roundRect(pad, y - 16, W - pad * 2, 40, 8); ctx.fill();
                    ctx.fillStyle = "#fff"; ctx.font = "16px sans-serif"; ctx.fillText(s.name, pad + 12, y + 6);
                    ctx.fillStyle = "#888"; ctx.font = "12px monospace"; ctx.fillText(s.dose, W - pad - ctx.measureText(s.dose).width - 12, y + 6);
                    y += 50;
                  });
                  y += 10;
                });
                const optBio = biomarkers.filter(b => b.flag === "OPTIMAL" || b.flag === "GOOD").slice(0, 3);
                if (optBio.length > 0) {
                  y += 10; ctx.fillStyle = "#00D4A0"; ctx.font = "bold 14px monospace"; ctx.fillText("OPTIMAL BIOMARKERS", pad, y); y += 28;
                  optBio.forEach(b => { ctx.fillStyle = "#00D4A0"; ctx.font = "14px sans-serif"; ctx.fillText(`✓ ${b.label}: ${b.value}${b.unit?" "+b.unit:""}`, pad + 12, y); y += 24; });
                }
                y = H - 30; ctx.fillStyle = "#444"; ctx.font = "10px monospace"; ctx.fillText("△ HYBRID PERFORMANCE OS", pad, y);
                const link = document.createElement("a");
                link.download = "my-stack.png"; link.href = canvas.toDataURL("image/png"); link.click();
              }}
              style={{ padding:"10px 16px", background:C.card, border:`1px solid ${C.cyan}33`, borderRadius:10, cursor:"pointer", fontFamily:C.ff, fontSize:12, color:C.cyan, letterSpacing:2 }}>
                SHARE MY STACK
              </button>
            )}
          </div>
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

      {nav === "perf" && (() => {
        const dayNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
        const currentWeekDays = (planBlocks[0]?.weeks?.[0]?.days) || [];

        const complianceData = currentWeekDays.map(d => {
          const planned = d.am || d.pm;
          if (!planned) return { day:d.day, status:"none" };
          const dayDateStr = d.date?.split(" ")[0];
          const hasActivity = garminActivities.some(a => a.start_time?.startsWith(dayDateStr || "___"));
          return { day:d.day, status: hasActivity ? "done" : "missed", planned:d.am };
        });
        const plannedCount = complianceData.filter(d => d.status !== "none").length;
        const doneCount = complianceData.filter(d => d.status === "done").length;
        const compliancePct = plannedCount > 0 ? Math.round((doneCount / plannedCount) * 100) : 0;

        const last7 = garminActivities.filter(a => {
          if (!a.start_time) return false;
          const d = new Date(a.start_time);
          return (Date.now() - d.getTime()) < 7 * 86400000;
        });
        const last42 = garminActivities.filter(a => {
          if (!a.start_time) return false;
          const d = new Date(a.start_time);
          return (Date.now() - d.getTime()) < 42 * 86400000;
        });
        const atl = last7.length > 0 ? Math.round(last7.reduce((s,a) => s + (a.duration_seconds||0)/60, 0) / 7) : 0;
        const ctl = last42.length > 0 ? Math.round(last42.reduce((s,a) => s + (a.duration_seconds||0)/60, 0) / 42) : 0;
        const tsb = ctl - atl;
        const tsbColor = tsb > 10 ? C.green : tsb > -10 ? C.yellow : C.red;
        const tsbLabel = tsb > 10 ? "FRESH" : tsb > -10 ? "NEUTRAL" : "FATIGUED";

        const vo2Metrics = unifiedMetrics.filter(m => m.vo2_max).slice(0, 30).reverse();
        const currentVo2 = vo2Metrics.length > 0 ? vo2Metrics[vo2Metrics.length - 1].vo2_max : null;
        const vo2Max = vo2Metrics.length > 0 ? Math.max(...vo2Metrics.map(m => Number(m.vo2_max))) : 0;

        const zoneColors = ["#555", C.blue, C.yellow, "#FF7700", C.red];
        const zoneData = [0,0,0,0,0];
        let totalZoneTime = 0;
        last7.forEach(a => {
          if (a.avg_hr) {
            const hr = a.avg_hr;
            const dur = a.duration_seconds || 0;
            const zone = hr >= 163 ? 4 : hr >= 150 ? 3 : hr >= 147 ? 2 : hr >= 132 ? 1 : 0;
            zoneData[zone] += dur;
            totalZoneTime += dur;
          }
        });

        const prs = {};
        garminActivities.forEach(a => {
          if (!a.distance_meters || !a.duration_seconds) return;
          const dist = a.distance_meters;
          const pace = a.duration_seconds / (dist / 1000);
          const checks = [
            { key:"5K", min:4800, max:5500 },
            { key:"10K", min:9500, max:10500 },
            { key:"HALF", min:20500, max:22000 },
            { key:"MARATHON", min:41500, max:43000 },
          ];
          checks.forEach(({ key, min, max }) => {
            if (dist >= min && dist <= max) {
              if (!prs[key] || a.duration_seconds < prs[key].time) {
                prs[key] = { time: a.duration_seconds, date: a.start_time };
              }
            }
          });
        });
        const fmtTime = (s) => { const m = Math.floor(s/60); const sec = Math.floor(s%60); return `${m}:${String(sec).padStart(2,"0")}`; };

        return (
          <div style={{ padding:"20px" }}>
            <div style={{ fontFamily:C.ff, fontSize:28, letterSpacing:2, marginBottom:4 }}>PERFORMANCE<span style={{ color:C.cyan }}>.</span></div>
            <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:20, textTransform:"uppercase" }}>TRAINING ANALYTICS</div>

            {/* WEEKLY COMPLIANCE */}
            <div style={{ marginBottom:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ fontFamily:C.ff, fontSize:18, color:C.cyan, letterSpacing:2 }}>WEEKLY COMPLIANCE</div>
                <div style={{ fontFamily:C.ff, fontSize:24, color: compliancePct >= 80 ? C.green : compliancePct >= 50 ? C.yellow : C.red, fontWeight:700 }}>{compliancePct}%</div>
              </div>
              <div style={{ display:"flex", gap:4, marginBottom:12 }}>
                {complianceData.map((d,i) => {
                  const bg = d.status === "done" ? C.green : d.status === "missed" ? `${C.red}44` : C.card;
                  const icon = d.status === "done" ? "✅" : d.status === "missed" ? "❌" : "—";
                  return (
                    <div key={i} style={{ flex:1, background:bg, borderRadius:8, padding:"8px 2px", textAlign:"center", border:`1px solid ${C.border}` }}>
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:1, marginBottom:4 }}>{d.day}</div>
                      <div style={{ fontSize:12 }}>{icon}</div>
                    </div>
                  );
                })}
              </div>
              {compliancePct < 80 && compliancePct > 0 && (
                <div style={{ background:C.card, borderRadius:12, padding:"12px 14px", border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.yellow}`, ...C.glass }}>
                  <div style={{ fontFamily:C.fs, fontSize:12, color:C.muted, lineHeight:1.6 }}>
                    {compliancePct < 50 ? "Compliance under 50% — let's discuss what's blocking your sessions." : "Slightly under target. Prioritize the high-intensity sessions."}
                  </div>
                </div>
              )}
            </div>

            {/* TRAINING LOAD */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontFamily:C.ff, fontSize:18, color:C.cyan, letterSpacing:2, marginBottom:12 }}>TRAINING LOAD</div>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1, background:C.card, borderRadius:C.radius, padding:"14px", textAlign:"center", border:`1px solid ${C.border}`, ...C.glass }}>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6 }}>ATL (7D)</div>
                  <div style={{ fontFamily:C.ff, fontSize:28, color:C.text, fontWeight:700 }}>{atl}</div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2 }}>MIN/DAY</div>
                </div>
                <div style={{ flex:1, background:C.card, borderRadius:C.radius, padding:"14px", textAlign:"center", border:`1px solid ${C.border}`, ...C.glass }}>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6 }}>CTL (42D)</div>
                  <div style={{ fontFamily:C.ff, fontSize:28, color:C.text, fontWeight:700 }}>{ctl}</div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2 }}>MIN/DAY</div>
                </div>
                <div style={{ flex:1, background:C.card, borderRadius:C.radius, padding:"14px", textAlign:"center", border:`1px solid ${tsbColor}22`, boxShadow:glow(tsbColor,0.1), ...C.glass }}>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6 }}>TSB</div>
                  <div style={{ fontFamily:C.ff, fontSize:28, color:tsbColor, fontWeight:700 }}>{tsb > 0 ? "+" : ""}{tsb}</div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:tsbColor, letterSpacing:2 }}>{tsbLabel}</div>
                </div>
              </div>
            </div>

            {/* VO2 MAX TREND */}
            <div style={{ marginBottom:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontFamily:C.ff, fontSize:18, color:C.cyan, letterSpacing:2 }}>VO2 MAX</div>
                {currentVo2 && <div style={{ fontFamily:C.ff, fontSize:32, color:C.cyan, fontWeight:700 }}>{Number(currentVo2).toFixed(1)}</div>}
              </div>
              {vo2Metrics.length > 1 ? (
                <div style={{ background:C.card, borderRadius:C.radius, padding:"16px", border:`1px solid ${C.border}`, ...C.glass }}>
                  <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:80 }}>
                    {vo2Metrics.map((m,i) => {
                      const val = Number(m.vo2_max);
                      const h = vo2Max > 0 ? (val / vo2Max) * 70 + 10 : 40;
                      return <div key={i} style={{ flex:1, height:h, background: i === vo2Metrics.length-1 ? C.cyan : `${C.cyan}44`, borderRadius:2, minWidth:2 }} />;
                    })}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
                    <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:1 }}>{vo2Metrics[0]?.date}</div>
                    <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:1 }}>{vo2Metrics[vo2Metrics.length-1]?.date}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2, textAlign:"center", padding:20 }}>
                  {currentVo2 ? "More data points needed for trend" : "No VO2 Max data yet — sync Garmin"}
                </div>
              )}
            </div>

            {/* ZONE DISTRIBUTION */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontFamily:C.ff, fontSize:18, color:C.cyan, letterSpacing:2, marginBottom:12 }}>ZONE DISTRIBUTION</div>
              {totalZoneTime > 0 ? (
                <div style={{ display:"flex", gap:6, height:120, alignItems:"flex-end" }}>
                  {zoneData.map((t,i) => {
                    const pct = totalZoneTime > 0 ? (t / totalZoneTime) * 100 : 0;
                    return (
                      <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <div style={{ fontFamily:C.fm, fontSize:8, color:zoneColors[i], fontWeight:700 }}>{Math.round(pct)}%</div>
                        <div style={{ width:"100%", height:Math.max(pct * 0.8, 4), background:zoneColors[i], borderRadius:4, transition:"height 0.3s" }} />
                        <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1 }}>Z{i+1}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2, textAlign:"center", padding:20 }}>No HR zone data this week</div>
              )}
            </div>

            {/* PERSONAL RECORDS */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontFamily:C.ff, fontSize:18, color:C.cyan, letterSpacing:2, marginBottom:12 }}>PERSONAL RECORDS</div>
              {Object.keys(prs).length > 0 ? (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {Object.entries(prs).map(([key, pr]) => (
                    <div key={key} style={{ background:C.card, borderRadius:C.radius, padding:"14px", border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.cyan}`, ...C.glass }}>
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6 }}>{key}</div>
                      <div style={{ fontFamily:C.ff, fontSize:22, color:C.cyan, fontWeight:700 }}>{fmtTime(pr.time)}</div>
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, marginTop:4, letterSpacing:1 }}>
                        {pr.date ? new Date(pr.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}).toUpperCase() : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2, textAlign:"center", padding:20 }}>No PRs detected yet — sync more activities</div>
              )}
            </div>

            {/* RACE PREDICTIONS */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontFamily:C.ff, fontSize:18, color:C.cyan, letterSpacing:2, marginBottom:12 }}>RACE PREDICTIONS</div>
              {currentVo2 ? (() => {
                const vo2 = Number(currentVo2);
                const predict5k  = Math.round(21.2 * 60 * Math.pow(42.195 / 5,    0.06) * Math.pow(vo2 / 50, -1.1));
                const predict10k = Math.round(21.2 * 60 * Math.pow(42.195 / 10,   0.06) * Math.pow(vo2 / 50, -1.1) * 2.1);
                const predictHM  = Math.round(21.2 * 60 * Math.pow(42.195 / 21.1, 0.06) * Math.pow(vo2 / 50, -1.1) * 4.6);
                const predictM   = Math.round(21.2 * 60 * Math.pow(1,              0.06) * Math.pow(vo2 / 50, -1.1) * 10);
                return (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {[["5K",predict5k],["10K",predict10k],["HALF",predictHM],["MARATHON",predictM]].map(([label,time]) => (
                      <div key={label} style={{ background:C.card, borderRadius:C.radius, padding:"14px", textAlign:"center", border:`1px solid ${C.border}`, ...C.glass }}>
                        <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6 }}>{label}</div>
                        <div style={{ fontFamily:C.ff, fontSize:20, color:C.text, fontWeight:700 }}>{fmtTime(time)}</div>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2, textAlign:"center", padding:20 }}>Need VO2 Max data for predictions — sync Garmin</div>
              )}
            </div>
          </div>
        );
      })()}

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
        {[["today","⚡","TODAY"],["plan","📅","PLAN"],["perf","🏆","PERF"],["supps","💊","SUPPS"],["stats","📊","STATS"]].map(([id,icon,label]) => (
          <button key={id} onClick={() => setNav(id)} style={{ flex:1, padding:"10px 4px 22px", background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <div style={{ fontSize:18 }}>{icon}</div>
            <div style={{ fontFamily:C.fm, fontSize:7, letterSpacing:2, color: nav===id ? C.cyan : C.muted, fontWeight: nav===id ? 700 : 400, textTransform:"uppercase" }}>{label}</div>
            {nav===id && <div style={{ width:4, height:4, borderRadius:"50%", background:C.cyan, marginTop:1 }} />}
          </button>
        ))}
      </div>

      <AIChat whoopData={whoopData} currentWeek={week} recentActivities={recentActivities} onPlanChange={handlePlanChange} userName={profile?.name} persona={coachPersona} onPersonaChange={handlePersonaChange} proactiveBadge={proactiveBadge} authToken={session?.access_token} />

      <PlanBuilder
        open={planBuilderOpen}
        profile={profile}
        authToken={session?.access_token}
        onClose={() => setPlanBuilderOpen(false)}
        onGenerated={async ({ builderInputs }) => {
          setPlanBuilderOpen(false);
          localStorage.removeItem(PLAN_BUILDER_DISMISS_KEY);
          setPlanBuilderDismissUntil(0);
          setPlanLoading(true);
          await fetchPlan(session?.access_token);
          setNav("plan");
          setProfile((prev) => (prev ? { ...prev, plan_builder: builderInputs } : prev));
        }}
      />

      {selDay && (
        <SessionModal name={modalName} dayData={dayData} sess={sess} weekId={weekId} onClose={() => setSelDay(null)} onSessSwitch={setSess} sundayChoice={sundayChoice} setSundayChoice={setSundayChoice} supabase={supabase} session={session} onSaved={() => fetchPlan(session?.access_token)} />
      )}

      {labOpen && (
        <>
          <div onClick={labClose} style={{ position:"fixed", inset:0, zIndex:245, background:"rgba(0,0,0,0.45)" }} />
          <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, height:"40vh", maxHeight:"48vh", zIndex:250, background:C.bg, borderRadius:"20px 20px 0 0", display:"flex", flexDirection:"column", boxShadow:"0 -8px 32px rgba(0,0,0,0.6)", marginTop:16, ...C.glass }}>
            <div style={{ display:"flex", justifyContent:"center", padding:"8px 0 2px" }}>
              <div style={{ width:36, height:4, borderRadius:2, background:C.light }} />
            </div>
            <div style={{ padding:"6px 20px 10px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontFamily:C.ff, fontSize:13, color:C.cyan, letterSpacing:2, fontWeight:700 }}>
                  🧪 SCENARIO MODE{labContext ? ` · ${labContext.toUpperCase()}` : ""}
                </div>
                <button onClick={labClose} style={{ background:C.cardSolid, border:"none", color:C.muted, width:26, height:26, borderRadius:"50%", cursor:"pointer", fontSize:11, flexShrink:0 }}>✕</button>
              </div>
            </div>

            <div style={{ flex:1, overflowY:"auto", padding:"10px 20px", display:"flex", flexDirection:"column", gap:8 }}>
              {labMessages.length === 0 && (
                <div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6, textTransform:"uppercase" }}>TRY A SCENARIO</div>
                  {["Skip Sunday's long run, redistribute volume","Traveling 3 days — hotel gym only","Wedding this weekend, adjust week","Add a second threshold session","Start taper — race in 2 weeks"].map((p,i) => (
                    <button key={i} onClick={() => labSend(p)}
                      style={{ display:"block", width:"100%", padding:"8px 12px", marginBottom:5, background:C.card, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", textAlign:"left", fontFamily:C.fs, fontSize:11, color:C.text, lineHeight:1.4 }}>{p}</button>
                  ))}
                </div>
              )}
              {labMessages.map((m, i) => (
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems: m.role==="user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth:"90%", padding:"8px 12px", borderRadius: m.role==="user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: m.role==="user" ? "rgba(0,243,255,0.15)" : C.card, border: m.role==="user" ? `1px solid ${C.cyan}33` : `1px solid ${C.border}` }}>
                    <div style={{ fontFamily:C.fs, fontSize:11, color:C.text, lineHeight:1.5 }}>{renderMarkdown(m.content)}</div>
                  </div>
                  {m.clarifyingQuestions && !m.cqSubmitted && (
                    <div style={{ maxWidth:"95%", marginTop:6, width:"100%" }}>
                      {(() => {
                        const normalized = normalizeClarifyingQuestions(m.clarifyingQuestions);
                        const msgKey = `lab_${i}`;
                        const selectionsById = Object.fromEntries(
                          normalized.map((q) => [q.id, cqSelections[`${msgKey}_${q.id}`] || []])
                        );
                        const { byId, sequence } = getClarifyingFlow(normalized, selectionsById);
                        const answered = labAnsweredQuestions[msgKey] || [];
                        const nextQuestionId = sequence.find((qid) => !answered.includes(qid)) || null;
                        const activeQuestion = nextQuestionId ? byId.get(nextQuestionId) : null;
                        const activeSelection = activeQuestion ? (selectionsById[activeQuestion.id] || []) : [];
                        const allAnswered = sequence.length > 0 && sequence.every((qid) => answered.includes(qid));
                        const questionIdx = activeQuestion ? Math.min(answered.length + 1, sequence.length) : sequence.length;

                        return (
                          <>
                            {sequence.length > 0 && (
                              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2, marginBottom:6 }}>
                                Question {questionIdx} of {sequence.length}
                              </div>
                            )}

                            {activeQuestion && (
                              <div style={{ background:C.card, borderRadius:10, padding:"10px 12px", marginBottom:6, border:`1px solid ${C.border}` }}>
                                <div style={{ fontFamily:C.fs, fontSize:11, color:C.text, marginBottom:8, lineHeight:1.4 }}>{activeQuestion.question}</div>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                                  {activeQuestion.options.map((opt, oi) => {
                                    const on = activeSelection.includes(opt);
                                    return (
                                      <button key={oi} onClick={() => {
                                        setCqSelections((prev) => {
                                          const key = `${msgKey}_${activeQuestion.id}`;
                                          const cur = prev[key] || [];
                                          let next = [];
                                          if (activeQuestion.type === "single_select") {
                                            next = [opt];
                                          } else {
                                            next = on ? cur.filter((x) => x !== opt) : [...cur, opt];
                                          }
                                          return { ...prev, [key]: next };
                                        });
                                      }} style={{
                                        padding:"5px 10px", borderRadius:16, cursor:"pointer",
                                        background: on ? `${C.cyan}22` : C.cardSolid,
                                        border: `1px solid ${on ? C.cyan : C.border}`,
                                        fontFamily:C.fm, fontSize:9, color: on ? C.cyan : C.muted, letterSpacing:1,
                                      }}>{opt}</button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {activeQuestion && (
                              <button
                                onClick={() => {
                                  if (activeSelection.length === 0) return;
                                  setLabAnsweredQuestions((prev) => {
                                    const cur = prev[msgKey] || [];
                                    if (cur.includes(activeQuestion.id)) return prev;
                                    return { ...prev, [msgKey]: [...cur, activeQuestion.id] };
                                  });
                                }}
                                disabled={activeSelection.length === 0}
                                style={{ width:"100%", padding:"10px", background:activeSelection.length ? C.cyan : C.cardSolid, color:activeSelection.length ? "#000" : C.muted, border:"none", borderRadius:8, cursor:activeSelection.length ? "pointer" : "default", fontFamily:C.ff, fontSize:12, letterSpacing:2, marginTop:4 }}
                              >
                                CONFIRM ANSWER →
                              </button>
                            )}

                            {allAnswered && (
                              <button onClick={() => {
                                const answers = sequence.map((qid) => {
                                  const q = byId.get(qid);
                                  const sel = selectionsById[qid] || [];
                                  return `${q?.question?.replace("?","")}:  ${sel.join(", ") || "Not specified"}`;
                                }).join(". ");
                                setLabMessages(prev => prev.map((mm, mi) => mi === i ? {...mm, cqSubmitted:true} : mm));
                                labSend(answers);
                              }} style={{ width:"100%", padding:"10px", background:C.cyan, color:"#000", border:"none", borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:12, letterSpacing:2, marginTop:4 }}>FINAL CONFIRM →</button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  {m.cqSubmitted && <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:2, marginTop:3 }}>✓ ANSWERS SENT</div>}
                  {m.planChange && !m.planChangeAccepted && (
                    <div style={{ maxWidth:"90%", marginTop:4, background:C.card2, borderRadius:8, padding:"8px 10px", border:`1px solid ${C.cyan}33` }}>
                      <div style={{ fontFamily:C.ff, fontSize:12, color:C.text, marginBottom:4 }}>{m.planChange.description}</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => handleLabAccept(m.planChange)} style={{ flex:1, padding:"6px", background:C.green, color:"#000", border:"none", borderRadius:6, cursor:"pointer", fontFamily:C.ff, fontSize:10, letterSpacing:2 }}>QUEUE</button>
                        <button onClick={() => setLabMessages(prev => prev.map(mm => mm.planChange === m.planChange ? {...mm, planChangeAccepted:"rejected"} : mm))} style={{ flex:1, padding:"6px", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer", fontFamily:C.ff, fontSize:10, letterSpacing:2 }}>SKIP</button>
                      </div>
                    </div>
                  )}
                  {m.planChangeAccepted === true && <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:2, marginTop:3 }}>✓ QUEUED</div>}
                  {m.planChangeAccepted === "rejected" && <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2, marginTop:3 }}>✕ SKIPPED</div>}
                </div>
              ))}
              {labLoading && (
                <div style={{ background:C.card, borderRadius:"12px 12px 12px 4px", padding:"8px 12px", border:`1px solid ${C.border}`, alignSelf:"flex-start" }}>
                  <div className="shimmer" style={{ fontFamily:C.fm, fontSize:9, letterSpacing:3 }}>SIMULATING</div>
                </div>
              )}
            </div>

            <div style={{ padding:"8px 20px 14px", display:"flex", gap:8, flexShrink:0 }}>
              <input
                value={labInput}
                onChange={e => setLabInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") labSend(labInput); }}
                placeholder="Describe your scenario..."
                style={{ flex:1, background:C.card, border:`1px solid ${C.cyan}22`, borderRadius:10, padding:"10px 12px", color:C.text, fontFamily:C.fs, fontSize:12, outline:"none" }}
              />
              <button onClick={() => labSend(labInput)} disabled={labLoading || !labInput.trim()} style={{ width:40, height:40, background: labInput.trim() ? C.cyan : C.card, border:"none", borderRadius:10, cursor: labInput.trim() ? "pointer" : "default", color: labInput.trim() ? "#000" : C.muted, fontSize:15, flexShrink:0 }}>↑</button>
            </div>
            {scenarioChanges.length > 0 && (
              <button onClick={() => setShowLabReview(true)}
                style={{ width:"100%", height:44, background:C.cyan, border:"none", borderRadius:"12px 12px 0 0", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, flexShrink:0 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#000" }} />
                <div style={{ fontFamily:C.ff, fontSize:13, color:"#000", letterSpacing:2 }}>{scenarioChanges.length} CHANGE{scenarioChanges.length>1?"S":""} QUEUED → REVIEW & APPLY</div>
              </button>
            )}
          </div>
        </>
      )}

      {showLabReview && (
        <div style={{ position:"fixed", inset:0, zIndex:260, background:"rgba(10,10,10,0.97)", display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>
          <div style={{ padding:"20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
            <div style={{ fontFamily:C.ff, fontSize:20, color:C.cyan, letterSpacing:2 }}>REVIEW CHANGES</div>
            <button onClick={() => setShowLabReview(false)} style={{ background:C.cardSolid, border:"none", color:C.muted, width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:14 }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
            {scenarioChanges.map((c, i) => (
              <div key={i} style={{ background:C.card, borderRadius:C.radius, padding:"14px 16px", marginBottom:10, border:`1px solid ${C.border}`, ...C.glass }}>
                <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6 }}>CHANGE {i+1}{c.day ? ` · ${c.day}` : ""}</div>
                <div style={{ display:"flex", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2, marginBottom:4 }}>ORIGINAL</div>
                    <div style={{ fontFamily:C.fs, fontSize:12, color:C.muted, lineHeight:1.5 }}>{c.changes?.am_session || c.changes?.note || "Current session"}</div>
                  </div>
                  <div style={{ width:1, background:C.border }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:C.fm, fontSize:6, color:C.cyan, letterSpacing:2, marginBottom:4 }}>MODIFIED</div>
                    <div style={{ fontFamily:C.fs, fontSize:12, color:C.cyan, lineHeight:1.5 }}>{c.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:"16px 20px 24px", flexShrink:0 }}>
            <button onClick={labApplyAll} style={{ width:"100%", padding:"16px", background:C.green, color:"#000", border:"none", borderRadius:12, cursor:"pointer", fontFamily:C.ff, fontSize:16, letterSpacing:3, marginBottom:10 }}>APPLY TO PLAN</button>
            <button onClick={labDiscard} style={{ width:"100%", padding:"10px", background:"transparent", color:C.muted, border:"none", cursor:"pointer", fontFamily:C.fm, fontSize:9, letterSpacing:2 }}>DISCARD ALL</button>
          </div>
        </div>
      )}

      {labToast && (
        <div onClick={() => { setLabOpen(true); setLabToast(null); }} style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", zIndex:200, background:C.cardSolid, border:`1px solid ${C.cyan}33`, borderRadius:12, padding:"10px 16px", cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.5)", maxWidth:380 }}>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.cyan, letterSpacing:1 }}>{labToast}</div>
        </div>
      )}
    </div>
  );
}
