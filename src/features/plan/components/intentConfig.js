export const SESSION_INTENTS = {
  rest: {
    label: "Rest",
    color: "rgba(255,255,255,0.25)",
    bgTint: "rgba(255,255,255,0.02)",
    borderTint: "rgba(255,255,255,0.05)",
    icon: "◯",
  },
  recovery: {
    label: "Recovery",
    color: "rgba(120,200,180,0.7)",
    bgTint: "rgba(120,200,180,0.04)",
    borderTint: "rgba(120,200,180,0.15)",
    icon: "◐",
  },
  z2_aerobic: {
    label: "Z2 Aerobic",
    color: "#C9A875",
    bgTint: "rgba(201,168,117,0.05)",
    borderTint: "rgba(201,168,117,0.18)",
    icon: "◓",
  },
  long_run: {
    label: "Long Run",
    color: "#C9A875",
    bgTint: "rgba(201,168,117,0.07)",
    borderTint: "rgba(201,168,117,0.22)",
    icon: "◓",
  },
  threshold: {
    label: "Threshold",
    color: "#E8A855",
    bgTint: "rgba(232,168,85,0.07)",
    borderTint: "rgba(232,168,85,0.25)",
    icon: "◑",
  },
  strength: {
    label: "Strength",
    color: "#9DB3E0",
    bgTint: "rgba(157,179,224,0.05)",
    borderTint: "rgba(157,179,224,0.2)",
    icon: "▲",
  },
  hyrox: {
    label: "HYROX",
    color: "#FF8A6C",
    bgTint: "rgba(255,138,108,0.07)",
    borderTint: "rgba(255,138,108,0.28)",
    icon: "●",
  },
  brick: {
    label: "Brick",
    color: "#FF8A6C",
    bgTint: "linear-gradient(180deg, rgba(201,168,117,0.07) 0%, rgba(255,138,108,0.07) 100%)",
    borderTint: "rgba(255,138,108,0.25)",
    icon: "◗",
  },
  race_week: {
    label: "Race Day",
    color: "#FFC857",
    bgTint: "linear-gradient(135deg, rgba(255,200,87,0.12) 0%, rgba(201,168,117,0.06) 100%)",
    borderTint: "rgba(255,200,87,0.4)",
    icon: "🏁",
  },
};

export const PHASE_GRADIENTS = {
  base: "linear-gradient(90deg, rgba(201,168,117,0.6) 0%, #C9A875 100%)",
  accumulation: "linear-gradient(90deg, #C9A875 0%, #E8A855 100%)",
  intensification: "linear-gradient(90deg, #E8A855 0%, #FF8A6C 100%)",
  peak: "linear-gradient(90deg, #FF8A6C 0%, #FFC857 100%)",
  sharpen: "linear-gradient(90deg, #FFC857 0%, #C9A875 100%)",
  taper: "linear-gradient(90deg, #C9A875 0%, rgba(201,168,117,0.5) 100%)",
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
