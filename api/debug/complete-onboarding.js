import { createClient } from "@supabase/supabase-js";

const RAFAEL_USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc";

export default async function handler(req, res) {
  console.warn("[DEPRECATED] /api/debug/complete-onboarding — Rafael-only test; remove before beta.");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(token);
  if (authErr || !user || user.id !== RAFAEL_USER_ID) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { error: upErr } = await supabase
    .from("user_profiles")
    .update({
      onboarding_completed: true,
      onboarding_step: "complete",
    })
    .eq("user_id", user.id);

  if (upErr) return res.status(500).json({ error: upErr.message });
  return res.status(200).json({ ok: true });
}
