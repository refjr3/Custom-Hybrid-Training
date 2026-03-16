import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SYSTEM_PROMPT = `You are Rafael Fagundo's Elite Hybrid Performance Coach. You have complete knowledge of his training, health, and goals.

ATHLETE PROFILE:
- Age: 31 | Height: 6'3" | Weight: 209 lbs | Body Fat: 15.4% | Lean Mass: 179.7 lbs
- ALMI: 10.7 (Optimal/Highly Muscular) | Bone T-Score: +2.2 (Optimal)
- LTHR: 165-170 bpm | Z2 Target: 132-151 bpm | Threshold: 150-168 bpm

FLAGGED BIOMARKERS (monitor and factor into advice):
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
5. Preserve lean mass — don't sacrifice strength for endurance until final 8 weeks of Ironman build
6. Factor in LDL/ApoB when advising nutrition — low saturated fat, high fiber

SUPPLEMENTS (daily):
- AM: Beta Alanine 3.2-6.4g, Creatine 5g, Whey #1 25-40g
- PM: Whey #2 25-40g
- Night: Magnesium Glycinate 300-400mg, L-Theanine 200-400mg, Sermorelin (per Rx)

When you suggest a plan change, format it as JSON at the end of your response like this:
<plan_change>
{
  "type": "modify_day" | "swap_session" | "add_biomarker" | "update_supplement",
  "description": "Brief description of the change",
  "changes": { ... specific change data ... }
}
</plan_change>

If no plan change is needed, don't include the plan_change block.
Keep responses concise and direct. You know Rafael well — talk to him like a coach, not a chatbot.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, whoopData, currentWeek, recentActivities } = req.body;

  if (!message) return res.status(400).json({ error: "No message provided" });

  // Get chat history from Supabase
  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .order("created_at", { ascending: true })
    .limit(20);

  // Get latest biomarkers
  const { data: biomarkers } = await supabase
    .from("biomarkers")
    .select("*")
    .order("date_collected", { ascending: false });

  // Build context message
  const contextMessage = `
CURRENT WHOOP DATA:
- Recovery: ${whoopData?.recovery?.score ?? "N/A"}% (${whoopData?.recovery?.score >= 67 ? "GREEN" : whoopData?.recovery?.score >= 34 ? "YELLOW" : "RED"})
- HRV: ${whoopData?.recovery?.hrv ?? "N/A"}ms | RHR: ${whoopData?.recovery?.rhr ?? "N/A"}bpm
- Sleep: ${whoopData?.sleep?.score ?? "N/A"}% | Hours: ${whoopData?.sleep?.hours ?? "N/A"}h
- Strain: ${whoopData?.strain?.score ?? "N/A"}

CURRENT TRAINING WEEK: ${currentWeek?.label ?? "N/A"} — ${currentWeek?.subtitle ?? ""}

${recentActivities?.length > 0 ? `RECENT GARMIN ACTIVITIES (last 5):
${recentActivities.map(a => `- ${a.activity_type}: ${a.name} | HR: ${a.avg_hr}bpm | ${a.distance_meters ? Math.round(a.distance_meters/1000*10)/10 + "km" : ""} | ${Math.round(a.duration_seconds/60)}min`).join("\n")}` : ""}

${biomarkers?.length > 0 ? `LATEST BIOMARKERS:
${biomarkers.slice(0,6).map(b => `- ${b.label}: ${b.value}${b.unit} (${b.flag})`).join("\n")}` : ""}

User message: ${message}`;

  // Save user message
  await supabase.from("ai_messages").insert({
    role: "user",
    content: message,
  });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          ...(history || []).map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: contextMessage },
        ],
      }),
    });

    const data = await response.json();
    const fullText = data.content?.[0]?.text || "Sorry, I couldn't process that.";

    // Parse plan change if present
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

    // Save assistant message
    await supabase.from("ai_messages").insert({
      role: "assistant",
      content: cleanText,
      has_plan_change: !!planChange,
      plan_change: planChange,
      plan_change_status: planChange ? "pending" : null,
    });

    return res.status(200).json({
      message: cleanText,
      planChange: planChange || null,
    });

  } catch (err) {
    return res.status(500).json({ error: "AI request failed", details: err.message });
  }
}
