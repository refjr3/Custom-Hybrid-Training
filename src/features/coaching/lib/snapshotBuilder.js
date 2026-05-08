/**
 * Layer 2: Build an AthleteStateSnapshot from raw source data.
 * Pure function. Deterministic given DB state.
 *
 * Signal resolution priority (per field):
 *   recovery: whoop > oura > intervals
 *   hrv: intervals (avg) > whoop > oura
 *   rhr: intervals > whoop > oura
 *   sleep: whoop > oura > apple_health > manual
 *   training_load (CTL/ATL/TSB): intervals only
 *   subjective signals: manual_checkins only
 *
 * NOTE: Oura branches are forward-compatible. Oura sync isn't integrated yet — those
 * branches will always be null until Phase 15.x adds Oura. Don't simplify them away.
 *
 * Returns null fields where data unavailable. Includes signalAvailability and
 * signalFreshness for downstream confidence calculation.
 */

export async function buildAthleteStateSnapshot(supabase, userId, asOfDate = null, options = {}) {
  const debugState = resolveDebugState(options);
  const isDevRuntime = Boolean(import.meta.env?.DEV)
    || (typeof process !== "undefined" && process?.env?.NODE_ENV !== "production");
  // Dev-only: allow injecting synthetic snapshots for decision-engine testing.
  if (isDevRuntime && debugState) {
    return getDebugSnapshot(debugState, asOfDate);
  }

  const today = asOfDate || new Date().toISOString().slice(0, 10);
  const cutoff14d = daysAgo(today, 14);
  const cutoff7d = daysAgo(today, 7);

  const { data: metricsRows } = await supabase
    .from("unified_metrics")
    .select("date, source, recovery_score, readiness_score, hrv, hrv_rmssd, rhr, resting_hr, sleep_total_min, sleep_awake_min, sleep_deep_min, sleep_rem_min, sleep_light_min, strain, ctl, tsb, training_load, created_at, updated_at")
    .eq("user_id", userId)
    .gte("date", cutoff14d)
    .lte("date", today)
    .order("date", { ascending: true });

  const { data: checkin } = await supabase
    .from("manual_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  const { data: planRow } = await supabase
    .from("training_days")
    .select("am_session, am_session_type, note, calendar_date")
    .eq("user_id", userId)
    .eq("calendar_date", today)
    .maybeSingle();

  if ((!metricsRows || metricsRows.length === 0) && !checkin) {
    return emptySnapshot(today);
  }

  const dailyMerged = mergeMetricsByDay(metricsRows || []);
  const todayDaily = dailyMerged.find((day) => day.date === today) || null;
  const last7 = dailyMerged.filter((day) => day.date >= cutoff7d);

  const hrvBaseline = avg(last7.map((day) => day.hrv));
  const rhrBaseline = avg(last7.map((day) => day.rhr));
  const rhrCurrent = todayDaily?.rhr ?? null;

  return {
    asOfDate: today,

    recoveryScore: todayDaily?.recoveryScore ?? null,

    hrvCurrent: todayDaily?.hrv ?? null,
    hrvBaseline,
    hrvDeltaPercent: percentDelta(todayDaily?.hrv, hrvBaseline),

    rhrCurrent,
    rhrBaseline,
    rhrDeltaBpm:
      rhrCurrent != null && rhrBaseline != null
        ? Math.round(rhrCurrent - rhrBaseline)
        : null,

    sleepHoursLastNight: todayDaily?.sleepHours ?? null,
    sleepHoursTrailing7d: avg(last7.map((day) => day.sleepHours)),

    ctl: todayDaily?.ctl ?? null,
    atl: todayDaily?.atl ?? null,
    tsb: todayDaily?.tsb ?? null,

    strainToday: todayDaily?.strain ?? null,

    subjective: checkin
      ? {
          energy: checkin.energy,
          legs: checkin.legs,
          motivation: checkin.motivation,
          sleepQuality: checkin.sleep_quality,
          submittedAt: checkin.created_at,
        }
      : null,

    todaySession: planRow
      ? {
          session: planRow.am_session,
          sessionType: planRow.am_session_type,
          note: planRow.note,
          isRest: !planRow.am_session || /^rest$/i.test(String(planRow.am_session || "")),
        }
      : null,

    signalAvailability: {
      recovery: todayDaily?.recoveryScore != null,
      hrv: todayDaily?.hrv != null,
      rhr: todayDaily?.rhr != null,
      sleep: todayDaily?.sleepHours != null,
      load: todayDaily?.ctl != null,
      strain: todayDaily?.strain != null,
      subjective: !!checkin,
      planContext: !!planRow,
    },
    signalFreshness: {
      recovery: freshnessOf(todayDaily?.recoveryScore, last7, "recoveryScore"),
      hrv: freshnessOf(todayDaily?.hrv, last7, "hrv"),
      rhr: freshnessOf(todayDaily?.rhr, last7, "rhr"),
      sleep: freshnessOf(todayDaily?.sleepHours, last7, "sleepHours"),
      load: freshnessOf(todayDaily?.ctl, last7, "ctl"),
      strain: freshnessOf(todayDaily?.strain, last7, "strain"),
      subjective: checkin ? "today" : "stale",
    },
  };
}

function resolveDebugState(options) {
  if (options?.debugState) return String(options.debugState).toLowerCase();
  if (typeof window !== "undefined") {
    const query = new URLSearchParams(window.location.search);
    const fromQuery = query.get("debug_state");
    if (fromQuery) return String(fromQuery).toLowerCase();
  }
  return null;
}

function freshnessOf(todayValue, last7, fieldName) {
  if (todayValue != null) return "today";
  if ((last7 || []).find((day) => day?.[fieldName] != null)) return "within_week";
  return "stale";
}

function pickLatest(existingRow, nextRow) {
  if (!existingRow) return nextRow;
  if (!nextRow) return existingRow;
  const existingStamp = new Date(existingRow.updated_at || existingRow.created_at || 0).getTime();
  const nextStamp = new Date(nextRow.updated_at || nextRow.created_at || 0).getTime();
  if (Number.isFinite(nextStamp) && nextStamp > existingStamp) return nextRow;
  return existingRow;
}

function roundIfFinite(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (digits <= 0) return Math.round(number);
  const p = 10 ** digits;
  return Math.round(number * p) / p;
}

function clampSleepHours(totalMin, awakeMin) {
  const total = Number(totalMin);
  if (!Number.isFinite(total)) return null;
  const awake = Number.isFinite(Number(awakeMin)) ? Number(awakeMin) : 0;
  const asleep = Math.max(total - awake, 0);
  return roundIfFinite(asleep / 60, 1);
}

function mergeMetricsByDay(rows) {
  // Per-field source priority — extends Phase 13.2c logic.
  // Recovery: WHOOP > Oura > Intervals
  // HRV/RHR: Intervals > WHOOP > Oura
  // Sleep: WHOOP > Oura (forward-compatible)
  // Strain: WHOOP only (0-21 scale)
  // CTL/ATL/TSB: Intervals only
  const byDate = new Map();

  for (const row of rows || []) {
    const date = String(row?.date || "");
    if (!date) continue;
    if (!byDate.has(date)) {
      byDate.set(date, { date, whoop: null, intervals: null, oura: null, apple_health: null });
    }
    const source = String(row?.source || "").toLowerCase();
    const bucket = byDate.get(date);
    if (Object.prototype.hasOwnProperty.call(bucket, source)) {
      bucket[source] = pickLatest(bucket[source], row);
    }
  }

  return [...byDate.values()]
    .map(({ date, whoop: w, intervals: i, oura: o }) => ({
      date,
      // NOTE: Oura branch is intentionally retained for forward compatibility.
      recoveryScore: roundIfFinite(w?.recovery_score ?? w?.readiness_score ?? o?.readiness_score ?? i?.recovery_score, 0),
      hrv:
        roundIfFinite(i?.hrv, 0)
        ?? roundIfFinite(i?.hrv_rmssd, 0)
        ?? roundIfFinite(w?.hrv_rmssd, 0)
        ?? roundIfFinite(o?.hrv, 0),
      rhr:
        roundIfFinite(i?.rhr, 0)
        ?? roundIfFinite(i?.resting_hr, 0)
        ?? roundIfFinite(w?.resting_hr, 0)
        ?? roundIfFinite(o?.resting_hr, 0),
      sleepHours:
        clampSleepHours(w?.sleep_total_min, w?.sleep_awake_min)
        ?? clampSleepHours(o?.sleep_total_min, o?.sleep_awake_min),
      strain: (() => {
        const strain = Number(w?.strain);
        if (!Number.isFinite(strain) || strain > 25) return null;
        return roundIfFinite(strain, 1);
      })(),
      ctl: roundIfFinite(i?.ctl, 1),
      atl: roundIfFinite(i?.training_load, 1),
      tsb: roundIfFinite(i?.tsb, 1),
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function avg(arr) {
  const valid = (arr || []).map(Number).filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function percentDelta(current, baseline) {
  const currentNum = Number(current);
  const baselineNum = Number(baseline);
  if (!Number.isFinite(currentNum) || !Number.isFinite(baselineNum) || baselineNum === 0) return null;
  return ((currentNum - baselineNum) / baselineNum) * 100;
}

function daysAgo(dateStr, numberOfDays) {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() - numberOfDays);
  return date.toISOString().slice(0, 10);
}

function emptySnapshot(date) {
  return {
    asOfDate: date,
    recoveryScore: null,
    hrvCurrent: null,
    hrvBaseline: null,
    hrvDeltaPercent: null,
    rhrCurrent: null,
    rhrBaseline: null,
    rhrDeltaBpm: null,
    sleepHoursLastNight: null,
    sleepHoursTrailing7d: null,
    ctl: null,
    atl: null,
    tsb: null,
    strainToday: null,
    subjective: null,
    todaySession: null,
    signalAvailability: {
      recovery: false,
      hrv: false,
      rhr: false,
      sleep: false,
      load: false,
      strain: false,
      subjective: false,
      planContext: false,
    },
    signalFreshness: {
      recovery: "stale",
      hrv: "stale",
      rhr: "stale",
      sleep: "stale",
      load: "stale",
      strain: "stale",
      subjective: "stale",
    },
  };
}

/* ============================================================
 * Dev-only: synthetic snapshots for testing decision engine.
 * ============================================================ */
function getDebugSnapshot(state, date) {
  const today = date || new Date().toISOString().slice(0, 10);
  const baseAvailability = {
    recovery: true,
    hrv: true,
    rhr: true,
    sleep: true,
    load: true,
    strain: true,
    subjective: true,
    planContext: true,
  };
  const baseFreshness = {
    recovery: "today",
    hrv: "today",
    rhr: "today",
    sleep: "today",
    load: "today",
    strain: "today",
    subjective: "today",
  };

  const presets = {
    red: {
      asOfDate: today,
      recoveryScore: 28,
      hrvCurrent: 38,
      hrvBaseline: 50,
      hrvDeltaPercent: -24,
      rhrCurrent: 56,
      rhrBaseline: 48,
      rhrDeltaBpm: 8,
      sleepHoursLastNight: 5.6,
      sleepHoursTrailing7d: 6.8,
      ctl: 12,
      atl: 48,
      tsb: -36,
      strainToday: 18.5,
      subjective: {
        energy: 1,
        legs: "heavy",
        motivation: "low",
        sleepQuality: "poor",
        submittedAt: new Date().toISOString(),
      },
      todaySession: {
        session: "Threshold 6×800m",
        sessionType: "threshold",
        note: "",
        isRest: false,
      },
      signalAvailability: baseAvailability,
      signalFreshness: baseFreshness,
    },
    yellow: {
      asOfDate: today,
      recoveryScore: 55,
      hrvCurrent: 47,
      hrvBaseline: 50,
      hrvDeltaPercent: -6,
      rhrCurrent: 50,
      rhrBaseline: 48,
      rhrDeltaBpm: 2,
      sleepHoursLastNight: 7.1,
      sleepHoursTrailing7d: 7.0,
      ctl: 10,
      atl: 38,
      tsb: -23,
      strainToday: 12.0,
      subjective: {
        energy: 3,
        legs: "normal",
        motivation: "moderate",
        sleepQuality: "fair",
        submittedAt: new Date().toISOString(),
      },
      todaySession: {
        session: "Z2 Erg + Mobility",
        sessionType: "z2",
        note: "",
        isRest: false,
      },
      signalAvailability: baseAvailability,
      signalFreshness: baseFreshness,
    },
    green: {
      asOfDate: today,
      recoveryScore: 82,
      hrvCurrent: 56,
      hrvBaseline: 50,
      hrvDeltaPercent: 12,
      rhrCurrent: 44,
      rhrBaseline: 48,
      rhrDeltaBpm: -4,
      sleepHoursLastNight: 8.3,
      sleepHoursTrailing7d: 7.6,
      ctl: 12,
      atl: 22,
      tsb: 8,
      strainToday: 8.0,
      subjective: {
        energy: 5,
        legs: "fresh",
        motivation: "high",
        sleepQuality: "good",
        submittedAt: new Date().toISOString(),
      },
      todaySession: {
        session: "Threshold 6×800m",
        sessionType: "threshold",
        note: "",
        isRest: false,
      },
      signalAvailability: baseAvailability,
      signalFreshness: baseFreshness,
    },
    sparse: {
      asOfDate: today,
      recoveryScore: null,
      hrvCurrent: null,
      hrvBaseline: null,
      hrvDeltaPercent: null,
      rhrCurrent: null,
      rhrBaseline: null,
      rhrDeltaBpm: null,
      sleepHoursLastNight: null,
      sleepHoursTrailing7d: null,
      ctl: null,
      atl: null,
      tsb: null,
      strainToday: null,
      subjective: {
        energy: 3,
        legs: "normal",
        motivation: "moderate",
        sleepQuality: "fair",
        submittedAt: new Date().toISOString(),
      },
      todaySession: {
        session: "Z2 Erg",
        sessionType: "z2",
        note: "",
        isRest: false,
      },
      signalAvailability: {
        recovery: false,
        hrv: false,
        rhr: false,
        sleep: false,
        load: false,
        strain: false,
        subjective: true,
        planContext: true,
      },
      signalFreshness: {
        recovery: "stale",
        hrv: "stale",
        rhr: "stale",
        sleep: "stale",
        load: "stale",
        strain: "stale",
        subjective: "today",
      },
    },
  };

  return presets[state] || presets.yellow;
}
