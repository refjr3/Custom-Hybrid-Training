import { colors, typography, spacing } from "../tokens";
import { MiniChart } from "./MiniChart";
import { LineIcon } from "./LineIcon";

export const MetricCard = ({
  label,
  value,
  unit,
  sparklineData,
  sparklineColor,
  trendDescriptor,
  icon,
  layout = "card",
}) => {
  const isInline = layout === "inline";

  return (
    <div
      style={{
        background: isInline ? "transparent" : colors.bgCardSubtle,
        border: isInline ? "none" : `0.5px solid ${colors.borderSubtle}`,
        borderRadius: spacing.cardRadius,
        padding: isInline ? 0 : spacing.cardPaddingTight,
        display: "flex",
        flexDirection: "column",
        alignItems: isInline ? "flex-start" : "stretch",
        flex: isInline ? 1 : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: isInline ? "flex-start" : "space-between",
          alignItems: "center",
          gap: isInline ? 5 : 0,
          marginBottom: isInline ? 4 : 12,
        }}
      >
        {icon ? <LineIcon name={icon} size={isInline ? 12 : 16} color={colors.accentGoldMuted} /> : null}
        <span
          style={{
            fontSize: typography.sizeCaps,
            color: colors.textSecondary,
            letterSpacing: typography.trackingMicro,
            fontWeight: typography.weightMedium,
          }}
        >
          {label}
        </span>
      </div>
      <div>
        <span
          style={{
            fontFamily: typography.fontDisplay,
            fontSize: isInline ? 22 : 28,
            color: value != null ? colors.textPrimary : colors.textTertiary,
            letterSpacing: isInline ? "-0.3px" : "-0.5px",
            lineHeight: 1,
          }}
        >
          {value != null ? value : "—"}
        </span>
        {value != null && unit ? (
          <span style={{ fontSize: isInline ? 11 : 13, color: colors.textSecondary, marginLeft: 3 }}>{unit}</span>
        ) : null}
      </div>
      {Array.isArray(sparklineData) && sparklineData.length > 1 ? (
        <MiniChart data={sparklineData} color={sparklineColor} height={28} />
      ) : null}
      {trendDescriptor ? (
        <div
          style={{
            fontSize: 10,
            color: colors.textTertiary,
            marginTop: 6,
          }}
        >
          {trendDescriptor}
        </div>
      ) : null}
    </div>
  );
};
