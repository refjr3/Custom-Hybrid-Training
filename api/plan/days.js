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

  const { data: weeks, error: weeksErr } = await supabase
    .from("training_weeks")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order("block_id")
    .order("week_order");

  if (weeksErr) return res.status(500).json({ error: weeksErr.message });

  const { data: days, error: daysErr } = await supabase
    .from("training_days")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`);

  if (daysErr) return res.status(500).json({ error: daysErr.message });

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
    blockMap[blockId].weeks.push({
      id: week.id,
      label: week.label,
      dates: week.dates,
      phase: week.phase,
      subtitle: week.subtitle,
      days: (daysByWeek[week.week_id] || []).map((d) => ({
        day: d.day_name,
        date: d.date_label,
        am: d.am_session,
        pm: d.pm_session,
        note2a: d.note,
        isRaceDay: d.is_race_day,
        isSunday: d.is_sunday,
        ai_modified: d.ai_modified || false,
        ai_modification_note: d.ai_modification_note || null,
      })),
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
