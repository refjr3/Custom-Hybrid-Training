import { createClient } from "@supabase/supabase-js";
import { resolveMetricsRange } from "./resolver.js";
import { getAccessTokenFromRequest } from "../lib/sessionToken.js";

function isIsoYmd(s) {
  if (!s || typeof s !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

// GET /api/metrics/range?start=YYYY-MM-DD&end=YYYY-MM-DD
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "no_auth" });

    const start = typeof req.query?.start === "string" ? req.query.start.trim() : "";
    const end = typeof req.query?.end === "string" ? req.query.end.trim() : "";
    if (!isIsoYmd(start) || !isIsoYmd(end)) {
      return res.status(400).json({ error: "invalid_range", hint: "Use start=YYYY-MM-DD&end=YYYY-MM-DD" });
    }
    if (start > end) {
      return res.status(400).json({ error: "start_after_end" });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "invalid_session" });

    const metrics = await resolveMetricsRange(user.id, start, end);
    return res.status(200).json(metrics);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "server_error" });
  }
}
