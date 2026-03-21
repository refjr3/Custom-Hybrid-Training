import { useState, useEffect, useRef } from "react";

const C = {
  bg:"#000000", card:"#1a1a1a", card2:"#222222",
  border:"#2a2a2a", text:"#ffffff", muted:"#888888", light:"#555555",
  red:"#FF3C00", green:"#00D4A0", yellow:"#FFD600", blue:"#0088FF",
  ff:"'Bebas Neue','Arial Black',sans-serif",
  fm:"'Space Mono',monospace",
  fs:"'Inter',-apple-system,sans-serif",
};

const input = {
  padding:"14px 16px", background:C.card, border:`1px solid ${C.border}`,
  borderRadius:10, color:C.text, fontFamily:C.fs, fontSize:15, outline:"none",
  width:"100%", maxWidth:"100%", boxSizing:"border-box",
};

const inputSm = {
  padding:"10px 12px", background:C.card2, border:`1px solid ${C.border}`,
  borderRadius:8, color:C.text, fontFamily:C.fs, fontSize:13, outline:"none",
  width:"100%", maxWidth:"100%", boxSizing:"border-box",
};

const RACE_GOALS = [
  { id:"hyrox",        label:"HYROX",            sub:"Functional fitness race" },
  { id:"marathon",     label:"MARATHON",          sub:"26.2 miles" },
  { id:"olympic_tri",  label:"OLYMPIC TRI",       sub:"1.5km swim / 40km bike / 10km run" },
  { id:"half_ironman", label:"70.3 HALF IM",      sub:"1.9km / 90km / 21.1km" },
  { id:"ironman",      label:"FULL IRONMAN",       sub:"3.8km / 180km / 42.2km" },
  { id:"general",      label:"GENERAL FITNESS",    sub:"Health & performance" },
];

const RACE_DATABASE = [
  { name:"HYROX Miami",              date:"2026-04-04", sport:"hyrox" },
  { name:"HYROX New York City",      date:"2026-01-18", sport:"hyrox" },
  { name:"HYROX Dallas",             date:"2026-02-08", sport:"hyrox" },
  { name:"HYROX Chicago",            date:"2026-03-22", sport:"hyrox" },
  { name:"HYROX London",             date:"2026-05-10", sport:"hyrox" },
  { name:"HYROX Los Angeles",        date:"2026-06-06", sport:"hyrox" },
  { name:"HYROX World Championship", date:"2026-06-14", sport:"hyrox" },
  { name:"Boston Marathon",           date:"2026-04-20", sport:"marathon" },
  { name:"NYC Marathon",              date:"2026-11-01", sport:"marathon" },
  { name:"Chicago Marathon",          date:"2026-10-11", sport:"marathon" },
  { name:"Berlin Marathon",           date:"2026-09-27", sport:"marathon" },
  { name:"London Marathon",           date:"2026-04-26", sport:"marathon" },
  { name:"Tokyo Marathon",            date:"2026-03-01", sport:"marathon" },
  { name:"Marine Corps Marathon",     date:"2026-10-25", sport:"marathon" },
  { name:"IRONMAN World Champ Kona",  date:"2026-10-10", sport:"ironman" },
  { name:"IRONMAN Florida",           date:"2026-11-07", sport:"ironman" },
  { name:"IRONMAN Texas",             date:"2026-04-25", sport:"ironman" },
  { name:"IRONMAN Lake Placid",       date:"2026-07-26", sport:"ironman" },
  { name:"IRONMAN 70.3 World Champ",  date:"2026-09-19", sport:"half_ironman" },
  { name:"IRONMAN 70.3 Oceanside",    date:"2026-04-04", sport:"half_ironman" },
  { name:"IRONMAN 70.3 Eagleman",     date:"2026-06-14", sport:"half_ironman" },
  { name:"IRONMAN 70.3 Mont-Tremblant", date:"2026-06-28", sport:"half_ironman" },
  { name:"Olympic Tri Nationals",     date:"2026-08-08", sport:"olympic_tri" },
  { name:"NYC Triathlon",             date:"2026-07-19", sport:"olympic_tri" },
  { name:"Chicago Triathlon",         date:"2026-08-30", sport:"olympic_tri" },
];

const SUPP_OPTIONS = [
  { id:"beta_alanine", label:"Beta Alanine",           sub:"3.2–6.4g · Performance buffer" },
  { id:"creatine",     label:"Creatine Monohydrate",   sub:"5g · Strength & power" },
  { id:"whey",         label:"Whey Protein",            sub:"25–40g · Recovery & muscle" },
  { id:"magnesium",    label:"Magnesium Glycinate",     sub:"300–400mg · Sleep & HRV" },
  { id:"l_theanine",   label:"L-Theanine",              sub:"200–400mg · Calm sleep" },
  { id:"sermorelin",   label:"Sermorelin (Rx)",         sub:"Per Rx · GH pulse pre-sleep" },
];

const DELOAD_OPTIONS = [
  { id:"every_4th",  label:"EVERY 4TH WEEK", sub:"Standard — 3 weeks hard, 1 week deload" },
  { id:"every_3rd",  label:"EVERY 3RD WEEK", sub:"Aggressive — 2 weeks hard, 1 week deload" },
  { id:"auto_whoop", label:"AUTO (WHOOP)",   sub:"Let recovery data decide when to deload" },
];

const SOON_WEARABLES = [
  { name:"APPLE WATCH",  sub:"Activity · Heart Rate · Sleep" },
  { name:"FITBIT",       sub:"Steps · Sleep · Heart Rate" },
  { name:"POLAR",        sub:"HR · Training Load" },
  { name:"COROS",        sub:"GPS · Power · Recovery" },
  { name:"WAHOO",        sub:"Cycling · Power" },
  { name:"EIGHT SLEEP",  sub:"Sleep · HRV · Temperature" },
];

const STORAGE_KEY = "onboarding_progress";

function calcZones(lthr) {
  if (!lthr || isNaN(lthr) || lthr < 80 || lthr > 220) return null;
  return {
    z2_min:       Math.round(lthr * 0.68),
    z2_max:       Math.round(lthr * 0.83),
    thresh_min:   Math.round(lthr * 0.95),
    thresh_max:   Math.round(lthr * 1.05),
  };
}

function NavRow({ onBack, onNext, nextLabel = "NEXT", nextDisabled = false, isLast = false }) {
  return (
    <div style={{ display:"flex", gap:10, marginTop:8 }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ padding:"14px 20px", background:C.card, border:`1px solid ${C.border}`, borderRadius:12, color:C.muted, fontFamily:C.ff, fontSize:16, letterSpacing:2, cursor:"pointer" }}
        >BACK</button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          flex:1, padding:"15px 0",
          background: nextDisabled ? C.card2 : (isLast ? C.red : C.green),
          color: nextDisabled ? C.muted : "#000",
          border:"none", borderRadius:12,
          cursor: nextDisabled ? "default" : "pointer",
          fontFamily:C.ff, fontSize:18, letterSpacing:3,
        }}
      >{nextLabel}</button>
    </div>
  );
}

function RaceLookup({ sport, value, onChange }) {
  const [query, setQuery] = useState(value?.name || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(value?.name || ""); }, [value?.name]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = query.toLowerCase();
  const results = RACE_DATABASE.filter(r =>
    (!sport || sport === "general" || r.sport === sport) &&
    r.name.toLowerCase().includes(q)
  ).slice(0, 5);

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange({ ...value, name:e.target.value }); }}
        onFocus={() => setOpen(true)}
        placeholder="Search or type race name…"
        style={inputSm}
      />
      {open && query.length > 0 && results.length > 0 && (
        <div style={{
          position:"absolute", top:"100%", left:0, right:0, zIndex:50,
          background:C.card2, border:`1px solid ${C.border}`, borderRadius:8,
          marginTop:2, maxHeight:180, overflowY:"auto",
        }}>
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                onChange({ ...value, name:r.name, date:r.date });
                setQuery(r.name);
                setOpen(false);
              }}
              style={{
                display:"block", width:"100%", padding:"8px 12px", background:"transparent",
                border:"none", borderBottom:`1px solid ${C.border}`, cursor:"pointer", textAlign:"left",
              }}
            >
              <div style={{ fontFamily:C.ff, fontSize:13, color:C.text, letterSpacing:1 }}>{r.name}</div>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:1, marginTop:1 }}>
                {new Date(r.date + "T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SoonBadge() {
  return (
    <div style={{ background:`${C.yellow}22`, border:`1px solid ${C.yellow}44`, borderRadius:20, padding:"3px 10px", fontFamily:C.fm, fontSize:7, color:C.yellow, letterSpacing:2, flexShrink:0 }}>
      SOON
    </div>
  );
}

export default function Onboarding({ supabase, session, onComplete }) {
  const [step, setStep]           = useState(0);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  // Step 0 — Name
  const [name, setName]           = useState("");
  // Step 1 — Body
  const [dob, setDob]             = useState("");
  const [age, setAge]             = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [heightFt, setHeightFt]   = useState("");
  const [heightIn, setHeightIn]   = useState("0");
  const [sex, setSex]             = useState(null);
  // Step 2 — Race goal (multi-select + race entries)
  const [raceGoals, setRaceGoals] = useState([]);
  const [noRace, setNoRace]       = useState(false);
  const [races, setRaces]         = useState([]);
  // Step 3 — HR zones + deload
  const [lthr, setLthr]           = useState("");
  const [deloadPref, setDeloadPref] = useState(null);
  // Step 4 — Wearables + Health Data
  const [whoopJustConnected, setWhoopJustConnected] = useState(false);
  const [bloodworkFile, setBloodworkFile]   = useState(null);
  const [customSupps, setCustomSupps]       = useState([]);
  const [showSuppInput, setShowSuppInput]   = useState(false);
  const [suppText, setSuppText]             = useState("");
  const bloodworkRef = useRef(null);
  // Step 5 — Supplements
  const [supplements, setSupplements] = useState([]);

  const TOTAL = 6;
  const next = () => { saveProgress(); setStep(s => Math.min(s + 1, TOTAL - 1)); };
  const back = () => { saveProgress(); setStep(s => Math.max(s - 1, 0)); };

  const toggleGoal = (id) => {
    const isRemoving = raceGoals.includes(id);
    if (isRemoving) {
      setRaceGoals(prev => prev.filter(g => g !== id));
      setRaces(prev => {
        const filtered = prev.filter(rc => rc.sport !== id);
        if (filtered.length > 0 && !filtered.some(rc => rc.is_primary)) {
          filtered[0].is_primary = true;
        }
        return filtered;
      });
    } else {
      setRaceGoals(prev => [...prev, id]);
      setRaces(prev => [...prev, { sport:id, name:"", date:"", is_primary: prev.length === 0 }]);
    }
  };

  const updateRace = (idx, updates) => {
    setRaces(prev => prev.map((r, i) => i === idx ? { ...r, ...updates } : r));
  };

  const setPrimary = (idx) => {
    setRaces(prev => prev.map((r, i) => ({ ...r, is_primary: i === idx })));
  };

  const toggleSupp = (id) =>
    setSupplements(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const addCustomSupp = () => {
    const t = suppText.trim();
    if (t && !customSupps.includes(t)) {
      setCustomSupps(prev => [...prev, t]);
    }
    setSuppText("");
  };

  const saveProgress = (overrides) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step, name, dob, age, weightLbs, heightFt, heightIn, sex,
        raceGoals, noRace, races, lthr, deloadPref, supplements,
        whoopJustConnected, customSupps,
        ...overrides,
      }));
    } catch (_) {}
  };

  const persistWhoopConnection = async () => {
    try {
      await supabase
        .from("user_profiles")
        .update({ connected_wearables: { whoop: true } })
        .eq("user_id", session.user.id);
    } catch (_) {}
  };

  // Restore onboarding state from localStorage on mount.
  // If returning from WHOOP OAuth (?connected=true / ?whoop_connected=true
  // OR whoop_redirect flag), force step 4 and mark WHOOP as connected.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlConnected = params.get("connected") === "true" || params.get("whoop_connected") === "true";
      const whoopRedirect = localStorage.getItem("onboarding_whoop_redirect") === "true";
      const returnFromWhoop = urlConnected || whoopRedirect;
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const d = JSON.parse(saved);
        if (d.name) setName(d.name);
        if (d.dob) setDob(d.dob);
        if (d.age) setAge(d.age);
        if (d.weightLbs) setWeightLbs(d.weightLbs);
        if (d.heightFt) setHeightFt(d.heightFt);
        if (d.heightIn) setHeightIn(d.heightIn);
        if (d.sex) setSex(d.sex);
        if (d.raceGoals) setRaceGoals(d.raceGoals);
        if (d.noRace) setNoRace(d.noRace);
        if (d.races) setRaces(d.races);
        if (d.lthr) setLthr(d.lthr);
        if (d.deloadPref) setDeloadPref(d.deloadPref);
        if (d.supplements) setSupplements(d.supplements);
        if (d.whoopJustConnected) setWhoopJustConnected(true);
        if (d.customSupps) setCustomSupps(d.customSupps);

        if (returnFromWhoop) {
          setStep(4);
          setWhoopJustConnected(true);
          persistWhoopConnection();
        } else {
          setStep(d.step || 0);
        }
      } else if (returnFromWhoop) {
        setStep(4);
        setWhoopJustConnected(true);
        persistWhoopConnection();
      }

      if (urlConnected) window.history.replaceState({}, "", "/");
      if (whoopRedirect) localStorage.removeItem("onboarding_whoop_redirect");
    } catch (_) {}
  }, []);

  // Auto-calculate age from DOB
  useEffect(() => {
    if (!dob) return;
    const birth = new Date(dob + "T00:00:00");
    const today = new Date();
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    if (a >= 0 && a < 120) setAge(String(a));
  }, [dob]);

  const connectWhoop = () => {
    saveProgress({ step: 4 });
    localStorage.setItem("onboarding_whoop_redirect", "true");
    window.location.href = "/api/auth/login";
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const lthrVal   = lthr ? parseInt(lthr, 10) : null;
      const zones     = calcZones(lthrVal);
      const htIn      = heightFt ? parseInt(heightFt, 10) * 12 + parseInt(heightIn || 0, 10) : null;

      const connectedWearables = {};
      if (whoopJustConnected) {
        connectedWearables.whoop = true;
      }

      const primaryGoal = raceGoals.length > 0 ? raceGoals[0] : null;

      const profileData = {
        user_id:              session.user.id,
        name:                 name.trim(),
        dob:                  dob || null,
        age:                  age ? parseInt(age, 10) : null,
        weight_lbs:           weightLbs ? parseFloat(weightLbs) : null,
        height_in:            htIn,
        sex,
        race_goal:            primaryGoal,
        races:                noRace ? [] : races,
        lthr:                 lthrVal,
        z2_min:               zones?.z2_min ?? null,
        z2_max:               zones?.z2_max ?? null,
        deload_preference:    deloadPref,
        connected_wearables:  connectedWearables,
        supplements,
      };

      let { data, error: dbErr } = await supabase
        .from("user_profiles")
        .upsert(profileData, { onConflict: "user_id" })
        .select()
        .single();

      // If dob column is missing from schema, retry without it
      if (dbErr && (dbErr.message?.includes("dob") || dbErr.code === "PGRST204")) {
        console.warn("[onboarding] dob column not found, retrying without dob:", dbErr.message);
        const { dob: _dropped, ...profileWithoutDob } = profileData;
        const retry = await supabase
          .from("user_profiles")
          .upsert(profileWithoutDob, { onConflict: "user_id" })
          .select()
          .single();
        data = retry.data;
        dbErr = retry.error;
      }

      if (dbErr) throw dbErr;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("onboarding_whoop_redirect");
      onComplete(data);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const zones = calcZones(parseInt(lthr, 10));

  const renderStep = () => {
    switch (step) {
      // ── Step 0: Name ───────────────────────────────────────────────────────
      case 0:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:4, marginBottom:12 }}>STEP 1 OF {TOTAL}</div>
              <div style={{ fontFamily:C.ff, fontSize:52, color:C.text, lineHeight:0.95, marginBottom:10 }}>WHAT'S<br/>YOUR NAME?</div>
              <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted }}>We'll personalize your dashboard.</div>
            </div>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && name.trim() && next()}
              placeholder="First name"
              style={{ ...input, fontFamily:C.ff, fontSize:32, letterSpacing:2, padding:"16px 18px" }}
            />
            <NavRow onNext={next} nextDisabled={!name.trim()} />
          </div>
        );

      // ── Step 1: Body ────────────────────────────────────────────────────────
      case 1:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:4, marginBottom:12 }}>STEP 2 OF {TOTAL}</div>
              <div style={{ fontFamily:C.ff, fontSize:52, color:C.text, lineHeight:0.95, marginBottom:10 }}>YOUR<br/>BODY</div>
              <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted }}>Used to calculate training zones and nutrition targets. All optional.</div>
            </div>

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>DATE OF BIRTH</div>
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                style={{ ...input, colorScheme:"dark" }}
              />
            </div>

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>AGE {dob && <span style={{ color:C.green, fontSize:7 }}>· AUTO FROM DOB</span>}</div>
              <input type="number" value={age} onChange={e => { if (!dob) setAge(e.target.value); }} placeholder="32" min="16" max="99" style={{ ...input, opacity: dob ? 0.6 : 1 }} readOnly={!!dob} />
            </div>

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>WEIGHT (LBS)</div>
              <input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="185" style={input} />
            </div>

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>HEIGHT</div>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1, position:"relative" }}>
                  <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5" min="4" max="7" style={{ ...input, paddingRight:30 }} />
                  <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontFamily:C.fm, fontSize:10, color:C.muted }}>ft</span>
                </div>
                <div style={{ flex:1, position:"relative" }}>
                  <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="10" min="0" max="11" style={{ ...input, paddingRight:30 }} />
                  <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontFamily:C.fm, fontSize:10, color:C.muted }}>in</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop:16 }}>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:8 }}>SEX</div>
              <div style={{ display:"flex", gap:8 }}>
                {[["M","MALE"],["F","FEMALE"],["X","OTHER"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSex(val)}
                    style={{
                      flex:1, padding:"12px 0",
                      background: sex===val ? C.green : C.card,
                      color: sex===val ? "#000" : C.muted,
                      border:`1px solid ${sex===val ? C.green : C.border}`,
                      borderRadius:10, cursor:"pointer", fontFamily:C.ff, fontSize:14, letterSpacing:2,
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>

            <NavRow onBack={back} onNext={next} />
          </div>
        );

      // ── Step 2: Race Goal ───────────────────────────────────────────────────
      case 2:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:4, marginBottom:12 }}>STEP 3 OF {TOTAL}</div>
              <div style={{ fontFamily:C.ff, fontSize:52, color:C.text, lineHeight:0.95, marginBottom:10 }}>RACE<br/>GOAL</div>
              <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted }}>What are you training toward? Select all that apply.</div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {RACE_GOALS.map(({ id, label, sub }) => {
                const on = raceGoals.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => { if (!noRace) toggleGoal(id); }}
                    style={{
                      display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                      background: on ? `${C.green}10` : C.card,
                      border:`1px solid ${on ? C.green+"55" : C.border}`,
                      borderRadius:10, cursor: noRace ? "default" : "pointer", textAlign:"left",
                      opacity: noRace ? 0.4 : 1,
                    }}
                  >
                    <div style={{
                      width:20, height:20, borderRadius:5, flexShrink:0,
                      background: on ? C.green : C.card2,
                      border:`2px solid ${on ? C.green : C.border}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      {on && <span style={{ color:"#000", fontSize:12, fontWeight:900, lineHeight:1 }}>✓</span>}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontFamily:C.ff, fontSize:15, color: on ? C.text : C.muted, letterSpacing:1 }}>{label}</div>
                      <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:1, marginTop:1 }}>{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* No race checkbox */}
            <button
              onClick={() => { setNoRace(prev => !prev); if (!noRace) { setRaces([]); setRaceGoals([]); } }}
              style={{
                display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                background: noRace ? `${C.yellow}10` : C.card,
                border:`1px solid ${noRace ? C.yellow+"55" : C.border}`,
                borderRadius:10, cursor:"pointer", textAlign:"left",
              }}
            >
              <div style={{
                width:20, height:20, borderRadius:5, flexShrink:0,
                background: noRace ? C.yellow : C.card2,
                border:`2px solid ${noRace ? C.yellow : C.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {noRace && <span style={{ color:"#000", fontSize:12, fontWeight:900, lineHeight:1 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontFamily:C.ff, fontSize:14, color: noRace ? C.text : C.muted, letterSpacing:1 }}>NO UPCOMING RACE</div>
                <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:1, marginTop:1 }}>Default to 16-week general plan</div>
              </div>
            </button>

            {/* Compact race entries per selected sport */}
            {!noRace && races.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%", maxWidth:"100%", overflow:"hidden" }}>
                <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3 }}>YOUR RACES</div>
                {races.map((race, idx) => {
                  const goalLabel = RACE_GOALS.find(g => g.id === race.sport)?.label || race.sport;
                  return (
                    <div key={idx} style={{
                      background:C.card, borderRadius:10, padding:"10px 12px",
                      border:`1px solid ${race.is_primary ? C.green+"55" : C.border}`,
                      width:"100%", maxWidth:"100%", boxSizing:"border-box", overflow:"hidden",
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:2 }}>{goalLabel}</div>
                        <button
                          onClick={() => setPrimary(idx)}
                          style={{
                            padding:"2px 8px", borderRadius:12, cursor:"pointer",
                            background: race.is_primary ? C.green : "transparent",
                            color: race.is_primary ? "#000" : C.muted,
                            border:`1px solid ${race.is_primary ? C.green : C.border}`,
                            fontFamily:C.fm, fontSize:6, letterSpacing:2,
                          }}
                        >{race.is_primary ? "★ PRIMARY" : "SET PRIMARY"}</button>
                      </div>
                      <div style={{ marginBottom:6 }}>
                        <RaceLookup
                          sport={race.sport}
                          value={race}
                          onChange={(updated) => updateRace(idx, updated)}
                        />
                      </div>
                      <input
                        type="date"
                        value={race.date}
                        onChange={e => updateRace(idx, { date:e.target.value })}
                        style={{ ...inputSm, colorScheme:"dark" }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <NavRow onBack={back} onNext={next} nextDisabled={!noRace && raceGoals.length === 0} />
          </div>
        );

      // ── Step 3: HR Zones + Deload ──────────────────────────────────────────
      case 3:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:4, marginBottom:12 }}>STEP 4 OF {TOTAL}</div>
              <div style={{ fontFamily:C.ff, fontSize:52, color:C.text, lineHeight:0.95, marginBottom:10 }}>HR<br/>ZONES</div>
              <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted }}>
                Enter your Lactate Threshold Heart Rate (LTHR) to auto-calculate zones.
                Leave blank to use app defaults — you can update this later.
              </div>
            </div>

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>LTHR (BPM)</div>
              <input
                type="number"
                value={lthr}
                onChange={e => setLthr(e.target.value)}
                placeholder="163  (leave blank to skip)"
                min="80" max="220"
                style={{ ...input, fontFamily:C.ff, fontSize:28, letterSpacing:2, padding:"16px 18px" }}
              />
            </div>

            {zones ? (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:4 }}>CALCULATED ZONES</div>
                {[
                  { label:"Z1  WARM UP",   range:`< ${zones.z2_min} bpm`,                         color:C.light },
                  { label:"Z2  EASY",      range:`${zones.z2_min}–${zones.z2_max} bpm`,           color:C.green },
                  { label:"Z3  AEROBIC",   range:`${zones.z2_max+1}–${zones.thresh_min-1} bpm`,   color:"#FFB800" },
                  { label:"Z4  THRESHOLD", range:`${zones.thresh_min}–${zones.thresh_max} bpm`,   color:"#FF7700" },
                  { label:"Z5  MAXIMUM",   range:`> ${zones.thresh_max} bpm`,                     color:C.red },
                ].map(({ label, range, color }) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:C.card, borderRadius:8, borderLeft:`3px solid ${color}` }}>
                    <span style={{ fontFamily:C.ff, fontSize:13, color, letterSpacing:2 }}>{label}</span>
                    <span style={{ fontFamily:C.fm, fontSize:10, color:C.text }}>{range}</span>
                  </div>
                ))}
              </div>
            ) : lthr && (
              <div style={{ fontFamily:C.fm, fontSize:9, color:"#FFB800", letterSpacing:1, padding:"8px 12px", background:"#FFB80010", borderRadius:8 }}>
                Enter a value between 80–220 bpm
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

      // ── Step 4: Wearables + Health Data ────────────────────────────────────
      case 4:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:4, marginBottom:12 }}>STEP 5 OF {TOTAL}</div>
              <div style={{ fontFamily:C.ff, fontSize:52, color:C.text, lineHeight:0.95, marginBottom:10 }}>CONNECT<br/>& IMPORT</div>
              <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted }}>
                Link devices and import health data. You can always do this later.
              </div>
            </div>

            {/* ── WEARABLES ─────────────────────────────────────────────── */}
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3 }}>WEARABLES</div>

            {/* WHOOP — active */}
            <div style={{
              background:C.card, borderRadius:12, padding:"14px", overflow:"hidden",
              border:`1px solid ${whoopJustConnected ? C.green+"55" : C.border}`,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontFamily:C.ff, fontSize:18, color:C.text, letterSpacing:2 }}>WHOOP</div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:1, marginTop:2 }}>Recovery · HRV · Sleep · Strain</div>
                </div>
                {whoopJustConnected && (
                  <div style={{ background:`${C.green}22`, border:`1px solid ${C.green}44`, borderRadius:20, padding:"3px 10px", fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:2 }}>
                    CONNECTED ✓
                  </div>
                )}
              </div>
              {!whoopJustConnected && (
                <button
                  onClick={connectWhoop}
                  style={{
                    width:"100%", padding:"10px", marginTop:10, background:C.green, color:"#000",
                    border:"none", borderRadius:8, cursor:"pointer",
                    fontFamily:C.ff, fontSize:14, letterSpacing:3,
                  }}
                >CONNECT WHOOP</button>
              )}
            </div>

            {/* SOON wearables — compact grid */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {SOON_WEARABLES.map(w => (
                <div key={w.name} style={{
                  background:C.card, borderRadius:10, padding:"10px 12px",
                  border:`1px solid ${C.border}`, opacity:0.6,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                    <div style={{ fontFamily:C.ff, fontSize:13, color:C.text, letterSpacing:1, lineHeight:1.1 }}>{w.name}</div>
                    <SoonBadge />
                  </div>
                  <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:1 }}>{w.sub}</div>
                </div>
              ))}
            </div>

            {/* ── HEALTH DATA ───────────────────────────────────────────── */}
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginTop:8 }}>HEALTH DATA</div>

            {/* Upload Bloodwork */}
            <div style={{
              background:C.card, borderRadius:12, padding:"14px",
              border:`1px solid ${bloodworkFile ? C.green+"55" : C.border}`,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:C.ff, fontSize:16, color:C.text, letterSpacing:1 }}>UPLOAD BLOODWORK</div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:1, marginTop:2 }}>PDF or photo · Claude reads it</div>
                </div>
                {bloodworkFile ? (
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                    <span style={{ fontFamily:C.fm, fontSize:8, color:C.green }}>✓</span>
                    <button onClick={() => { setBloodworkFile(null); if (bloodworkRef.current) bloodworkRef.current.value = ""; }}
                      style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:12, padding:0 }}>✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => bloodworkRef.current?.click()}
                    style={{
                      padding:"6px 14px", background:C.card2, color:C.text,
                      border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer",
                      fontFamily:C.ff, fontSize:12, letterSpacing:2, flexShrink:0,
                    }}
                  >UPLOAD</button>
                )}
              </div>
              {bloodworkFile && (
                <div style={{ fontFamily:C.fm, fontSize:8, color:C.green, marginTop:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {bloodworkFile.name}
                </div>
              )}
              <input ref={bloodworkRef} type="file" accept="image/*,.pdf" style={{ display:"none" }} onChange={e => {
                const file = e.target.files?.[0];
                if (file) setBloodworkFile({ name: file.name, type: file.type, size: file.size });
              }} />
            </div>

            {/* Current Supplements */}
            <div style={{
              background:C.card, borderRadius:12, padding:"14px",
              border:`1px solid ${C.border}`,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontFamily:C.ff, fontSize:16, color:C.text, letterSpacing:1 }}>CURRENT SUPPLEMENTS</div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:1, marginTop:2 }}>Add what you're already taking</div>
                </div>
                {!showSuppInput && (
                  <button
                    onClick={() => setShowSuppInput(true)}
                    style={{
                      padding:"6px 14px", background:C.card2, color:C.text,
                      border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer",
                      fontFamily:C.ff, fontSize:12, letterSpacing:2, flexShrink:0,
                    }}
                  >ADD</button>
                )}
              </div>
              {showSuppInput && (
                <div style={{ marginTop:10 }}>
                  <div style={{ display:"flex", gap:6 }}>
                    <input
                      type="text"
                      value={suppText}
                      onChange={e => setSuppText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomSupp(); } }}
                      placeholder="e.g. Creatine 5g, Vitamin D 5000 IU"
                      style={{ ...inputSm, flex:1 }}
                    />
                    <button onClick={addCustomSupp} disabled={!suppText.trim()}
                      style={{
                        padding:"8px 12px", background: suppText.trim() ? C.green : C.card2,
                        color: suppText.trim() ? "#000" : C.muted,
                        border:"none", borderRadius:8, cursor: suppText.trim() ? "pointer" : "default",
                        fontFamily:C.ff, fontSize:11, letterSpacing:1, flexShrink:0,
                      }}
                    >+</button>
                  </div>
                  {customSupps.length > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
                      {customSupps.map((s, i) => (
                        <div key={i} style={{
                          display:"flex", alignItems:"center", gap:6,
                          background:C.card2, border:`1px solid ${C.border}`, borderRadius:20,
                          padding:"4px 10px",
                        }}>
                          <span style={{ fontFamily:C.fm, fontSize:9, color:C.text }}>{s}</span>
                          <button onClick={() => setCustomSupps(prev => prev.filter((_, j) => j !== i))}
                            style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:11, padding:0, lineHeight:1 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <NavRow onBack={back} onNext={next} />
          </div>
        );

      // ── Step 5: Supplements ─────────────────────────────────────────────────
      case 5:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:4, marginBottom:12 }}>STEP 6 OF {TOTAL}</div>
              <div style={{ fontFamily:C.ff, fontSize:52, color:C.text, lineHeight:0.95, marginBottom:10 }}>YOUR<br/>STACK</div>
              <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted }}>
                Select what you currently use. We'll show your personalized protocol. Skip anything you don't take.
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {SUPP_OPTIONS.map(({ id, label, sub }) => {
                const on = supplements.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleSupp(id)}
                    style={{
                      display:"flex", alignItems:"center", gap:14, padding:"14px 16px",
                      background: on ? `${C.green}10` : C.card,
                      border:`1px solid ${on ? C.green+"55" : C.border}`,
                      borderRadius:12, cursor:"pointer", textAlign:"left",
                    }}
                  >
                    <div style={{
                      width:22, height:22, borderRadius:6, flexShrink:0,
                      background: on ? C.green : C.card2,
                      border:`2px solid ${on ? C.green : C.border}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      {on && <span style={{ color:"#000", fontSize:13, fontWeight:900, lineHeight:1 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontFamily:C.ff, fontSize:15, color: on ? C.text : C.muted, letterSpacing:1 }}>{label}</div>
                      <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1, marginTop:2 }}>{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <div style={{ fontFamily:C.fm, fontSize:9, color:C.red, letterSpacing:1, padding:"10px 12px", background:`${C.red}15`, borderRadius:8, lineHeight:1.5 }}>
                {error}
              </div>
            )}

            <NavRow onBack={back} onNext={save} nextLabel={saving ? "SAVING..." : "LET'S GO →"} nextDisabled={saving} isLast />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <div style={{ maxWidth:480, margin:"0 auto", padding:"28px 24px 60px" }}>

        {/* Progress bar */}
        <div style={{ display:"flex", gap:4, marginBottom:36 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div
              key={i}
              style={{
                flex:1, height:3, borderRadius:4,
                background: i <= step ? C.green : C.card2,
                transition:"background 0.3s",
              }}
            />
          ))}
        </div>

        {renderStep()}
      </div>
    </div>
  );
}
