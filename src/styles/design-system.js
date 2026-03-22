export const colors = {
  bg:        "#0A0A0A",
  surface:   "#111111",
  card:      "rgba(255,255,255,0.04)",
  card2:     "rgba(255,255,255,0.07)",
  cardSolid: "#141414",
  border:    "rgba(255,255,255,0.08)",
  divider:   "#444444",
  text:      "#FFFFFF",
  muted:     "#888888",
  light:     "#555555",
  cyan:      "#00F3FF",
  green:     "#00D4A0",
  red:       "#FF3B30",
  yellow:    "#FFD600",
  blue:      "#0088FF",
  orange:    "#FF7700",
};

export const fonts = {
  display: "'Bebas Neue','Arial Black',sans-serif",
  mono:    "'Space Mono',monospace",
  body:    "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

export const glass = {
  backdropFilter:       "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

export const glassCard = {
  background:    colors.card,
  border:        `1px solid ${colors.border}`,
  borderRadius:  16,
  ...glass,
};

export const glowShadow = (color, intensity = 0.3) =>
  `0 0 20px ${color}${Math.round(intensity * 255).toString(16).padStart(2, "0")}, 0 0 60px ${color}${Math.round(intensity * 0.4 * 255).toString(16).padStart(2, "0")}`;

export const buttonPress = {
  transition: "transform 0.1s ease",
};

export const capsLabel = {
  fontFamily:    fonts.mono,
  fontSize:      8,
  color:         colors.muted,
  letterSpacing: 3,
  textTransform: "uppercase",
};

export const metricDisplay = {
  fontFamily:    fonts.display,
  fontWeight:    700,
  letterSpacing: -1,
  lineHeight:    1,
};
