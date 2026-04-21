const OPTIONS = [
  {
    key: "get_stronger",
    title: "Get stronger",
    description: "Primary emphasis on strength work",
  },
  {
    key: "build_endurance",
    title: "Build endurance",
    description: "Primary emphasis on aerobic capacity",
  },
  {
    key: "lose_weight",
    title: "Lose weight",
    description: "Calorie-burning focus with sustainable progression",
  },
  {
    key: "get_consistent",
    title: "Just get consistent",
    description: "Easy re-entry, low pressure",
  },
  {
    key: "train_for_race",
    title: "Train for a race",
    description: "Race-specific prep",
  },
];

const cardBase = {
  textAlign: "left",
  padding: "16px 18px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.03)",
  cursor: "pointer",
  transition: "border 0.2s, background 0.2s",
};

export default function Step3Focus({ mainFocus, setMainFocus, raceOnProfile }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {OPTIONS.map(({ key, title, description }) => {
        const selected = mainFocus === key;
        const hintRace = key === "train_for_race" && raceOnProfile;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setMainFocus(key)}
            style={{
              ...cardBase,
              border: selected ? "1px solid rgba(201,168,117,0.5)" : cardBase.border,
              background: selected ? "rgba(201,168,117,0.08)" : cardBase.background,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: selected ? "#C9A875" : "#fff", marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,0.45)" }}>{description}</div>
            {hintRace ? (
              <div style={{ marginTop: 8, fontSize: 11, color: "rgba(201,168,117,0.75)" }}>We see a race on your profile — selected as a starting point; change anytime.</div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
