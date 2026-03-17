import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { data: weeks, error: weeksErr } = await supabase
    .from("training_weeks")
    .select("*")
    .order("block_id")
    .order("week_order");

  if (weeksErr) return res.status(500).json({ error: weeksErr.message });

  // TRACE: log raw week rows to expose actual id and block_id values
  console.log("[plan/days] raw weeks from DB:", JSON.stringify((weeks || []).map(w => ({ id: w.id, block_id: w.block_id, label: w.label }))));
  const { data: days, error: daysErr } = await supabase
    .from("training_days")
    .select("*")
    .order("sort_order");

  if (daysErr) return res.status(500).json({ error: daysErr.message });

  // Group days by week database id
  const daysByWeek = {};
  for (const day of days) {
    if (!daysByWeek[day.week_id]) daysByWeek[day.week_id] = [];
    daysByWeek[day.week_id].push(day);
  }

  // Build block structure matching the frontend BLOCKS format
  const blockOrder = ["taper", "phase1", "phase2", "phase3", "phase4"];
  const blockLabels = {
    taper: "MIAMI TAPER",
    phase1: "PHASE 1",
    phase2: "PHASE 2",
    phase3: "PHASE 3",
    phase4: "PHASE 4",
  };

  const blockMap = {};
  for (const week of weeks) {
    const blockId = week.block_id;
    if (!blockMap[blockId]) blockMap[blockId] = [];
    blockMap[blockId].push({
      id: week.id,
      label: week.label,
      dates: week.dates,
      phase: week.phase,
      subtitle: week.subtitle,
      days: (daysByWeek[week.id] || []).map((d) => ({
        day: d.day_name,
        date: d.date,
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

  const blocks = blockOrder
    .filter((id) => blockMap[id])
    .map((id) => ({
      id,
      label: blockLabels[id],
      weeks: blockMap[id],
    }));

  // TRACE: log every WED day object being returned
  for (const block of blocks) {
    for (const week of block.weeks) {
      const wed = week.days.find(d => d.day === "WED");
      if (wed) console.log("[plan/days] WED object week", week.id, JSON.stringify(wed));
    }
  }

  return res.status(200).json({ blocks });
}
