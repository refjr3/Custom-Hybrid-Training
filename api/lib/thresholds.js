// Each evaluator returns { color: 'green'|'amber'|'red', text: '...' }

export function evaluateReadiness(score) {
  if (score == null) return null;
  if (score >= 67) return { color: "green", text: "Optimal" };
  if (score >= 34) return { color: "amber", text: "Compromised" };
  return { color: "red", text: "Low" };
}

export function evaluateHRV(value, baseline) {
  if (value == null || baseline == null) return null;
  const pctDelta = ((value - baseline) / baseline) * 100;
  if (pctDelta >= -5) {
    return { color: "green", text: `${pctDelta >= 0 ? "+" : ""}${pctDelta.toFixed(0)}% vs baseline` };
  }
  if (pctDelta >= -15) return { color: "amber", text: `${pctDelta.toFixed(0)}% below baseline` };
  return { color: "red", text: `${pctDelta.toFixed(0)}% below baseline` };
}

export function evaluateRHR(value, baseline) {
  if (value == null || baseline == null) return null;
  const delta = value - baseline;
  if (delta <= 3) return { color: "green", text: "Normal" };
  if (delta <= 8) return { color: "amber", text: `+${delta.toFixed(0)} bpm above baseline` };
  return { color: "red", text: `+${delta.toFixed(0)} bpm elevated` };
}

export function evaluateSleepDuration(minutes) {
  if (minutes == null) return null;
  const hours = minutes / 60;
  if (hours >= 7) return { color: "green", text: "Adequate" };
  if (hours >= 6) return { color: "amber", text: "Short" };
  return { color: "red", text: "Insufficient" };
}

export function evaluateSleepStage(value, baseline, _label) {
  if (value == null || baseline == null) return null;
  const delta = value - baseline;
  if (Math.abs(delta) <= 10) return { color: "green", text: "Typical" };
  if (delta < -10) return { color: "amber", text: `${Math.abs(delta).toFixed(0)}min below baseline` };
  return { color: "green", text: `${delta.toFixed(0)}min above baseline` };
}

export function evaluateSleepAwake(value, baseline) {
  if (value == null) return null;
  const baseValue = baseline ?? 20;
  if (value <= baseValue + 10) return { color: "green", text: "Normal" };
  if (value <= baseValue + 25) return { color: "amber", text: `${(value - baseValue).toFixed(0)}min above baseline` };
  return { color: "red", text: "Highly disrupted" };
}

export function evaluateSleepScore(score) {
  if (score == null) return null;
  if (score >= 80) return { color: "green", text: "Good" };
  if (score >= 60) return { color: "amber", text: "Fair" };
  return { color: "red", text: "Poor" };
}

export function evaluateZ2Weekly(weekMinutes, target = 240, dayOfWeek, _baseline) {
  if (weekMinutes == null) return null;

  // Proration: expected volume so far based on day of week (Mon=1 ... Sun=7)
  const dayIdx = dayOfWeek === 0 ? 7 : dayOfWeek;
  const expectedByNow = (target / 7) * dayIdx;
  const pctOfTarget = (weekMinutes / target) * 100;
  const pctOfPace = expectedByNow > 0 ? (weekMinutes / expectedByNow) * 100 : 0;

  if (pctOfPace >= 80) return { color: "green", text: `${Math.round(pctOfTarget)}% of target`, pctOfPace };
  if (pctOfPace >= 50) return { color: "amber", text: `Behind pace · ${Math.round(pctOfTarget)}% of target`, pctOfPace };
  return { color: "red", text: `Well behind · ${Math.round(pctOfTarget)}% of target`, pctOfPace };
}
