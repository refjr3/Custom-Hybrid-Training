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
