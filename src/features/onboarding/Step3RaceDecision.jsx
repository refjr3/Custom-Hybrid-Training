import { PrimaryButton, GlassCard } from "./shared/Inputs.jsx";

export default function Step3RaceDecision({ value, onChange, onNext, saving, error }) {
  const v = value || {};
  const intent = v.event_training_intent || "";

  const setIntent = (id) => {
    onChange({ ...v, event_training_intent: id });
  };

  const handleNext = () => {
    if (!intent) return;
    onNext({ ...v, event_training_intent: intent });
  };

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { id: "yes", title: "Yes, I have a race/event", body: "Search our catalog or enter manually." },
          { id: "no", title: "No, just training", body: "We will focus on performance without a fixed race." },
        ].map((o) => {
          const active = intent === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setIntent(o.id)}
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
      <PrimaryButton onClick={handleNext} disabled={!intent || saving}>
        {saving ? "Saving…" : "NEXT"}
      </PrimaryButton>
    </GlassCard>
  );
}
