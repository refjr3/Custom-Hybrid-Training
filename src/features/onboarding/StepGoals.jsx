import { GlassInput, PrimaryButton, GlassCard, Pill } from "./shared/Inputs.jsx";

const SPORTS = [
  { id: "HYROX", label: "HYROX" },
  { id: "TRIATHLON", label: "Triathlon" },
  { id: "RUNNING", label: "Running" },
  { id: "CYCLING", label: "Cycling" },
  { id: "STRENGTH", label: "Strength" },
  { id: "HYBRID", label: "Hybrid" },
];

const HOURS = [
  { key: "3-5", label: "3–5", value: 4 },
  { key: "5-8", label: "5–8", value: 6.5 },
  { key: "8-12", label: "8–12", value: 10 },
  { key: "12+", label: "12+", value: 14 },
];

export default function StepGoals({ value, onChange, onNext, saving, error }) {
  const set = (k, v) => onChange({ ...value, [k]: v });

  const toggleSport = (id) => {
    const cur = Array.isArray(value.sports) ? value.sports : [];
    const next = cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id];
    set("sports", next);
  };

  const canNext = Array.isArray(value.sports) && value.sports.length > 0 && value.weekly_hours_key;

  const noRace = Boolean(value.no_race);
  const showRace = !noRace;

  const handleNext = () => {
    if (!canNext) return;
    const hoursRow = HOURS.find((h) => h.key === value.weekly_hours_key);
    onNext({
      ...value,
      weekly_training_hours: hoursRow?.value ?? null,
      target_race_name: noRace ? null : value.target_race_name || null,
      target_race_date: noRace ? null : value.target_race_date || null,
    });
  };

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={sectionLabel}>Primary sport *</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SPORTS.map((s) => (
            <Pill key={s.id} selected={Array.isArray(value.sports) && value.sports.includes(s.id)} onClick={() => toggleSport(s.id)}>
              {s.label}
            </Pill>
          ))}
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
        <input type="checkbox" checked={noRace} onChange={(e) => set("no_race", e.target.checked)} style={{ width: 16, height: 16 }} />
        No upcoming race
      </label>

      {showRace ? (
        <>
          <label style={labelCol}>
            Target race name
            <GlassInput value={value.target_race_name || ""} onChange={(e) => set("target_race_name", e.target.value)} placeholder="Optional" />
          </label>
          <label style={labelCol}>
            Target race date
            <GlassInput type="date" value={value.target_race_date || ""} onChange={(e) => set("target_race_date", e.target.value)} />
          </label>
        </>
      ) : null}

      <div>
        <div style={sectionLabel}>Weekly training hours *</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {HOURS.map((h) => (
            <Pill key={h.key} selected={value.weekly_hours_key === h.key} onClick={() => set("weekly_hours_key", h.key)}>
              {h.label}
            </Pill>
          ))}
        </div>
      </div>

      {error ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div> : null}

      <PrimaryButton onClick={handleNext} disabled={!canNext || saving}>
        {saving ? "Saving…" : "NEXT"}
      </PrimaryButton>
    </GlassCard>
  );
}

const sectionLabel = {
  fontSize: 11,
  letterSpacing: "0.8px",
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
  marginBottom: 8,
};

const labelCol = { display: "flex", flexDirection: "column", gap: 6, fontSize: 11, letterSpacing: "0.6px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" };
