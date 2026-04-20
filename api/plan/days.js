import { createClient } from "@supabase/supabase-js";
// Plan day labels are interpreted on the client using US Eastern dates (see ../../lib/getLocalToday.js).

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Verify the user's JWT and scope data to their user_id.
  // Rows with user_id IS NULL are legacy/shared data visible to any authenticated user.
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });
  const userId = user.id;

  const { data: blockRows, error: blocksErr } = await supabase
    .from("training_blocks")
    .select("block_id, phase, label, block_order")
    .eq("user_id", userId)
    .order("block_order", { ascending: true });

  if (blocksErr) return res.status(500).json({ error: blocksErr.message });
  if (!blockRows || blockRows.length === 0) {
    console.warn("[plan/days] 0 blocks for userId:", userId);
    return res.status(404).json({ error: "No training blocks found for this user. Check that the plan was seeded with the correct user_id." });
  }

  const blockIds = blockRows.map((b) => b.block_id).filter(Boolean);
  const { data: weeks, error: weeksErr } = await supabase
    .from("training_weeks")
    .select("*")
    .eq("user_id", userId)
    .in("block_id", blockIds)
    .order("week_order", { ascending: true });

  if (weeksErr) return res.status(500).json({ error: weeksErr.message });

  // Fix #4: surface a clear error instead of returning an empty block list that
  // silently causes the client to fall back to hardcoded BLOCKS.
  if (!weeks || weeks.length === 0) {
    console.warn("[plan/days] 0 weeks for userId:", userId);
    return res.status(404).json({ error: "No training weeks found for this user. Check that the plan was seeded with the correct user_id." });
  }

  const weekIds = weeks.map((w) => w.week_id).filter(Boolean);
  const { data: days, error: daysErr } = await supabase
    .from("training_days")
    .select("*")
    .eq("user_id", userId)
    .in("week_id", weekIds);

  if (daysErr) return res.status(500).json({ error: daysErr.message });

  if (!days || days.length === 0) {
    console.warn("[plan/days] 0 days for userId:", userId);
    return res.status(404).json({ error: "No training days found for this user. Check that the plan was seeded with the correct user_id." });
  }

  // Group days by week slug (training_days.week_id references training_weeks.week_id)
  const daysByWeek = {};
  for (const day of days) {
    if (!daysByWeek[day.week_id]) daysByWeek[day.week_id] = [];
    daysByWeek[day.week_id].push(day);
  }

  // Build block structure from training_blocks, then attach matching weeks and days
  const blockMap = {};
  const blockOrder = blockRows.map((b) => b.block_id);
  const blockIndexById = Object.fromEntries(blockOrder.map((id, idx) => [id, idx]));
  for (const block of blockRows) {
    blockMap[block.block_id] = {
      label: block.label || block.phase || block.block_id,
      weeks: [],
      order: block.block_order ?? 999,
    };
  }

  const DAY_ORDER = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
  const sortedWeeks = [...weeks].sort((a, b) => {
    const blockDiff = (blockIndexById[a.block_id] ?? 999) - (blockIndexById[b.block_id] ?? 999);
    if (blockDiff !== 0) return blockDiff;
    return (a.week_order ?? 999) - (b.week_order ?? 999);
  });

  for (const week of sortedWeeks) {
    const blockId = week.block_id;
    if (!blockMap[blockId]) {
      blockMap[blockId] = { label: week.phase || blockId, weeks: [], order: 999 };
      blockOrder.push(blockId);
    }
    const weekDays = (daysByWeek[week.week_id] || [])
      .sort((a, b) => (DAY_ORDER[a.day_name] ?? 99) - (DAY_ORDER[b.day_name] ?? 99))
      .map((d) => ({
        day: d.day_name,
        date: d.date_label,
        am: d.am_session,
        pm: d.pm_session,
        am_session_blocks: d.am_session_blocks || [],
        pm_session_blocks: d.pm_session_blocks || [],
        am_session_custom: d.am_session_custom || null,
        pm_session_custom: d.pm_session_custom || null,
        note2a: d.note,
        isRaceDay: d.is_race_day,
        isSunday: d.is_sunday,
        ai_modified: d.ai_modified || false,
        ai_modification_note: d.ai_modification_note || null,
      }));
    blockMap[blockId].weeks.push({
      id: week.id,
      label: week.label,
      dates: week.dates,
      phase: week.phase,
      subtitle: week.subtitle,
      days: weekDays,
    });
  }

  const blocks = blockOrder.map((id) => ({
    id,
    label: blockMap[id].label,
    order: blockMap[id].order ?? 999,
    weeks: blockMap[id].weeks,
  }));

  // Sort blocks into the correct display order regardless of UUID ordering.
  // Include seeded HYROX 12-week phases so Base Rebuild shows first.
  const BLOCK_LABEL_ORDER = [
    "MIAMI TAPER",
    "BASE REBUILD",
    "ACCUMULATION",
    "INTENSIFICATION",
    "PEAK & TEST",
    "PHASE 1",
    "PHASE 2",
    "PHASE 3",
    "PHASE 4",
  ];
  blocks.sort((a, b) => {
    const orderDiff = (a.order ?? 999) - (b.order ?? 999);
    if (orderDiff !== 0) return orderDiff;
    const ai = BLOCK_LABEL_ORDER.indexOf(a.label);
    const bi = BLOCK_LABEL_ORDER.indexOf(b.label);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return res.status(200).json({ blocks });
}
