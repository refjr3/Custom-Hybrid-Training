// 14-day recovery delta from current
export function getRecoveryDelta14d(currentScore, dailyArr) {
  if (currentScore == null || !dailyArr?.length) return null;
  const past14 = dailyArr
    .slice(-15, -1)
    .map((day) => day?.recoveryScore)
    .filter((value) => value != null);
  if (past14.length < 3) return null;
  const baseline = past14.reduce((sum, value) => sum + value, 0) / past14.length;
  return Math.round(currentScore - baseline);
}

export function getRecoveryNarrative(currentScore, dailyArr) {
  if (currentScore == null || !dailyArr?.length) return null;
  const delta = getRecoveryDelta14d(currentScore, dailyArr);
  if (delta == null) return "Building baseline.";
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

// Maps engine verdict to italic-emphasis greeting status word
// Returns { prefix, emphasis, period }
// e.g. { prefix: "You're", emphasis: "primed", period: "." }
export function getGreetingStatus(decision) {
  if (!decision) return { prefix: "Here's where you stand", emphasis: "today", period: "." };

  const { state } = decision;

  if (state === "green") {
    return { prefix: "You're", emphasis: "primed", period: "." };
  }
  if (state === "yellow") {
    // Fatigue override = body's good but load is heavy. Same surface as yellow.
    return { prefix: "Hold", emphasis: "steady", period: "." };
  }
  if (state === "red") {
    return { prefix: "", emphasis: "Recovery", period: " day." };
  }
  return { prefix: "Here's where you stand", emphasis: "today", period: "." };
}

// Extracts top main movements from a parsed workout, returns "Squat · Bench · Row · Press" style summary
// Skips warmups, cooldowns, finishers. Returns null if no exercises.
export function getMovementSummary(parsedWorkout, max = 5) {
  if (!parsedWorkout?.blocks?.length) return null;
  const skipLabels = ["COOLDOWN", "POST-RUN COOLDOWN", "WARMUP", "WARM-UP", "FINISHER"];
  const exerciseBlocks = parsedWorkout.blocks.filter(
    (block) => block.type === "exercises" && !skipLabels.some((label) => block.label?.toUpperCase().includes(label))
  );
  const names = [];
  for (const block of exerciseBlocks) {
    for (const ex of block.exercises || []) {
      // Keep the movement label clean for the inline editorial summary.
      const cleanName = String(ex?.name || "").split("—")[0].trim();
      if (cleanName && !names.includes(cleanName)) names.push(cleanName);
      if (names.length >= max) break;
    }
    if (names.length >= max) break;
  }
  return names.length ? names.join(" · ") : null;
}
