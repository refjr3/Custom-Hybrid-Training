import { getSessionIntent } from "./intentConfig.js";

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function normalizeDayName(day) {
  const raw = String(day?.day_name || day?.day || "").trim().toUpperCase();
  if (!raw) return "";
  return raw.slice(0, 3);
}

function orderDays(days) {
  const rows = Array.isArray(days) ? [...days] : [];
  rows.sort((a, b) => DAY_ORDER.indexOf(normalizeDayName(a)) - DAY_ORDER.indexOf(normalizeDayName(b)));
  return rows;
}

function weekTypeStyles(type) {
  const key = String(type || "STANDARD").trim().toUpperCase();
  if (key === "BRICK") {
    return { color: "#FF8A6C", background: "rgba(255,138,108,0.14)" };
  }
  if (key === "DELOAD") {
    return { color: "rgba(120,200,180,0.95)", background: "rgba(120,200,180,0.14)" };
  }
  return { color: "#C9A875", background: "rgba(201,168,117,0.14)" };
}

function parseDurationFromSessionName(sessionName) {
  const text = String(sessionName || "");
  const m = text.match(/(\d+(?:\.\d+)?)\s*(min|mins|minutes|hr|hrs|hour|hours)\b/i);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = String(m[2] || "").toLowerCase();
  if (unit.startsWith("hr")) {
    const mins = Math.round(value * 60);
    return `${mins} min`;
  }
  return `${Math.round(value)} min`;
}

function durationForDay(day) {
  const blocks = Array.isArray(day?.am_session_blocks) ? day.am_session_blocks : [];
  const blockMinutes = blocks.reduce((sum, block) => {
    const n = Number(block?.duration_min);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
  if (blockMinutes > 0) return `${Math.round(blockMinutes)} min`;
  return parseDurationFromSessionName(day?.am_session || day?.am);
}

function weekTypeFromNotes(days, fallbackType) {
  const fallback = String(fallbackType || "STANDARD").trim().toUpperCase() || "STANDARD";
  for (const day of days || []) {
    const note = String(day?.note ?? day?.note2a ?? "");
    const match = note.match(/WEEK\s*TYPE\s*:\s*(BRICK|STANDARD|DELOAD)\b/i);
    if (match) return String(match[1]).toUpperCase();
  }
  return fallback;
}

export function WeeklyStructureSnapshot({
  days,
  todayDayIndex = null,
  weekType,
}) {
  const orderedDays = orderDays(days);
  const resolvedWeekType = weekTypeFromNotes(orderedDays, weekType);
  const weekTypeTone = weekTypeStyles(resolvedWeekType);

  return (
    <div style={{ marginTop: 24, marginBottom: 16 }}>
      <div
        style={{
          fontSize: 9,
          color: "rgba(255,255,255,0.45)",
          letterSpacing: "2px",
          fontWeight: 500,
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span>THIS WEEK</span>
        <span
          style={{
            fontSize: 8,
            color: weekTypeTone.color,
            letterSpacing: "1.6px",
          }}
        >
          {resolvedWeekType}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {DAY_ORDER.map((dayKey, i) => {
          const day = orderedDays.find((d) => normalizeDayName(d) === dayKey) || {
            id: `placeholder_${dayKey}`,
            day_name: dayKey,
            am_session: null,
            am_completed_at: null,
          };
          const intent = getSessionIntent(day?.am_session_type, day?.am_session);
          const isToday = Number.isInteger(todayDayIndex) && i === Number(todayDayIndex);
          const isRest = !day?.am_session || /^rest$/i.test(String(day?.am_session));
          const isDone = Boolean(day?.am_completed_at);
          const dotColor = isRest ? "rgba(255,255,255,0.15)" : intent.color;

          return (
            <div
              key={day.id || `${dayKey}_${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 0",
                gap: 10,
                borderBottom: i < 6 ? "0.5px solid rgba(255,255,255,0.05)" : "none",
                ...(isToday && {
                  paddingLeft: 5,
                  paddingRight: 5,
                  margin: "0 -5px",
                  background: "rgba(201,168,117,0.05)",
                  borderRadius: 8,
                  borderBottom: "transparent",
                }),
              }}
            >
              <span
                style={{
                  width: 30,
                  flexShrink: 0,
                  fontSize: 9,
                  fontWeight: isToday ? 600 : 500,
                  color: isToday ? "#C9A875" : "rgba(255,255,255,0.45)",
                  letterSpacing: "1.4px",
                }}
              >
                {dayKey}
              </span>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: dotColor,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12,
                  color: isRest ? "rgba(255,255,255,0.35)" : isToday ? "#fff" : "rgba(255,255,255,0.85)",
                  fontStyle: isRest ? "italic" : "normal",
                  fontWeight: 500,
                  letterSpacing: "-0.1px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {isRest ? "Rest" : day?.am_session}
              </span>
              {isDone ? (
                <span style={{ fontSize: 10, color: "rgba(120,200,180,0.7)", flexShrink: 0 }}>✓</span>
              ) : (
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.4)",
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {durationForDay(day) || "—"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

