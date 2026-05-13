import { getPhaseNarrative } from "../phaseNarratives.js";

function clampPercent(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export default function PhaseProgressCardV2({
  phaseName,
  weekOfPhase,
  totalWeeksInPhase,
  dayOfPhase,
  totalDaysInPhase,
  progressPercent,
  completedCount,
  plannedSessions,
  daysToRace,
}) {
  const narrative = getPhaseNarrative(phaseName);
  const pct = clampPercent(progressPercent);
  const safeDay = Math.max(0, Number(dayOfPhase || 0));
  const safeTotalDays = Math.max(0, Number(totalDaysInPhase || 0));
  const safeWeekOfPhase = Math.max(1, Number(weekOfPhase || 1));
  const safeTotalWeeks = Math.max(1, Number(totalWeeksInPhase || 1));
  const safeCompleted = Math.max(0, Number(completedCount || 0));
  const safePlanned = Math.max(0, Number(plannedSessions || 0));
  const safeDaysToRace = Number.isFinite(Number(daysToRace)) ? Math.max(0, Number(daysToRace)) : 0;

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18,
        padding: 18,
        marginTop: 18,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "rgba(255,255,255,0.55)",
            fontWeight: 600,
          }}
        >
          PHASE PROGRESS
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "rgba(255,255,255,0.4)",
            fontWeight: 600,
            textAlign: "right",
          }}
        >
          {`DAY ${safeDay} OF ${safeTotalDays}`}
        </div>
      </div>

      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 18,
          lineHeight: 1.2,
          color: "rgba(255,255,255,0.95)",
          marginTop: 10,
          marginBottom: 6,
        }}
      >
        {phaseName || "Current Phase"}
      </div>

      {narrative ? (
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 13,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.5,
            marginBottom: 16,
          }}
        >
          {narrative}
        </div>
      ) : null}

      <div
        style={{
          height: 6,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 3,
            background: "linear-gradient(90deg, #D4A953, #E8DCC4)",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 8,
          marginBottom: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            fontWeight: 600,
            color: "#D4A953",
          }}
        >
          {`${Math.round(pct)}%`}
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
            textAlign: "right",
          }}
        >
          {`WK ${safeWeekOfPhase} OF ${safeTotalWeeks}`}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {[
          { value: safeCompleted, label: "DONE", valueColor: "#D4A953" },
          { value: safePlanned, label: "PLANNED", valueColor: "rgba(255,255,255,0.92)" },
          { value: safeDaysToRace, label: "D TO DC", valueColor: "rgba(255,255,255,0.92)" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#0A0A0A",
              padding: "11px 8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 20,
                lineHeight: 1,
                marginBottom: 4,
                color: stat.valueColor,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.16em",
                color: "rgba(255,255,255,0.45)",
                fontWeight: 600,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
