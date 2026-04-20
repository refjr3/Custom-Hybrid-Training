import { PrimaryButton, GlassCard } from "./shared/Inputs.jsx";

const OPTIONS = [
  { id: "hybrid", title: "Hybrid (strength + endurance)", body: "Lift and log real endurance work." },
  { id: "strength", title: "Strength-focused (lifting primary)", body: "Barbell and accessories first." },
  { id: "endurance", title: "Endurance-focused (running, cycling, swimming)", body: "Aerobic base and race pace work." },
  { id: "crossfit", title: "CrossFit / functional fitness", body: "Varied high-intensity mixed modal." },
  { id: "bodybuilding", title: "Bodybuilding / physique", body: "Hypertrophy and composition." },
  { id: "returning", title: "Returning from injury or break", body: "We will prioritize smart progressions." },
  { id: "beginner", title: "Just getting started", body: "Foundations and consistency first." },
];

/** Maps card id → `primary_focus` + `performance_type` (027 columns). */
export function trainingStyleToProfile(styleId) {
  const id = String(styleId || "");
  if (id === "bodybuilding") return { primary_focus: "composition", performance_type: "bodybuilding_physique" };
  if (id === "returning") return { primary_focus: "return", performance_type: null };
  const perfMap = {
    hybrid: "hybrid",
    strength: "pure_strength",
    endurance: "pure_endurance",
    crossfit: "crossfit_style",
    beginner: "beginner",
  };
  return { primary_focus: "performance", performance_type: perfMap[id] || "hybrid" };
}

export default function Step2TrainingStyle({ value, onChange, onNext, saving, error }) {
  const selected = value?.training_style_id || "";

  const set = (k, v) => onChange({ ...value, [k]: v });

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {OPTIONS.map((o) => {
          const active = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => set("training_style_id", o.id)}
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
      <PrimaryButton onClick={() => selected && onNext(value)} disabled={!selected || saving}>
        {saving ? "Saving…" : "NEXT"}
      </PrimaryButton>
    </GlassCard>
  );
}
