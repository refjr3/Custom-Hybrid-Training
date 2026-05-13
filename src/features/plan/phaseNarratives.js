export const PHASE_NARRATIVES = {
  "Base Rebuild":
    "Foundational aerobic base and movement quality. The work that lets later phases peak.",
  Accumulation:
    "Building volume and aerobic capacity. Stack the bricks before the build.",
  Intensification:
    "Sharpening the engine. Intervals get faster, strength stays heavy.",
  Peak:
    "Race-specific sharpening. Lower volume, higher quality.",
  Taper:
    "Pull back. Protect the work already done.",
  "Race Week":
    "Final dial-in. Move, don't strain.",
  Recovery:
    "Active reset. Light enough to rebuild, present enough to maintain.",
};

export function getPhaseNarrative(phaseName) {
  if (!phaseName) return "";
  const match = Object.keys(PHASE_NARRATIVES).find(
    (key) => key.toLowerCase() === String(phaseName).toLowerCase(),
  );
  return match ? PHASE_NARRATIVES[match] : "";
}
