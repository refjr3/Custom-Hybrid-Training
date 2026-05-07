export const colors = {
  bgPrimary: "#000000",
  bgCardDark: "#0E0E0E",
  bgCardSubtle: "rgba(255,255,255,0.025)",

  borderGold: "#B8924A",
  borderSubtle: "rgba(255,255,255,0.06)",
  borderHairline: "rgba(255,255,255,0.04)",

  accentGold: "#C9A961",
  accentGoldMuted: "#8A7340",
  accentGoldGlow: "rgba(201,169,97,0.12)",

  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0A0",
  textTertiary: "#6B6B6B",

  semanticGood: "#6BAE7E",
  semanticWarn: "#C9A961",
  semanticBad: "#D97757",

  recoveryGradientStart: "rgba(120,200,180,0.95)",
  recoveryGradientEnd: "#C9A875",

  intentZ2: "#C9A875",
  intentThreshold: "#E8A855",
  intentStrength: "#9DB3E0",
  intentHyrox: "#FF8A6C",
  intentBrick: "linear-gradient(180deg, #C9A875, #FF8A6C)",
  intentRecovery: "#78C8B4",
  intentRest: "rgba(255,255,255,0.15)",
};

export const typography = {
  fontDisplay: "'DM Serif Display', serif",
  fontBody: "'DM Sans', system-ui, -apple-system, sans-serif",

  sizeHeroNumber: 56,
  sizeHeadline: 32,
  sizeSectionTitle: 19,
  sizeBodyLarge: 14,
  sizeBody: 13,
  sizeBodySmall: 12,
  sizeCaps: 9,
  sizeMicro: 8,

  weightRegular: 400,
  weightMedium: 500,
  weightSemibold: 600,

  trackingCaps: "2px",
  trackingMicro: "1.6px",
  trackingTight: "-0.5px",
};

export const spacing = {
  cardRadius: 18,
  cardRadiusLarge: 22,
  cardPadding: 18,
  cardPaddingTight: 14,

  sectionGap: 28,
  sectionGapTight: 16,
  componentGap: 14,

  inlineGap: 8,
  inlineGapWide: 12,
};

export const shadows = {
  cardLift: "0 4px 16px rgba(0,0,0,0.18)",
  heroLift: "0 8px 32px rgba(0,0,0,0.25)",
};

export function getIntentColor(intent) {
  const map = {
    z2: colors.intentZ2,
    aerobic: colors.intentZ2,
    threshold: colors.intentThreshold,
    tempo: colors.intentThreshold,
    strength: colors.intentStrength,
    hyrox: colors.intentHyrox,
    brick: colors.intentBrick,
    recovery: colors.intentRecovery,
    rest: colors.intentRest,
  };
  return map[String(intent || "").toLowerCase()] || colors.accentGoldMuted;
}

export function classifyRecovery(score) {
  if (score == null) return { label: "NO DATA", color: colors.textTertiary };
  if (score >= 67) return { label: "PRIMED", color: colors.semanticGood };
  if (score >= 34) return { label: "STEADY", color: colors.semanticWarn };
  return { label: "COMPROMISED", color: colors.semanticBad };
}

export function formatTime(seconds) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
