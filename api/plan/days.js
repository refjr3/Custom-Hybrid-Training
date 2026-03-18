import { createClient } from "@supabase/supabase-js";

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
  console.log("[plan/days] userId:", userId);

  const { data: weeks, error: weeksErr } = await supabase
    .from("training_weeks")
    .select("*")
    .eq("user_id", userId)
    .order("block_id")
    .order("week_order");

  console.log("[plan/days] weeks count:", weeks?.length, "| weeksErr:", weeksErr?.message);
  if (weeksErr) return res.status(500).json({ error: weeksErr.message });

  // Fix #4: surface a clear error instead of returning an empty block list that
  // silently causes the client to fall back to hardcoded BLOCKS.
  if (!weeks || weeks.length === 0) {
    console.log("[plan/days] WARNING: 0 weeks found for userId:", userId, "— seed may have used a different user_id");
    return res.status(404).json({ error: "No training weeks found for this user. Check that the plan was seeded with the correct user_id." });
  }

  const { data: days, error: daysErr } = await supabase
    .from("training_days")
    .select("*")
    .eq("user_id", userId);

  console.log("[plan/days] days count:", days?.length, "| daysErr:", daysErr?.message);
  if (daysErr) return res.status(500).json({ error: daysErr.message });

  if (!days || days.length === 0) {
    console.log("[plan/days] WARNING: 0 days found for userId:", userId);
    return res.status(404).json({ error: "No training days found for this user. Check that the plan was seeded with the correct user_id." });
  }

  // Group days by week database id
  const daysByWeek = {};
  for (const day of days) {
    if (!daysByWeek[day.week_id]) daysByWeek[day.week_id] = [];
    daysByWeek[day.week_id].push(day);
  }

  // Build block structure dynamically from whatever block_id values exist in DB
  const blockMap = {};
  const blockOrder = [];
  for (const week of weeks) {
    const blockId = week.block_id;
    if (!blockMap[blockId]) {
      blockMap[blockId] = { label: week.phase || blockId, weeks: [] };
      blockOrder.push(blockId);
    }
    const DAY_ORDER = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
    const weekDays = (daysByWeek[week.week_id] || [])
      .sort((a, b) => (DAY_ORDER[a.day_name] ?? 99) - (DAY_ORDER[b.day_name] ?? 99))
      .map((d) => ({
        day: d.day_name,
        date: d.date_label,
        am: d.am_session,
        pm: d.pm_session,
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
    weeks: blockMap[id].weeks,
  }));

  // Sort blocks into the correct display order regardless of UUID ordering
  const BLOCK_LABEL_ORDER = ["MIAMI TAPER", "PHASE 1", "PHASE 2", "PHASE 3", "PHASE 4"];
  blocks.sort((a, b) => {
    const ai = BLOCK_LABEL_ORDER.indexOf(a.label);
    const bi = BLOCK_LABEL_ORDER.indexOf(b.label);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return res.status(200).json({ blocks });
}
