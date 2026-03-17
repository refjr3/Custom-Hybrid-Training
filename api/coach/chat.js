import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, whoopData, currentWeek, recentActivities, attachment } = req.body;
  if (!message && !attachment) return res.status(400).json({ error: "No message or attachment provided" });

  const SYSTEM_PROMPT = `You are Rafael Fagundo's Elite Hybrid Performance Coach. You have complete knowledge of his training, health, and goals.

ATHLETE PROFILE:
- Age: 31 | Height: 6'3" | Weight: 209 lbs | Body Fat: 15.4% | Lean Mass: 179.7 lbs
- ALMI: 10.7 (Optimal/Highly Muscular) | Bone T-Score: +2.2 (Optimal)
- LTHR: 165-170 bpm | Z2 Target: 132-151 bpm | Threshold: 150-168 bpm

FLAGGED BIOMARKERS:
- LDL: 145 mg/dL HIGH | ApoB: 103 mg/dL HIGH | Fasting Glucose: 117 mg/dL HIGH
- Testosterone: 474 ng/dL (mid-range for age)

RACE PROGRESSION: Half Marathon → Marathon → 70.3 Ironman → 140.6 Ironman
CURRENT PHASE: Miami HYROX (Apr 4) → Phase 1 post-race base build

WEEKLY STRUCTURE:
- MON: HYROX Session | TUE: Threshold Run | WED: Strength + Z2 PM
- THU: Tempo/VO2 Max | FRI: HYROX Session | SAT: Long Run | SUN: Mobility or Plyo+Core

COACHING RULES:
1. Never suggest zero strength days — minimum 2/week
2. 80% of running volume in Z2 (132-151 bpm)
3. Never suggest VO2 Max when WHOOP is Yellow or Red
4. WHOOP Red (<35%) = recovery only, no exceptions
5. Preserve lean mass until final 8 weeks of Ironman build
6. Factor in LDL/ApoB — low saturated fat, high fiber

SUPPLEMENTS:
- AM: Beta Alanine 3.2-6.4g, Creatine 5g, Whey #1 25-40g
- PM: Whey #2 25-40g
- Night: Magnesium Glycinate 300-400mg, L-Theanine 200-400mg, Sermorelin (per Rx)

When suggesting a plan change, include this EXACTLY at the end of your response (valid JSON only, no trailing text):
<plan_change>
{"type": "modify_day", "week_id": "<week_id from context>", "day": "<MON|TUE|WED|THU|FRI|SAT|SUN>", "description": "One-line summary of the change", "changes": {"am": "<new workout name or omit>", "pm": "<new workout name or omit>", "note": "<updated coaching note or omit>"}}
</plan_change>

Rules for plan_change JSON:
- "week_id" MUST match the id sent in CURRENT TRAINING WEEK (e.g. "tw1", "tw2", "rw", "p1w1")
- "day" MUST be one of: MON, TUE, WED, THU, FRI, SAT, SUN
- Only include keys inside "changes" that are actually being modified
- Workout names in "am"/"pm" MUST exactly match one of the known workouts
- If you don't have enough context to fill week_id or day, do NOT emit a plan_change block

RESPONSE RULES:
- Lead with the direct answer. No preamble.
- Keep responses under 150 words unless a detailed plan is explicitly requested.
- Use markdown: **bold** for key terms, blank lines between sections.
- Never dump everything you know — answer only what was asked.
- Talk like a coach: direct, confident, action-oriented. Short sentences.`;

  try {
    // Fetch last 10 messages (5 pairs) for conversation history
    let historyMessages = [];
    try {
      const { data } = await supabase
        .from("ai_messages")
        .select("role, content")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data && data.length > 0) {
        // Reverse to chronological order, ensure strict user/assistant alternation
        const reversed = data.reverse();
        const validated = [];
        let expectedRole = "user";
        for (const m of reversed) {
          if (m.role === expectedRole) {
            validated.push(m);
            expectedRole = expectedRole === "user" ? "assistant" : "user";
          }
        }
        // Drop trailing user message with no assistant reply
        if (validated.length > 0 && validated[validated.length - 1].role === "user") {
          validated.pop();
        }
        historyMessages = validated;
      }
    } catch (e) {
      // ai_messages table may not exist yet — proceed without history
    }

    const now = new Date();
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const todayStr = `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()} ${now.getFullYear()}`;

    const contextText = `TODAY: ${todayStr}

CURRENT WHOOP DATA:
- Recovery: ${whoopData?.recovery?.score ?? "N/A"}% (${whoopData?.recovery?.score >= 67 ? "GREEN" : whoopData?.recovery?.score >= 34 ? "YELLOW" : "RED"})
- HRV: ${whoopData?.recovery?.hrv ?? "N/A"}ms | RHR: ${whoopData?.recovery?.rhr ?? "N/A"}bpm
- Sleep: ${whoopData?.sleep?.score ?? "N/A"}% | Hours: ${whoopData?.sleep?.hours ?? "N/A"}h
- Strain: ${whoopData?.strain?.score ?? "N/A"}

CURRENT TRAINING WEEK: id=${currentWeek?.id ?? "N/A"} label=${currentWeek?.label ?? "N/A"} — ${currentWeek?.subtitle ?? ""}

User message: ${message || "(see attached file)"}`;

    // Build content for the current user message — include attachment if present
    let userContent;
    if (attachment?.data && attachment?.media_type) {
      const isImage = attachment.media_type.startsWith("image/");
      const isPdf = attachment.media_type === "application/pdf";
      if (isImage) {
        userContent = [
          { type: "image", source: { type: "base64", media_type: attachment.media_type, data: attachment.data } },
          { type: "text", text: contextText },
        ];
      } else if (isPdf) {
        userContent = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: attachment.data } },
          { type: "text", text: contextText },
        ];
      } else {
        userContent = contextText;
      }
    } else {
      userContent = contextText;
    }

    const messages = [
      ...historyMessages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || "Anthropic API error" });
    }

    const fullText = data.content?.[0]?.text || "Sorry, I couldn't process that.";

    let planChange = null;
    let cleanText = fullText;
    const planChangeMatch = fullText.match(/<plan_change>([\s\S]*?)<\/plan_change>/);
    if (planChangeMatch) {
      try {
        planChange = JSON.parse(planChangeMatch[1].trim());
        cleanText = fullText.replace(/<plan_change>[\s\S]*?<\/plan_change>/, "").trim();
      } catch (e) {
        cleanText = fullText;
      }
    }

    // Persist messages (fire-and-forget — don't block the response)
    supabase.from("ai_messages").insert([
      { role: "user", content: message || `[attachment: ${attachment?.name}]` },
      { role: "assistant", content: cleanText },
    ]).then(() => {}).catch(() => {});

    return res.status(200).json({
      message: cleanText,
      planChange: planChange || null,
    });

  } catch (err) {
    return res.status(500).json({ error: "AI request failed", details: err.message });
  }
}
