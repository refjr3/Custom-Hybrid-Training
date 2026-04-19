import { PrimaryButton, GlassCard } from "./shared/Inputs.jsx";

const OPTIONS = [
  {
    id: "competing",
    title: "Competing",
    body: "Training for a specific event or race",
  },
  {
    id: "performance",
    title: "Performance",
    body: "Getting fitter without a specific race",
  },
  {
    id: "composition",
    title: "Composition",
    body: "Body recomp — lose fat, build muscle",
  },
  {
    id: "return",
    title: "Return",
    body: "Coming back from injury, break, or life event",
  },
];

export default function Step2Focus({ value, onChange, onNext, saving, error }) {
  const selected = value?.primary_focus || "";

  const set = (k, v) => onChange({ ...value, [k]: v });

  const handleNext = () => {
    if (!selected) return;
    onNext({ ...value, primary_focus: selected });
  };

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {OPTIONS.map((o) => {
          const active = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => set("primary_focus", o.id)}
              style={{
                textAlign: "left",
                padding: "16px 18px",
                borderRadius: 18,
                border: active ? "1px solid rgba(201,168,117,0.55)" : "1px solid rgba(255,255,255,0.1)",
                background: active ? "rgba(201,168,117,0.12)" : "rgba(255,255,255,0.04)",
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: active ? "#C9A875" : "#fff" }}>{o.title}</div>
              <div style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,0.42)" }}>{o.body}</div>
            </button>
          );
        })}
      </div>

      {error ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div> : null}

      <PrimaryButton onClick={handleNext} disabled={!selected || saving}>
        {saving ? "Saving…" : "NEXT"}
      </PrimaryButton>
    </GlassCard>
  );
}
