const DAY_OPTIONS = [3, 4, 5, 6, 7];

const pillBase = {
  flex: 1,
  minWidth: 0,
  padding: "14px 8px",
  borderRadius: 14,
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.75)",
  fontFamily: "'DM Sans', sans-serif",
  transition: "border 0.2s, background 0.2s, color 0.2s",
};

export default function Step1Days({ daysPerWeek, setDaysPerWeek, flexibility, setFlexibility }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {DAY_OPTIONS.map((n) => {
          const selected = daysPerWeek === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setDaysPerWeek(n)}
              style={{
                ...pillBase,
                border: selected ? "1px solid rgba(201,168,117,0.55)" : pillBase.border,
                background: selected ? "rgba(201,168,117,0.12)" : pillBase.background,
                color: selected ? "#C9A875" : pillBase.color,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "16px 18px",
        }}
      >
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>This schedule is…</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["strict", "flexible"].map((opt) => {
            const selected = flexibility === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setFlexibility(opt)}
                style={{
                  flex: 1,
                  padding: "12px 10px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: selected ? "1px solid rgba(201,168,117,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  background: selected ? "rgba(201,168,117,0.1)" : "rgba(0,0,0,0.2)",
                  color: selected ? "#C9A875" : "rgba(255,255,255,0.55)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {opt === "strict" ? "Keep it strict" : "I'm flexible"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
