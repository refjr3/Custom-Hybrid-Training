import { createPortal } from "react-dom";

function dayAbbrev(dayName) {
  return String(dayName || "").trim().slice(0, 3).toUpperCase();
}

export function ComplianceDetailModal({
  onClose,
  currentWeekLabel,
  currentWeekDays,
  recentWeeks,
  completionResolver,
  onNavigateToDay,
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          border: "none",
          background: "rgba(0,0,0,0.72)",
          zIndex: 13990,
          cursor: "pointer",
        }}
        aria-label="Close compliance details"
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          inset: "8% 4%",
          zIndex: 14000,
          background: "linear-gradient(180deg, #17191D 0%, #0D0E10 100%)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 16,
          padding: "14px 14px 16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "rgba(201,168,117,0.72)", letterSpacing: "2px", fontWeight: 600 }}>
            COMPLIANCE DETAILS
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.7)",
              width: 28,
              height: 28,
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ overflowY: "auto", paddingRight: 2 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "1.6px", marginBottom: 8 }}>
              THIS WEEK · {currentWeekLabel || "Current Week"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(currentWeekDays || []).map((day, idx) => {
                const state = completionResolver?.(day) || { complete: false };
                return (
                  <div
                    key={day?.id || `${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      border: "0.5px solid rgba(255,255,255,0.07)",
                      borderRadius: 10,
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ minWidth: 42, fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "1.2px" }}>
                      {dayAbbrev(day?.day_name || day?.day)}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.9)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {day?.am_session || "Rest"}
                    </div>
                    <div style={{ fontSize: 11, color: state.complete ? "rgba(120,200,180,0.9)" : "rgba(255,255,255,0.35)" }}>
                      {state.complete ? "✓" : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "1.6px", marginBottom: 8 }}>
              LAST 4 WEEKS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(recentWeeks || []).map((row) => (
                <div
                  key={row.week?.id || row.week?.week_order}
                  style={{
                    border: "0.5px solid rgba(255,255,255,0.07)",
                    borderRadius: 10,
                    padding: "8px 9px",
                    background: row.isCurrent ? "rgba(201,168,117,0.06)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>
                      {row.week?.label || `Week ${row.week?.week_order || "—"}`}
                    </span>
                    <span style={{ fontSize: 10, color: "rgba(120,200,180,0.9)", fontVariantNumeric: "tabular-nums" }}>
                      {row.completed}/{row.planned}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
                    {(row.days || []).map((day, idx) => {
                      const state = completionResolver?.(day) || { complete: false };
                      const isRest = !day?.am_session || /^rest$/i.test(String(day?.am_session || ""));
                      return (
                        <button
                          key={day?.id || `${row.week?.id}_${idx}`}
                          type="button"
                          disabled={row.isCurrent}
                          onClick={() => {
                            onNavigateToDay?.(row.week?.id, idx);
                            onClose?.();
                          }}
                          style={{
                            border: "0.5px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.02)",
                            borderRadius: 6,
                            padding: "5px 0 4px",
                            opacity: isRest ? 0.45 : 1,
                            cursor: row.isCurrent ? "default" : "pointer",
                            color: "rgba(255,255,255,0.7)",
                            fontSize: 8,
                          }}
                        >
                          <div>{dayAbbrev(day?.day_name || day?.day).slice(0, 1)}</div>
                          <div style={{ marginTop: 1, color: state.complete ? "rgba(120,200,180,0.9)" : "rgba(255,255,255,0.45)" }}>
                            {state.complete ? "✓" : "•"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
          Sessions auto-marked complete when matching activity is detected from Garmin or Strava.
        </div>
      </div>
    </>,
    document.body,
  );
}

