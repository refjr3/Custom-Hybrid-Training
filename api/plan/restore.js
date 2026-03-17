import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.query.secret !== "triad2026") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data: weekRow, error: weekErr } = await supabase
      .from("training_weeks")
      .select("id")
      .eq("week_id", "tw1")
      .single();

    if (weekErr || !weekRow) {
      return res.status(404).json({ error: "Week tw1 not found", details: weekErr?.message });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("training_days")
      .update({
        am_session: "STRENGTH A — Full Body Power",
        pm_session: "ZONE 2 — Easy Aerobic",
        ai_modified: false,
        ai_modification_note: null,
      })
      .eq("week_id", weekRow.id)
      .eq("day", "WED")
      .select();

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    return res.status(200).json({ success: true, restored: updated });
  } catch (err) {
    return res.status(500).json({ error: "Restore failed", details: err.message });
  }
}
