const T = {
  bg: "#000",
  cardBg: "rgba(255,255,255,0.012)",
  cardBorder: "rgba(255,255,255,0.04)",
  hairline: "rgba(255,255,255,0.06)",
  gold: "#C9A875",
  goldGlow: "rgba(201,169,97,0.12)",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,0.70)",
  text50: "rgba(255,255,255,0.50)",
  text35: "rgba(255,255,255,0.35)",
  text22: "rgba(255,255,255,0.22)",
  good: "#6BAE7E",
  teal: "rgb(120,200,180)",
  serif: "'DM Serif Display', serif",
  sans: "'DM Sans', system-ui, sans-serif",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatNowStamp() {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${date} · ${time}`;
}

function recoverySubline(score) {
  if (score == null) return "Waiting on recovery sync.";
  if (score >= 67) return "You're primed.";
  if (score >= 34) return "Hold steady.";
  return "Ease in.";
}

function recoveryTag(score) {
  if (score == null) return "SYNCING";
  if (score >= 67) return "PRIMED";
  if (score >= 34) return "READY";
  return "RECOVER";
}

function splitSteps(steps) {
  const list = (steps || [])
    .map((step) => String(step || "").trim())
    .filter(Boolean)
    .filter((step) => !step.startsWith("—"))
    .slice(0, 8);

  return list.map((step, idx) => {
    const timeMatch = step.match(/(\d+\s*(?:x\s*\d+\s*)?(?:min|m|sec|s))/i);
    const left = timeMatch?.[0]?.replace(/\s+/g, " ").trim() || `SET ${idx + 1}`;
    const right = timeMatch
      ? step.replace(timeMatch[0], "").replace(/^[\s—\-:·]+/, "").trim() || step
      : step;
    return { left: left.toUpperCase(), right };
  });
}

const InlineMetric = ({ icon, label, value, unit }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      padding: "10px 0 8px",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        justifyContent: "center",
        marginBottom: 4,
      }}
    >
      <span style={{ fontSize: 11, color: T.gold }}>{icon}</span>
      <span
        style={{
          fontFamily: T.sans,
          fontSize: 9,
          color: T.text35,
          letterSpacing: "1.4px",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </div>
    <div style={{ fontFamily: T.serif, fontSize: 18, color: T.text, lineHeight: 1 }}>
      {value != null ? value : "—"}
      {unit && value != null ? (
        <span style={{ fontFamily: T.sans, fontSize: 10, color: T.text50, marginLeft: 3 }}>{unit}</span>
      ) : null}
    </div>
  </div>
);

const WeekTicks = ({ completed }) => (
  <div
    style={{
      display: "flex",
      gap: "2.5px",
      alignItems: "center",
      width: "100%",
    }}
  >
    {Array.from({ length: 56 }).map((_, i) => (
      <span
        key={`tick_${i}`}
        style={{
          width: 1,
          flexShrink: 0,
          borderRadius: "0.5px",
          height: i === completed ? 5 : 8,
          background:
            i < completed
              ? T.gold
              : i === completed
                ? "rgba(201,168,117,0.35)"
                : "#3A3530",
          flex: 1,
          maxWidth: 4,
        }}
      />
    ))}
  </div>
);

export default function TodayV2({
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
}) {
  const displayName = profileName || "Athlete";
  const scoreValue = Number.isFinite(Number(recoveryScore)) ? Number(recoveryScore) : null;
  const scorePct = scoreValue != null ? clamp(scoreValue / 100, 0, 1) : 0;
  const sourceLabel = recoverySource ? String(recoverySource).toUpperCase() : "NO SOURCE";
  const syncOk = syncStatus === "green";
  const syncDot = syncOk ? T.good : "#FF3B30";
  const syncText = syncOk ? "SYNCED" : "STALE";
  const strokeDim = scoreValue != null ? 4 : 3;
  const dialSize = 110;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - scorePct);
  const sessionType = String(todayTag || "SESSION").toUpperCase();
  const sessionSteps = splitSteps(todayWorkoutSteps);
  const coachHeadline = coachingDecision?.label || coachSynthesis?.headline || "Coach brief loading";
  const coachBody = coachingDecision?.rationale || coachSynthesis?.summary || "Your coach is reviewing your latest readiness and plan context.";
  const confidenceLabel = String(coachingDecision?.confidence?.label || "high").toUpperCase();
  const signalCount = coachingDecision?.signalsConsidered?.length || 0;

  return (
    <div
      style={{
        padding: "0 0 20px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        overflowX: "hidden",
        background: T.bg,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px 12px",
          borderBottom: `0.5px solid ${T.hairline}`,
        }}
      >
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ width: 20, height: 1.5, borderRadius: 1, background: T.text50 }} />
          <span style={{ width: 14, height: 1.5, borderRadius: 1, background: T.text50 }} />
          <span style={{ width: 20, height: 1.5, borderRadius: 1, background: T.text50 }} />
        </button>

        <div style={{ textAlign: "center", fontSize: 26, lineHeight: 1, letterSpacing: "-0.4px" }}>
          <span style={{ fontFamily: T.sans, fontWeight: 600, color: T.text70 }}>The </span>
          <em style={{ fontFamily: T.serif, fontStyle: "italic", fontWeight: 400, color: T.text }}>Lab</em>
          <span style={{ fontFamily: T.sans, fontWeight: 600, color: T.text70 }}>.</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: syncDot }} />
          <span style={{ fontFamily: T.sans, fontSize: 9, letterSpacing: "1.4px", color: T.text35, fontWeight: 500 }}>
            {syncText}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: `0.5px solid ${T.hairline}` }}>
        {[
          { eye: "PHASE", value: phaseName || "Training", eyeColor: T.text35, valueSerif: true },
          { eye: "WEEK", value: `${currentWeekNum}`, suffix: ` / ${totalPlanWeeks}`, eyeColor: T.text35 },
          { eye: "DC RACE", value: daysAway != null ? `${daysAway} days` : "—", eyeColor: T.gold, valueColor: T.gold },
        ].map((cell, idx) => (
          <div
            key={cell.eye}
            style={{
              flex: 1,
              padding: "10px 10px 12px",
              borderRight: idx < 2 ? `0.5px solid ${T.hairline}` : "none",
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: T.sans, fontSize: 9, letterSpacing: "1.4px", color: cell.eyeColor, marginBottom: 6 }}>
              {cell.eye}
            </div>
            <div style={{ color: cell.valueColor || T.text }}>
              <span
                style={{
                  fontFamily: cell.valueSerif ? T.serif : T.sans,
                  fontStyle: cell.valueSerif ? "italic" : "normal",
                  fontSize: cell.eye === "WEEK" ? 18 : 20,
                  fontWeight: cell.eye === "WEEK" ? 500 : 400,
                  letterSpacing: "-0.2px",
                }}
              >
                {cell.value}
              </span>
              {cell.suffix ? (
                <span style={{ fontFamily: T.sans, fontSize: 14, color: T.text35, marginLeft: 2 }}>{cell.suffix}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "20px 16px 6px" }}>
        <div style={{ fontFamily: T.sans, fontSize: 11, color: T.text35, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>
          {formatNowStamp()}
        </div>
        <div style={{ fontFamily: T.serif, fontSize: 26, color: T.text, lineHeight: 1.15, letterSpacing: "-0.3px" }}>
          Good morning, {displayName}.
          <br />
          <em style={{ color: T.gold, fontStyle: "italic" }}>{recoverySubline(scoreValue)}</em>
        </div>
      </div>

      <div style={{ padding: "18px 16px 4px" }}>
        <WeekTicks completed={daysCompletedThisWeek} />
      </div>

      <div style={{ padding: "8px 16px 4px" }}>
        <button
          type="button"
          onClick={onOpenCheckIn}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: T.gold,
            fontFamily: T.sans,
            fontSize: 11,
            letterSpacing: "1.4px",
            fontWeight: 500,
            textTransform: "uppercase",
            textDecoration: "underline",
            textUnderlineOffset: 4,
          }}
        >
          {checkInLoading ? "CHECKING..." : hasCheckIn ? "✓ CHECKED IN" : "+ QUICK CHECK-IN"}
        </button>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        <div
          style={{
            position: "relative",
            background: T.cardBg,
            border: `0.5px solid ${T.cardBorder}`,
            borderRadius: 22,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 120,
              height: 120,
              background: `radial-gradient(circle, ${T.goldGlow} 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1, padding: "16px 16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: T.sans, fontSize: 9, color: T.gold, letterSpacing: "2px", fontWeight: 500 }}>RECOVERY</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontFamily: T.sans, fontSize: 9, color: T.text35, letterSpacing: "1.2px" }}>
                  VIA {sourceLabel}
                </div>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: syncDot }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <div style={{ position: "relative", width: dialSize, height: dialSize }}>
                <svg width={dialSize} height={dialSize}>
                  <defs>
                    <linearGradient id="today-v2-rec-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={T.teal} />
                      <stop offset="100%" stopColor={T.gold} />
                    </linearGradient>
                  </defs>
                  <circle
                    cx={dialSize / 2}
                    cy={dialSize / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={strokeDim}
                  />
                  {scoreValue != null ? (
                    <circle
                      cx={dialSize / 2}
                      cy={dialSize / 2}
                      r={radius}
                      fill="none"
                      stroke="url(#today-v2-rec-grad)"
                      strokeWidth={strokeDim}
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      transform={`rotate(-90 ${dialSize / 2} ${dialSize / 2})`}
                    />
                  ) : null}
                </svg>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ fontFamily: T.serif, fontSize: 36, color: scoreValue != null ? T.text : T.text35, lineHeight: 1 }}>
                    {scoreValue != null ? scoreValue : "—"}
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 8, color: T.gold, letterSpacing: "1.6px", marginTop: 4 }}>
                    {recoveryTag(scoreValue)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: `0.5px solid ${T.hairline}`, display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            <InlineMetric icon="♥" label="HRV" value={hrvValue} unit="ms" />
            <InlineMetric icon="∿" label="RHR" value={rhrValue} unit="bpm" />
            <InlineMetric icon="☾" label="Sleep" value={sleepValue} unit="hrs" />
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "24px 16px 22px",
          marginTop: 22,
          borderTop: `0.5px solid ${T.hairline}`,
          borderBottom: `0.5px solid ${T.hairline}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: T.sans, fontSize: 9, color: T.gold, letterSpacing: "2px", fontWeight: 500 }}>
            COACH BRIEF
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 9, color: T.text35, letterSpacing: "1.4px" }}>
            {confidenceLabel} CONFIDENCE
          </div>
        </div>

        {coachingLoading ? (
          <div style={{ height: 62, background: "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: 12 }} />
        ) : (
          <>
            <div style={{ fontFamily: T.serif, fontStyle: "italic", fontSize: 22, color: T.text, lineHeight: 1.2, marginBottom: 8 }}>
              {coachHeadline}
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 12, color: T.text50, lineHeight: 1.55, marginBottom: 14 }}>
              {coachBody}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onOpenSignals}
            style={{
              border: "none",
              background: T.gold,
              color: "#0D0E10",
              borderRadius: 999,
              padding: "8px 12px",
              fontFamily: T.sans,
              fontSize: 11,
              letterSpacing: "1px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View signals ({signalCount})
          </button>
          <button
            type="button"
            onClick={onAskCoach}
            style={{
              border: `0.5px solid ${T.cardBorder}`,
              background: "transparent",
              color: T.text70,
              borderRadius: 999,
              padding: "8px 12px",
              fontFamily: T.sans,
              fontSize: 11,
              letterSpacing: "1px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            ✦ Ask coach
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "24px 22px 0",
          background: "linear-gradient(180deg, rgba(201,168,117,0.06) 0%, transparent 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ fontFamily: T.serif, fontStyle: "italic", fontSize: 16, color: T.text70 }}>ii.</div>
          <div style={{ fontFamily: T.sans, fontSize: 9, color: T.text35, letterSpacing: "1.7px" }}>
            TODAY · {phaseName?.toUpperCase() || "TRAINING"} · WK {currentWeekNum} / {totalPlanWeeks}
          </div>
          <div style={{ flex: 1, height: 1, background: T.hairline }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <WeekTicks completed={daysCompletedThisWeek} />
        </div>

        {isRestDay ? (
          <div
            style={{
              borderTop: `0.5px solid ${T.hairline}`,
              paddingTop: 16,
              paddingBottom: 22,
            }}
          >
            <div style={{ fontFamily: T.serif, fontStyle: "italic", fontSize: 34, color: T.text, lineHeight: 1.1, marginBottom: 8 }}>
              Rest day.
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 13, color: T.text50, lineHeight: 1.55 }}>
              Recover. Keep movement light and let adaptation catch up.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: T.sans, fontSize: 11, color: T.gold, letterSpacing: "1.8px", textTransform: "uppercase", marginBottom: 6 }}>
              {sessionType}
              {weekType ? ` · ${String(weekType).toUpperCase()} WEEK` : ""}
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 46, color: T.text, lineHeight: 1.05, letterSpacing: "-1px" }}>
              {todayDuration || "—"}
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 26, color: T.gold, fontStyle: "italic", lineHeight: 1.1, marginTop: 2, marginBottom: 14 }}>
              at {todayZoneLabel || "target"}
            </div>

            <div style={{ borderTop: `0.5px solid ${T.hairline}`, marginBottom: 16 }}>
              {(sessionSteps.length ? sessionSteps : [{ left: "PLAN", right: todaySessionLabel || "Session details unavailable." }]).map((row, idx) => (
                <div
                  key={`${row.left}_${idx}`}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: idx < (sessionSteps.length ? sessionSteps.length : 1) - 1 ? `0.5px solid ${T.hairline}` : "none",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ width: 80, flexShrink: 0, fontFamily: T.sans, fontSize: 11, color: T.gold, letterSpacing: "1.4px", textTransform: "uppercase" }}>
                    {row.left}
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 13, color: T.text70, lineHeight: 1.45 }}>
                    {row.right}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onStartSession}
              style={{
                width: "100%",
                border: "none",
                background: T.gold,
                color: "#0D0E10",
                borderRadius: 14,
                padding: "16px 14px",
                fontFamily: T.sans,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "1.6px",
                textTransform: "uppercase",
                cursor: "pointer",
                marginBottom: 14,
              }}
            >
              ▶ START · {todayDuration || "SESSION"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
