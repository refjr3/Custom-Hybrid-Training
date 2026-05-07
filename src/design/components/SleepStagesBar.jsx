import { colors, spacing, typography } from "../tokens";

export const SleepStagesBar = ({ deepMin, remMin, lightMin, awakeMin }) => {
  const toSafeMinutes = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  };

  const segments = [
    { label: "DEEP", value: toSafeMinutes(deepMin), color: colors.sleepStageDeep },
    { label: "REM", value: toSafeMinutes(remMin), color: colors.sleepStageRem },
    { label: "LIGHT", value: toSafeMinutes(lightMin), color: colors.sleepStageLight },
    { label: "AWAKE", value: toSafeMinutes(awakeMin), color: colors.sleepStageAwake },
  ];

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (!total) return null;

  const asleepMinutes = Math.max(total - toSafeMinutes(awakeMin), 0);
  const sleepHours = Math.floor(asleepMinutes / 60);
  const sleepMinutes = asleepMinutes % 60;

  return (
    <div
      style={{
        background: colors.bgCardSubtle,
        border: `0.5px solid ${colors.borderSubtle}`,
        borderRadius: spacing.cardRadius,
        padding: spacing.cardPaddingTight,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontSize: typography.sizeCaps, color: colors.textSecondary, letterSpacing: typography.trackingMicro, fontWeight: typography.weightMedium }}>
          SLEEP STAGES
        </span>
        <span style={{ fontFamily: typography.fontDisplay, fontSize: 20, color: colors.textPrimary, letterSpacing: "-0.3px" }}>
          {sleepHours}h {sleepMinutes}m
        </span>
      </div>

      <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
        {segments.map((segment) => (
          segment.value > 0 ? (
            <div
              key={segment.label}
              style={{ flex: segment.value, background: segment.color }}
              title={`${segment.label}: ${segment.value}m`}
            />
          ) : null
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {segments.map((segment) => (
          segment.value > 0 ? (
            <div key={segment.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: colors.textTertiary }}>
              <span style={{ width: 6, height: 6, borderRadius: 1, background: segment.color, display: "inline-block" }} />
              <span style={{ letterSpacing: "0.8px", fontWeight: typography.weightMedium }}>{segment.label}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: colors.textSecondary }}>{segment.value}m</span>
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
};
