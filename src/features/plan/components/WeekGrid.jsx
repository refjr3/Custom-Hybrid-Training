import { getSessionIntent } from "./intentConfig.js";
import { colors, getIntentColor, typography } from "../../../design/tokens";

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function extractDayNumber(dateLabel) {
  if (!dateLabel) return "";
  const match = String(dateLabel).match(/\b(\d{1,2})\b/);
  return match ? match[1] : "";
}

export function WeekGrid({ days, selectedDayIndex, onSelectDay, todayIndex, completionResolver }) {
  const safeDays = Array.isArray(days) ? days : [];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 4,
        marginBottom: 16,
        padding: 4,
      }}
    >
      {DAY_ORDER.map((dayKey, i) => {
        const day = safeDays.find((d) => String(d?.day_name || d?.day || "").toLowerCase().startsWith(dayKey));
        if (!day) return <div key={dayKey} style={{ minHeight: 64 }} />;

        const intent = getSessionIntent(day.am_session_type, day.am_session);
        const isToday = i === todayIndex;
        const isSelected = i === selectedDayIndex;
        const isRest = !day.am_session || /^rest$/i.test(String(day.am_session || ""));
        const completionState = completionResolver?.(day) || { complete: !!day.am_completed_at };
        const isCompleted = !!completionState.complete;
        const dateNum = extractDayNumber(day.date_label || day.date);
        const dayName = String(day.day_name || day.day || dayKey);
        const dowShort = dayName.slice(0, 3).toUpperCase();

        return (
          <button
            key={dayKey}
            type="button"
            onClick={() => onSelectDay?.(i)}
            style={{
              background: isSelected ? colors.accentGoldGlow : colors.bgCardSubtle,
              border: isSelected ? `1px solid ${colors.accentGold}` : `0.5px solid ${colors.borderSubtle}`,
              borderRadius: 10,
              padding: "8px 4px 9px",
              textAlign: "center",
              minHeight: 64,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: isRest && !isToday ? 0.4 : isCompleted && !isToday ? 0.55 : 1,
              cursor: "pointer",
              fontFamily: typography.fontBody,
            }}
          >
            <div
              style={{
                fontSize: 8,
                fontWeight: 500,
                letterSpacing: "1.4px",
                color: isSelected ? colors.accentGold : colors.textSecondary,
              }}
            >
              {dowShort}
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 500,
                lineHeight: 1,
                color: colors.textPrimary,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.4px",
              }}
            >
              {dateNum}
            </div>
            {isCompleted ? (
              <div style={{ fontSize: 9, color: colors.semanticGood, marginTop: 1 }}>✓</div>
            ) : (
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isRest ? colors.intentRest : getIntentColor(intent?.key || day?.am_session_type || day?.am_session),
                  marginTop: 1,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
