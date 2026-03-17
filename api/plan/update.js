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

      // Apply the field changes to the training_days row
      const allowedFields = ["am", "pm", "note2a", "is_race_day", "is_sunday"];
      const updatePayload = {};
      for (const [key, value] of Object.entries(changes || {})) {
        if (allowedFields.includes(key)) {
          updatePayload[key] = value;
        }
      }

      if (Object.keys(updatePayload).length === 0) {
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
