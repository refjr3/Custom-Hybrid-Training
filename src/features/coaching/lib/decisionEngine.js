/**
 * Layer 4: Coaching decision engine.
 * Consumes physiological states + snapshot context. Produces coaching decision.
 *
 * Optimization principle: AVOID OBVIOUSLY BAD RECOMMENDATIONS.
 * We don't aim for perfect optimization; we aim to catch fatigue mismatches and
 * explain the recommendation in practical coaching language.
 */

export const ENGINE_VERSION = "1.0.0";

export function evaluateTrainingCompatibility(states, snapshot) {
  const decision = computeDecisionState(states, snapshot);
  const rationale = generateRationale(decision, states, snapshot);
  const confidence = computeConfidence(snapshot);
  const signalsConsidered = listSignalsConsidered(states, snapshot);

  return {
    state: decision.state,
    label: decision.label,
    rationale,
    fatigueOverride: decision.fatigueOverride === true,
    confidence,
    signalsConsidered,
    engineVersion: ENGINE_VERSION,
  };
}

function computeDecisionState(states, snapshot) {
  if (states.aerobic.state === "strained" && states.nervousSystem.state === "suppressed") {
    return { state: "red", label: "Back Off Today" };
  }
  if (states.sleep.state === "insufficient" && states.subjective.state === "flat") {
    return { state: "red", label: "Back Off Today" };
  }

  if (states.fatigue.state === "heavy") {
    const otherNegatives = [
      states.nervousSystem.state === "suppressed",
      states.aerobic.state === "strained",
      states.sleep.state === "insufficient",
      states.subjective.state === "flat",
    ].filter(Boolean).length;
    if (otherNegatives >= 1) {
      return { state: "red", label: "Back Off Today" };
    }
    return { state: "yellow", label: "Hold the Line", fatigueOverride: true };
  }

  const greenSignals = [
    states.nervousSystem.state === "stable" || states.nervousSystem.state === "fresh",
    states.aerobic.state !== "strained",
    states.sleep.state !== "insufficient",
    states.fatigue.state !== "heavy" && states.fatigue.state !== "building",
    // 'unknown' passes this; lack of check-in should not block GREEN.
    states.subjective.state !== "flat",
  ];

  if (greenSignals.every(Boolean)) {
    return { state: "green", label: "Ready to Push" };
  }

  return { state: "yellow", label: "Hold the Line" };
}

function generateRationale(decision, states, snapshot) {
  const session = snapshot.todaySession;
  const isLowIntensityPlan = !!session
    && (session.sessionType === "recovery"
      || session.sessionType === "z2"
      || session.isRest === true);

  const stressors = [];
  const positives = [];

  if (states.nervousSystem.state === "suppressed") stressors.push("your nervous system is showing stress");
  if (states.aerobic.state === "strained") stressors.push("your resting heart rate is elevated");
  if (states.sleep.state === "insufficient") stressors.push("sleep was short last night");
  if (states.fatigue.state === "heavy") stressors.push("accumulated fatigue is high");
  if (states.subjective.state === "flat") stressors.push("you reported low energy");

  if (states.nervousSystem.state === "fresh") positives.push("nervous system is fresh");
  if (states.aerobic.state === "recovering") positives.push("cardiovascular recovery is strong");
  if (states.sleep.state === "excellent") positives.push("sleep was solid");
  if (states.fatigue.state === "recovered" || states.fatigue.state === "fresh") positives.push("you're well-rested");
  if (states.subjective.state === "strong") positives.push("you reported feeling good");

  if (decision.state === "red") {
    let rationale = `Recovery markers are stressed — ${stressors.slice(0, 2).join(" and ")}. `;
    if (isLowIntensityPlan && session?.session) {
      rationale += `Today's planned ${session.session} is light enough to absorb, but consider scaling back further or moving it.`;
    } else if (session?.session) {
      rationale += `Today's planned ${session.session} may push past your current capacity. Consider reducing intensity or swapping for an easy aerobic day.`;
    } else {
      rationale += "Consider reducing intensity or swapping for an easy aerobic day.";
    }
    return rationale;
  }

  if (decision.state === "green") {
    let rationale = positives.length
      ? `${capitalize(positives[0])}${positives[1] ? ` and ${positives[1]}.` : "."}`
      : "All systems stable.";
    rationale += ` Today's planned ${session?.session || "training"} aligns well with your current state.`;
    return rationale;
  }

  if (decision.fatigueOverride) {
    return "Accumulated load is high, but recovery markers are strong. Execute the planned session — keep intensity honest, skip optional add-ons.";
  }

  if (stressors.length && isLowIntensityPlan && session?.session) {
    return `${capitalize(stressors[0])}, but today's ${session.session} is appropriate for current state. Complete as prescribed.`;
  }
  if (stressors.length) {
    return `${capitalize(stressors[0])}, but manageable. Complete today's session as prescribed — avoid adding extra intensity.`;
  }
  return "Mixed signals across recovery markers. Complete today's session as prescribed — listen to your body during warmup.";
}

function computeConfidence(snapshot) {
  const signals = ["recovery", "hrv", "rhr", "sleep", "load", "subjective"];
  const presentCount = signals.filter((signal) => snapshot.signalAvailability?.[signal]).length;

  let score = (presentCount / signals.length) * 100;
  const freshCount = Object.values(snapshot.signalFreshness || {}).filter((freshness) => freshness === "today").length;

  if (freshCount === 0 && presentCount > 0) score *= 0.6;
  if (presentCount === 1 && snapshot.signalAvailability?.subjective) {
    // Subjective-only mode should stay low confidence, but not unreadably low.
    score = Math.min(Math.max(score, 35), 50);
  }

  score = Math.round(score);

  if (score >= 75) {
    return { score, label: "high", reason: "Signals consistent across recovery, sleep, and load." };
  }
  if (score >= 50) {
    return { score, label: "medium", reason: "Limited or partial data — interpretation is directional." };
  }
  if (score >= 30) {
    return { score, label: "low", reason: "Few signals available. Connect a wearable for deeper analysis." };
  }
  return { score, label: "very_low", reason: "Insufficient data for a reliable recommendation." };
}

function listSignalsConsidered(states, snapshot) {
  const list = [];

  if (snapshot.recoveryScore != null) {
    list.push({
      name: "Recovery",
      value: snapshot.recoveryScore,
      status: classifyRecoveryStatus(snapshot.recoveryScore),
    });
  }
  if (snapshot.hrvDeltaPercent != null) {
    list.push({
      name: "HRV trend",
      value: `${snapshot.hrvDeltaPercent > 0 ? "+" : ""}${Math.round(snapshot.hrvDeltaPercent)}% vs 7d`,
      status: states.nervousSystem.state,
    });
  }
  if (snapshot.rhrDeltaBpm != null) {
    list.push({
      name: "Resting HR",
      value: `${snapshot.rhrDeltaBpm > 0 ? "+" : ""}${snapshot.rhrDeltaBpm} bpm vs baseline`,
      status: states.aerobic.state,
    });
  }
  if (snapshot.sleepHoursLastNight != null) {
    list.push({
      name: "Sleep",
      value: `${snapshot.sleepHoursLastNight}h`,
      status: states.sleep.state,
    });
  }
  if (snapshot.tsb != null) {
    list.push({
      name: "Training load",
      value: states.fatigue.state,
      status: states.fatigue.state,
    });
  }
  if (snapshot.subjective) {
    list.push({
      name: "Check-in",
      value: states.subjective.state,
      status: states.subjective.state,
    });
  }

  return list;
}

function classifyRecoveryStatus(score) {
  if (score >= 67) return "strong";
  if (score >= 34) return "moderate";
  return "low";
}

function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
