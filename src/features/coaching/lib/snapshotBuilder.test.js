import assert from "node:assert/strict";
import test from "node:test";
import { buildAthleteStateSnapshot } from "./snapshotBuilder.js";

function createMockSupabase({
  unified_metrics = [],
  manual_checkins = [],
  training_days = [],
} = {}) {
  const tables = { unified_metrics, manual_checkins, training_days };

  const applyFilters = (rows, state) => {
    let result = [...rows];
    for (const [key, value] of Object.entries(state.eq || {})) {
      result = result.filter((row) => row?.[key] === value);
    }
    if (state.gte) {
      result = result.filter((row) => String(row?.[state.gte.key] || "") >= String(state.gte.value));
    }
    if (state.lte) {
      result = result.filter((row) => String(row?.[state.lte.key] || "") <= String(state.lte.value));
    }
    return result;
  };

  return {
    from(tableName) {
      const state = { tableName, eq: {}, gte: null, lte: null };
      return {
        select() {
          return this;
        },
        eq(key, value) {
          state.eq[key] = value;
          return this;
        },
        gte(key, value) {
          state.gte = { key, value };
          return this;
        },
        lte(key, value) {
          state.lte = { key, value };
          return this;
        },
        order() {
          const rows = applyFilters(tables[state.tableName] || [], state);
          return Promise.resolve({ data: rows, error: null });
        },
        maybeSingle() {
          const rows = applyFilters(tables[state.tableName] || [], state);
          return Promise.resolve({ data: rows[0] || null, error: null });
        },
      };
    },
  };
}

test("buildAthleteStateSnapshot: full data yields populated and fresh snapshot", async () => {
    const userId = "u-1";
    const today = "2026-05-08";
    const supabase = createMockSupabase({
      unified_metrics: [
        {
          user_id: userId,
          date: today,
          source: "whoop",
          recovery_score: 62,
          hrv_rmssd: 51,
          resting_hr: 48,
          sleep_total_min: 510,
          sleep_awake_min: 30,
          strain: 12.4,
        },
        {
          user_id: userId,
          date: today,
          source: "intervals",
          hrv: 50,
          rhr: 47,
          ctl: 33,
          training_load: 41,
          tsb: -8,
        },
        {
          user_id: userId,
          date: today,
          source: "strava",
          strain: 99,
        },
      ],
      manual_checkins: [
        {
          user_id: userId,
          date: today,
          energy: 4,
          legs: "normal",
          motivation: "high",
          sleep_quality: "good",
          created_at: "2026-05-08T08:00:00.000Z",
        },
      ],
      training_days: [
        {
          user_id: userId,
          calendar_date: today,
          am_session: "Threshold Run",
          am_session_type: "threshold",
          note: "Main quality day",
        },
      ],
    });

    const snapshot = await buildAthleteStateSnapshot(supabase, userId, today);

    assert.equal(snapshot.recoveryScore, 62);
    assert.equal(snapshot.hrvCurrent, 50);
    assert.equal(snapshot.rhrCurrent, 47);
    assert.equal(snapshot.sleepHoursLastNight, 8);
    assert.equal(snapshot.ctl, 33);
    assert.equal(snapshot.atl, 41);
    assert.equal(snapshot.tsb, -8);
    assert.ok(snapshot.subjective);
    assert.equal(Object.values(snapshot.signalAvailability).every(Boolean), true);
    assert.equal(Object.values(snapshot.signalFreshness).every((value) => value === "today"), true);
});

test("buildAthleteStateSnapshot: WHOOP-only data leaves load and subjective null", async () => {
    const userId = "u-2";
    const today = "2026-05-08";
    const supabase = createMockSupabase({
      unified_metrics: [
        {
          user_id: userId,
          date: today,
          source: "whoop",
          recovery_score: 55,
          hrv_rmssd: 45,
          resting_hr: 51,
          sleep_total_min: 465,
          sleep_awake_min: 35,
          strain: 9.9,
        },
      ],
    });

    const snapshot = await buildAthleteStateSnapshot(supabase, userId, today);

    assert.equal(snapshot.recoveryScore, 55);
    assert.equal(snapshot.hrvCurrent, 45);
    assert.equal(snapshot.rhrCurrent, 51);
    assert.equal(snapshot.sleepHoursLastNight, 7.2);
    assert.equal(snapshot.ctl, null);
    assert.equal(snapshot.atl, null);
    assert.equal(snapshot.tsb, null);
    assert.equal(snapshot.subjective, null);
});

test("buildAthleteStateSnapshot: manual-only checkin still returns subjective state", async () => {
    const userId = "u-3";
    const today = "2026-05-08";
    const supabase = createMockSupabase({
      manual_checkins: [
        {
          user_id: userId,
          date: today,
          energy: 3,
          legs: "normal",
          motivation: "moderate",
          sleep_quality: "fair",
          created_at: "2026-05-08T08:20:00.000Z",
        },
      ],
    });

    const snapshot = await buildAthleteStateSnapshot(supabase, userId, today);

    assert.equal(snapshot.recoveryScore, null);
    assert.equal(snapshot.hrvCurrent, null);
    assert.equal(snapshot.rhrCurrent, null);
    assert.equal(snapshot.sleepHoursLastNight, null);
    assert.equal(snapshot.ctl, null);
    assert.deepEqual(snapshot.subjective, {
      energy: 3,
      legs: "normal",
      motivation: "moderate",
      sleepQuality: "fair",
      submittedAt: "2026-05-08T08:20:00.000Z",
    });
    assert.equal(snapshot.signalAvailability.subjective, true);
    assert.equal(snapshot.signalAvailability.recovery, false);
});

test("buildAthleteStateSnapshot: no data returns empty snapshot", async () => {
    const snapshot = await buildAthleteStateSnapshot(
      createMockSupabase(),
      "u-4",
      "2026-05-08",
    );

    assert.equal(snapshot.recoveryScore, null);
    assert.equal(snapshot.subjective, null);
    assert.equal(Object.values(snapshot.signalAvailability).every((value) => value === false), true);
    assert.equal(Object.values(snapshot.signalFreshness).every((value) => value === "stale"), true);
});

test("buildAthleteStateSnapshot: debug state injection returns synthetic preset", async () => {
    const snapshot = await buildAthleteStateSnapshot(
      createMockSupabase(),
      "u-5",
      "2026-05-08",
      { debugState: "red" },
    );

    assert.equal(snapshot.recoveryScore, 28);
    assert.equal(snapshot.tsb, -36);
    assert.equal(snapshot.subjective?.legs, "heavy");
});
