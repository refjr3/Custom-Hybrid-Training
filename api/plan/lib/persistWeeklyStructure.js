/**
 * Writes training_blocks, training_weeks, and training_days for a new variant.
 * One training_block per skeleton phase (legacy HYROX-style), weeks routed by week.phase.
 * Day keys from the model are mon..sun; DB uses MON..SUN (see api/plan/days.js).
 */

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TO_UPPER = {
  mon: "MON",
  tue: "TUE",
  wed: "WED",
  thu: "THU",
  fri: "FRI",
  sat: "SAT",
  sun: "SUN",
};

function slugPhaseSegment(name, phaseIdx) {
  const base = String(name || "phase")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 36) || "phase";
  return `p${phaseIdx}_${base}`;
}

function pickDaySpec(week, dayKey) {
  const lower = String(dayKey).toLowerCase();
  const days = week?.days && typeof week.days === "object" ? week.days : {};
  const spec =
    days[lower] ||
    days[String(dayKey).toUpperCase()] ||
    days[dayKey] ||
    null;
  if (!spec || String(spec.session_type || "").toLowerCase() === "rest") {
    return { session_type: "rest", name: "Rest", notes: "" };
  }
  return {
    session_type: spec.session_type || "training",
    name: String(spec.name || "Session").slice(0, 120),
    notes: spec.notes != null ? String(spec.notes) : "",
  };
}

/**
 * @returns {Promise<{ blockIds: Record<string, string>, week1WeekId: string | null, weekIds: string[] }>}
 */
export async function persistWeeklyStructure(supabase, userId, variantId, skeleton, weeks) {
  const variantUuid = String(variantId);
  const phases = Array.isArray(skeleton.phases) && skeleton.phases.length > 0 ? skeleton.phases : null;

  const sortedWeeks = [...weeks].sort(
    (a, b) => (Number(a.week_number) || 0) - (Number(b.week_number) || 0),
  );

  const weekIds = [];
  const today = new Date();

  /** Single-block fallback when skeleton has no phases (degenerate model output). */
  if (!phases) {
    const blockId = `block_${variantUuid}_${Date.now()}`;
    const { error: blockErr } = await supabase.from("training_blocks").insert({
      user_id: userId,
      variant_id: variantId,
      block_id: blockId,
      label: skeleton.variant_name || "Generated plan",
      phase: "Training",
      block_order: 0,
    });
    if (blockErr) throw new Error(`training_blocks insert: ${blockErr.message}`);

    for (const week of sortedWeeks) {
      const weekNum = Math.max(1, Number(week.week_number) || sortedWeeks.indexOf(week) + 1);
      const weekId = `${blockId}_w${weekNum}`;
      weekIds.push(weekId);

      const weekStartDate = new Date(today);
      weekStartDate.setDate(today.getDate() + (weekNum - 1) * 7);
      const dow = weekStartDate.getDay();
      const diff = dow === 0 ? 6 : dow - 1;
      weekStartDate.setDate(weekStartDate.getDate() - diff);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
      const datesLabel = `${weekStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

      const { error: weekErr } = await supabase.from("training_weeks").insert({
        user_id: userId,
        variant_id: variantId,
        week_id: weekId,
        block_id: blockId,
        label: `Week ${weekNum}`,
        dates: datesLabel,
        phase: week.phase || "Training",
        subtitle: week.subtitle || "",
        week_order: weekNum,
      });
      if (weekErr) throw new Error(`training_weeks insert: ${weekErr.message}`);

      const dayRows = DAY_ORDER.map((dayKey, i) => {
        const daySpec = pickDaySpec(week, dayKey);
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(weekStartDate.getDate() + i);
        const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return {
          user_id: userId,
          variant_id: variantId,
          week_id: weekId,
          day_name: TO_UPPER[dayKey],
          date_label: dayLabel,
          am_session: daySpec.name,
          pm_session: null,
          note: daySpec.notes || null,
          is_race_day: false,
          is_sunday: TO_UPPER[dayKey] === "SUN",
          am_session_blocks: [],
          pm_session_blocks: [],
        };
      });
      const { error: daysErr } = await supabase.from("training_days").insert(dayRows);
      if (daysErr) throw new Error(`training_days insert: ${daysErr.message}`);
    }

    const week1WeekId = weekIds[0] || `${blockId}_w1`;
    return { blockIds: { default: blockId }, week1WeekId, weekIds };
  }

  const blockIds = {};
  const blockIdByPhaseUpper = new Map();

  for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx++) {
    const phase = phases[phaseIdx];
    const slug = slugPhaseSegment(phase.name, phaseIdx);
    const blockId = `block_${variantUuid}_${slug}`;
    const label = String(phase.name || "Block").trim().toUpperCase();

    const { error: blockErr } = await supabase.from("training_blocks").insert({
      user_id: userId,
      variant_id: variantId,
      block_id: blockId,
      label,
      phase: String(phase.name || "Block").trim(),
      block_order: phaseIdx,
    });
    if (blockErr) throw new Error(`training_blocks insert: ${blockErr.message}`);

    const phaseNameKey = String(phase.name || "").trim();
    blockIds[phaseNameKey] = blockId;
    blockIdByPhaseUpper.set(phaseNameKey.toUpperCase(), blockId);
  }

  const defaultPhaseName = String(phases[0]?.name || "Base").trim();
  const defaultBlockId = blockIds[defaultPhaseName];
  if (!defaultBlockId) throw new Error("persistWeeklyStructure: missing first phase block");

  const resolveBlockIdForWeek = (week) => {
    const raw = String(week?.phase ?? "").trim();
    if (!raw) return defaultBlockId;
    const u = raw.toUpperCase();
    if (blockIdByPhaseUpper.has(u)) return blockIdByPhaseUpper.get(u);
    for (const ph of phases) {
      if (String(ph.name).trim().toUpperCase() === u) {
        return blockIds[String(ph.name).trim()];
      }
    }
    console.warn("[persistWeeklyStructure] unmatched week.phase, using default:", raw);
    return defaultBlockId;
  };

  let week1WeekId = null;

  for (const week of sortedWeeks) {
    const weekNum = Math.max(1, Number(week.week_number) || sortedWeeks.indexOf(week) + 1);
    const blockId = resolveBlockIdForWeek(week);
    const weekId = `${blockId}_w${weekNum}`;
    if (weekNum === 1) week1WeekId = weekId;
    weekIds.push(weekId);

    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() + (weekNum - 1) * 7);
    const dow = weekStartDate.getDay();
    const diff = dow === 0 ? 6 : dow - 1;
    weekStartDate.setDate(weekStartDate.getDate() - diff);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    const datesLabel = `${weekStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    const { error: weekErr } = await supabase.from("training_weeks").insert({
      user_id: userId,
      variant_id: variantId,
      week_id: weekId,
      block_id: blockId,
      label: `Week ${weekNum}`,
      dates: datesLabel,
      phase: week.phase || defaultPhaseName,
      subtitle: week.subtitle || "",
      week_order: weekNum,
    });
    if (weekErr) throw new Error(`training_weeks insert: ${weekErr.message}`);

    const dayRows = DAY_ORDER.map((dayKey, i) => {
      const daySpec = pickDaySpec(week, dayKey);
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(weekStartDate.getDate() + i);
      const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      return {
        user_id: userId,
        variant_id: variantId,
        week_id: weekId,
        day_name: TO_UPPER[dayKey],
        date_label: dayLabel,
        am_session: daySpec.name,
        pm_session: null,
        note: daySpec.notes || null,
        is_race_day: false,
        is_sunday: TO_UPPER[dayKey] === "SUN",
        am_session_blocks: [],
        pm_session_blocks: [],
      };
    });

    const { error: daysErr } = await supabase.from("training_days").insert(dayRows);
    if (daysErr) throw new Error(`training_days insert: ${daysErr.message}`);
  }

  if (!week1WeekId && weekIds.length > 0) {
    week1WeekId = weekIds[0];
  }

  return { blockIds, week1WeekId, weekIds };
}
