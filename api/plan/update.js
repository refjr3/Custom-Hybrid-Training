import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type, week_id, day, changes, description } = req.body;

  if (!type) return res.status(400).json({ error: "Missing type" });

  try {
    if (type === "modify_day") {
      if (!week_id || !day) {
        return res.status(400).json({ error: "modify_day requires week_id and day" });
      }

      // Resolve week db id from week_id string
      const { data: weekRow, error: weekErr } = await supabase
        .from("training_weeks")
        .select("id")
        .eq("week_id", week_id)
        .single();

      if (weekErr || !weekRow) {
        return res.status(404).json({ error: `Week not found: ${week_id}` });
      }

      // Apply the field changes to the training_days row.
      // AI coach emits frontend keys (am/pm/note); map them to DB columns.
      const fieldMap = {
        am:         "am_session",
        pm:         "pm_session",
        note:       "note",
        note2a:     "note",          // legacy alias
        is_race_day:"is_race_day",
        is_sunday:  "is_sunday",
        ai_modification_note: "ai_modification_note",
      };
      const updatePayload = { ai_modified: true };
      for (const [key, value] of Object.entries(changes || {})) {
        const col = fieldMap[key];
        if (col) updatePayload[col] = value;
      }

      // ai_modification_note from top-level description if not in changes
      if (description && !updatePayload.ai_modification_note) {
        updatePayload.ai_modification_note = description;
      }

      const mutableFields = ["am_session", "pm_session", "note", "is_race_day", "ai_modification_note", "ai_modified"];
      const hasChange = mutableFields.some((f) => f in updatePayload && f !== "ai_modified" && f !== "ai_modification_note");
      if (!hasChange) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const { error: updateErr } = await supabase
        .from("training_days")
        .update(updatePayload)
        .eq("week_id", weekRow.id)
        .eq("day", day);

      if (updateErr) return res.status(500).json({ error: updateErr.message });

      return res.status(200).json({ success: true, description });
    }

    return res.status(400).json({ error: `Unknown plan change type: ${type}` });
  } catch (err) {
    return res.status(500).json({ error: "Plan update failed", details: err.message });
  }
}
