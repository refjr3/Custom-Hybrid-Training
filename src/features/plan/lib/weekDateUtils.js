import { formatEasternYmdFromDate } from "../../../../lib/getLocalToday.js";

// Parse "Apr 27 – May 3" or "May 4 – May 10" (en/em dash separator, no year)
// Returns { start: Date, end: Date } using a year hint.
export function parseWeekDates(datesStr, yearHint) {
  if (!datesStr) return null;
  const normalized = String(datesStr).replace(/[–—-]/g, "|");
  const parts = normalized.split("|").map((s) => s.trim());
  if (parts.length !== 2) return null;

  const year = yearHint || new Date().getFullYear();
  const startStr = `${parts[0]} ${year}`;
  let endStr = `${parts[1]} ${year}`;

  // If end part has no month token, inherit from start.
  const endHasMonth = /^[A-Za-z]+/.test(parts[1]);
  if (!endHasMonth) {
    const startMonth = parts[0].match(/^[A-Za-z]+/)?.[0] || "";
    endStr = `${startMonth} ${parts[1]} ${year}`;
  }

  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  end.setHours(23, 59, 59, 999);

  // Dec -> Jan crossover.
  if (end < start) end.setFullYear(end.getFullYear() + 1);
  return { start, end };
}

// Returns 0-6 for Mon-Sun
export function getDayIndex(date) {
  const day = date.getDay(); // 0=Sun ... 6=Sat
  return day === 0 ? 6 : day - 1;
}

// Find the week that contains today's date.
// Falls back: before block -> first week, after block -> last week.
export function getCurrentWeek(weeks, today = new Date()) {
  if (!Array.isArray(weeks) || weeks.length === 0) return null;
  const yearHint = today.getFullYear();
  const todayIso = formatEasternYmdFromDate(today);

  for (const week of weeks) {
    const range = parseWeekDates(week?.dates, yearHint) || deriveRangeFromDays(week, yearHint);
    if (!range) continue;
    const startIso = formatEasternYmdFromDate(range.start);
    const endIso = formatEasternYmdFromDate(range.end);
    if (todayIso >= startIso && todayIso <= endIso) {
      return { week, range, todayDayIndex: getDayIndex(today) };
    }
  }

  for (const week of weeks) {
    const range = parseWeekDates(week?.dates, yearHint) || deriveRangeFromDays(week, yearHint);
    if (!range) continue;
    const startIso = formatEasternYmdFromDate(range.start);
    if (startIso > todayIso) {
      return { week, range, todayDayIndex: 0, fallback: "before_block" };
    }
  }

  const lastWeek = weeks[weeks.length - 1];
  return {
    week: lastWeek,
    range: parseWeekDates(lastWeek?.dates, yearHint) || deriveRangeFromDays(lastWeek, yearHint),
    todayDayIndex: 6,
    fallback: "after_block",
  };
}

export function computePhaseProgress(weeks, currentWeekOrder, phases) {
  if (!Array.isArray(phases) || !phases.length || !currentWeekOrder) return null;
  const weekOrder = Number(currentWeekOrder);
  if (!Number.isFinite(weekOrder)) return null;

  const phase =
    phases.find((p) => {
      const start = Number(p?.start_week);
      const end = Number(p?.end_week);
      return Number.isFinite(start) && Number.isFinite(end) && weekOrder >= start && weekOrder <= end;
    }) || null;

  if (!phase) return null;

  const start = Number(phase.start_week);
  const end = Number(phase.end_week);
  const phaseTotalWeeks = end - start + 1;
  const currentWeekInPhase = weekOrder - start + 1;
  const phaseProgressPercent = Math.max(
    0,
    Math.min(100, (currentWeekInPhase / Math.max(phaseTotalWeeks, 1)) * 100),
  );

  let phaseStatusLabel = `Wk ${currentWeekInPhase} of ${phaseTotalWeeks}`;
  if (currentWeekInPhase === phaseTotalWeeks) phaseStatusLabel += " · Final week";
  else if (currentWeekInPhase / phaseTotalWeeks >= 0.5) phaseStatusLabel += " · Halfway";

  return {
    phase,
    phaseTotalWeeks,
    currentWeekInPhase,
    phaseProgressPercent,
    phaseStatusLabel,
  };
}

// Extract day number (e.g. 4 from "Mon May 4") for week-grid display.
export function extractDayNumber(dateLabel) {
  if (!dateLabel) return "—";
  const match = String(dateLabel).match(/(\d+)/);
  return match ? match[1] : "—";
}

function parseDayLabelToIso(label, yearHint) {
  if (!label) return null;
  const parsed = new Date(`${String(label).trim()} ${yearHint}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatEasternYmdFromDate(parsed);
}

function deriveRangeFromDays(week, yearHint) {
  const dayRows = Array.isArray(week?.days) ? week.days : [];
  const isos = dayRows
    .map((d) => parseDayLabelToIso(d?.date_label || d?.date, yearHint))
    .filter(Boolean)
    .sort();
  if (!isos.length) return null;
  const start = new Date(`${isos[0]}T00:00:00`);
  const end = new Date(`${isos[isos.length - 1]}T23:59:59.999`);
  return { start, end };
}
