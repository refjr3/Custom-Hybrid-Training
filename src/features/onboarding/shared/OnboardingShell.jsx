/**
 * Full-screen onboarding frame: wordmark, volumetric haze, step rail, optional back.
 * Phase 4.1 — used by OnboardingFlow in later commits.
 */

const STEP_KEYS = ["profile", "goals", "devices", "connect", "complete"];

/** Map server `onboarding_step` string → 0-based index; default to profile. */
export function stepIndexFromProfile(step) {
  const s = typeof step === "string" ? step.trim().toLowerCase() : "";
  const i = STEP_KEYS.indexOf(s);
  return i >= 0 ? i : 0;
}

export function onboardingStepKeyFromIndex(i) {
  return STEP_KEYS[Math.max(0, Math.min(STEP_KEYS.length - 1, i))] ?? "profile";
}

export function Wordmark({ style = {} }) {
  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: 8,
        ...style,
      }}
    >
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: "#fff", fontSize: 15, letterSpacing: "-0.2px" }}>The </span>
      <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontWeight: 400, color: "#C9A875", fontSize: 18 }}>Lab</span>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: "#fff", fontSize: 15 }}>.</span>
    </div>
  );
}

function StepDots({ currentIndex, total = 5 }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 4, marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === currentIndex ? 22 : 6,
            height: 6,
            borderRadius: 999,
            background: i === currentIndex ? "#C9A875" : "rgba(255,255,255,0.12)",
            transition: "width 0.25s ease, background 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}

export default function OnboardingShell({
  stepIndex = 0,
  stepTotal = 5,
  title,
  subtitle,
  onBack,
  children,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
        background: "#0D0E10",
        color: "#fff",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 55% at 50% -15%, rgba(201,168,117,0.16) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 100% 30%, rgba(255,255,255,0.06) 0%, transparent 45%),
            radial-gradient(ellipse 65% 45% at 0% 70%, rgba(201,168,117,0.06) 0%, transparent 50%),
            linear-gradient(180deg, #101115 0%, #0D0E10 38%, #0c0d10 100%)
          `,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, padding: "28px 22px 36px", minHeight: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <Wordmark />

        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            style={{
              alignSelf: "flex-start",
              marginTop: 4,
              marginBottom: 8,
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.35)",
              fontSize: 13,
              letterSpacing: "0.5px",
              cursor: "pointer",
              padding: "6px 0",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ‹ Back
          </button>
        ) : (
          <div style={{ height: 32 }} />
        )}

        <StepDots currentIndex={stepIndex} total={stepTotal} />

        {title ? (
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.5px",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
        ) : null}

        {subtitle ? (
          <p
            style={{
              margin: "0 0 22px",
              textAlign: "center",
              fontSize: 13,
              lineHeight: 1.45,
              color: "rgba(255,255,255,0.42)",
              padding: "0 6px",
            }}
          >
            {subtitle}
          </p>
        ) : (
          <div style={{ height: 8 }} />
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
      </div>
    </div>
  );
}
