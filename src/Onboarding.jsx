import { useState } from "react";

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
  width:"100%", boxSizing:"border-box",
};

const RACE_GOALS = [
  { id:"hyrox",        label:"HYROX",            sub:"Functional fitness race" },
  { id:"olympic_tri",  label:"OLYMPIC TRI",       sub:"1.5km swim / 40km bike / 10km run" },
  { id:"half_ironman", label:"70.3 HALF IM",      sub:"1.9km / 90km / 21.1km" },
  { id:"ironman",      label:"FULL IRONMAN",       sub:"3.8km / 180km / 42.2km" },
  { id:"marathon",     label:"MARATHON",           sub:"26.2 miles" },
  { id:"general",      label:"GENERAL FITNESS",    sub:"Health & performance" },
];

const SUPP_OPTIONS = [
  { id:"beta_alanine", label:"Beta Alanine",           sub:"3.2–6.4g · Performance buffer" },
  { id:"creatine",     label:"Creatine Monohydrate",   sub:"5g · Strength & power" },
  { id:"whey",         label:"Whey Protein",            sub:"25–40g · Recovery & muscle" },
  { id:"magnesium",    label:"Magnesium Glycinate",     sub:"300–400mg · Sleep & HRV" },
  { id:"l_theanine",   label:"L-Theanine",              sub:"200–400mg · Calm sleep" },
  { id:"sermorelin",   label:"Sermorelin (Rx)",         sub:"Per Rx · GH pulse pre-sleep" },
];

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

export default function Onboarding({ supabase, session, onComplete }) {
  const [step, setStep]           = useState(0);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  // Step 1 — Name
  const [name, setName]           = useState("");
  // Step 2 — Body
  const [age, setAge]             = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [heightFt, setHeightFt]   = useState("");
  const [heightIn, setHeightIn]   = useState("0");
  const [sex, setSex]             = useState(null);
  // Step 3 — Race goal
  const [raceGoal, setRaceGoal]   = useState(null);
  // Step 4 — HR zones
  const [lthr, setLthr]           = useState("");
  // Step 5 — Supplements
  const [supplements, setSupplements] = useState([]);

  const TOTAL = 5;
  const next = () => setStep(s => Math.min(s + 1, TOTAL - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const toggleSupp = (id) =>
    setSupplements(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const lthrVal   = lthr ? parseInt(lthr, 10) : null;
      const zones     = calcZones(lthrVal);
      const htIn      = heightFt ? parseInt(heightFt, 10) * 12 + parseInt(heightIn || 0, 10) : null;

      const { data, error: dbErr } = await supabase
        .from("user_profiles")
        .upsert({
          user_id:    session.user.id,
          name:       name.trim(),
          age:        age       ? parseInt(age, 10)         : null,
          weight_lbs: weightLbs ? parseFloat(weightLbs)     : null,
          height_in:  htIn,
          sex,
          race_goal:  raceGoal,
          lthr:       lthrVal,
          z2_min:     zones?.z2_min   ?? null,
          z2_max:     zones?.z2_max   ?? null,
          supplements,
        }, { onConflict: "user_id" })
        .select()
        .single();

      if (dbErr) throw dbErr;
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
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>AGE</div>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="32" min="16" max="99" style={input} />
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

            <div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:6 }}>SEX</div>
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
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:4, marginBottom:12 }}>STEP 3 OF {TOTAL}</div>
              <div style={{ fontFamily:C.ff, fontSize:52, color:C.text, lineHeight:0.95, marginBottom:10 }}>RACE<br/>GOAL</div>
              <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted }}>What are you training toward?</div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {RACE_GOALS.map(({ id, label, sub }) => {
                const on = raceGoal === id;
                return (
                  <button
                    key={id}
                    onClick={() => setRaceGoal(id)}
                    style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"16px 18px",
                      background: on ? `${C.green}15` : C.card,
                      border:`1px solid ${on ? C.green : C.border}`,
                      borderRadius:12, cursor:"pointer", textAlign:"left",
                    }}
                  >
                    <div>
                      <div style={{ fontFamily:C.ff, fontSize:18, color: on ? C.green : C.text, letterSpacing:2 }}>{label}</div>
                      <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1, marginTop:3 }}>{sub}</div>
                    </div>
                    {on && <span style={{ color:C.green, fontSize:18 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            <NavRow onBack={back} onNext={next} nextDisabled={!raceGoal} />
          </div>
        );

      // ── Step 3: HR Zones ────────────────────────────────────────────────────
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

            <NavRow onBack={back} onNext={next} />
          </div>
        );

      // ── Step 4: Supplements ─────────────────────────────────────────────────
      case 4:
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:4, marginBottom:12 }}>STEP 5 OF {TOTAL}</div>
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
