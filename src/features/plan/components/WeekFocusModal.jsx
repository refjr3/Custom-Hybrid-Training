import { createPortal } from "react-dom";

export function WeekFocusModal({
  phaseName,
  weekLabel,
  weekType,
  focusText,
  keySessions,
  nextWeekPreview,
  onClose,
}) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 13100,
        background: "rgba(0,0,0,0.74)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "rgba(18,18,22,0.98)",
          border: "0.5px solid rgba(255,255,255,0.12)",
          borderRadius: 18,
          padding: "16px 16px 18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: "2px", color: "rgba(201,168,117,0.7)", fontWeight: 600 }}>
            WEEK FOCUS
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.6px", marginBottom: 8 }}>
          {String(phaseName || "Training").toUpperCase()} · {weekLabel || "Current week"} · {String(weekType || "STANDARD").toUpperCase()}
        </div>

        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 23,
            color: "#fff",
            letterSpacing: "-0.4px",
            lineHeight: 1.25,
            marginBottom: 14,
          }}
        >
          {focusText || "Stay consistent with the plan. Trust the periodization."}
        </div>

        <div style={{ fontSize: 9, letterSpacing: "1.6px", color: "rgba(255,255,255,0.42)", marginBottom: 8 }}>
          KEY SESSIONS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {(keySessions || []).length ? (
            keySessions.map((item, idx) => (
              <div
                key={`${item.day}_${idx}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "0.5px solid rgba(255,255,255,0.07)",
                }}
              >
                <span style={{ fontSize: 10, color: "rgba(201,168,117,0.9)", letterSpacing: "1px", minWidth: 44 }}>
                  {String(item.day || "").toUpperCase()}
                </span>
                <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.82)" }}>{item.session}</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>No key sessions detected.</div>
          )}
        </div>

        <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.09)", paddingTop: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: "1.5px", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
            NEXT WEEK
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", lineHeight: 1.4 }}>
            {nextWeekPreview || "Stay consistent with the plan. Trust the periodization."}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

