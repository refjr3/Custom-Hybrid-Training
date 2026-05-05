import { formatEasternYmdFromDate } from "../../../../lib/getLocalToday.js";

// Parse "Apr 27 – May 3" or "May 4 – May 10" (en/em dash separator, no year)
export function parseWeekDates(datesStr, yearHint) {
  if (!datesStr) return null;
  const normalized = String(datesStr).replace(/[–—-]/g, "|");
  const parts = normalized.split("|").map((s) => s.trim());
  if (parts.length !== 2) return null;

  const year = yearHint || new Date().getFullYear();
  const startStr = `${parts[0]} ${year}`;
  let endStr = `${parts[1]} ${year}`;

  const endHasMonth = /^[A-Za-z]+/.test(parts[1]);
  if (!endHasMonth) {
    const startMonth = parts[0].match(/^[A-Za-z]+/)?.[0] || "";
    endStr = `${startMonth} ${parts[1]} ${year}`;
  }

  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  end.setHours(23, 59, 59, 999);

  if (end < start) end.setFullYear(end.getFullYear() + 1);
  return { start, end };
}

export function getDayIndex(date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

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

export function extractDayNumber(dateLabel) {
  if (!dateLabel) return "—";
  const match = String(dateLabel).match(/(\d+)/);
  return match ? match[1] : "—";
}

function weekOrderNum(w) {
  const n = Number(w?.week_order ?? w?._weekOrder);
  return Number.isFinite(n) ? n : null;
}

/**
 * Phase progress from `training_weeks.phase` on loaded week rows
 * (not plan variant `phases` jsonb — often empty in production).
 *
 * @param {object[]} weeks — flattened variant weeks (same order as PlanWeekView `allWeeks`)
 * @param {object} displayedWeek — the week row the user is viewing (e.g. `allWeeks[currentWeekIdx]`)
 */
export function computePhaseProgress(weeks, displayedWeek) {
  if (!Array.isArray(weeks) || !displayedWeek || !displayedWeek.phase) return null;

  const phaseName = displayedWeek.phase;
  const weeksInPhase = weeks
    .filter((w) => w.phase === phaseName)
    .sort((a, b) => (weekOrderNum(a) ?? 9999) - (weekOrderNum(b) ?? 9999));

  if (weeksInPhase.length === 0) return null;

  let idx = -1;
  if (displayedWeek.id != null) {
    idx = weeksInPhase.findIndex((w) => String(w.id) === String(displayedWeek.id));
  }
  if (idx < 0) {
    const o = weekOrderNum(displayedWeek);
    const wo = Number(displayedWeek.week_order);
    const target = Number.isFinite(o) ? o : Number.isFinite(wo) ? wo : null;
    if (target != null) {
      idx = weeksInPhase.findIndex(
        (w) => weekOrderNum(w) === target || Number(w.week_order) === target,
      );
    }
  }
  if (idx < 0) {
    idx = weeksInPhase.indexOf(displayedWeek);
  }
  if (idx < 0) return null;

  const currentWeekInPhase = idx + 1;
  const phaseTotalWeeks = weeksInPhase.length;
  const phaseProgressPercent = (currentWeekInPhase / phaseTotalWeeks) * 100;

  let phaseStatusLabel = `Wk ${currentWeekInPhase} of ${phaseTotalWeeks}`;
  if (currentWeekInPhase === phaseTotalWeeks) phaseStatusLabel += " · Final week";

  return {
    phaseName,
    phase: { name: phaseName },
    currentWeekInPhase,
    phaseTotalWeeks,
    phaseProgressPercent,
    phaseStatusLabel,
  };
}

/** End of race week (or last week) as the plan's effective race date. */
export function getVariantRaceDate(weeks) {
  if (!weeks || weeks.length === 0) return null;
  const raceWeek =
    weeks.find((w) => w.phase && /race\s*week/i.test(String(w.phase))) || weeks[weeks.length - 1];

  if (!raceWeek?.dates) return null;

  const range = parseWeekDates(raceWeek.dates, new Date().getFullYear());
  if (!range) return null;

  return range.end;
}

/** Calendar-current week in loaded blocks (fallback first week). */
export function getCalendarCurrentWeekFromPlan(planBlocks) {
  if (!Array.isArray(planBlocks) || planBlocks.length === 0) return null;

  const labelToIso = (label, y) => {
    if (!label || typeof label !== "string") return null;
    const p = new Date(`${label.trim()} ${y}`);
    if (Number.isNaN(p.getTime())) return null;
    return formatEasternYmdFromDate(p);
  };

  const mondayOf = (iso) => {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return formatEasternYmdFromDate(d);
  };

  const sunAfterMon = (monIso) => {
    const d = new Date(`${monIso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + 6);
    return formatEasternYmdFromDate(d);
  };

  const y = new Date().getFullYear();
  const todayParts = new Date();
  const todayIso = `${todayParts.getFullYear()}-${String(todayParts.getMonth() + 1).padStart(2, "0")}-${String(todayParts.getDate()).padStart(2, "0")}`;

  let hit = null;
  outer: for (const block of planBlocks) {
    for (const w of block.weeks || []) {
      const days = w.days || [];
      const isos = days.map((d) => labelToIso(d?.date || d?.date_label, y)).filter(Boolean);
      if (!isos.length) continue;
      const minIso = isos.reduce((a, b) => (a < b ? a : b));
      const mon = mondayOf(minIso);
      const sun = mon ? sunAfterMon(mon) : null;
      if (!mon || !sun) continue;
      if (todayIso >= mon && todayIso <= sun) {
        hit = { block, week: w };
        break outer;
      }
    }
  }

  if (!hit) {
    const b0 = planBlocks[0];
    const w0 = (b0?.weeks || [])[0];
    if (!w0) return null;
    hit = { block: b0, week: w0 };
  }

  return {
    blockId: hit.block?.id,
    weekId: hit.week?.id,
    weekOrder: hit.week?.week_order != null ? Number(hit.week.week_order) : weekOrderNum(hit.week),
    week: hit.week,
    block: hit.block,
  };
}
