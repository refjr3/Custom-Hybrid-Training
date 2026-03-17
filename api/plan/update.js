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

      // Normalize day: "Wednesday" → "WED", "wed" → "WED", "WED" → "WED"
      const DAY_MAP = {
        monday:"MON", tuesday:"TUE", wednesday:"WED",
        thursday:"THU", friday:"FRI", saturday:"SAT", sunday:"SUN",
      };
      const normalizedDay = DAY_MAP[day.toLowerCase()] || day.toUpperCase().slice(0, 3);

      console.log("[plan/update] received:", JSON.stringify({ type, week_id, day: normalizedDay, changes, description }));

      // Resolve week db id — try slug match first, then direct UUID match
      let weekRow = null;
      {
        const { data, error } = await supabase
          .from("training_weeks").select("id").eq("week_id", week_id).single();
        if (!error && data) weekRow = data;
      }
      if (!weekRow) {
        const { data, error } = await supabase
          .from("training_weeks").select("id").eq("id", week_id).single();
        if (!error && data) weekRow = data;
      }
      if (!weekRow) {
        console.log("[plan/update] week not found for value:", week_id);
        return res.status(404).json({ error: `Week not found: ${week_id}` });
      }

      console.log("[plan/update] resolved week db id:", weekRow.id);

      // Apply the field changes to the training_days row.
      // Accept both the exact DB column names and short legacy aliases.
      const fieldMap = {
        am_session: "am_session",    // exact DB column — what the AI now sends
        pm_session: "pm_session",    // exact DB column — what the AI now sends
        am:         "am_session",    // legacy short alias
        pm:         "pm_session",    // legacy short alias
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
        console.log("[plan/update] no valid fields in changes:", changes);
        return res.status(400).json({ error: "No valid fields to update" });
      }

      console.log("[plan/update] updating training_days where week_id =", weekRow.id, "day =", normalizedDay, "payload:", JSON.stringify(updatePayload));

      const { data: updated, error: updateErr, count } = await supabase
        .from("training_days")
        .update(updatePayload)
        .eq("week_id", weekRow.id)
        .eq("day", normalizedDay)
        .select();

      if (updateErr) {
        console.log("[plan/update] supabase error:", updateErr.message);
        return res.status(500).json({ error: updateErr.message });
      }

      console.log("[plan/update] rows updated:", updated?.length ?? count, JSON.stringify(updated));

      return res.status(200).json({ success: true, description });
    }

    return res.status(400).json({ error: `Unknown plan change type: ${type}` });
  } catch (err) {
    return res.status(500).json({ error: "Plan update failed", details: err.message });
  }
}
