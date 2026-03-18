import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const VALID_TIME_GROUPS = new Set(["MORNING", "AFTERNOON", "NIGHT", "DAILY TARGETS"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });
  const userId = user.id;

  const { type, supplement, supplement_id } = req.body;

  try {
    if (type === "add_supplement") {
      if (!supplement?.name || !supplement?.dose) {
        return res.status(400).json({ error: "supplement.name and supplement.dose are required" });
      }

      const timeGroup = VALID_TIME_GROUPS.has(supplement.time_group)
        ? supplement.time_group
        : "MORNING";

      // Place the new supplement after any existing ones for this user
      const { data: existing } = await supabase
        .from("supplements")
        .select("sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { data, error } = await supabase
        .from("supplements")
        .insert({
          user_id:    userId,
          name:       supplement.name,
          dose:       supplement.dose,
          note:       supplement.note || null,
          timing:     supplement.timing || "ANY",
          time_group: timeGroup,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) {
        console.log("[supplements/update] insert error:", error.message);
        return res.status(500).json({ error: error.message });
      }

      console.log("[supplements/update] added supplement:", JSON.stringify(data));
      return res.status(200).json({ success: true, supplement: data });
    }

    if (type === "remove_supplement") {
      if (!supplement_id) return res.status(400).json({ error: "supplement_id is required" });

      const { error } = await supabase
        .from("supplements")
        .delete()
        .eq("id", supplement_id)
        .eq("user_id", userId);

      if (error) {
        console.log("[supplements/update] delete error:", error.message);
        return res.status(500).json({ error: error.message });
      }

      console.log("[supplements/update] removed supplement:", supplement_id);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: `Unknown type: ${type}` });
  } catch (err) {
    return res.status(500).json({ error: "Supplement update failed", details: err.message });
  }
}
