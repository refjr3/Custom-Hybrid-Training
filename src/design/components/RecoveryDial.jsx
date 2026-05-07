import { colors, typography, classifyRecovery } from "../tokens";
import { Pill } from "./Pill";

export const RecoveryDial = ({ score, deltaVsAvg, size = "hero" }) => {
  const dim = size === "hero" ? 220 : 130;
  const strokeW = size === "hero" ? 14 : 10;
  const radius = dim / 2 - strokeW / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const progress = score != null ? score / 100 : 0;
  const offset = circumference * (1 - progress);
  const valueSize = size === "hero" ? typography.sizeHeroNumber : 36;
  const status = classifyRecovery(score);
  const statusVariant = status.label === "PRIMED" ? "good" : status.label === "STEADY" ? "warn" : "bad";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        position: "relative",
        margin: size === "hero" ? "20px 0 28px" : "12px 0 16px",
      }}
    >
      <svg width={dim} height={dim}>
        <defs>
          <linearGradient id={`recovery-grad-${size}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={colors.recoveryGradientStart} />
            <stop offset="100%" stopColor={colors.recoveryGradientEnd} />
          </linearGradient>
        </defs>
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke={colors.borderSubtle} strokeWidth={strokeW} />
        {score != null ? (
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={`url(#recovery-grad-${size})`}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          />
        ) : null}
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: typography.sizeCaps,
            color: colors.textSecondary,
            letterSpacing: typography.trackingCaps,
            fontWeight: typography.weightMedium,
          }}
        >
          RECOVERY
        </div>
        <div
          style={{
            fontFamily: typography.fontDisplay,
            fontSize: valueSize,
            color: colors.textPrimary,
            lineHeight: 1,
            letterSpacing: "-1.5px",
            marginTop: 4,
          }}
        >
          {score != null ? score : "—"}
        </div>
        <div style={{ marginTop: 6 }}>
          <Pill variant={statusVariant} size="sm">
            {status.label}
          </Pill>
        </div>
        {deltaVsAvg != null ? (
          <div style={{ marginTop: 6 }}>
            <Pill variant={deltaVsAvg >= 0 ? "good" : "bad"} size="sm">
              {deltaVsAvg >= 0 ? "+" : ""}
              {deltaVsAvg} vs 7d
            </Pill>
          </div>
        ) : null}
      </div>
    </div>
  );
};
