/**
 * Phase progress from `training_weeks.phase` across loaded week rows
 * (not from plan variant `phases` jsonb — often empty in production).
 */
export function computePhaseProgress(weeks, currentWeekOrder) {
  if (!weeks || currentWeekOrder == null || Number.isNaN(Number(currentWeekOrder))) return null;

  const currentWeek = weeks.find((w) => Number(w.week_order) === Number(currentWeekOrder));
  if (!currentWeek?.phase) return null;

  const phaseName = currentWeek.phase;
  const weeksInPhase = weeks
    .filter((w) => w.phase === phaseName)
    .sort((a, b) => Number(a.week_order) - Number(b.week_order));

  if (weeksInPhase.length === 0) return null;

  const phaseStart = Number(weeksInPhase[0].week_order);
  const phaseTotalWeeks = weeksInPhase.length;
  const curOrd = Number(currentWeekOrder);
  const currentWeekInPhase = curOrd - phaseStart + 1;
  const phaseProgressPercent = (currentWeekInPhase / phaseTotalWeeks) * 100;

  let phaseStatusLabel = `Wk ${currentWeekInPhase} of ${phaseTotalWeeks}`;
  if (currentWeekInPhase === phaseTotalWeeks) phaseStatusLabel += " · Final week";

  return {
    phaseName,
    currentWeekInPhase,
    phaseTotalWeeks,
    phaseProgressPercent,
    phaseStatusLabel,
  };
}

/** Calendar "today" week within loaded plan blocks (Mon–Sun span), or first week. */
export function getCalendarCurrentWeekFromPlan(planBlocks) {
  if (!Array.isArray(planBlocks) || planBlocks.length === 0) return null;

  const labelToIso = (label, y) => {
    if (!label || typeof label !== "string") return null;
    const p = new Date(`${label.trim()} ${y}`);
    if (Number.isNaN(p.getTime())) return null;
    const yy = p.getFullYear();
    const mm = String(p.getMonth() + 1).padStart(2, "0");
    const dd = String(p.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  const mondayOf = (iso) => {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  const sunAfterMon = (monIso) => {
    const d = new Date(`${monIso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + 6);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
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
    weekOrder: hit.week?.week_order != null ? Number(hit.week.week_order) : null,
    week: hit.week,
    block: hit.block,
  };
}
