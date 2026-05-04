import { GlassInput, PrimaryButton, GlassCard } from "./shared/Inputs.jsx";
import { EQUIPMENT_OPTIONS } from "./shared/equipmentOptions.js";

export default function Step7Environment({ value, onChange, onNext, saving, error }) {
  const v = value || {};
  const set = (patch) => onChange({ ...v, ...patch });
  const eq = Array.isArray(v.equipment_access) ? v.equipment_access : [];

  const toggleEq = (id) => {
    const next = eq.includes(id) ? eq.filter((x) => x !== id) : [...eq, id];
    set({ equipment_access: next });
  };

  const canNext = Boolean(v.training_environment);

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={labelStyle}>
        Where do you train? *
        <select
          value={v.training_environment || ""}
          onChange={(e) => set({ training_environment: e.target.value })}
          style={selectStyle}
        >
          <option value="" style={{ color: "#111" }}>
            Select…
          </option>
          <option value="home" style={{ color: "#111" }}>
            Home gym
          </option>
          <option value="commercial" style={{ color: "#111" }}>
            Commercial gym
          </option>
          <option value="both" style={{ color: "#111" }}>
            Both
          </option>
          <option value="outdoor" style={{ color: "#111" }}>
            Outdoor only
          </option>
        </select>
      </label>
      <div style={labelStyle}>
        <span>Equipment access</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {EQUIPMENT_OPTIONS.map((item) => (
            <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
              <input type="checkbox" checked={eq.includes(item.id)} onChange={() => toggleEq(item.id)} style={{ width: 16, height: 16 }} />
              {item.label}
            </label>
          ))}
        </div>
      </div>
      <label style={labelStyle}>
        Injuries or limitations (optional)
        <GlassInput value={v.injuries_limitations || ""} onChange={(e) => set({ injuries_limitations: e.target.value })} placeholder="Optional" />
      </label>
      {error ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div> : null}
      <PrimaryButton onClick={() => canNext && onNext(v)} disabled={!canNext || saving}>
        {saving ? "Saving…" : "NEXT"}
      </PrimaryButton>
    </GlassCard>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 11,
  letterSpacing: "0.8px",
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
};

const selectStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  padding: "10px 14px",
  color: "#fff",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 15,
  outline: "none",
};
