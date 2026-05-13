import { getSessionIntent } from "./intentConfig.js";
import { extractDayNumber } from "../lib/weekDateUtils.js";

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function normalizeDayName(day) {
  return String(day?.day_name || day?.day || "")
    .trim()
    .toUpperCase()
    .slice(0, 3);
}

function orderWeekDays(weekDays) {
  const rows = Array.isArray(weekDays) ? [...weekDays] : [];
  return rows
    .map((day, index) => ({ day, index }))
    .sort(
      (a, b) =>
        DAY_ORDER.indexOf(normalizeDayName(a.day)) - DAY_ORDER.indexOf(normalizeDayName(b.day)),
    );
}

function intentToBarColor(intent) {
  const key = String(intent?.key || "").toLowerCase();
  if (!key || key === "rest") return "rgba(255,255,255,0.15)";
  if (key === "recovery" || key === "z2" || key === "long_run") return "#4ade80";
  if (key === "threshold" || key === "hyrox" || key === "brick") return "#f87171";
  if (key === "strength") return "#fbbf24";
  return "#fbbf24";
}

export default function DaySelectorV2({
  weekDays,
  selectedDayIndex,
  onSelectDay,
}) {
  const ordered = orderWeekDays(weekDays);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 6,
        marginTop: 10,
        marginBottom: 14,
      }}
    >
      {ordered.map(({ day, index }) => {
        const intent = getSessionIntent(day?.am_session_type, day?.am_session);
        const isActive = index === selectedDayIndex;
        const dayLabel = normalizeDayName(day);
        return (
          <button
            key={day?.id || `selector_day_${index}`}
            type="button"
            onClick={() => onSelectDay?.(index)}
            style={{
              padding: "9px 0 7px",
              borderRadius: 11,
              textAlign: "center",
              cursor: "pointer",
              border: isActive ? "1px solid #D4A953" : "1px solid rgba(255,255,255,0.07)",
              background: isActive ? "rgba(212,169,83,0.1)" : "rgba(255,255,255,0.04)",
              transform: isActive ? "translateY(-1px)" : "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.12em",
                color: isActive ? "#D4A953" : "rgba(255,255,255,0.45)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {dayLabel ? dayLabel.slice(0, 1) : "—"}
            </div>
            <div
              style={{
                fontSize: 15,
                color: "#fff",
                fontWeight: 600,
                lineHeight: 1,
                marginBottom: 7,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {extractDayNumber(day?.date_label || day?.date || day?.calendar_date)}
            </div>
            <div
              style={{
                width: 18,
                height: 2,
                borderRadius: 1,
                margin: "0 auto",
                background: day?.am_session ? intentToBarColor(intent) : "rgba(255,255,255,0.15)",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
