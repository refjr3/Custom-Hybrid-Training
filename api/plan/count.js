// Diagnostic endpoint — returns row counts for all three training tables.
// Call: GET /api/plan/count?secret=triad2026

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.query.secret !== "triad2026") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const count = async (table) => {
    const { count: n, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) return { error: error.message };
    return n ?? 0;
  };

  return res.status(200).json({
    training_blocks: await count("training_blocks"),
    training_weeks:  await count("training_weeks"),
    training_days:   await count("training_days"),
  });
}
