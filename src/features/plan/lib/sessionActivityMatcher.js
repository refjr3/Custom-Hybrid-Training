import { parseWeekDates } from "./weekDateUtils.js";

const DAY_ORDER = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };

function formatYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toIsoDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const fromDateTime = raw.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (fromDateTime) return fromDateTime[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatYmd(parsed);
}

function parseDayLabelToIso(label, yearHint) {
  if (!label) return null;
  const parsed = new Date(`${String(label).trim()} ${yearHint}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatYmd(parsed);
}

function inferWeekYearHint(week) {
  const nowYear = new Date().getFullYear();
  const fromRange = parseWeekDates(week?.dates, nowYear)?.start?.getFullYear();
  return fromRange || nowYear;
}

function resolveDayIndex(day, fallbackIndex) {
  const key = String(day?.day_name || day?.day || "").trim().toUpperCase().slice(0, 3);
  const mapped = DAY_ORDER[key];
  if (Number.isInteger(mapped)) return mapped;
  return Number.isInteger(fallbackIndex) ? fallbackIndex : 0;
}

function resolveCalendarDate(week, day, dayIndex) {
  const explicit =
    toIsoDate(day?.calendar_date)
    || toIsoDate(day?._iso)
    || toIsoDate(day?.date)
    || toIsoDate(day?.start_time);
  if (explicit) return explicit;

  const yearHint = inferWeekYearHint(week);
  const fromLabel = parseDayLabelToIso(day?.date_label, yearHint);
  if (fromLabel) return fromLabel;

  const weekRange = parseWeekDates(week?.dates, yearHint);
  if (weekRange?.start) {
    const d = new Date(weekRange.start);
    d.setDate(d.getDate() + resolveDayIndex(day, dayIndex));
    return formatYmd(d);
  }

  return null;
}

function normalizeWeeks(weeks) {
  return (Array.isArray(weeks) ? weeks : []).map((week) => {
    const days = Array.isArray(week?.days) ? week.days : [];
    const nextDays = days.map((day, dayIndex) => ({
      ...day,
      calendar_date: resolveCalendarDate(week, day, dayIndex),
    }));
    return { ...week, days: nextDays };
  });
}

/**
 * Match planned training_days against synced activities.
 * Returns a Map of training_day_id → { matched, source, activity_id, confidence }.
 */
export async function matchSessionsToActivities(supabase, userId, weeks) {
  if (!supabase || !userId) return new Map();

  const normalizedWeeks = normalizeWeeks(weeks);
  const allDays = normalizedWeeks.flatMap((w) => w.days || []).filter((d) => d?.id);
  if (!allDays.length) return new Map();

  const plannedDates = allDays
    .map((d) => d.calendar_date)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d)));
  if (!plannedDates.length) return new Map();

  plannedDates.sort();
  const minDate = plannedDates[0];
  const maxDate = plannedDates[plannedDates.length - 1];

  const { data: activities, error } = await supabase
    .from("garmin_activities")
    .select("activity_id, activity_type, start_time, duration_seconds, distance_meters, source")
    .eq("user_id", userId)
    .gte("start_time", `${minDate}T00:00:00`)
    .lte("start_time", `${maxDate}T23:59:59`)
    .gt("duration_seconds", 0);

  if (error || !Array.isArray(activities)) {
    if (error) console.error("[sessionActivityMatcher] query error:", error);
    return new Map();
  }

  const activitiesByDate = new Map();
  for (const act of activities) {
    const dateKey = toIsoDate(act?.start_time);
    if (!dateKey) continue;
    if (!activitiesByDate.has(dateKey)) activitiesByDate.set(dateKey, []);
    activitiesByDate.get(dateKey).push(act);
  }

  const matches = new Map();
  for (const week of normalizedWeeks) {
    for (const day of week.days || []) {
      if (!day?.id) continue;
      const dayDate = day.calendar_date;
      const acts = dayDate ? activitiesByDate.get(dayDate) || [] : [];
      const isRest = !day?.am_session || /^rest$/i.test(String(day.am_session));

      if (isRest) {
        matches.set(day.id, { matched: false, isRest: true });
        continue;
      }

      if (acts.length > 0) {
        const primary = [...acts].sort(
          (a, b) => Number(b?.duration_seconds || 0) - Number(a?.duration_seconds || 0),
        )[0];
        matches.set(day.id, {
          matched: true,
          source: primary?.source || "garmin",
          activity_id: primary?.activity_id,
          activity_type: primary?.activity_type,
          duration_seconds: primary?.duration_seconds,
          confidence: "auto",
        });
      } else {
        matches.set(day.id, { matched: false });
      }
    }
  }

  return matches;
}

export function getCompletionState(day, matches) {
  if (!day) return { complete: false };
  if (day?.am_completed_at) return { complete: true, source: "manual" };

  const dayId = day?.id;
  const matched = matches?.get?.(dayId) || matches?.get?.(String(dayId));
  if (matched?.matched) {
    return {
      complete: true,
      source: matched.source || "activity",
      auto: true,
      activity_id: matched.activity_id,
    };
  }
  return { complete: false };
}
