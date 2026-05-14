import { parseWorkoutDetail } from "../../features/plan/parseWorkoutDetail.js";
import {
  getGreetingStatus,
  getMovementSummary,
  getRecoveryDelta14d,
  getRecoveryNarrative,
  splitVerdictLabel,
} from "../../features/performance/lib/performanceNarratives.js";

function formatNowStamp() {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${date} · ${time}`;
}

function formatValue(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (digits > 0) return n.toFixed(digits);
  return String(Math.round(n));
}

function withPeriod(text) {
  const raw = String(text || "").trim();
  if (!raw) return "Session.";
  return /[.!?]$/.test(raw) ? raw : `${raw}.`;
}

function capitalizeWord(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  return `${raw.charAt(0).toUpperCase()}${raw.slice(1)}`;
}

function SectionHeader({ index, title, right }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        paddingBottom: 18,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
        {`— ${index}  ${title}`}
      </div>
      <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
        {right || ""}
      </div>
    </div>
  );
}

export default function TodayV3({
  profileName,
  onOpenMenu,
  syncStatus,
  phaseName,
  currentWeekNum,
  totalPlanWeeks,
  daysAway,
  daysCompletedThisWeek,
  checkInLoading,
  hasCheckIn,
  onOpenCheckIn,
  recoveryScore,
  recoverySource,
  hrvValue,
  rhrValue,
  sleepValue,
  coachingLoading,
  coachingDecision,
  coachSynthesis,
  onOpenSignals,
  onAskCoach,
  todayTag,
  weekType,
  isRestDay,
  todaySessionLabel,
  todayDuration,
  todayZoneLabel,
  todayWorkoutSteps,
  onStartSession,
  todaySessionName,
  todayWorkout,
  todayCoachingNote,
  daily,
}) {
  const displayName = String(profileName || "Athlete").trim() || "Athlete";
  const greeting = getGreetingStatus(coachingDecision);
  const score = Number.isFinite(Number(recoveryScore)) ? Math.round(Number(recoveryScore)) : null;
  const scoreAxisValue = score == null ? 0 : Math.max(0, Math.min(100, score));
  const delta14d = getRecoveryDelta14d(score, daily || []);
  const recoveryNarrative = getRecoveryNarrative(score, daily || []);
  const narrativeText = delta14d != null && delta14d > 15 ? "Top of your range." : (recoveryNarrative || "Building baseline.");
  const recoveryWord = capitalizeWord(greeting.emphasis || "Steady");
  const confidenceLabel = String(coachingDecision?.confidence?.label || "low").toUpperCase();
  const verdict = splitVerdictLabel(coachingDecision?.label || "");
  const parsedWorkout = parseWorkoutDetail({
    sessionName: todaySessionName || todaySessionLabel || "",
    workout: todayWorkout || {},
    note: todayCoachingNote || "",
    phase: phaseName,
  });
  const workoutType = String(todayWorkout?.type || todayTag || "SESSION").toUpperCase();
  const durationLabel = String(todayDuration || "—").toUpperCase();
  const headlineSource = parsedWorkout?.headline || todayWorkout?.headline || todaySessionLabel || "Session";
  const workoutHeadline = withPeriod(headlineSource);
  const movementSummary = getMovementSummary(parsedWorkout, 5);

  const axisTicks = [0, 25, 50, 75];
  const scoreTickValue = score == null ? null : scoreAxisValue;
  const scoreTickTop = `${100 - scoreAxisValue}%`;
  const signalCount = coachingDecision?.signalsConsidered?.length || 0;

  return (
    <div style={{ background: "#0A0A0A", padding: "0 22px 100px" }}>
      <div style={{ padding: "16px 0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
          {formatNowStamp()}
        </div>
        <div style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
          THE LAB.
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 30, lineHeight: 1.15, fontWeight: 500, color: "#fff", marginBottom: 4 }}>
          {`Good morning, ${displayName}.`}
        </div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 30, lineHeight: 1.15, fontWeight: 500, color: "#fff" }}>
          {greeting.prefix ? <span>{greeting.prefix} </span> : null}
          <span style={{ fontStyle: "italic", color: "#D4A953" }}>{greeting.emphasis}</span>
          <span>{greeting.period}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderTop: "0.5px solid rgba(255,255,255,0.08)", borderBottom: "0.5px solid rgba(255,255,255,0.08)", marginBottom: 36 }}>
        <div style={{ padding: "12px 0", textAlign: "center" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 6 }}>PHASE</div>
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 16, color: "#fff" }}>{phaseName || "Training"}</div>
        </div>
        <div style={{ padding: "12px 0", textAlign: "center" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 6 }}>WEEK</div>
          <div style={{ fontSize: 16, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{`${currentWeekNum || 1} / ${totalPlanWeeks || 1}`}</div>
        </div>
        <div style={{ padding: "12px 0", textAlign: "center" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 6 }}>TO RACE</div>
          <div style={{ fontSize: 16, color: "#D4A953", fontVariantNumeric: "tabular-nums" }}>{daysAway != null ? `${daysAway}d` : "—"}</div>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <SectionHeader index="01" title="RECOVERY" right="" />

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ width: 70, height: 200, position: "relative" }}>
            {axisTicks.map((tick) => (
              <div
                key={tick}
                style={{
                  position: "absolute",
                  top: `${100 - tick}%`,
                  left: 0,
                  transform: "translateY(-50%)",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  color: "rgba(255,255,255,0.4)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {tick}
              </div>
            ))}
            {scoreTickValue != null ? (
              <div
                style={{
                  position: "absolute",
                  top: scoreTickTop,
                  left: 0,
                  transform: "translateY(-50%)",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  color: "#D4A953",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {scoreTickValue}
              </div>
            ) : null}
          </div>

          <div style={{ flex: 1, minHeight: 200, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 130, lineHeight: 1, fontWeight: 400, color: "#fff" }}>
              {score != null ? score : "—"}
            </div>
            <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#D4A953", fontSize: 22 }}>
              {`${recoveryWord}.`}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)", margin: "18px 0 14px" }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
          {[
            { label: "HRV", value: formatValue(hrvValue), unit: "ms", color: "#fff" },
            { label: "RHR", value: formatValue(rhrValue), unit: "bpm", color: "#fff" },
            { label: "SLEEP", value: formatValue(sleepValue, 1), unit: "hrs", color: "#fff" },
            {
              label: "Δ 14D",
              value: delta14d == null ? "—" : `${delta14d > 0 ? "+" : ""}${delta14d}`,
              unit: "pts",
              color: delta14d == null ? "rgba(255,255,255,0.45)" : delta14d > 0 ? "#4ade80" : delta14d < 0 ? "#f87171" : "rgba(255,255,255,0.65)",
            },
          ].map((metric) => (
            <div key={metric.label}>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)", fontWeight: 600, marginBottom: 6 }}>
                {metric.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 500, color: metric.color, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
                {metric.value}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{metric.unit}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
          {narrativeText}
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <SectionHeader
          index="02"
          title="COACH"
          right={coachingDecision ? `${confidenceLabel} CONFIDENCE` : ""}
        />

        <div style={{ marginBottom: 16, fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 500, color: "#fff", lineHeight: 1.1 }}>
          {verdict.prefix ? <span>{verdict.prefix} </span> : null}
          <span style={{ fontStyle: "italic", color: "#D4A953" }}>{verdict.emphasis || "Loading"}</span>
          <span>.</span>
        </div>

        <div style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(255,255,255,0.7)", marginBottom: 22 }}>
          {coachingDecision?.rationale || coachSynthesis?.summary || "Your coach is reviewing your latest readiness and plan context."}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <button
            type="button"
            onClick={onOpenSignals}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "#D4A953",
              fontWeight: 600,
            }}
          >
            {`${signalCount} SIGNALS →`}
          </button>
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            — signed, your coach
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <SectionHeader index="03" title="TODAY" right={`${workoutType} · ${durationLabel}`} />

        <div style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 500, lineHeight: 1.1, color: "#fff", fontStyle: "italic", marginBottom: movementSummary ? 14 : 0 }}>
          {workoutHeadline}
        </div>

        {movementSummary ? (
          <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
            {movementSummary}
          </div>
        ) : null}
      </div>
    </div>
  );
}
