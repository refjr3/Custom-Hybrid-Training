import { colors, typography } from "../tokens";
import { LineIcon } from "./LineIcon";

export const Chip = ({ icon, label, value }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {icon ? <LineIcon name={icon} size={14} color={colors.accentGoldMuted} /> : null}
      <span
        style={{
          fontSize: typography.sizeBody,
          color: colors.textPrimary,
          fontWeight: typography.weightMedium,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
    <span
      style={{
        fontSize: typography.sizeMicro,
        color: colors.textTertiary,
        letterSpacing: "1.5px",
        fontWeight: typography.weightMedium,
        marginLeft: icon ? 20 : 0,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  </div>
);
