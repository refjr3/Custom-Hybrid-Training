import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  const { type, hrv_values, week_summary } = req.body;
  const messages = [];

  if (type === "hrv_trend" && hrv_values?.length >= 3) {
    const last3 = hrv_values.slice(-3);
    const declining = last3.every((v, i) => i === 0 || v < last3[i - 1]);
    if (declining) {
      const drop = last3[0] - last3[last3.length - 1];
      const content = `Your HRV has dropped ${last3.length} days straight (${last3.join("ms → ")}ms — down ${drop}ms total). This pattern usually signals accumulated fatigue or poor sleep quality. Let's talk about whether we need to back off intensity this week.`;
      messages.push({
        user_id: user.id,
        role: "proactive",
        content,
        metadata: { type: "hrv_decline", values: last3, drop },
      });
    }
  }

  if (type === "weekly_review" && week_summary) {
    try {
      const prompt = `Generate a brief weekly training review for this athlete. Data:
${JSON.stringify(week_summary)}

Format as 3 short sections (2-3 sentences each):
**WHAT WENT WELL** — highlight positives
**WATCH THIS WEEK** — flag concerns or things to monitor  
**NEXT WEEK PREVIEW** — what to expect

Keep it under 120 words. Be direct. No fluff.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const content = data.content?.[0]?.text || null;
      if (content) {
        messages.push({
          user_id: user.id,
          role: "proactive",
          content,
          metadata: { type: "weekly_review" },
        });
      }
    } catch (_) {}
  }

  if (messages.length > 0) {
    const rows = messages.map(m => ({
      user_id: m.user_id,
      role: m.role,
      content: m.content,
    }));
    await supabase.from("ai_messages").insert(rows).catch(() => {});
  }

  return res.status(200).json({ messages });
}
