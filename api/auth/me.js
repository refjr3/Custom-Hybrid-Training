import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET /api/auth/me
// Returns { user_id, email } for the currently authenticated user.
// Useful for finding your UUID before seeding:
//   fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid token" });

  return res.status(200).json({ user_id: user.id, email: user.email });
}
