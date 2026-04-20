import { createClient } from "@supabase/supabase-js";
import { getAccessTokenFromRequest } from "../lib/sessionToken.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "no_auth" });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: "invalid" });

    const q = (req.query.q || "").trim();
    const sport = typeof req.query.sport === "string" ? req.query.sport.trim() : "";
    if (q.length < 2) return res.status(200).json({ results: [] });

    const today = new Date().toISOString().slice(0, 10);

    let query = supabase
      .from("races_catalog")
      .select("*")
      .ilike("name", `%${q}%`)
      .or(`race_date.is.null,race_date.gte.${today}`)
      .order("race_date", { ascending: true, nullsFirst: false })
      .limit(10);

    if (sport) query = query.eq("sport", sport);

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ results: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
