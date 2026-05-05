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
 * Daily phase progress from `training_weeks.phase`.
 *
 * @param {object[]} weeks flattened variant weeks
 * @param {number} todayWeekOrder absolute week_order for today within plan
 * @param {number} todayDayIndex Mon=0 ... Sun=6
 */
export function computePhaseProgress(weeks, todayWeekOrder, todayDayIndex = 0) {
  if (!Array.isArray(weeks) || weeks.length === 0) return null;
  if (!Number.isFinite(Number(todayWeekOrder))) return null;

  const todayOrder = Number(todayWeekOrder);
  const currentWeek =
    weeks.find((w) => weekOrderNum(w) === todayOrder || Number(w?.week_order) === todayOrder) || null;
  if (!currentWeek?.phase) return null;

  const phaseName = String(currentWeek.phase).trim();
  const weeksInPhase = weeks
    .filter((w) => String(w?.phase || "").trim() === phaseName)
    .sort((a, b) => (weekOrderNum(a) ?? 9999) - (weekOrderNum(b) ?? 9999));
  if (weeksInPhase.length === 0) return null;

  const weekIdx = weeksInPhase.findIndex(
    (w) => weekOrderNum(w) === todayOrder || Number(w?.week_order) === todayOrder,
  );
  if (weekIdx < 0) return null;

  const currentWeekInPhase = weekIdx + 1;
  const phaseTotalWeeks = weeksInPhase.length;
  const safeDayIndex = Math.max(0, Math.min(6, Number(todayDayIndex) || 0));
  const daysIntoPhase = ((currentWeekInPhase - 1) * 7) + safeDayIndex + 1;
  const totalDaysInPhase = phaseTotalWeeks * 7;
  const phaseProgressPercent = totalDaysInPhase > 0 ? (daysIntoPhase / totalDaysInPhase) * 100 : 0;
  const phaseStatusLabel = `Day ${daysIntoPhase} of ${totalDaysInPhase} · Wk ${currentWeekInPhase} of ${phaseTotalWeeks}`;

  return {
    phaseName,
    phase: { name: phaseName },
    currentWeekInPhase,
    phaseTotalWeeks,
    daysIntoPhase,
    totalDaysInPhase,
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
