import { colors, getIntentColor } from "../../../design/tokens";

export const SESSION_INTENTS = {
  rest: {
    key: "rest",
    label: "Rest",
    color: colors.intentRest,
    bgTint: colors.bgCardSubtle,
    borderTint: colors.borderSubtle,
    icon: "◯",
    pillVariant: "default",
  },
  recovery: {
    key: "recovery",
    label: "Recovery",
    color: getIntentColor("recovery"),
    bgTint: "rgba(120,200,180,0.08)",
    borderTint: "rgba(120,200,180,0.3)",
    icon: "◐",
    pillVariant: "intentRecovery",
  },
  z2_aerobic: {
    key: "z2",
    label: "Z2 Aerobic",
    color: getIntentColor("z2"),
    bgTint: colors.accentGoldGlow,
    borderTint: "rgba(201,169,97,0.35)",
    icon: "◓",
    pillVariant: "intentZ2",
  },
  long_run: {
    key: "z2",
    label: "Long Run",
    color: getIntentColor("z2"),
    bgTint: colors.accentGoldGlow,
    borderTint: "rgba(201,169,97,0.35)",
    icon: "◓",
    pillVariant: "intentZ2",
  },
  threshold: {
    key: "threshold",
    label: "Threshold",
    color: getIntentColor("threshold"),
    bgTint: "rgba(232,168,85,0.08)",
    borderTint: "rgba(232,168,85,0.32)",
    icon: "◑",
    pillVariant: "intentThreshold",
  },
  strength: {
    key: "strength",
    label: "Strength",
    color: getIntentColor("strength"),
    bgTint: "rgba(157,179,224,0.08)",
    borderTint: "rgba(157,179,224,0.3)",
    icon: "▲",
    pillVariant: "intentStrength",
  },
  hyrox: {
    key: "hyrox",
    label: "HYROX",
    color: getIntentColor("hyrox"),
    bgTint: "rgba(255,138,108,0.08)",
    borderTint: "rgba(255,138,108,0.34)",
    icon: "●",
    pillVariant: "intentHyrox",
  },
  brick: {
    key: "brick",
    label: "Brick",
    color: getIntentColor("hyrox"),
    bgTint: "linear-gradient(180deg, rgba(201,169,97,0.08) 0%, rgba(255,138,108,0.08) 100%)",
    borderTint: "rgba(255,138,108,0.34)",
    icon: "◗",
    pillVariant: "intentHyrox",
  },
  race_week: {
    key: "hyrox",
    label: "Race Day",
    color: colors.semanticWarn,
    bgTint: "linear-gradient(135deg, rgba(201,169,97,0.18) 0%, rgba(201,169,97,0.08) 100%)",
    borderTint: "rgba(201,169,97,0.4)",
    icon: "🏁",
    pillVariant: "intentHyrox",
  },
};

export const PHASE_GRADIENTS = {
  base: `linear-gradient(90deg, rgba(201,169,97,0.6) 0%, ${colors.accentGold} 100%)`,
  accumulation: `linear-gradient(90deg, ${colors.accentGold} 0%, ${colors.intentThreshold} 100%)`,
  intensification: `linear-gradient(90deg, ${colors.intentThreshold} 0%, ${colors.intentHyrox} 100%)`,
  peak: `linear-gradient(90deg, ${colors.intentHyrox} 0%, ${colors.semanticWarn} 100%)`,
  sharpen: `linear-gradient(90deg, ${colors.semanticWarn} 0%, ${colors.accentGold} 100%)`,
  taper: `linear-gradient(90deg, ${colors.accentGold} 0%, rgba(201,169,97,0.5) 100%)`,
};

export function inferPhaseKey(phaseName) {
  const lower = String(phaseName || "").toLowerCase();
  if (!lower) return "base";
  if (lower.includes("accum")) return "accumulation";
  if (lower.includes("intens")) return "intensification";
  if (lower.includes("peak")) return "peak";
  if (lower.includes("sharp")) return "sharpen";
  if (lower.includes("taper")) return "taper";
  if (lower.includes("base")) return "base";
  return "base";
}

export function getPhaseGradient(phaseName) {
  return PHASE_GRADIENTS[inferPhaseKey(phaseName)] || PHASE_GRADIENTS.base;
}

export function getPhaseStatusLabel(currentWeekInPhase, phaseTotalWeeks) {
  if (!phaseTotalWeeks || phaseTotalWeeks <= 1) return "Single week";
  if (currentWeekInPhase >= phaseTotalWeeks) return "Final week";
  if (currentWeekInPhase === 1) return "Opening week";
  if (currentWeekInPhase === Math.ceil(phaseTotalWeeks / 2)) return "Halfway";
  const weeksLeft = Math.max(phaseTotalWeeks - currentWeekInPhase, 0);
  return `${weeksLeft} wk left`;
}

export function getSessionIntent(sessionType, sessionName) {
  if (sessionType && SESSION_INTENTS[sessionType]) return SESSION_INTENTS[sessionType];
  const lower = String(sessionName || "").toLowerCase();
  if (lower.includes("rest")) return SESSION_INTENTS.rest;
  if (lower.includes("threshold")) return SESSION_INTENTS.threshold;
  if (lower.includes("hyrox")) return SESSION_INTENTS.hyrox;
  if (lower.includes("brick")) return SESSION_INTENTS.brick;
  if (lower.includes("long run") || lower.includes("long z2")) return SESSION_INTENTS.long_run;
  if (lower.includes("z2") || lower.includes("zone 2")) return SESSION_INTENTS.z2_aerobic;
  if (lower.includes("strength") || lower.includes("lift")) return SESSION_INTENTS.strength;
  if (lower.includes("recovery") || lower.includes("mobility")) return SESSION_INTENTS.recovery;
  return SESSION_INTENTS.z2_aerobic;
}
