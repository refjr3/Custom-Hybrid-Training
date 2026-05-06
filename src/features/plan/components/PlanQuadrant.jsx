import { getSessionIntent } from "./intentConfig.js";
import { extractDayNumber } from "../lib/weekDateUtils.js";

const cellStyle = {
  background: "rgba(255,255,255,0.025)",
  border: "0.5px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "12px 13px",
  minHeight: 130,
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "'DM Sans', sans-serif",
};

const cellLabelStyle = {
  fontSize: 9,
  color: "rgba(255,255,255,0.45)",
  letterSpacing: "1.6px",
  fontWeight: 500,
};

function MiniCell({ day, isToday, completionState, onTap }) {
  const intent = getSessionIntent(day?.am_session_type, day?.am_session);
  const isRest = !day?.am_session || /^rest$/i.test(String(day?.am_session));

  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        textAlign: "center",
        padding: "5px 1px",
        borderRadius: 5,
        border: "none",
        background: isToday ? "rgba(201,168,117,0.18)" : "rgba(255,255,255,0.03)",
        opacity: isRest ? 0.35 : 1,
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.5)", letterSpacing: "0.8px" }}>
        {String(day?.day_name || day?.day || "").trim().slice(0, 1).toUpperCase()}
      </div>
      <div style={{ fontSize: 10, color: "white", fontWeight: 500, marginTop: 1, lineHeight: 1 }}>
        {extractDayNumber(day?.date_label || day?.date)}
      </div>
      {completionState?.complete ? (
        <div style={{ fontSize: 7, color: "rgba(120,200,180,0.8)", marginTop: 1 }}>✓</div>
      ) : (
        <div
          style={{
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: isRest ? "rgba(255,255,255,0.15)" : intent.color,
            margin: "2px auto 0",
          }}
        />
      )}
    </button>
  );
}

function ComplianceMiniStats({ weekDays, completionResolver }) {
  const planned = weekDays.filter((d) => !/^rest$/i.test(String(d?.am_session || "")) && d?.am_session).length;
  const completed = weekDays.filter((d) => completionResolver?.(d)?.complete).length;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>This week</span>
        <span
          style={{
            fontSize: 14,
            color: "rgba(120,200,180,0.95)",
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {completed}/{planned}
        </span>
      </div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>
        Auto-detected from Garmin &amp; Strava
      </div>
    </div>
  );
}

export function PlanQuadrant({
  weekDays,
  todayDayIndex,
  phaseProgress,
  weekFocus,
  weekType,
  completionResolver,
  onTapDay,
  onTapPhase,
  onTapFocus,
  onTapCompliance,
}) {
  const safeDays = Array.isArray(weekDays) ? weekDays : [];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        marginTop: 18,
        marginBottom: 24,
      }}
    >
      <div style={{ ...cellStyle, cursor: "default" }}>
        <div style={cellLabelStyle}>THIS WEEK</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginTop: 8,
          }}
        >
          {safeDays.map((day, i) => (
            <MiniCell
              key={day?.id || `mini_${i}`}
              day={day}
              isToday={i === todayDayIndex}
              completionState={completionResolver?.(day)}
              onTap={() => onTapDay?.(i)}
            />
          ))}
        </div>
      </div>

      <button type="button" onClick={onTapPhase} style={cellStyle}>
        <div style={cellLabelStyle}>PHASE PROGRESS</div>
        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 32,
            color: "#C9A875",
            letterSpacing: "-0.5px",
            marginTop: 4,
            lineHeight: 1,
          }}
        >
          {Math.round(Number(phaseProgress?.phaseProgressPercent || 0))}%
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
          {phaseProgress?.phaseStatusLabel || "Wk 1 of 1"}
        </div>
        <div
          style={{
            marginTop: 10,
            height: 4,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(0, Math.min(100, Number(phaseProgress?.phaseProgressPercent || 0)))}%`,
              background: "linear-gradient(90deg, rgba(201,168,117,0.6) 0%, #C9A875 100%)",
              borderRadius: 3,
            }}
          />
        </div>
      </button>

      <button type="button" onClick={onTapFocus} style={cellStyle}>
        <div style={cellLabelStyle}>WEEK FOCUS</div>
        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 17,
            color: "rgba(255,255,255,0.92)",
            letterSpacing: "-0.3px",
            lineHeight: 1.25,
            marginTop: 4,
            flex: 1,
          }}
        >
          {weekFocus}
        </div>
        <div
          style={{
            fontSize: 8,
            color: "#FF8A6C",
            letterSpacing: "1.5px",
            fontWeight: 500,
            marginTop: 8,
          }}
        >
          {weekType}
        </div>
      </button>

      <button type="button" onClick={onTapCompliance} style={cellStyle}>
        <div style={cellLabelStyle}>COMPLIANCE</div>
        <ComplianceMiniStats weekDays={safeDays} completionResolver={completionResolver} />
      </button>
    </div>
  );
}
