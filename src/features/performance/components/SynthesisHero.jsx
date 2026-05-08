import { colors, typography } from "../../../design/tokens";

export const SynthesisHero = ({ decision, onTapWhy }) => {
  if (!decision) return null;

  const stateColor = {
    green: colors.semanticGood,
    yellow: colors.semanticWarn,
    red: colors.semanticBad,
  }[decision.state] || colors.textTertiary;

  return (
    <div
      style={{
        background: "rgba(201,168,117,0.05)",
        border: "0.5px solid rgba(201,168,117,0.2)",
        borderRadius: 22,
        padding: "24px 24px 20px",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 9, color: colors.accentGold, letterSpacing: "2px", fontWeight: 500 }}>
          TODAY'S READ
        </span>
        <span style={{ fontSize: 9, color: colors.textTertiary, letterSpacing: "1.4px", fontWeight: 500 }}>
          {String(decision?.confidence?.label || "low").toUpperCase()} CONFIDENCE
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: stateColor }} />
        <div
          style={{
            fontFamily: typography.fontDisplay,
            fontSize: 30,
            color: colors.textPrimary,
            letterSpacing: "-0.6px",
            lineHeight: 1.05,
          }}
        >
          {decision.label}
        </div>
      </div>

      <div
        style={{
          fontSize: 13,
          color: colors.textSecondary,
          lineHeight: 1.5,
          marginBottom: 16,
        }}
      >
        {decision.rationale}
      </div>

      <button
        type="button"
        onClick={onTapWhy}
        style={{
          background: "transparent",
          border: "none",
          color: colors.accentGold,
          fontSize: 11,
          letterSpacing: "1.5px",
          fontWeight: 500,
          cursor: "pointer",
          padding: 0,
        }}
      >
        WHY · {decision.signalsConsidered.length} signals →
      </button>
    </div>
  );
};
