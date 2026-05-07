/* global Map */

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function roundOrNull(value, digits = 0) {
  const n = toNumberOrNull(value);
  if (n == null) return null;
  if (digits <= 0) return Math.round(n);
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function truncateToTenths(value) {
  const n = toNumberOrNull(value);
  if (n == null) return null;
  return Math.floor(n * 10) / 10;
}

function pickPreferredRow(existingRow, nextRow) {
  if (!existingRow) return nextRow;
  if (!nextRow) return existingRow;

  const existingPrimary = existingRow?.is_primary === true;
  const nextPrimary = nextRow?.is_primary === true;
  if (existingPrimary !== nextPrimary) {
    return nextPrimary ? nextRow : existingRow;
  }

  const existingStamp = new Date(existingRow?.updated_at || existingRow?.created_at || 0).getTime();
  const nextStamp = new Date(nextRow?.updated_at || nextRow?.created_at || 0).getTime();
  if (Number.isFinite(existingStamp) && Number.isFinite(nextStamp) && nextStamp > existingStamp) {
    return nextRow;
  }
  return existingRow;
}

export function mergeRowsByDay(rows) {
  const byDate = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const date = String(row?.date || "");
    if (!date) continue;

    if (!byDate.has(date)) {
      byDate.set(date, {
        whoop: null,
        intervals: null,
        strava: null,
      });
    }

    const source = String(row?.source || "").toLowerCase();
    if (source === "whoop" || source === "intervals" || source === "strava") {
      const bucket = byDate.get(date);
      bucket[source] = pickPreferredRow(bucket[source], row);
    }
  }

  const merged = [];
  for (const [date, sources] of byDate.entries()) {
    const whoop = sources.whoop;
    const intervals = sources.intervals;

    const whoopRecovery = toNumberOrNull(whoop?.recovery_score) ?? toNumberOrNull(whoop?.readiness_score);
    const intervalsRecovery = toNumberOrNull(intervals?.recovery_score);

    const hrv = intervals?.hrv != null
      ? roundOrNull(intervals.hrv, 0)
      : whoop?.hrv_rmssd != null
        ? roundOrNull(whoop.hrv_rmssd, 0)
        : null;

    const rhr = intervals?.rhr != null
      ? roundOrNull(intervals.rhr, 0)
      : whoop?.resting_hr != null
        ? roundOrNull(whoop.resting_hr, 0)
        : null;

    const sleepAwakeMin = toNumberOrNull(whoop?.sleep_awake_min);
    const sleepDeepMin = toNumberOrNull(whoop?.sleep_deep_min);
    const sleepRemMin = toNumberOrNull(whoop?.sleep_rem_min);
    const sleepLightMin = toNumberOrNull(whoop?.sleep_light_min);

    let sleepHours = null;
    if (whoop?.sleep_total_min != null) {
      const totalMin = toNumberOrNull(whoop.sleep_total_min);
      const awakeMin = sleepAwakeMin || 0;
      const asleepMin = totalMin != null ? Math.max(totalMin - awakeMin, 0) : null;
      sleepHours = asleepMin != null ? truncateToTenths(asleepMin / 60) : null;
    }

    const whoopStrain = toNumberOrNull(whoop?.strain);
    const strain = whoopStrain != null && whoopStrain <= 25
      ? roundOrNull(whoopStrain, 1)
      : null;

    merged.push({
      date,
      recoveryScore: whoopRecovery ?? intervalsRecovery ?? null,
      hrv,
      rhr,
      sleepHours,
      sleepAwakeMin: roundOrNull(sleepAwakeMin, 0),
      sleepDeepMin: roundOrNull(sleepDeepMin, 0),
      sleepRemMin: roundOrNull(sleepRemMin, 0),
      sleepLightMin: roundOrNull(sleepLightMin, 0),
      strain,
      ctl: toNumberOrNull(intervals?.ctl),
      atl: toNumberOrNull(intervals?.training_load),
      tsb: toNumberOrNull(intervals?.tsb),
    });
  }

  return merged.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
