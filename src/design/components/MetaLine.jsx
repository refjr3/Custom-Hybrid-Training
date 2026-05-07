import { colors, typography } from "../tokens";

export const MetaLine = ({ items, ...rest }) => (
  <div
    style={{
      display: "flex",
      alignItems: "baseline",
      gap: 6,
      flexWrap: "wrap",
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: typography.weightMedium,
    }}
    {...rest}
  >
    {(Array.isArray(items) ? items : []).map((item, i) => (
      <span key={String(i)} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={item?.color ? { color: item.color } : null}>{item?.text}</span>
        {i < items.length - 1 ? <span style={{ color: colors.textTertiary, fontSize: 9 }}>·</span> : null}
      </span>
    ))}
  </div>
);
