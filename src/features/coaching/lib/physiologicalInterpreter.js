/**
 * Layer 3: Interpret physiological states from a Layer 2 snapshot.
 * Pure function. Each rule is named, versioned, and documented.
 *
 * Output states use coaching language, not diagnosis language.
 * Avoid: "overreached", "compromised", "deficient"
 * Prefer: "elevated", "strained", "accumulating", "heavy", "suppressed", "stable", "fresh"
 */

export const INTERPRETER_VERSION = "1.0.0";

export function interpretPhysiologicalStates(snapshot) {
  return {
    nervousSystem: interpretNervousSystem(snapshot),
    aerobic: interpretAerobic(snapshot),
    sleep: interpretSleep(snapshot),
    fatigue: interpretFatigue(snapshot),
    subjective: interpretSubjective(snapshot),
    interpreterVersion: INTERPRETER_VERSION,
  };
}

/* ============================================================
 * NervousSystem rules
 * ============================================================ */
function interpretNervousSystem(snapshot) {
  if (snapshot.hrvDeltaPercent == null) {
    return { state: "unknown", rule: null, reason: "No HRV data available." };
  }

  if (snapshot.hrvDeltaPercent <= -10) {
    return {
      state: "suppressed",
      rule: "NervousSystemSuppressed_v1",
      reason: `HRV is ${Math.abs(Math.round(snapshot.hrvDeltaPercent))}% below your 7-day average.`,
    };
  }

  if (snapshot.hrvDeltaPercent >= 5) {
    return {
      state: "fresh",
      rule: "NervousSystemFresh_v1",
      reason: `HRV is ${Math.round(snapshot.hrvDeltaPercent)}% above your 7-day average.`,
    };
  }

  return {
    state: "stable",
    rule: "NervousSystemStable_v1",
    reason: "HRV is within your normal range.",
  };
}

/* ============================================================
 * Aerobic rules
 * ============================================================ */
function interpretAerobic(snapshot) {
  if (snapshot.rhrDeltaBpm == null) {
    return { state: "unknown", rule: null, reason: "No RHR data." };
  }

  if (snapshot.rhrDeltaBpm >= 5) {
    return {
      state: "strained",
      rule: "AerobicStrained_v1",
      reason: `RHR is ${snapshot.rhrDeltaBpm} bpm above your baseline.`,
    };
  }

  if (snapshot.rhrDeltaBpm <= -3) {
    return {
      state: "recovering",
      rule: "AerobicRecovering_v1",
      reason: `RHR is ${Math.abs(snapshot.rhrDeltaBpm)} bpm below baseline — strong recovery signal.`,
    };
  }

  return {
    state: "stable",
    rule: "AerobicStable_v1",
    reason: "RHR is within normal range.",
  };
}

/* ============================================================
 * Sleep rules
 * ============================================================ */
function interpretSleep(snapshot) {
  if (snapshot.sleepHoursLastNight == null) {
    return { state: "unknown", rule: null, reason: "No sleep data." };
  }

  if (snapshot.sleepHoursLastNight < 6.5) {
    return {
      state: "insufficient",
      rule: "SleepInsufficient_v1",
      reason: `Only ${snapshot.sleepHoursLastNight} hours last night.`,
    };
  }

  if (snapshot.sleepHoursLastNight >= 8) {
    return {
      state: "excellent",
      rule: "SleepExcellent_v1",
      reason: `${snapshot.sleepHoursLastNight} hours of solid sleep.`,
    };
  }

  return {
    state: "adequate",
    rule: "SleepAdequate_v1",
    reason: `${snapshot.sleepHoursLastNight} hours — within target range.`,
  };
}

/* ============================================================
 * Fatigue rules (TSB-based with coaching language)
 * ============================================================ */
function interpretFatigue(snapshot) {
  if (snapshot.tsb == null) {
    return { state: "unknown", rule: null, reason: "No training load data." };
  }

  if (snapshot.tsb > 25) {
    return { state: "fresh", rule: "FatigueFresh_v1", reason: "You are well rested." };
  }
  if (snapshot.tsb >= 5) {
    return { state: "recovered", rule: "FatigueRecovered_v1", reason: "Recovered from recent load." };
  }
  if (snapshot.tsb >= -5) {
    return { state: "neutral", rule: "FatigueNeutral_v1", reason: "Equilibrium between load and recovery." };
  }
  if (snapshot.tsb >= -25) {
    return { state: "building", rule: "FatigueBuilding_v1", reason: "Productive accumulated load." };
  }
  return { state: "heavy", rule: "FatigueHeavy_v1", reason: "High accumulated fatigue. Risk of diminishing returns." };
}

/* ============================================================
 * Subjective rules (from manual_checkins)
 * ============================================================ */
function interpretSubjective(snapshot) {
  if (!snapshot.subjective) {
    return { state: "unknown", rule: null, reason: "No check-in today." };
  }

  const { energy, legs, motivation } = snapshot.subjective;
  const legsScore = legs === "fresh" ? 5 : legs === "normal" ? 3 : 1;
  const motivationScore = motivation === "high" ? 5 : motivation === "moderate" ? 3 : 1;
  const composite = (Number(energy || 0) + legsScore + motivationScore) / 3;

  if (composite >= 4) {
    return { state: "strong", rule: "SubjectiveStrong_v1", reason: "Athlete reports strong feel." };
  }
  if (composite <= 2) {
    return { state: "flat", rule: "SubjectiveFlat_v1", reason: "Athlete reports low energy or motivation." };
  }
  return { state: "neutral", rule: "SubjectiveNeutral_v1", reason: "Athlete reports moderate feel." };
}
