const WEEK = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "Th" },
  { key: "fri", label: "F" },
  { key: "sat", label: "Sa" },
  { key: "sun", label: "Su" },
];

const pill = {
  width: 40,
  height: 40,
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.65)",
  fontFamily: "'DM Sans', sans-serif",
};

export default function Step2Unavailable({
  unavailableDays,
  setUnavailableDays,
  daysPerWeek,
  onReduceDaysToAvailable,
  onClearUnavailable,
}) {
  const blockedCount = unavailableDays.length;
  const daysAvailable = 7 - blockedCount;
  const conflict = daysAvailable < daysPerWeek;

  const toggle = (key) => {
    setUnavailableDays((prev) => {
      const set = new Set(prev);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return [...set];
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
        {WEEK.map(({ key, label }) => {
          const on = unavailableDays.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              title={key}
              style={{
                ...pill,
                border: on ? "1px solid rgba(255,107,107,0.45)" : pill.border,
                background: on ? "rgba(255,107,107,0.12)" : pill.background,
                color: on ? "#FF8A6C" : pill.color,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {conflict ? (
        <div
          style={{
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.25)",
            borderRadius: 14,
            padding: "14px 16px",
            marginTop: 4,
            fontSize: 12,
            color: "#FF8A6C",
            lineHeight: 1.55,
          }}
        >
          You picked {daysPerWeek} days/week but blocked {blockedCount} weekday
          {blockedCount === 1 ? "" : "s"}. Want to train on one of those days or drop to {daysAvailable}/week?
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onReduceDaysToAvailable}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,138,108,0.35)",
                background: "rgba(255,255,255,0.06)",
                color: "#FFCCB0",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Change to {daysAvailable}/week
            </button>
            <button
              type="button"
              onClick={onClearUnavailable}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.2)",
                color: "rgba(255,255,255,0.75)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Let me rethink blocked days
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function step2NextDisabled({ unavailableDays, daysPerWeek }) {
  const blockedCount = unavailableDays.length;
  const daysAvailable = 7 - blockedCount;
  return daysAvailable < daysPerWeek;
}
