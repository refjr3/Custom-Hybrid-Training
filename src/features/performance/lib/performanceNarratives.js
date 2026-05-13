export function getRecoveryNarrative(currentScore, dailyArr) {
  if (currentScore == null || !dailyArr?.length) return null;
  const past14 = dailyArr
    .slice(-15, -1)
    .map((day) => day?.recoveryScore)
    .filter((value) => value != null);
  if (past14.length < 3) return "Building baseline.";
  const baseline = Math.round(past14.reduce((sum, value) => sum + value, 0) / past14.length);
  const delta = currentScore - baseline;
  if (Math.abs(delta) < 3) return "In line with your 14-day baseline.";
  const direction = delta > 0 ? "above" : "below";
  return `${Math.abs(delta)} points ${direction} your 14-day baseline.`;
}

export function getStrainNarrative(strain) {
  if (strain == null) return null;
  if (strain < 10) return "Recovery-zone day. Body's barely working.";
  if (strain < 14) return "Solid aerobic load. Sustainable.";
  if (strain < 18) return "Heavy day. Earned recovery tonight.";
  return "Max effort. Don't stack another.";
}

export function splitVerdictLabel(label) {
  if (!label) return { prefix: "", emphasis: "" };
  const words = String(label).trim().split(/\s+/);
  if (words.length === 1) return { prefix: "", emphasis: words[0] };
  return {
    prefix: words.slice(0, -1).join(" "),
    emphasis: words[words.length - 1],
  };
}
