import { useEffect, useMemo, useState } from "react";

const SURFACE = {
  bg: "#0D0D0D",
  text: "#FFFFFF",
  muted: "#888888",
  border: "rgba(255,255,255,0.12)",
  card: "rgba(255,255,255,0.04)",
  input: "rgba(255,255,255,0.06)",
  cyan: "#00F3FF",
  red: "#FF3B30",
  green: "#00D4A0",
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
    label: "RUN",
    icon: "▷",
    defaultDuration: "distance",
    defaultUnit: "km",
    durationOptions: ["distance", "time", "lap_button", "heart_rate"],
    intensityOptions: ["none", "pace", "heart_rate_zone", "custom_hr", "power_zone"],
    defaultSteps: ["warmup", "work", "cooldown"],
    distancePresets: ["200m", "400m", "800m", "1km", "1.5km", "3km", "5km", "10km"],
  },
  ski_erg: {
    label: "SKI ERG",
    icon: "⬡",
    defaultDuration: "distance",
    defaultUnit: "m",
    durationOptions: ["distance", "time", "calories", "lap_button"],
    intensityOptions: ["none", "pace", "calories"],
    defaultSteps: ["warmup", "work", "rest"],
    distancePresets: ["250m", "500m", "1000m", "2000m"],
  },
  row_erg: {
    label: "ROW ERG",
    icon: "◉",
    defaultDuration: "distance",
    defaultUnit: "m",
    durationOptions: ["distance", "time", "calories", "lap_button"],
    intensityOptions: ["none", "pace", "calories"],
    defaultSteps: ["warmup", "work", "rest"],
    distancePresets: ["250m", "500m", "1000m", "2000m"],
  },
  bike: {
    label: "BIKE",
    icon: "◈",
    defaultDuration: "time",
    defaultUnit: "min",
    durationOptions: ["time", "distance", "lap_button"],
    intensityOptions: ["none", "power_zone", "custom_power", "heart_rate_zone", "cadence"],
    defaultSteps: ["warmup", "work", "cooldown"],
    distancePresets: ["5km", "10km", "20km", "40km"],
  },
  swim: {
    label: "SWIM",
    icon: "〜",
    defaultDuration: "distance",
    defaultUnit: "m",
    durationOptions: ["distance", "time", "lap_button"],
    intensityOptions: ["none", "pace", "heart_rate_zone"],
    defaultSteps: ["warmup", "work", "cooldown"],
    distancePresets: ["25m", "50m", "100m", "200m", "400m"],
  },
  strength: {
    label: "STRENGTH",
    icon: "▲",
    defaultDuration: "time",
    defaultUnit: "min",
    durationOptions: ["time", "lap_button", "open"],
    intensityOptions: ["none"],
    defaultSteps: ["work", "rest"],
    distancePresets: [],
  },
  hyrox: {
    label: "HYROX",
    icon: "⬡",
    defaultDuration: "distance",
    defaultUnit: "m",
    durationOptions: ["distance", "time", "lap_button"],
    intensityOptions: ["none", "heart_rate_zone"],
    defaultSteps: ["work", "rest"],
    distancePresets: ["50m", "100m", "200m", "500m", "1000m"],
  },
};

const STEP_TYPES = ["warmup", "work", "recover", "rest", "cooldown", "other"];

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const LABELS = {
  warmup: "WARM UP",
  work: "WORK",
  recover: "RECOVER",
  rest: "REST",
  cooldown: "COOL DOWN",
  repeat: "REPEAT",
  other: "OTHER",
  lap_button: "LAP BUTTON",
  heart_rate: "HEART RATE",
  heart_rate_zone: "HEART RATE ZONE",
  custom_hr: "CUSTOM HR",
  power_zone: "POWER ZONE",
  custom_power: "CUSTOM POWER",
};

const toLabel = (value) => LABELS[value] || String(value || "").replace(/_/g, " ").toUpperCase();

const unitsForDuration = (durationType, defaultUnit) => {
  if (durationType === "time") return ["min", "sec"];
  if (durationType === "distance") return ["km", "mi", "m", "yd"];
  if (durationType === "calories") return ["cal"];
  if (durationType === "heart_rate") return ["bpm"];
  if (durationType === "lap_button" || durationType === "open") return [];
  return defaultUnit ? [defaultUnit] : ["min"];
};

const parsePreset = (preset) => {
  const m = String(preset || "").trim().match(/^(\d+(?:\.\d+)?)(km|mi|m|yd)$/i);
  if (!m) return null;
  return { value: Number(m[1]), unit: m[2].toLowerCase() };
};

const defaultStep = (sport, type = "work") => {
  const config = SPORT_CONFIG[sport] || SPORT_CONFIG.run;
  const durationType = config.defaultDuration || "time";
  const units = unitsForDuration(durationType, config.defaultUnit);
  return {
    id: uid(),
    type,
    name: toLabel(type),
    duration: {
      type: durationType,
      value: durationType === "distance" ? 1 : durationType === "time" ? 10 : null,
      unit: units[0] || null,
    },
    intensity: { type: "none", zone: 2, min: null, max: null },
    notes: "",
    color: STEP_COLORS[type] || STEP_COLORS.other,
  };
};

const summarizeDuration = (duration) => {
  if (!duration) return "Open";
  if (duration.type === "lap_button") return "Lap Button";
  if (duration.type === "open") return "Open";
  if (duration.value === null || duration.value === "" || Number.isNaN(Number(duration.value))) return toLabel(duration.type);
  return `${duration.value}${duration.unit ? ` ${duration.unit}` : ""}`;
};

const summarizeIntensity = (intensity) => {
  if (!intensity || intensity.type === "none") return "No Intensity";
  if (intensity.type === "heart_rate_zone" || intensity.type === "power_zone") return `${toLabel(intensity.type)} Z${intensity.zone || 2}`;
  if (intensity.type === "custom_hr" || intensity.type === "custom_power") {
    if (intensity.min && intensity.max) return `${toLabel(intensity.type)} ${intensity.min}-${intensity.max}`;
    return toLabel(intensity.type);
  }
  return toLabel(intensity.type);
};

const getWorkout = (workout) => workout || { sport: null, steps: [] };

export default function WorkoutEditorSheet({
  open,
  workout,
  onWorkoutChange,
  onCancel,
  onSave,
  saving,
  status,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [mounted, setMounted] = useState(open);
  const state = getWorkout(workout);
  const config = SPORT_CONFIG[state.sport] || null;

  useEffect(() => {
    if (open) setMounted(true);
    else {
      const timer = setTimeout(() => setMounted(false), 350);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (open) setExpandedId(null);
  }, [open]);

  const needsSport = !state.sport;
  const sportOptions = useMemo(() => Object.entries(SPORT_CONFIG), []);

  if (!mounted) return null;

  const setSport = (sportId) => {
    const nextConfig = SPORT_CONFIG[sportId];
    const nextSteps = state.steps?.length
      ? state.steps
      : (nextConfig.defaultSteps || ["work"]).map((stepType) => defaultStep(sportId, stepType));
    onWorkoutChange({ sport: sportId, steps: nextSteps });
  };

  const updateStep = (stepId, updater) => {
    onWorkoutChange({
      ...state,
      steps: (state.steps || []).map((step) => (step.id === stepId ? updater(step) : step)),
    });
  };

  const deleteStep = (stepId) => {
    onWorkoutChange({ ...state, steps: (state.steps || []).filter((step) => step.id !== stepId) });
  };

  const updateRepeatChild = (repeatId, childId, updater) => {
    updateStep(repeatId, (repeat) => ({
      ...repeat,
      steps: (repeat.steps || []).map((child) => (child.id === childId ? updater(child) : child)),
    }));
  };

  const deleteRepeatChild = (repeatId, childId) => {
    updateStep(repeatId, (repeat) => ({
      ...repeat,
      steps: (repeat.steps || []).filter((child) => child.id !== childId),
    }));
  };

  const addStep = () => {
    if (!state.sport) return;
    onWorkoutChange({ ...state, steps: [...(state.steps || []), defaultStep(state.sport, "work")] });
  };

  const addRepeat = () => {
    if (!state.sport) return;
    const repeat = {
      id: uid(),
      type: "repeat",
      name: "Repeat",
      count: 4,
      color: STEP_COLORS.repeat,
      steps: [defaultStep(state.sport, "work"), defaultStep(state.sport, "recover")],
    };
    onWorkoutChange({ ...state, steps: [...(state.steps || []), repeat] });
  };

  const updateStepType = (step, stepType) => ({
    ...step,
    type: stepType,
    color: STEP_COLORS[stepType] || STEP_COLORS.other,
    name: step.name === toLabel(step.type) ? toLabel(stepType) : step.name,
  });

  const renderStepEditor = (step, callbacks, nested = false) => {
    const activeConfig = config || SPORT_CONFIG.run;
    const durationTypes = activeConfig.durationOptions || ["time"];
    const intensityTypes = activeConfig.intensityOptions || ["none"];
    const currentDurationType = step.duration?.type || activeConfig.defaultDuration;
    const currentUnits = unitsForDuration(currentDurationType, activeConfig.defaultUnit);
    const zoneMax = step.intensity?.type === "power_zone" ? 7 : 5;

    return (
      <div
        style={{
          border: `1px solid ${SURFACE.border}`,
          borderLeft: `4px solid ${step.color || STEP_COLORS.other}`,
          borderRadius: 12,
          background: SURFACE.card,
          padding: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: 2, color: SURFACE.text }}>
            ● {toLabel(step.type)}
          </div>
          <button
            onClick={callbacks.onDelete}
            style={{ minHeight: 44, minWidth: 44, border: "none", background: "none", color: SURFACE.red, cursor: "pointer", fontSize: 16 }}
          >
            ✕
          </button>
        </div>
        <div style={{ color: SURFACE.muted, fontSize: 12, marginTop: 4, wordBreak: "break-word" }}>
          {summarizeDuration(step.duration)} · {summarizeIntensity(step.intensity)}
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 2, color: SURFACE.muted, marginBottom: 6 }}>STEP TYPE</div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
              {STEP_TYPES.map((type) => {
                const active = step.type === type;
                return (
                  <button
                    key={`${step.id}_type_${type}`}
                    onClick={() => callbacks.onChange((prev) => updateStepType(prev, type))}
                    style={{
                      minHeight: 44,
                      whiteSpace: "nowrap",
                      borderRadius: 999,
                      border: `1px solid ${active ? STEP_COLORS[type] || SURFACE.cyan : SURFACE.border}`,
                      background: active ? `${STEP_COLORS[type] || SURFACE.cyan}22` : "transparent",
                      color: active ? (STEP_COLORS[type] || SURFACE.cyan) : SURFACE.muted,
                      padding: "0 12px",
                      fontFamily: "'Space Mono',monospace",
                      fontSize: 10,
                      letterSpacing: 1,
                      cursor: "pointer",
                    }}
                  >
                    {toLabel(type)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 2, color: SURFACE.muted, marginBottom: 6 }}>DURATION</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px", gap: 8 }}>
              <select
                value={currentDurationType}
                onChange={(e) =>
                  callbacks.onChange((prev) => ({
                    ...prev,
                    duration: {
                      ...prev.duration,
                      type: e.target.value,
                      unit: unitsForDuration(e.target.value, activeConfig.defaultUnit)[0] || null,
                      value: e.target.value === "lap_button" || e.target.value === "open" ? null : prev.duration?.value ?? 10,
                    },
                  }))
                }
                style={{ ...inputStyle, minHeight: 44 }}
              >
                {durationTypes.map((type) => (
                  <option key={`${step.id}_dur_${type}`} value={type}>{toLabel(type)}</option>
                ))}
              </select>

              <input
                type="number"
                value={step.duration?.value ?? ""}
                disabled={currentDurationType === "lap_button" || currentDurationType === "open"}
                onChange={(e) => callbacks.onChange((prev) => ({ ...prev, duration: { ...prev.duration, value: e.target.value === "" ? "" : Number(e.target.value) } }))}
                style={{ ...inputStyle, minHeight: 44 }}
              />

              <select
                value={step.duration?.unit || ""}
                disabled={currentUnits.length === 0}
                onChange={(e) => callbacks.onChange((prev) => ({ ...prev, duration: { ...prev.duration, unit: e.target.value || null } }))}
                style={{ ...inputStyle, minHeight: 44 }}
              >
                {currentUnits.length === 0 ? <option value="">N/A</option> : currentUnits.map((u) => <option key={`${step.id}_u_${u}`} value={u}>{u.toUpperCase()}</option>)}
              </select>
            </div>
            {(activeConfig.distancePresets || []).length > 0 && currentDurationType === "distance" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {activeConfig.distancePresets.map((preset) => (
                  <button
                    key={`${step.id}_preset_${preset}`}
                    onClick={() => {
                      const parsed = parsePreset(preset);
                      if (!parsed) return;
                      callbacks.onChange((prev) => ({ ...prev, duration: { ...prev.duration, type: "distance", value: parsed.value, unit: parsed.unit } }));
                    }}
                    style={{ minHeight: 36, borderRadius: 999, border: `1px solid ${SURFACE.border}`, background: "transparent", color: SURFACE.muted, padding: "0 10px", fontFamily: "'Space Mono',monospace", fontSize: 10, cursor: "pointer" }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 2, color: SURFACE.muted, marginBottom: 6 }}>INTENSITY</div>
            <select
              value={step.intensity?.type || "none"}
              onChange={(e) => callbacks.onChange((prev) => ({ ...prev, intensity: { ...prev.intensity, type: e.target.value } }))}
              style={{ ...inputStyle, minHeight: 44, width: "100%" }}
            >
              {intensityTypes.map((type) => (
                <option key={`${step.id}_int_${type}`} value={type}>{toLabel(type)}</option>
              ))}
            </select>

            {(step.intensity?.type === "heart_rate_zone" || step.intensity?.type === "power_zone") && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 8, scrollbarWidth: "none", paddingBottom: 2 }}>
                {Array.from({ length: zoneMax }, (_, i) => i + 1).map((zone) => {
                  const active = Number(step.intensity?.zone || 2) === zone;
                  return (
                    <button
                      key={`${step.id}_zone_${zone}`}
                      onClick={() => callbacks.onChange((prev) => ({ ...prev, intensity: { ...prev.intensity, zone } }))}
                      style={{ minHeight: 40, minWidth: 52, borderRadius: 999, border: `1px solid ${active ? SURFACE.cyan : SURFACE.border}`, background: active ? `${SURFACE.cyan}22` : "transparent", color: active ? SURFACE.cyan : SURFACE.muted, fontFamily: "'Space Mono',monospace", fontSize: 10, cursor: "pointer" }}
                    >
                      Z{zone}
                    </button>
                  );
                })}
              </div>
            )}

            {(step.intensity?.type === "custom_hr" || step.intensity?.type === "custom_power" || step.intensity?.type === "pace" || step.intensity?.type === "cadence") && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <input
                  type="number"
                  value={step.intensity?.min ?? ""}
                  onChange={(e) => callbacks.onChange((prev) => ({ ...prev, intensity: { ...prev.intensity, min: e.target.value === "" ? null : Number(e.target.value) } }))}
                  placeholder="MIN"
                  style={{ ...inputStyle, minHeight: 44 }}
                />
                <input
                  type="number"
                  value={step.intensity?.max ?? ""}
                  onChange={(e) => callbacks.onChange((prev) => ({ ...prev, intensity: { ...prev.intensity, max: e.target.value === "" ? null : Number(e.target.value) } }))}
                  placeholder="MAX"
                  style={{ ...inputStyle, minHeight: 44 }}
                />
              </div>
            )}
          </div>

          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 2, color: SURFACE.muted, marginBottom: 6 }}>NOTES (OPTIONAL)</div>
            <textarea
              rows={nested ? 2 : 3}
              value={step.notes || ""}
              onChange={(e) => callbacks.onChange((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Stay conversational, nasal breathing"
              style={{ ...inputStyle, width: "100%", minHeight: 72, resize: "vertical" }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: SURFACE.bg,
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 2px", flexShrink: 0 }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.65)" }} />
      </div>

      <div style={{ position: "sticky", top: 0, zIndex: 2, borderBottom: `1px solid ${SURFACE.border}`, background: SURFACE.bg, padding: "10px 14px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <button onClick={onCancel} style={headerSecondaryButton}>CANCEL</button>
          <div style={{ color: SURFACE.text, fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 3 }}>EDIT WORKOUT</div>
          <button onClick={onSave} disabled={saving} style={headerPrimaryButton}>{saving ? "SAVING..." : "SAVE"}</button>
        </div>
        {state.sport && (
          <div style={{ marginTop: 8 }}>
            <span style={{ border: `1px solid ${SURFACE.cyan}66`, borderRadius: 999, padding: "4px 10px", fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 2, color: SURFACE.cyan }}>
              {(SPORT_CONFIG[state.sport]?.icon || "•")} {SPORT_CONFIG[state.sport]?.label || state.sport.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {status ? (
        <div style={{ padding: "8px 14px", color: status.startsWith("✓") ? SURFACE.green : SURFACE.red, fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: 2 }}>
          {status}
        </div>
      ) : null}

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {needsSport ? (
          <div style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 14, background: SURFACE.card, padding: 12 }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: 2, color: SURFACE.cyan, marginBottom: 10 }}>STEP 1 — PICK SPORT</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
              {sportOptions.map(([id, sport]) => (
                <button key={id} onClick={() => setSport(id)} style={sportChip(false)}>
                  {sport.icon} {sport.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
              {sportOptions.map(([id, sport]) => {
                const active = state.sport === id;
                return (
                  <button key={id} onClick={() => setSport(id)} style={sportChip(active)}>
                    {sport.icon} {sport.label}
                  </button>
                );
              })}
            </div>

            {(state.steps || []).map((step) => {
              const expanded = expandedId === step.id;
              if (step.type === "repeat") {
                return (
                  <div key={step.id} style={{ border: `1px solid ${SURFACE.border}`, borderLeft: `4px solid ${STEP_COLORS.repeat}`, borderRadius: 12, background: SURFACE.card, overflow: "hidden" }}>
                    <button onClick={() => setExpandedId(expanded ? null : step.id)} style={rowToggleStyle}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: SURFACE.text, letterSpacing: 2 }}>↻ REPEAT {step.count || 1} TIMES</div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStep(step.id);
                          }}
                          style={{ ...iconButton, color: SURFACE.red }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ marginTop: 4, textAlign: "left", color: SURFACE.muted, fontSize: 12, lineHeight: 1.4, wordBreak: "break-word" }}>
                        {(step.steps || []).map((child) => `● ${toLabel(child.type)}: ${summarizeDuration(child.duration)} · ${summarizeIntensity(child.intensity)}`).slice(0, 3).join("  ·  ")}
                      </div>
                    </button>

                    {expanded && (
                      <div style={{ padding: 12, borderTop: `1px solid ${SURFACE.border}`, display: "grid", gap: 10 }}>
                        <div>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 2, color: SURFACE.muted, marginBottom: 6 }}>REPEAT COUNT</div>
                          <input
                            type="number"
                            min={1}
                            value={step.count || 1}
                            onChange={(e) => updateStep(step.id, (prev) => ({ ...prev, count: Math.max(1, Number(e.target.value) || 1) }))}
                            style={{ ...inputStyle, minHeight: 44, width: 110 }}
                          />
                        </div>

                        {(step.steps || []).map((child) =>
                          renderStepEditor(
                            child,
                            {
                              onDelete: () => deleteRepeatChild(step.id, child.id),
                              onChange: (updater) => updateRepeatChild(step.id, child.id, updater),
                            },
                            true
                          )
                        )}

                        <button
                          onClick={() => updateStep(step.id, (prev) => ({ ...prev, steps: [...(prev.steps || []), defaultStep(state.sport, "work")] }))}
                          style={linkButton}
                        >
                          + ADD STEP TO REPEAT
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={step.id}>
                  <button onClick={() => setExpandedId(expanded ? null : step.id)} style={rowToggleStyleWithBorder(step.color)}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: SURFACE.text, letterSpacing: 2 }}>● {toLabel(step.type)}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStep(step.id);
                        }}
                        style={{ ...iconButton, color: SURFACE.red }}
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ marginTop: 4, textAlign: "left", color: SURFACE.muted, fontSize: 12, lineHeight: 1.4, wordBreak: "break-word" }}>
                      {summarizeDuration(step.duration)} · {summarizeIntensity(step.intensity)}
                    </div>
                  </button>
                  {expanded && (
                    <div style={{ marginTop: 8 }}>
                      {renderStepEditor(step, {
                        onDelete: () => deleteStep(step.id),
                        onChange: (updater) => updateStep(step.id, updater),
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={addStep} style={addButton}>+ ADD STEP</button>
              <button onClick={addRepeat} style={addButton}>+ ADD REPEAT</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: SURFACE.input,
  border: `1px solid ${SURFACE.border}`,
  borderRadius: 8,
  color: SURFACE.text,
  padding: "8px 12px",
  boxSizing: "border-box",
  outline: "none",
};

const headerSecondaryButton = {
  minHeight: 44,
  border: "none",
  background: "transparent",
  color: SURFACE.muted,
  padding: "0 4px",
  fontFamily: "'Space Mono',monospace",
  fontSize: 10,
  letterSpacing: 2,
  cursor: "pointer",
};

const headerPrimaryButton = {
  minHeight: 44,
  border: "none",
  background: SURFACE.cyan,
  color: "#000",
  borderRadius: 10,
  padding: "0 14px",
  fontFamily: "'Space Mono',monospace",
  fontSize: 10,
  letterSpacing: 2,
  cursor: "pointer",
  fontWeight: 700,
};

const sportChip = (active) => ({
  minHeight: 44,
  whiteSpace: "nowrap",
  borderRadius: 999,
  border: `1px solid ${active ? SURFACE.cyan : SURFACE.border}`,
  background: active ? `${SURFACE.cyan}22` : "transparent",
  color: active ? SURFACE.cyan : SURFACE.muted,
  padding: "0 12px",
  fontFamily: "'Space Mono',monospace",
  fontSize: 10,
  letterSpacing: 1,
  cursor: "pointer",
});

const rowToggleStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  textAlign: "left",
  padding: 12,
  cursor: "pointer",
  minHeight: 44,
};

const rowToggleStyleWithBorder = (color) => ({
  ...rowToggleStyle,
  border: `1px solid ${SURFACE.border}`,
  borderLeft: `4px solid ${color || STEP_COLORS.other}`,
  borderRadius: 12,
  background: SURFACE.card,
  overflow: "hidden",
});

const iconButton = {
  minHeight: 36,
  minWidth: 36,
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
};

const addButton = {
  minHeight: 44,
  borderRadius: 10,
  border: `1px dashed ${SURFACE.border}`,
  background: "transparent",
  color: SURFACE.cyan,
  fontFamily: "'Space Mono',monospace",
  fontSize: 10,
  letterSpacing: 2,
  cursor: "pointer",
};

const linkButton = {
  minHeight: 44,
  borderRadius: 10,
  border: "none",
  background: "transparent",
  color: SURFACE.cyan,
  fontFamily: "'Space Mono',monospace",
  fontSize: 10,
  letterSpacing: 2,
  textAlign: "left",
  cursor: "pointer",
  padding: 0,
};
