import assert from "node:assert/strict";
import test from "node:test";
import { buildAthleteStateSnapshot } from "./snapshotBuilder.js";
import { interpretPhysiologicalStates } from "./physiologicalInterpreter.js";
import { evaluateTrainingCompatibility } from "./decisionEngine.js";

async function evaluateDebugState(state) {
  const snapshot = await buildAthleteStateSnapshot(null, "debug-user", "2026-05-08", { debugState: state });
  const states = interpretPhysiologicalStates(snapshot);
  const decision = evaluateTrainingCompatibility(states, snapshot);
  return { snapshot, states, decision };
}

test("decision engine: red debug state maps to Back Off Today", async () => {
  const { decision } = await evaluateDebugState("red");
  assert.equal(decision.state, "red");
  assert.equal(decision.label, "Back Off Today");
});

test("decision engine: green debug state maps to Ready to Push", async () => {
  const { decision } = await evaluateDebugState("green");
  assert.equal(decision.state, "green");
  assert.equal(decision.label, "Ready to Push");
});

test("decision engine: yellow debug state maps to Hold the Line", async () => {
  const { decision } = await evaluateDebugState("yellow");
  assert.equal(decision.state, "yellow");
  assert.equal(decision.label, "Hold the Line");
});

test("decision engine: sparse debug state lowers confidence to low or medium", async () => {
  const { decision } = await evaluateDebugState("sparse");
  assert.ok(["low", "medium"].includes(decision.confidence.label));
  assert.ok(decision.confidence.score <= 60);
});

test("decision engine: full data confidence remains high", async () => {
  const { decision } = await evaluateDebugState("green");
  assert.equal(decision.confidence.label, "high");
  assert.ok(decision.confidence.score >= 75);
});
