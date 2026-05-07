import { colors, spacing } from "../tokens";

export const SessionCard = ({ children, active = false, style, ...rest }) => (
  <div
    style={{
      borderRadius: spacing.cardRadiusLarge,
      padding: spacing.cardPadding,
      background: colors.bgCardDark,
      border: `1px solid ${active ? colors.borderGold : colors.borderSubtle}`,
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
);
