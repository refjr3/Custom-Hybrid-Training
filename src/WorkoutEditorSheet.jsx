import { useState } from "react";

const C = {
  bg: "#0D0D0D",
  card: "rgba(255,255,255,0.055)",
  border: "rgba(255,255,255,0.13)",
  cyan: "#C9A875",
  red: "#FF3B30",
  green: "#00D4A0",
  text: "#FFFFFF",
  muted: "#888888",
  fm: "'DM Sans',sans-serif",
};

const STEP_COLORS = {
  warmup: "#e74c3c",
  work: "#4a90c4",
  recover: "#f39c12",
  rest: "#7f8c8d",
  cooldown: "#27ae60",
  repeat: "#9b59b6",
  other: "#888888",
};

const SPORT_CONFIG = {
  run: {
    label: "RUN", icon: "▷",
    durationOptions: ["time","distance","lap_button"],
    defaultUnit: "km",
    intensityOptions: ["none","heart_rate_zone","custom_hr","pace"],
    presets: ["200m","400m","800m","1km","3km","5km"],
    defaultSteps: ["warmup","work","cooldown"]
  },
  ski_erg: {
    label: "SKI ERG", icon: "⬡",
    durationOptions: ["distance","time","calories"],
    defaultUnit: "m",
    intensityOptions: ["none","pace","calories"],
    presets: ["250m","500m","1000m","2000m"],
    defaultSteps: ["warmup","work","rest"]
  },
  row_erg: {
    label: "ROW ERG", icon: "◉",
    durationOptions: ["distance","time","calories"],
    defaultUnit: "m",
    intensityOptions: ["none","pace","calories"],
    presets: ["250m","500m","1000m","2000m"],
    defaultSteps: ["warmup","work","rest"]
  },
  bike: {
    label: "BIKE", icon: "◈",
    durationOptions: ["time","distance","lap_button"],
    defaultUnit: "min",
    intensityOptions: ["none","power_zone","heart_rate_zone","cadence"],
    presets: ["10min","20min","30min","45min"],
    defaultSteps: ["warmup","work","cooldown"]
  },
  swim: {
    label: "SWIM", icon: "〜",
    durationOptions: ["distance","time"],
    defaultUnit: "m",
    intensityOptions: ["none","pace","heart_rate_zone"],
    presets: ["25m","50m","100m","200m","400m"],
    defaultSteps: ["warmup","work","cooldown"]
  },
  strength: {
    label: "STRENGTH", icon: "▲",
    durationOptions: ["time","open","lap_button"],
    defaultUnit: "min",
    intensityOptions: ["none"],
    presets: [],
    defaultSteps: ["work","rest"]
  },
  hyrox: {
    label: "HYROX", icon: "⬡",
    durationOptions: ["distance","time","lap_button"],
    defaultUnit: "m",
    intensityOptions: ["none","heart_rate_zone"],
    presets: ["50m","100m","200m","500m","1km"],
    defaultSteps: ["work","rest"]
  },
};

const uid = () => crypto.randomUUID();

function makeStep(type) {
  return {
    id: uid(),
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    duration: { type: "time", value: "", unit: "min" },
    intensity: { type: "none", zone: null, min: null, max: null },
    note: "",
  };
}

export default function WorkoutEditorSheet({ open, sport: initialSport, blocks, onSave, onCancel }) {
  const safeSport = (initialSport && SPORT_CONFIG[initialSport]) ? initialSport : "run";

  const [sport, setSport] = useState(safeSport);
  const [steps, setSteps] = useState(() => {
    const config = SPORT_CONFIG[safeSport];
    if (blocks && blocks.length > 0) {
      return blocks.flatMap(b => (b.items || []).map(item => ({
        id: uid(),
        type: "work",
        name: item.name || "Work",
        duration: { type: "time", value: item.sets || "", unit: "min" },
        intensity: { type: "none", zone: null, min: null, max: null },
        note: item.load || item.note || "",
      })));
    }
    return config.defaultSteps.map(makeStep);
  });
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving] = useState(false);

  const config = SPORT_CONFIG[sport] || SPORT_CONFIG["run"];

  const updateStep = (id, patch) =>
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const updateDuration = (id, patch) =>
    setSteps(prev => prev.map(s => s.id === id ? { ...s, duration: { ...s.duration, ...patch } } : s));

  const updateIntensity = (id, patch) =>
    setSteps(prev => prev.map(s => s.id === id ? { ...s, intensity: { ...s.intensity, ...patch } } : s));

  const deleteStep = (id) => setSteps(prev => prev.filter(s => s.id !== id));

  const addStep = () => {
    const newStep = makeStep("work");
    setSteps(prev => [...prev, newStep]);
    setExpandedId(newStep.id);
  };

  const addRepeat = () => {
    const inner1 = makeStep("work");
    const inner2 = makeStep("recover");
    setSteps(prev => [...prev, {
      id: uid(),
      type: "repeat",
      name: "Repeat",
      count: 4,
      steps: [inner1, inner2],
    }]);
  };

  const handleSave = async () => {
    setSaving(true);
    const blocks = [{
      id: uid(),
      title: config.label,
      type: sport,
      items: steps.filter(s => s.type !== "repeat").map(s => ({
        id: s.id,
        name: s.name,
        sets: s.duration.value ? `${s.duration.value}${s.duration.unit}` : "",
        reps: s.intensity.zone ? `Z${s.intensity.zone}` : "",
        load: s.note,
        note: s.note,
        is_ai_generated: false,
        is_modified: true,
      })),
    }];
    await onSave(blocks);
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: C.bg,
      display: "flex", flexDirection: "column",
      transform: open ? "translateY(0)" : "translateY(100%)",
      transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
    }}>
      {/* Drag handle */}
      <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px 12px" }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: C.muted, fontFamily: C.fm, fontSize: 11, letterSpacing: 2, cursor: "pointer" }}>
          CANCEL
        </button>
        <div style={{ fontFamily: C.fm, fontSize: 11, color: C.text, letterSpacing: 3 }}>EDIT WORKOUT</div>
        <button onClick={handleSave} disabled={saving} style={{ background: C.cyan, border: "none", color: "#000", fontFamily: C.fm, fontSize: 11, letterSpacing: 2, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>
          {saving ? "SAVING..." : "SAVE"}
        </button>
      </div>

      {/* Sport picker */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 16px 12px", scrollbarWidth: "none" }}>
        {Object.entries(SPORT_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setSport(key)} style={{
            flexShrink: 0, background: sport === key ? C.cyan : C.card,
            border: `1px solid ${sport === key ? C.cyan : C.border}`,
            borderRadius: 20, padding: "6px 14px", color: sport === key ? "#000" : C.muted,
            fontFamily: C.fm, fontSize: 10, letterSpacing: 2, cursor: "pointer", whiteSpace: "nowrap"
          }}>
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      {/* Scrollable step list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 100px" }}>
        {steps.map((step, idx) => {
          const color = STEP_COLORS[step.type] || C.muted;
          const isExpanded = expandedId === step.id;

          if (step.type === "repeat") {
            return (
              <div key={step.id} style={{ marginBottom: 10, borderRadius: 12, border: `1px solid ${STEP_COLORS.repeat}44`, borderLeft: `3px solid ${STEP_COLORS.repeat}`, background: C.card, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: STEP_COLORS.repeat, fontSize: 14 }}>↻</span>
                    <span style={{ fontFamily: C.fm, fontSize: 10, color: C.text, letterSpacing: 2 }}>REPEAT</span>
                    <input
                      type="number"
                      value={step.count}
                      onChange={e => setSteps(prev => prev.map(s => s.id === step.id ? { ...s, count: parseInt(e.target.value) || 1 } : s))}
                      style={{ width: 44, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "4px 8px", fontFamily: C.fm, fontSize: 11, textAlign: "center" }}
                    />
                    <span style={{ fontFamily: C.fm, fontSize: 10, color: C.muted }}>TIMES</span>
                  </div>
                  <button onClick={() => deleteStep(step.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 14, cursor: "pointer" }}>✕</button>
                </div>
                {(step.steps || []).map(inner => (
                  <div key={inner.id} style={{ marginLeft: 12, marginBottom: 6, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", borderLeft: `2px solid ${STEP_COLORS[inner.type] || C.muted}` }}>
                    <span style={{ fontFamily: C.fm, fontSize: 10, color: STEP_COLORS[inner.type] || C.muted, letterSpacing: 2 }}>{inner.type.toUpperCase()}</span>
                    <span style={{ fontFamily: C.fm, fontSize: 10, color: C.muted, marginLeft: 8 }}>{inner.duration.value}{inner.duration.unit}</span>
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div key={step.id} style={{ marginBottom: 10, borderRadius: 12, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, background: C.card, overflow: "hidden" }}>
              {/* Step header — tap to expand */}
              <div onClick={() => setExpandedId(isExpanded ? null : step.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 12px 12px 14px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: C.fm, fontSize: 10, color: C.text, letterSpacing: 2 }}>{step.type.toUpperCase()}</div>
                    <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, marginTop: 2 }}>
                      {step.duration.value ? `${step.duration.value} ${step.duration.unit}` : "tap to configure"}
                      {step.intensity.type !== "none" && step.intensity.zone ? ` · Z${step.intensity.zone}` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: C.muted, fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</span>
                  <button onClick={e => { e.stopPropagation(); deleteStep(step.id); }} style={{ background: "none", border: "none", color: C.red, fontSize: 14, cursor: "pointer", padding: 0 }}>✕</button>
                </div>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.border}` }}>
                  {/* Step type */}
                  <div style={{ marginTop: 12, marginBottom: 12 }}>
                    <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 6 }}>STEP TYPE</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["warmup","work","recover","rest","cooldown","other"].map(t => (
                        <button key={t} onClick={() => updateStep(step.id, { type: t })} style={{
                          background: step.type === t ? `${STEP_COLORS[t]}22` : "transparent",
                          border: `1px solid ${step.type === t ? STEP_COLORS[t] : C.border}`,
                          borderRadius: 6, padding: "5px 10px", color: step.type === t ? STEP_COLORS[t] : C.muted,
                          fontFamily: C.fm, fontSize: 9, letterSpacing: 1, cursor: "pointer"
                        }}>
                          {t.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 6 }}>DURATION</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <select value={step.duration.type} onChange={e => updateDuration(step.id, { type: e.target.value })} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontFamily: C.fm, fontSize: 10, cursor: "pointer" }}>
                        {config.durationOptions.map(o => <option key={o} value={o}>{o.replace("_"," ").toUpperCase()}</option>)}
                      </select>
                      {step.duration.type !== "lap_button" && step.duration.type !== "open" && (
                        <input type="text" value={step.duration.value} onChange={e => updateDuration(step.id, { value: e.target.value })} placeholder="Value" style={{ width: 70, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontFamily: C.fm, fontSize: 11, textAlign: "center" }} />
                      )}
                      <select value={step.duration.unit} onChange={e => updateDuration(step.id, { unit: e.target.value })} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontFamily: C.fm, fontSize: 10, cursor: "pointer" }}>
                        {["min","sec","km","mi","m","yd","cal"].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    {config.presets.length > 0 && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {config.presets.map(p => (
                          <button key={p} onClick={() => {
                            const num = parseFloat(p);
                            const unit = p.replace(/[\d.]/g, "");
                            updateDuration(step.id, { value: String(num), unit: unit || config.defaultUnit });
                          }} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", color: C.muted, fontFamily: C.fm, fontSize: 9, cursor: "pointer" }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Intensity */}
                  {config.intensityOptions.length > 1 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 6 }}>INTENSITY</div>
                      <select value={step.intensity.type} onChange={e => updateIntensity(step.id, { type: e.target.value, zone: null })} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontFamily: C.fm, fontSize: 10, width: "100%", cursor: "pointer" }}>
                        {config.intensityOptions.map(o => <option key={o} value={o}>{o.replace(/_/g," ").toUpperCase()}</option>)}
                      </select>
                      {(step.intensity.type === "heart_rate_zone" || step.intensity.type === "power_zone") && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          {[1,2,3,4,5].map(z => (
                            <button key={z} onClick={() => updateIntensity(step.id, { zone: z })} style={{
                              flex: 1, background: step.intensity.zone === z ? `${color}22` : "transparent",
                              border: `1px solid ${step.intensity.zone === z ? color : C.border}`,
                              borderRadius: 6, padding: "8px 4px", color: step.intensity.zone === z ? color : C.muted,
                              fontFamily: C.fm, fontSize: 10, cursor: "pointer"
                            }}>Z{z}</button>
                          ))}
                        </div>
                      )}
                      {step.intensity.type === "custom_hr" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                          <input type="number" value={step.intensity.min || ""} onChange={e => updateIntensity(step.id, { min: e.target.value })} placeholder="Min BPM" style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontFamily: C.fm, fontSize: 11 }} />
                          <span style={{ color: C.muted, fontFamily: C.fm, fontSize: 10 }}>–</span>
                          <input type="number" value={step.intensity.max || ""} onChange={e => updateIntensity(step.id, { max: e.target.value })} placeholder="Max BPM" style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontFamily: C.fm, fontSize: 11 }} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Note */}
                  <div>
                    <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 6 }}>NOTE (OPTIONAL)</div>
                    <input type="text" value={step.note} onChange={e => updateStep(step.id, { note: e.target.value })} placeholder="e.g. stay conversational, nasal breathing" style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 12px", fontFamily: C.fm, fontSize: 11 }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={addStep} style={{ flex: 1, background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 12, padding: 14, color: C.cyan, fontFamily: C.fm, fontSize: 10, letterSpacing: 2, cursor: "pointer" }}>
            + ADD STEP
          </button>
          <button onClick={addRepeat} style={{ flex: 1, background: "transparent", border: `1px dashed ${STEP_COLORS.repeat}55`, borderRadius: 12, padding: 14, color: STEP_COLORS.repeat, fontFamily: C.fm, fontSize: 10, letterSpacing: 2, cursor: "pointer" }}>
            ↻ ADD REPEAT
          </button>
        </div>
      </div>
    </div>
  );
}
