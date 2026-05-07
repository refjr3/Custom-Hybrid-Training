import { InfoIcon } from "./LineIcon";
import { colors, typography } from "../tokens";

export const SectionLabel = ({ children, meta, hasInfo, ...rest }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      fontSize: typography.sizeCaps,
      fontWeight: typography.weightMedium,
      color: colors.accentGold,
      letterSpacing: typography.trackingCaps,
      margin: "28px 4px 14px",
    }}
    {...rest}
  >
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {children}
      {hasInfo ? <InfoIcon size={10} /> : null}
    </span>
    {meta ? (
      <span
        style={{
          color: colors.textTertiary,
          letterSpacing: "1.4px",
          fontSize: typography.sizeCaps,
        }}
      >
        {meta}
      </span>
    ) : null}
  </div>
);
