import { getSessionIntent } from "./intentConfig.js";

export function DayCard({ day, isToday, isPast, onTap }) {
  const amIntent = getSessionIntent(day?.am_session_type, day?.am_session);
  const pmIntent = day?.pm_session ? getSessionIntent(day?.pm_session_type, day?.pm_session) : null;
  const isRest = !day?.am_session || String(day.am_session).toLowerCase() === "rest";

  if (isPast) {
    return (
      <button
        type="button"
        onClick={onTap}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 8,
          opacity: 0.65,
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "1px",
                marginBottom: 2,
              }}
            >
              {String(day?.date_label || "").toUpperCase()}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              {isRest ? "Rest" : day?.am_session}
            </div>
          </div>
          {day?.am_completed_at ? (
            <div style={{ fontSize: 11, color: "rgba(120,200,180,0.7)" }}>✓ Done</div>
          ) : null}
        </div>
      </button>
    );
  }

  if (isRest) {
    return (
      <div
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: "14px 18px",
          marginBottom: 10,
          opacity: 0.5,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "1.5px",
            marginBottom: 3,
          }}
        >
          {String(day?.date_label || "").toUpperCase()}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Rest</div>
      </div>
    );
  }

  const cardBg = amIntent.bgTint;
  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        width: "100%",
        background: cardBg,
        border: `1px solid ${isToday ? amIntent.color : amIntent.borderTint}`,
        borderRadius: 18,
        padding: "18px 20px",
        marginBottom: 10,
        cursor: "pointer",
        textAlign: "left",
        position: "relative",
        boxShadow: isToday ? `0 0 0 1px ${amIntent.color}, 0 8px 24px rgba(0,0,0,0.3)` : "none",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {isToday ? (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 16,
            fontSize: 9,
            fontWeight: 700,
            color: amIntent.color,
            letterSpacing: "2px",
          }}
        >
          TODAY
        </div>
      ) : null}

      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "1.5px",
          marginBottom: 8,
        }}
      >
        {String(day?.date_label || "").toUpperCase()}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: amIntent.color, letterSpacing: "2.5px" }}>
          {String(amIntent.label || "").toUpperCase()}
        </div>
        {day?.is_user_modified ? <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>✏️</div> : null}
      </div>

      <div
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 18,
          color: "#fff",
          letterSpacing: "-0.2px",
          lineHeight: 1.25,
          marginBottom: pmIntent ? 12 : 4,
        }}
      >
        {day?.am_session}
      </div>

      {pmIntent ? (
        <div
          style={{
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: pmIntent.color,
              letterSpacing: "2.5px",
              marginBottom: 4,
            }}
          >
            PM · {String(pmIntent.label || "").toUpperCase()}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
            {day?.pm_session}
          </div>
        </div>
      ) : null}

      {day?.am_completed_at ? (
        <div style={{ marginTop: 10, fontSize: 11, color: "rgba(120,200,180,0.7)" }}>✓ Completed</div>
      ) : null}
    </button>
  );
}
