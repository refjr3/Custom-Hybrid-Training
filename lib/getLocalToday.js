/** US Eastern (Charlotte) calendar date — same on Vercel (UTC) and in the browser. */
const EASTERN_TZ = "America/New_York";

function partsToYmd(parts) {
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function getLocalToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return partsToYmd(parts);
}

/** Next calendar day after getLocalToday() (noon-UTC trick avoids DST edge on the string). */
export function getLocalTomorrow() {
  const today = getLocalToday();
  if (!today) return null;
  return addCalendarDaysToIsoYmd(today, 1);
}

export function addCalendarDaysToIsoYmd(isoYmd, deltaDays) {
  const [y, m, d] = String(isoYmd)
    .split("-")
    .map((x) => Number(x));
  if (!y || !m || !d) return null;
  const u = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  u.setUTCDate(u.getUTCDate() + deltaDays);
  const Y = u.getUTCFullYear();
  const M = String(u.getUTCMonth() + 1).padStart(2, "0");
  const D = String(u.getUTCDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

/** Civil date in Eastern for an existing Date (e.g. parsed plan label). */
export function formatEasternYmdFromDate(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return partsToYmd(parts);
}
