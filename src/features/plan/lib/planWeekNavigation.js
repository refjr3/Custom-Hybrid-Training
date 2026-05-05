export function getWeekOrderValue(week, fallback = Number.MAX_SAFE_INTEGER) {
  const ord = Number(week?.week_order ?? week?._weekOrder);
  return Number.isFinite(ord) && ord > 0 ? ord : fallback;
}

export function buildWeekOrderMap(weeks) {
  const map = new Map();
  for (const week of Array.isArray(weeks) ? weeks : []) {
    const ord = getWeekOrderValue(week, null);
    if (ord == null) continue;
    if (!map.has(ord)) map.set(ord, week);
  }
  return map;
}

export function getAdjacentWeekByOrder(weeks, currentWeekOrder, delta) {
  const cur = Number(currentWeekOrder);
  const step = Number(delta);
  if (!Number.isFinite(cur) || !Number.isFinite(step) || Math.abs(step) !== 1) return null;
  return buildWeekOrderMap(weeks).get(cur + step) || null;
}
