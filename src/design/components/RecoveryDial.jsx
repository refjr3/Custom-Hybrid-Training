import { colors, typography, classifyRecovery } from "../tokens";
import { Pill } from "./Pill";

export const RecoveryDial = ({ score, deltaVsAvg, size = "hero", deltaWindowLabel = "7d" }) => {
  const isHero = size === "hero";
  const dim = isHero ? 220 : 140;
  const strokeW = isHero ? 14 : 10;
  const radius = dim / 2 - strokeW / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const progress = score != null ? score / 100 : 0;
  const offset = circumference * (1 - progress);
  const valueSize = isHero ? typography.sizeHeroNumber : 30;
  const status = classifyRecovery(score);
  const statusVariant = status.label === "PRIMED" ? "good" : status.label === "STEADY" ? "warn" : "bad";
  const badgeSize = isHero ? "sm" : "xs";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        margin: isHero ? "20px 0 28px" : "8px 0 10px",
        gap: 6,
      }}
    >
      <div style={{ position: "relative", width: dim, height: dim }}>
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
            width: isHero ? "auto" : dim - 32,
            maxWidth: dim - 32,
          }}
        >
          <div
            style={{
              fontSize: isHero ? typography.sizeCaps : 8,
              color: colors.textSecondary,
              letterSpacing: isHero ? typography.trackingCaps : "1.2px",
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
              letterSpacing: isHero ? "-1.5px" : "-1px",
              marginTop: isHero ? 4 : 2,
            }}
          >
            {score != null ? score : "—"}
          </div>
          <div style={{ marginTop: isHero ? 6 : 4 }}>
            <Pill variant={statusVariant} size={badgeSize}>
              {status.label}
            </Pill>
          </div>
        </div>
      </div>
      {deltaVsAvg != null ? (
        <div>
          <Pill variant={deltaVsAvg >= 0 ? "good" : "bad"} size={badgeSize}>
            {deltaVsAvg >= 0 ? "+" : ""}
            {deltaVsAvg} vs {deltaWindowLabel}
          </Pill>
        </div>
      ) : null}
    </div>
  );
};
