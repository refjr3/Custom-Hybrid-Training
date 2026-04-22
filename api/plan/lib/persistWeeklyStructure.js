/**
 * Writes training_blocks, training_weeks, and training_days for a new variant.
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
 * @returns {Promise<{ blockId: string, week1WeekId: string, weekIds: string[] }>}
 */
export async function persistWeeklyStructure(supabase, userId, variantId, skeleton, weeks) {
  const variantUuid = String(variantId);
  const blockId = `block_${variantUuid}_${Date.now()}`;

  const { error: blockErr } = await supabase.from("training_blocks").insert({
    user_id: userId,
    variant_id: variantId,
    block_id: blockId,
    label: skeleton.variant_name || "Generated plan",
    phase: skeleton.phases?.[0]?.name || "Base",
    block_order: 0,
  });
  if (blockErr) throw new Error(`training_blocks insert: ${blockErr.message}`);

  const sortedWeeks = [...weeks].sort(
    (a, b) => (Number(a.week_number) || 0) - (Number(b.week_number) || 0),
  );

  const weekIds = [];
  const today = new Date();

  for (const week of sortedWeeks) {
    const weekNum = Math.max(1, Number(week.week_number) || sortedWeeks.indexOf(week) + 1);
    const weekId = `${blockId}_w${weekNum}`;

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
      phase: week.phase || skeleton.phases?.[0]?.name || "Training",
      subtitle: week.subtitle || "",
      week_order: weekNum,
    });
    if (weekErr) throw new Error(`training_weeks insert: ${weekErr.message}`);

    weekIds.push(weekId);

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

  return { blockId, week1WeekId, weekIds };
}
