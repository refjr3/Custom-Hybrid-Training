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

  for (const week of weeks) {
    const range = parseWeekDates(week?.dates, yearHint);
    if (!range) continue;
    if (today >= range.start && today <= range.end) {
      return { week, range, todayDayIndex: getDayIndex(today) };
    }
  }

  for (const week of weeks) {
    const range = parseWeekDates(week?.dates, yearHint);
    if (!range) continue;
    if (range.start > today) {
      return { week, range, todayDayIndex: 0, fallback: "before_block" };
    }
  }

  const lastWeek = weeks[weeks.length - 1];
  return {
    week: lastWeek,
    range: parseWeekDates(lastWeek?.dates, yearHint),
    todayDayIndex: 6,
    fallback: "after_block",
  };
}

// Extract day number (e.g. 4 from "Mon May 4") for week-grid display.
export function extractDayNumber(dateLabel) {
  if (!dateLabel) return "—";
  const match = String(dateLabel).match(/(\d+)/);
  return match ? match[1] : "—";
}
