import { useState, useEffect } from "react";

const C = {
  bg:"#000000", card:"#1a1a1a", card2:"#222222",
  border:"#2a2a2a", text:"#ffffff", muted:"#888888", light:"#555555",
  red:"#FF3C00", green:"#00D4A0", yellow:"#FFD600", blue:"#0088FF",
  ff:"'Bebas Neue','Arial Black',sans-serif",
  fm:"'Space Mono',monospace",
  fs:"'Inter',-apple-system,sans-serif",
};

const inputStyle = {
  padding:"14px 16px", background:C.card, border:`1px solid ${C.border}`,
  borderRadius:10, color:C.text, fontFamily:C.fs, fontSize:15, outline:"none",
  width:"100%", boxSizing:"border-box",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function computeAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

const DELOAD_OPTIONS = [
  { id:"every_4th",  label:"EVERY 4TH WEEK", sub:"Standard — 3 weeks hard, 1 week deload" },
  { id:"every_3rd",  label:"EVERY 3RD WEEK", sub:"Aggressive — 2 weeks hard, 1 week deload" },
  { id:"auto_hrv",   label:"AUTO (HRV-BASED)", sub:"Let recovery data decide when to deload" },
];

const STORAGE_KEY = "onboarding_progress";
const STEP_KEY = "onboarding_step";

function calcZones(lthr) {
  if (!lthr || isNaN(lthr) || lthr < 80 || lthr > 220) return null;
  return {
    z2_min:     Math.round(lthr * 0.68),
    z2_max:     Math.round(lthr * 0.83),
    thresh_min: Math.round(lthr * 0.95),
    thresh_max: Math.round(lthr * 1.05),
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StepHeader({ step, total, title, sub }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:4, marginBottom:12 }}>
        STEP {step} OF {total}
      </div>
      <div style={{ fontFamily:C.ff, fontSize:50, color:C.text, lineHeight:0.95, marginBottom:10 }}>
        {title}
      </div>
      {sub && <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted, lineHeight:1.5 }}>{sub}</div>}
    </div>
  );
}

function NavRow({ onBack, onNext, nextLabel = "NEXT →", nextDisabled = false, isLast = false }) {
  return (
    <div style={{ display:"flex", gap:10, marginTop:8 }}>
      {onBack && (
        <button onClick={onBack} style={{ padding:"14px 20px", background:C.card, border:`1px solid ${C.border}`, borderRadius:12, color:C.muted, fontFamily:C.ff, fontSize:16, letterSpacing:2, cursor:"pointer" }}>BACK</button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        style={{ flex:1, padding:"15px 0", background: nextDisabled ? C.card2 : isLast ? C.red : C.green, color: nextDisabled ? C.muted : "#000", border:"none", borderRadius:12, cursor: nextDisabled ? "default" : "pointer", fontFamily:C.ff, fontSize:18, letterSpacing:3 }}
      >{nextLabel}</button>
    </div>
  );
}

function PillRow({ options, value, onChange, multi = false }) {
  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
      {options.map(({ id, label, sub }) => {
        const on = multi ? value.includes(id) : value === id;
        return (
          <button
            key={id}
            onClick={() => {
              if (multi) {
                onChange(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
              } else {
                onChange(id);
              }
            }}
            style={{ padding:"12px 16px", background: on ? `${C.green}18` : C.card, border:`1px solid ${on ? C.green : C.border}`, borderRadius:12, cursor:"pointer", textAlign:"left", minWidth:sub ? 130 : 60 }}
          >
            <div style={{ fontFamily:C.ff, fontSize:15, color: on ? C.green : C.text, letterSpacing:1 }}>{label}</div>
            {sub && <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1, marginTop:3 }}>{sub}</div>}
          </button>
        );
      })}
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────

const SPORT_OPTIONS = [
  { id:"hyrox",         label:"HYROX",          sub:"Functional fitness race" },
  { id:"marathon",      label:"MARATHON",        sub:"26.2 miles" },
  { id:"half_marathon", label:"HALF MARATHON",   sub:"13.1 miles" },
  { id:"triathlon_703", label:"TRIATHLON 70.3",  sub:"1.9k / 90k / 21.1k" },
  { id:"ironman",       label:"IRONMAN 140.6",   sub:"3.8k / 180k / 42.2k" },
  { id:"strength",      label:"STRENGTH",        sub:"Lifting & power" },
  { id:"hybrid",        label:"HYBRID",          sub:"Mixed fitness" },
];

const EXPERIENCE_OPTIONS = [
  { id:"beginner",     label:"BEGINNER",     sub:"< 1 year structured training" },
  { id:"intermediate", label:"INTERMEDIATE", sub:"1–3 years structured training" },
  { id:"advanced",     label:"ADVANCED",     sub:"3+ years, competed before" },
];

const WEEKS_PER_BLOCK_OPTIONS = [
  { id:4,  label:"4 WKS" },
  { id:6,  label:"6 WKS" },
  { id:8,  label:"8 WKS" },
  { id:12, label:"12 WKS" },
];

const PHASES_OPTIONS = [
  { id:2, label:"2" },
  { id:3, label:"3" },
  { id:4, label:"4" },
  { id:6, label:"6" },
];

const LOADING_MESSAGES = [
  "Analyzing your race goal...",
  "Structuring your training phases...",
  "Building your weekly schedule...",
  "Applying progressive overload...",
  "Personalizing recovery weeks...",
  "Finalizing your plan...",
];

// ── Main component ─────────────────────────────────────────────────────────

export default function Onboarding({ supabase, session, onComplete }) {
  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);

  // Step 0 — Profile
  const [name, setName]               = useState("");
  const [sports, setSports]           = useState([]);
  const [experienceLevel, setExpLevel] = useState(null);

  // Step 1 — Goal: one race entry per selected sport
  const [races, setRaces]             = useState([]);  // [{ sportId, name, date, is_primary }]
  const [weeklyHours, setWeeklyHours] = useState("");

  // Step 2 — Body
  const [dob, setDob]           = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("0");
  const [sex, setSex]           = useState(null);
  const [lthr, setLthr]         = useState("");
  const [lthrUnknown, setLthrUnknown] = useState(false);

  // Step 4 — Plan structure
  const [weeksPerBlock, setWeeksPerBlock] = useState(null);
  const [phases, setPhases]               = useState(null);
  const [deloadPref, setDeloadPref]       = useState(null);

  const TOTAL_STEPS = 5; // progress bar covers steps 0–4; step 5 is the loading screen

  const next = () => { setError(null); setStep(s => s + 1); };
  const back = () => { setError(null); setStep(s => s - 1); };

  // Sync races with selected sports — one race entry per sport
  useEffect(() => {
    if (sports.length === 0) {
      setRaces([]);
      return;
    }
    setRaces(prev => {
      const next = [];
      let hasPrimary = false;
      for (const sportId of sports) {
        const existing = prev.find(r => r.sportId === sportId);
        next.push({
          sportId,
          name: existing?.name ?? (SPORT_OPTIONS.find(s => s.id === sportId)?.label || sportId),
          date: existing?.date ?? "",
          is_primary: existing?.is_primary ?? (!hasPrimary && (hasPrimary = true)),
        });
      }
      if (next.length && !next.some(r => r.is_primary)) next[0].is_primary = true;
      return next;
    });
  }, [sports]);

  // WHOOP OAuth return: check URL for ?connected=true or ?whoop_connected=true and resume at Wearables (step 3)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const whoopReturn = params.get("connected") === "true" || params.get("whoop_connected") === "true";
    if (whoopReturn) {
      const saved = localStorage.getItem(STEP_KEY);
      const targetStep = saved ? Math.min(parseInt(saved, 10), 4) : 3;
      setStep(targetStep);
      window.history.replaceState({}, "", window.location.pathname || "/");
      localStorage.removeItem(STEP_KEY);
    }
  }, []);

  // Derived values
  const computedAge  = computeAge(dob);
  const effectiveLthr = lthrUnknown
    ? (computedAge ? 180 - computedAge : null)
    : (lthr ? parseInt(lthr, 10) : null);
  const zones = calcZones(effectiveLthr);

  // Cycle loading messages while generating
  useEffect(() => {
    if (step !== 5) return;
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 2200);
    return () => clearInterval(timer);
  }, [step]);

  // ── Plan save + generation ────────────────────────────────────────────────

  const handleBuildPlan = async () => {
    setSaving(true);
    setError(null);
    setStep(5);

    try {
      const htIn    = heightFt ? parseInt(heightFt, 10) * 12 + parseInt(heightIn || 0, 10) : null;
      const lthrVal = effectiveLthr;
      const zonesCalc = calcZones(lthrVal);

      const primaryRace = races.find(r => r.is_primary) || races[0];
      const racesForProfile = races.map(r => ({ date: r.date || null, name: r.name?.trim() || null, is_primary: r.is_primary }));

      // 1. Save profile
      const { data: profileData, error: profileErr } = await supabase
        .from("user_profiles")
        .upsert({
          user_id:               session.user.id,
          name:                  name.trim(),
          sports,
          experience_level:      experienceLevel,
          target_race_name:      primaryRace?.name?.trim() || null,
          target_race_date:      primaryRace?.date || null,
          races:                 racesForProfile,
          weekly_training_hours: weeklyHours ? parseFloat(weeklyHours) : null,
          dob:                   dob || null,
          weight_lbs:            weightLbs ? parseFloat(weightLbs) : null,
          height_in:             htIn,
          sex,
          lthr:                  lthrVal,
          z2_min:                zonesCalc?.z2_min   ?? null,
          z2_max:                zonesCalc?.z2_max   ?? null,
          race_goal:             sports[0] || null,   // backward compat for existing coach references
          weeks_per_block:       weeksPerBlock,
          phases,
          deload_preference:     deloadPref,
        }, { onConflict: "user_id" })
        .select()
        .single();

      if (profileErr) throw profileErr;

      // 2. Generate plan
      const genRes = await fetch("/api/plan/generate", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ profile: profileData }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || "Plan generation failed");

      // 3. Transition to main app
      onComplete(profileData);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  // ── Step renderers ────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {

      // ── Step 0: Profile ───────────────────────────────────────────────────
      case 0:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            <StepHeader step={1} total={TOTAL_STEPS} title={"LET'S\nBUILD\nYOUR OS."} sub="We'll personalize everything to you." />

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>YOUR NAME</div>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && name.trim() && next()}
                placeholder="First name"
                style={{ ...inputStyle, fontFamily:C.ff, fontSize:32, letterSpacing:2, padding:"16px 18px" }}
              />
            </div>

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>SPORTS (SELECT ALL THAT APPLY)</div>
              <PillRow options={SPORT_OPTIONS} value={sports} onChange={setSports} multi />
            </div>

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>EXPERIENCE LEVEL</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {EXPERIENCE_OPTIONS.map(({ id, label, sub }) => {
                  const on = experienceLevel === id;
                  return (
                    <button key={id} onClick={() => setExpLevel(id)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", background: on ? `${C.green}15` : C.card, border:`1px solid ${on ? C.green : C.border}`, borderRadius:12, cursor:"pointer", textAlign:"left" }}>
                      <div>
                        <div style={{ fontFamily:C.ff, fontSize:17, color: on ? C.green : C.text, letterSpacing:2 }}>{label}</div>
                        <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1, marginTop:3 }}>{sub}</div>
                      </div>
                      {on && <span style={{ color:C.green, fontSize:18 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <NavRow onNext={next} nextDisabled={!name.trim() || sports.length === 0 || !experienceLevel} />
          </div>
        );

      // ── Step 1: Goal ──────────────────────────────────────────────────────
      case 1:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <StepHeader step={2} total={TOTAL_STEPS} title={"YOUR\nGOAL."} sub="What are you working toward?" />

            {races.map((race) => (
              <div key={race.sportId} style={{ padding:"16px", background:C.card, border:`1px solid ${C.border}`, borderRadius:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontFamily:C.ff, fontSize:16, color:C.text, letterSpacing:2 }}>{SPORT_OPTIONS.find(s => s.id === race.sportId)?.label || race.sportId}</div>
                  <button
                    onClick={() => setRaces(prev => prev.map(r => ({ ...r, is_primary: r.sportId === race.sportId })))}
                    style={{
                      padding:"6px 12px", background: race.is_primary ? C.green : C.card2, color: race.is_primary ? "#000" : C.muted,
                      border:`1px solid ${race.is_primary ? C.green : C.border}`, borderRadius:8, cursor:"pointer", fontFamily:C.fm, fontSize:8, letterSpacing:2,
                    }}
                  >{race.is_primary ? "PRIMARY" : "SET PRIMARY"}</button>
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2, marginBottom:4 }}>RACE NAME</div>
                  <input type="text" value={race.name} onChange={e => setRaces(prev => prev.map(r => r.sportId === race.sportId ? { ...r, name: e.target.value } : r))} placeholder="e.g. HYROX London 2026" style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2, marginBottom:4 }}>RACE DATE</div>
                  <input type="date" value={race.date} onChange={e => setRaces(prev => prev.map(r => r.sportId === race.sportId ? { ...r, date: e.target.value } : r))} style={{ ...inputStyle, colorScheme:"dark" }} />
                </div>
              </div>
            ))}

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>CURRENT WEEKLY TRAINING HOURS</div>
              <div style={{ position:"relative" }}>
                <input type="number" value={weeklyHours} onChange={e => setWeeklyHours(e.target.value)} placeholder="8" min="1" max="40" style={{ ...inputStyle, paddingRight:40 }} />
                <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontFamily:C.fm, fontSize:10, color:C.muted }}>hrs</span>
              </div>
            </div>

            <NavRow onBack={back} onNext={next} nextDisabled={races.length === 0} />
          </div>
        );

      // ── Step 2: Body ──────────────────────────────────────────────────────
      case 2:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <StepHeader step={3} total={TOTAL_STEPS} title={"BODY\nMETRICS."} sub="Used to calibrate zones and nutrition targets. All optional." />

            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:2 }}>
                <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>DATE OF BIRTH</div>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} max={new Date().toISOString().split("T")[0]} style={{ ...inputStyle, colorScheme:"dark" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>SEX</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {[["M","M"],["F","F"],["X","X"]].map(([val, label]) => (
                    <button key={val} onClick={() => setSex(val)} style={{ padding:"12px 0", background: sex===val ? C.green : C.card, color: sex===val ? "#000" : C.muted, border:`1px solid ${sex===val ? C.green : C.border}`, borderRadius:10, cursor:"pointer", fontFamily:C.ff, fontSize:14, letterSpacing:2 }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>WEIGHT (LBS)</div>
              <input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="185" style={inputStyle} />
            </div>

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>HEIGHT</div>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1, position:"relative" }}>
                  <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5" min="4" max="7" style={{ ...inputStyle, paddingRight:30 }} />
                  <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontFamily:C.fm, fontSize:10, color:C.muted }}>ft</span>
                </div>
                <div style={{ flex:1, position:"relative" }}>
                  <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="10" min="0" max="11" style={{ ...inputStyle, paddingRight:30 }} />
                  <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontFamily:C.fm, fontSize:10, color:C.muted }}>in</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3 }}>LTHR (BPM)</div>
                <button onClick={() => setLthrUnknown(v => !v)} style={{ padding:"4px 10px", background: lthrUnknown ? `${C.yellow}22` : C.card2, border:`1px solid ${lthrUnknown ? C.yellow+"66" : C.border}`, borderRadius:8, cursor:"pointer", fontFamily:C.fm, fontSize:8, color: lthrUnknown ? C.yellow : C.muted, letterSpacing:1 }}>
                  {lthrUnknown ? "✓ I DON'T KNOW" : "I DON'T KNOW"}
                </button>
              </div>
              {lthrUnknown ? (
                <div style={{ padding:"14px 16px", background:`${C.yellow}10`, border:`1px solid ${C.yellow}33`, borderRadius:10, fontFamily:C.fs, fontSize:14, color:C.text }}>
                  {computedAge
                    ? <>Estimated LTHR: <strong>{180 - computedAge} bpm</strong> <span style={{ fontFamily:C.fm, fontSize:9, color:C.muted }}>(180 − age {computedAge})</span></>
                    : <span style={{ color:C.muted }}>Enter your date of birth above to estimate.</span>}
                </div>
              ) : (
                <input type="number" value={lthr} onChange={e => setLthr(e.target.value)} placeholder="163  (leave blank to skip)" min="80" max="220" style={{ ...inputStyle, fontFamily:C.ff, fontSize:28, letterSpacing:2, padding:"16px 18px" }} />
              )}
            </div>

            {zones && !lthrUnknown && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:4 }}>CALCULATED ZONES</div>
                {[
                  { label:"Z2  EASY",      range:`${zones.z2_min}–${zones.z2_max} bpm`,           color:C.green },
                  { label:"Z4  THRESHOLD", range:`${zones.thresh_min}–${zones.thresh_max} bpm`,   color:"#FF7700" },
                ].map(({ label, range, color }) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:C.card, borderRadius:8, borderLeft:`3px solid ${color}` }}>
                    <span style={{ fontFamily:C.ff, fontSize:13, color, letterSpacing:2 }}>{label}</span>
                    <span style={{ fontFamily:C.fm, fontSize:10, color:C.text }}>{range}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop:4 }}>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>DELOAD PREFERENCE</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {DELOAD_OPTIONS.map(({ id, label, sub }) => {
                  const on = deloadPref === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setDeloadPref(id)}
                      style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"14px 16px",
                        background: on ? `${C.green}15` : C.card,
                        border:`1px solid ${on ? C.green : C.border}`,
                        borderRadius:12, cursor:"pointer", textAlign:"left",
                      }}
                    >
                      <div>
                        <div style={{ fontFamily:C.ff, fontSize:15, color: on ? C.green : C.text, letterSpacing:2 }}>{label}</div>
                        <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1, marginTop:3 }}>{sub}</div>
                      </div>
                      {on && <span style={{ color:C.green, fontSize:18 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <NavRow onBack={back} onNext={next} />
          </div>
        );

      // ── Step 3: Wearables ─────────────────────────────────────────────────
      case 3:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <StepHeader step={4} total={TOTAL_STEPS} title={"WEARABLES."} sub="Connect your devices for live recovery data. You can skip any and connect later." />

            {[
              { id:"whoop",  label:"WHOOP",  sub:"Recovery · HRV · Sleep", available:true },
              { id:"garmin", label:"GARMIN", sub:"Activities · Power · Pace", available:false },
              { id:"oura",   label:"OURA",   sub:"Ring · Sleep · Readiness", available:false },
            ].map(({ id, label, sub, available }) => (
              <div key={id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 18px", background:C.card, border:`1px solid ${C.border}`, borderRadius:14 }}>
                <div>
                  <div style={{ fontFamily:C.ff, fontSize:18, color:C.text, letterSpacing:2 }}>{label}</div>
                  <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1, marginTop:3 }}>{sub}</div>
                </div>
                {available ? (
                  <button
                    onClick={() => {
                      try { localStorage.setItem(STEP_KEY, String(step)); } catch (_) {}
                      window.open("/api/auth/login", "_blank");
                    }}
                    style={{ padding:"10px 16px", background:C.green, color:"#000", border:"none", borderRadius:10, cursor:"pointer", fontFamily:C.ff, fontSize:13, letterSpacing:2 }}
                  >CONNECT ↗</button>
                ) : (
                  <div style={{ padding:"8px 12px", background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, fontFamily:C.fm, fontSize:8, color:C.light, letterSpacing:2 }}>SOON</div>
                )}
              </div>
            ))}

            <NavRow onBack={back} onNext={next} nextLabel="SKIP / CONTINUE →" />
          </div>
        );

      // ── Step 4: Plan structure ─────────────────────────────────────────────
      case 4:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            <StepHeader step={5} total={TOTAL_STEPS} title={"PLAN\nSTRUCTURE."} sub="Your coach will use this to shape your training blocks." />

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>WEEKS PER BLOCK</div>
              <div style={{ display:"flex", gap:8 }}>
                {WEEKS_PER_BLOCK_OPTIONS.map(({ id, label }) => {
                  const on = weeksPerBlock === id;
                  return (
                    <button key={id} onClick={() => setWeeksPerBlock(id)} style={{ flex:1, padding:"13px 0", background: on ? C.green : C.card, color: on ? "#000" : C.muted, border:`1px solid ${on ? C.green : C.border}`, borderRadius:10, cursor:"pointer", fontFamily:C.ff, fontSize:15, letterSpacing:1 }}>{label}</button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>PHASES (TRAINING BLOCKS)</div>
              <div style={{ display:"flex", gap:8 }}>
                {PHASES_OPTIONS.map(({ id, label }) => {
                  const on = phases === id;
                  return (
                    <button key={id} onClick={() => setPhases(id)} style={{ flex:1, padding:"13px 0", background: on ? C.green : C.card, color: on ? "#000" : C.muted, border:`1px solid ${on ? C.green : C.border}`, borderRadius:10, cursor:"pointer", fontFamily:C.ff, fontSize:18, letterSpacing:1 }}>{label}</button>
                  );
                })}
              </div>
              {phases && weeksPerBlock && (
                <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:1, marginTop:8 }}>
                  {phases * weeksPerBlock} total weeks · {phases} phases × {weeksPerBlock} weeks each
                </div>
              )}
            </div>

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>DELOAD PREFERENCE</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {DELOAD_OPTIONS.map(({ id, label, sub }) => {
                  const on = deloadPref === id;
                  return (
                    <button key={id} onClick={() => setDeloadPref(id)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", background: on ? `${C.green}15` : C.card, border:`1px solid ${on ? C.green : C.border}`, borderRadius:12, cursor:"pointer", textAlign:"left" }}>
                      <div>
                        <div style={{ fontFamily:C.ff, fontSize:16, color: on ? C.green : C.text, letterSpacing:2 }}>{label}</div>
                        <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1, marginTop:3 }}>{sub}</div>
                      </div>
                      {on && <span style={{ color:C.green, fontSize:18 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <NavRow onBack={back} onNext={handleBuildPlan} nextLabel="BUILD MY PLAN →" nextDisabled={!weeksPerBlock || !phases || !deloadPref} isLast />
          </div>
        );

      // ── Step 5: Generating ────────────────────────────────────────────────
      case 5:
        return (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"70vh", gap:32 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:C.ff, fontSize:72, color:C.green, lineHeight:1, letterSpacing:4 }}>TRIAD<span style={{ color:C.red }}>.</span></div>
              <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:4, marginTop:6 }}>HYBRID PERFORMANCE OS</div>
            </div>

            {error ? (
              <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:12, textAlign:"center" }}>
                <div style={{ fontFamily:C.fm, fontSize:9, color:C.red, letterSpacing:1, padding:"12px 16px", background:`${C.red}15`, borderRadius:10, lineHeight:1.6 }}>{error}</div>
                <button onClick={() => { setError(null); setSaving(true); handleBuildPlan(); }} style={{ padding:"14px", background:C.red, color:"#fff", border:"none", borderRadius:12, cursor:"pointer", fontFamily:C.ff, fontSize:16, letterSpacing:3 }}>TRY AGAIN</button>
              </div>
            ) : (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:C.fm, fontSize:11, color:C.muted, letterSpacing:2, marginBottom:8 }}>YOUR COACH IS BUILDING YOUR PLAN</div>
                <div style={{ fontFamily:C.fs, fontSize:14, color:C.text, lineHeight:1.6, transition:"opacity 0.4s" }}>{loadingMsg}</div>
                <div style={{ marginTop:24, display:"flex", gap:6, justifyContent:"center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:C.green, opacity: saving ? 1 : 0.3, animation:`pulse ${1 + i * 0.3}s ease-in-out infinite alternate` }} />
                  ))}
                </div>
                <style>{`@keyframes pulse { from { opacity:0.2; transform:scale(0.8); } to { opacity:1; transform:scale(1.2); } }`}</style>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <div style={{ maxWidth:480, margin:"0 auto", padding:"28px 24px 60px" }}>

        {/* Progress bar — hidden on loading screen */}
        {step < 5 && (
          <div style={{ display:"flex", gap:4, marginBottom:36 }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} style={{ flex:1, height:3, borderRadius:4, background: i <= step ? C.green : C.card2, transition:"background 0.3s" }} />
            ))}
          </div>
        )}

        {renderStep()}
      </div>
    </div>
  );
}
