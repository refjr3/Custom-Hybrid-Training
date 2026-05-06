function formatRaceDate(date) {
  if (!date) return "";
  const parsed =
    date instanceof Date
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)
      : new Date(`${String(date).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PhaseHeaderStrip({
  currentPhaseName,
  currentWeekOrder,
  totalWeeks,
  raceDate,
  raceName,
  daysToRace = null,
  onTapBlockView,
  currentWeekInPhase = 1,
  phaseTotalWeeks = 1,
  isDeloadWeek = false,
}) {
  const raceDateFormatted = formatRaceDate(raceDate);
  const raceNameLabel = String(raceName || "").trim();
  const weekInPhase = Number(currentWeekInPhase) || Number(currentWeekOrder) || 1;
  const weekCount = Number(phaseTotalWeeks) || Number(totalWeeks) || 1;
  const raceCountdownLabel = daysToRace != null ? `${daysToRace}d` : null;

  return (
    <button
      type="button"
      onClick={onTapBlockView}
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        padding: "14px 4px 12px",
        marginBottom: 2,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, minWidth: 0 }}>
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.85)",
              fontWeight: 500,
              letterSpacing: "-0.1px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {currentPhaseName || "Current Block"}
            {isDeloadWeek ? " · Deload" : ""}
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>·</span>
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            Wk {weekInPhase} of {weekCount}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
          {raceCountdownLabel ? (
            <span
              style={{
                fontSize: 11,
                color: "#C9A875",
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {raceCountdownLabel}
            </span>
          ) : null}
          {raceCountdownLabel && (raceNameLabel || raceDateFormatted) ? (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>·</span>
          ) : null}
          {raceNameLabel ? (
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
                fontWeight: 500,
                minWidth: 0,
                maxWidth: "60%",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={raceNameLabel}
            >
              {raceNameLabel}
            </span>
          ) : null}
          {raceNameLabel && raceDateFormatted ? (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>·</span>
          ) : null}
          {raceDateFormatted ? (
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {raceDateFormatted}
            </span>
          ) : null}
        </div>
      </div>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>→</span>
    </button>
  );
}
