import { PrimaryButton, SecondaryButton, GlassCard, Pill } from "./shared/Inputs.jsx";

const OPTIONS = [
  "Maintain strength while doing endurance",
  "Build muscle while training for event",
  "Lose fat",
  "Improve a weak discipline",
  "Stay injury-free",
  "Improve sleep and recovery",
  "Improve pace / speed",
  "Improve mobility",
];

export default function Step5Secondary({ value, onChange, onNext, saving, error }) {
  const arr = Array.isArray(value?.secondary_goals) ? value.secondary_goals : [];

  const toggle = (label) => {
    const next = arr.includes(label) ? arr.filter((x) => x !== label) : [...arr, label];
    onChange({ ...value, secondary_goals: next });
  };

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>Optional — pick any that apply.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {OPTIONS.map((o) => (
          <Pill key={o} selected={arr.includes(o)} onClick={() => toggle(o)}>
            {o}
          </Pill>
        ))}
      </div>
      {error ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <PrimaryButton onClick={() => onNext(value)} disabled={saving}>
          {saving ? "Saving…" : "NEXT"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => onNext({ ...value, secondary_goals: [] })} disabled={saving}>
          Skip
        </SecondaryButton>
      </div>
    </GlassCard>
  );
}
