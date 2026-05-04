function formatRaceDate(date) {
  if (!date) return "";
  const parsed = new Date(`${String(date).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PhaseHeaderStrip({
  currentPhaseName,
  currentWeekOrder,
  totalWeeks,
  raceDate,
  onTapBlockView,
  isDeloadWeek = false,
  currentWeekInPhase = 1,
  phaseTotalWeeks = 1,
  phaseProgressPercent = 0,
  phaseStatusLabel = "",
  phaseGradient = "linear-gradient(90deg, rgba(201,168,117,0.6) 0%, #C9A875 100%)",
}) {
  const now = new Date();
  const nowMidday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0,
  );
  const raceMidday = raceDate ? new Date(`${String(raceDate).slice(0, 10)}T12:00:00`) : null;
  const daysToRace =
    raceMidday && !Number.isNaN(raceMidday.getTime())
      ? Math.max(0, Math.round((raceMidday.getTime() - nowMidday.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

  return (
    <button
      type="button"
      onClick={onTapBlockView}
      style={{
        width: "100%",
        background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(201,168,117,0.2)",
        borderRadius: 16,
        padding: "14px 18px",
        cursor: "pointer",
        textAlign: "left",
        marginBottom: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 500,
              color: "rgba(201,168,117,0.65)",
              letterSpacing: "2px",
              marginBottom: 4,
              textTransform: "uppercase",
            }}
          >
            WEEK {currentWeekOrder || "—"} OF {totalWeeks || "—"}
            {isDeloadWeek ? " · DELOAD" : ""}
          </div>
          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 19,
              color: "#fff",
              letterSpacing: "-0.3px",
              marginTop: 4,
            }}
          >
            {currentPhaseName || "Current Block"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {daysToRace !== null ? (
            <>
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.4)",
                  letterSpacing: "1.5px",
                  fontWeight: 500,
                  marginBottom: 2,
                  textTransform: "uppercase",
                }}
              >
                RACE IN
              </div>
              <div style={{ fontSize: 14, color: "#C9A875", fontWeight: 500, marginTop: 3 }}>{daysToRace}d</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                {formatRaceDate(raceDate)}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "0.5px solid rgba(201,168,117,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "1.5px",
              fontWeight: 500,
              textTransform: "uppercase",
            }}
          >
            PHASE PROGRESS
          </span>
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {phaseStatusLabel}
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(0, Math.min(100, Number(phaseProgressPercent) || 0))}%`,
              background: phaseGradient,
              borderRadius: 3,
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
        Tap for full block →
      </div>
    </button>
  );
}
