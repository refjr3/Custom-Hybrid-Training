import { createClient } from "@supabase/supabase-js";
import { resolveMetrics } from "./resolver.js";
import { getCalendarYmdInTimeZone } from "../../lib/getLocalToday.js";
import { getAccessTokenFromRequest } from "../lib/sessionToken.js";

// GET /api/metrics/today — resolved metrics for “today” in the user’s profile time zone.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "no_auth" });

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "invalid_session" });

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("time_zone")
      .eq("user_id", user.id)
      .maybeSingle();

    const tz = profile?.time_zone || "America/New_York";
    const today = getCalendarYmdInTimeZone(tz);
    if (!today) return res.status(500).json({ error: "date_unavailable" });

    const metrics = await resolveMetrics(user.id, today);
    return res.status(200).json(metrics);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "server_error" });
  }
}
