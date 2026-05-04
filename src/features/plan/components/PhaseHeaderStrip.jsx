export function PhaseHeaderStrip({
  currentPhaseName,
  currentWeekOrder,
  totalWeeks,
  raceDate,
  onTapBlockView,
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
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "14px 18px",
        cursor: "pointer",
        textAlign: "left",
        marginBottom: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(201,168,117,0.6)",
              letterSpacing: "2.5px",
              marginBottom: 4,
              textTransform: "uppercase",
            }}
          >
            WEEK {currentWeekOrder || "—"} OF {totalWeeks || "—"}
          </div>
          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 17,
              color: "#fff",
              letterSpacing: "-0.3px",
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
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  letterSpacing: "1.5px",
                  marginBottom: 2,
                  textTransform: "uppercase",
                }}
              >
                RACE IN
              </div>
              <div style={{ fontSize: 16, color: "#C9A875", fontWeight: 600 }}>
                {daysToRace} days
              </div>
            </>
          ) : null}
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
        Tap for full block →
      </div>
    </button>
  );
}
