import { GlassSelect, PrimaryButton, GlassCard } from "./shared/Inputs.jsx";

const EXPERIENCE = [
  { value: "beginner", label: "Beginner — <1 yr" },
  { value: "intermediate", label: "Intermediate — 1–3 yr" },
  { value: "advanced", label: "Advanced — 3–5 yr" },
  { value: "elite", label: "Elite — 5 yr+" },
];

const HOURS = [
  { key: "3-5", label: "3–5" },
  { key: "5-8", label: "5–8" },
  { key: "8-12", label: "8–12" },
  { key: "12+", label: "12+" },
];

export default function Step6Capacity({ value, onChange, onNext, saving, error }) {
  const v = value || {};
  const set = (k, x) => onChange({ ...v, [k]: x });

  const canNext =
    v.training_experience &&
    v.highest_competitive_level &&
    v.weekly_hours_key &&
    v.sessions_per_day &&
    v.days_per_week;

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={labelStyle}>
        Training experience *
        <GlassSelect value={v.training_experience || ""} onChange={(e) => set("training_experience", e.target.value)}>
          <option value="" style={{ color: "#111" }}>
            Select…
          </option>
          {EXPERIENCE.map((e) => (
            <option key={e.value} value={e.value} style={{ color: "#111" }}>
              {e.label}
            </option>
          ))}
        </GlassSelect>
      </label>
      <label style={labelStyle}>
        Highest competitive level *
        <GlassSelect value={v.highest_competitive_level || ""} onChange={(e) => set("highest_competitive_level", e.target.value)}>
          <option value="" style={{ color: "#111" }}>
            Select…
          </option>
          {["never", "local", "regional", "national", "international", "pro"].map((x) => (
            <option key={x} value={x} style={{ color: "#111" }}>
              {x === "never" ? "Never competed" : x.charAt(0).toUpperCase() + x.slice(1)}
            </option>
          ))}
        </GlassSelect>
      </label>
      <div style={labelStyle}>
        <span>Hours per week *</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {HOURS.map((h) => (
            <button
              key={h.key}
              type="button"
              onClick={() => set("weekly_hours_key", h.key)}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: v.weekly_hours_key === h.key ? "1px solid rgba(201,168,117,0.55)" : "1px solid rgba(255,255,255,0.1)",
                background: v.weekly_hours_key === h.key ? "rgba(201,168,117,0.15)" : "rgba(255,255,255,0.06)",
                color: v.weekly_hours_key === h.key ? "#C9A875" : "rgba(255,255,255,0.7)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>
      <label style={labelStyle}>
        Sessions per day *
        <GlassSelect value={v.sessions_per_day || ""} onChange={(e) => set("sessions_per_day", e.target.value)}>
          <option value="" style={{ color: "#111" }}>
            Select…
          </option>
          <option value="1" style={{ color: "#111" }}>
            1
          </option>
          <option value="2" style={{ color: "#111" }}>
            2
          </option>
          <option value="flexible" style={{ color: "#111" }}>
            Flexible
          </option>
        </GlassSelect>
      </label>
      <label style={labelStyle}>
        Days per week *
        <GlassSelect value={v.days_per_week || ""} onChange={(e) => set("days_per_week", e.target.value)}>
          <option value="" style={{ color: "#111" }}>
            Select…
          </option>
          {["3", "4", "5", "6", "7"].map((d) => (
            <option key={d} value={d} style={{ color: "#111" }}>
              {d}
            </option>
          ))}
        </GlassSelect>
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
