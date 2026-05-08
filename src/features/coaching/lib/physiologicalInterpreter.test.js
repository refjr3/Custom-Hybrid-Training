import assert from "node:assert/strict";
import test from "node:test";
import { interpretPhysiologicalStates, INTERPRETER_VERSION } from "./physiologicalInterpreter.js";

test("physiological interpreter: all fresh signals map to optimistic states", () => {
  const snapshot = {
    hrvDeltaPercent: 6,
    rhrDeltaBpm: -3,
    sleepHoursLastNight: 8.0,
    tsb: 10,
    subjective: { energy: 5, legs: "fresh", motivation: "high" },
  };

  const states = interpretPhysiologicalStates(snapshot);
  assert.equal(states.nervousSystem.state, "fresh");
  assert.equal(states.aerobic.state, "recovering");
  assert.equal(states.sleep.state, "excellent");
  assert.equal(states.fatigue.state, "recovered");
  assert.equal(states.subjective.state, "strong");
  assert.equal(states.interpreterVersion, INTERPRETER_VERSION);
});

test("physiological interpreter: stressed signals map to caution states", () => {
  const snapshot = {
    hrvDeltaPercent: -15,
    rhrDeltaBpm: 6,
    sleepHoursLastNight: 5.5,
    tsb: -30,
    subjective: { energy: 1, legs: "heavy", motivation: "low" },
  };

  const states = interpretPhysiologicalStates(snapshot);
  assert.equal(states.nervousSystem.state, "suppressed");
  assert.equal(states.aerobic.state, "strained");
  assert.equal(states.sleep.state, "insufficient");
  assert.equal(states.fatigue.state, "heavy");
  assert.equal(states.subjective.state, "flat");
});

test("physiological interpreter: mixed signals preserve mixed state output", () => {
  const snapshot = {
    hrvDeltaPercent: -12,
    rhrDeltaBpm: 0,
    sleepHoursLastNight: 8.3,
    tsb: 0,
    subjective: null,
  };

  const states = interpretPhysiologicalStates(snapshot);
  assert.equal(states.nervousSystem.state, "suppressed");
  assert.equal(states.aerobic.state, "stable");
  assert.equal(states.sleep.state, "excellent");
  assert.equal(states.fatigue.state, "neutral");
  assert.equal(states.subjective.state, "unknown");
});

test("physiological interpreter: no data returns unknown for every domain", () => {
  const states = interpretPhysiologicalStates({
    hrvDeltaPercent: null,
    rhrDeltaBpm: null,
    sleepHoursLastNight: null,
    tsb: null,
    subjective: null,
  });

  assert.equal(states.nervousSystem.state, "unknown");
  assert.equal(states.aerobic.state, "unknown");
  assert.equal(states.sleep.state, "unknown");
  assert.equal(states.fatigue.state, "unknown");
  assert.equal(states.subjective.state, "unknown");
});
