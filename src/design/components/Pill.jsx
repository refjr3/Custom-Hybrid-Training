import { colors, typography } from "../tokens";

export const Pill = ({ children, variant = "default", size = "sm", onClick, ...rest }) => {
  const variants = {
    default: { color: colors.textSecondary, bg: "rgba(255,255,255,0.04)", border: colors.borderSubtle },
    gold: { color: colors.accentGold, bg: colors.accentGoldGlow, border: "rgba(201,168,117,0.4)" },
    good: { color: colors.semanticGood, bg: "rgba(107,174,126,0.12)", border: "rgba(107,174,126,0.3)" },
    warn: { color: colors.semanticWarn, bg: "rgba(201,169,97,0.12)", border: "rgba(201,169,97,0.3)" },
    bad: { color: colors.semanticBad, bg: "rgba(217,119,87,0.12)", border: "rgba(217,119,87,0.3)" },
    intentStrength: { color: colors.intentStrength, bg: "rgba(157,179,224,0.12)", border: "rgba(157,179,224,0.3)" },
    intentHyrox: { color: colors.intentHyrox, bg: "rgba(255,138,108,0.12)", border: "rgba(255,138,108,0.3)" },
    intentZ2: { color: colors.intentZ2, bg: "rgba(201,168,117,0.12)", border: "rgba(201,168,117,0.3)" },
    intentThreshold: { color: colors.intentThreshold, bg: "rgba(232,168,85,0.12)", border: "rgba(232,168,85,0.3)" },
    intentRecovery: { color: colors.intentRecovery, bg: "rgba(120,200,180,0.12)", border: "rgba(120,200,180,0.3)" },
  };
  const sizes = {
    sm: { padding: "3px 9px", fontSize: 10 },
    md: { padding: "5px 12px", fontSize: 11 },
    lg: { padding: "7px 14px", fontSize: 11 },
  };

  const v = variants[variant] || variants.default;
  const s = sizes[size] || sizes.sm;

  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: typography.weightMedium,
        letterSpacing: "1.4px",
        color: v.color,
        background: v.bg,
        border: `0.5px solid ${v.border}`,
        borderRadius: 10,
        cursor: onClick ? "pointer" : "default",
      }}
      {...rest}
    >
      {children}
    </span>
  );
};
