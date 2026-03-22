import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, whoopData, currentWeek, recentActivities, attachment, user_id, scenarioChanges } = req.body;
  if (!message && !attachment) return res.status(400).json({ error: "No message or attachment provided" });

  // Fetch user profile and flagged biomarkers in parallel so the system prompt is dynamic
  const [profileResult, bioResult] = await Promise.all([
    user_id
      ? supabase.from("user_profiles").select("*").eq("user_id", user_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("biomarkers").select("label,value,unit,flag").in("flag", ["HIGH", "LOW"]),
  ]);

  const p = profileResult.data;
  const flaggedBio = bioResult.data || [];
  const athleteName = p?.name || "the athlete";

  // Compute age from dob (dob replaced the age integer column in migration 005)
  const dob = p?.dob;
  const ageYears = dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const heightIn = p?.height_in;
  const heightStr = heightIn ? `${Math.floor(heightIn / 12)}'${heightIn % 12}"` : "N/A";
  const lthr = p?.lthr;
  const z2Min = p?.z2_min ?? 132;
  const z2Max = p?.z2_max ?? 151;
  const threshMin = lthr ? Math.round(lthr * 0.95) : 150;
  const threshMax = lthr ? Math.round(lthr * 1.05) : 168;

  // Race goal: prefer new target_race_name, fall back to legacy race_goal slug
  const raceGoal = p?.target_race_name
    ? `${p.target_race_name}${p.target_race_date ? ` (${p.target_race_date})` : ""}`
    : p?.race_goal ? p.race_goal.replace(/_/g, " ").toUpperCase() : "N/A";

  // Sports: prefer new sports[], fall back to legacy race_goal
  const sportsDisplay = p?.sports?.length > 0
    ? p.sports.join(", ").toUpperCase()
    : p?.race_goal ? p.race_goal.replace(/_/g, " ").toUpperCase() : "N/A";

  const SUPP_NAMES = {
    beta_alanine: "Beta Alanine 3.2–6.4g",
    creatine:     "Creatine 5g",
    whey:         "Whey Protein 25–40g",
    magnesium:    "Magnesium Glycinate 300–400mg",
    l_theanine:   "L-Theanine 200–400mg",
    sermorelin:   "Sermorelin (per Rx)",
  };
  const suppLine = (p?.supplements || []).map(id => SUPP_NAMES[id]).filter(Boolean).join(", ") || "None recorded";

  const bioLines = flaggedBio.length > 0
    ? flaggedBio.map(b => `- ${b.label}: ${b.value}${b.unit ? ` ${b.unit}` : ""} ${b.flag}`).join("\n")
    : "- No flagged biomarkers on record";

  const persona = p?.coach_persona || "grinder";
  const PERSONA_INTROS = {
    scientist: `You are THE SCIENTIST — ${athleteName}'s data-driven performance analyst. You speak in clinical, precise terms. Lead with biomarkers, lab values, and physiological rationale. Cite specific numbers. Your tone is methodical, evidence-based, and analytical. You explain the "why" behind every recommendation using sports science.`,
    grinder: `You are THE GRINDER — ${athleteName}'s no-nonsense performance coach. You push through excuses. Your tone is direct, athlete-focused, and motivational. Short sentences. Action-oriented. You believe in earned adaptation. Talk like a coach on the field — confident, commanding, and focused on execution.`,
    sage: `You are THE SAGE — ${athleteName}'s mindful performance guide. You focus on psychology, perceived effort (RPE), and sustainable adaptation. Your tone is calm, reflective, and wise. You reference the mind-body connection, emphasize recovery quality, and help the athlete develop internal awareness. You ask questions as often as you give answers.`,
  };

  const personaIntro = PERSONA_INTROS[persona] || PERSONA_INTROS.grinder;

  const SYSTEM_PROMPT = `${personaIntro} You have complete knowledge of their training, health, and goals.

ATHLETE PROFILE:
- Name: ${athleteName} | Age: ${ageYears ?? "N/A"} | Weight: ${p?.weight_lbs ? `${p.weight_lbs} lbs` : "N/A"} | Height: ${heightStr}
- Sports: ${sportsDisplay}${p?.experience_level ? ` | Level: ${p.experience_level}` : ""}${p?.weekly_training_hours ? ` | Volume: ${p.weekly_training_hours}h/wk` : ""}
- LTHR: ${lthr ?? "N/A"} bpm | Z2 Target: ${z2Min}–${z2Max} bpm | Threshold: ${threshMin}–${threshMax} bpm
- Race Goal: ${raceGoal}

FLAGGED BIOMARKERS:
${bioLines}

SUPPLEMENTS ON STACK: ${suppLine}

COACHING RULES:
1. Never suggest zero strength days — minimum 2/week
2. 80% of running volume in Z2 (${z2Min}–${z2Max} bpm)
3. Never suggest VO2 Max when WHOOP is Yellow or Red
4. WHOOP Red (<35%) = recovery only, no exceptions
5. Preserve lean mass until final 8 weeks of Ironman build
6. Factor in any HIGH/LOW biomarkers in nutrition and intensity guidance

When suggesting a plan change, include this EXACTLY at the end of your response (valid JSON only, no trailing text):
<plan_change>
{"type": "modify_day", "week_id": "<week_id from context>", "day": "<MON|TUE|WED|THU|FRI|SAT|SUN>", "description": "One-line summary of the change", "changes": {"note": "<your coaching instruction, e.g. Scale to 6×2. Stay Z4.>"}}
</plan_change>

Rules for modify_day plan_change JSON:
- "week_id" MUST be copied exactly from the id field in CURRENT TRAINING WEEK context — it is a UUID like "a1b2c3d4-..." — do NOT invent or paraphrase it
- "day" MUST be a 3-letter uppercase abbreviation: MON, TUE, WED, THU, FRI, SAT, or SUN — never a full day name
- "changes" MUST use ONLY these exact keys: am_session, pm_session, am_session_custom, pm_session_custom, note — no other keys are valid
- Only include keys inside "changes" that are actually being modified
- If you don't have enough context to fill week_id or day, do NOT emit a plan_change block

When suggesting adding a new supplement to the athlete's stack, include this EXACTLY at the end of your response instead:
<plan_change>
{"type": "add_supplement", "description": "One-line summary, e.g. Add Vitamin D3 2000 IU for bone health", "supplement": {"name": "<supplement name>", "dose": "<amount, e.g. 2000 IU>", "note": "<1-sentence rationale>", "timing": "<AM|PM|NIGHT|ANY|PRE-WORKOUT|POST-WORKOUT>", "time_group": "<MORNING|AFTERNOON|NIGHT|DAILY TARGETS>"}}
</plan_change>

Rules for add_supplement plan_change JSON:
- Only suggest if directly relevant to the athlete's goals, biomarkers, or current conversation
- Do NOT suggest a supplement already on the stack (SUPPLEMENTS ON STACK in the profile above)
- name: concise human-readable name (e.g. "Vitamin D3")
- dose: specific amount (e.g. "2000 IU" or "500mg")
- timing: when to take — AM, PM, NIGHT, ANY, PRE-WORKOUT, or POST-WORKOUT
- time_group: one of exactly MORNING, AFTERNOON, NIGHT, or DAILY TARGETS
- note: 1-sentence plain-English rationale tied to the athlete's data

WHEN TO UPDATE am_session / pm_session / am_session_custom vs note — follow this decision tree:

  Q: Is the user keeping the same workout type but just adjusting volume/intensity/duration?
     YES → use "note" only. Do NOT touch am_session/pm_session.
     Example: "Scale Threshold to 6×2 min instead of 10×2" →
       {"note": "Scale to 6×2. Maintain Z4 quality. Stop if HR won't recover."}

  Q: Is the user replacing one session type with a completely different one (e.g. Strength → Z2, Threshold → Recovery)?
     YES → update am_session to the new WL key AND include a note.
     Example: "Drop Strength, just do Z2 today" →
       {"am_session": "ZONE 2 — Easy Aerobic", "note": "Dropping Strength — WHOOP too low. Z2 only. Keep HR 132–151."}
     Example: "Replace VO2 Max with Tempo — WHOOP is Yellow" →
       {"am_session": "TEMPO — 20 Min Sustained", "note": "Swapping VO2 Max for Tempo — Yellow WHOOP. Z3–Z4 only."}
     Example: "Full rest day, swap to Recovery" →
       {"am_session": "RECOVERY — Active Reset", "pm_session": null, "note": "Full swap to active recovery. No intensity today."}

  Q: Is the user asking for a fully CUSTOM workout — a unique protocol that doesn't match any existing WL key (e.g. "design me a custom hill repeat ladder", "give me a unique lactate test session")?
     YES → write the full workout as markdown to am_session_custom.
           Set am_session to the closest matching WL key so the day-grid type badge still renders correctly.
           Include a note summarising the change.
     Format rules for am_session_custom:
       - Use ## for section headers (WARM-UP, MAIN SET, COOL-DOWN, etc.)
       - Use - for each individual step / exercise / interval
       - Use **bold** for key numbers, zones, or cues
       - Keep it concise — the athlete reads this during the session
     Example: "Design me a custom hill repeat threshold session" →
       {
         "am_session": "THRESHOLD — 10×2 Min",
         "am_session_custom": "## WARM-UP\n\n- 10 min easy jog @ Z2 (< 151 bpm)\n- 4 × 20 sec strides with full recovery\n\n## MAIN SET\n\n- **8 × 90 sec hill repeats** @ Z4 effort (150–168 bpm)\n- Jog back down recovery between reps\n- 2 min standing rest after rep 4\n\n## COOL-DOWN\n\n- 10 min easy flat jog @ Z2\n- 5 min walking + hip mobility",
         "note": "Custom hill threshold — replaces flat intervals. Hills build neuromuscular power alongside lactate tolerance."
       }

CRITICAL — am_session and pm_session value rules:
  * NEVER set am_session or pm_session to free text descriptions
  * The value MUST be copied exactly (character-for-character) from this list — any other value is REJECTED:
    "FOR TIME — Ultimate HYROX"
    "FOR TIME — Hyrox Full Runs Half Stations"
    "FOR TIME — Hyrox Full Send"
    "AMRAP 40 — Hyrox Grind"
    "AMRAP 60 — Ski Row Burpee"
    "EMOM 60 — Hyrox Stations"
    "EMOM 40 — Full Hyrox"
    "INTERVAL — 6 Rounds Run Ski Wall Balls"
    "STRENGTH A — Full Body Power"
    "STRENGTH B — Full Body Pull"
    "STRENGTH C — Full Body Hybrid"
    "THRESHOLD — 10×2 Min"
    "TEMPO — 20 Min Sustained"
    "VO2 MAX — Short Intervals"
    "ZONE 2 — Easy Aerobic"
    "LONG RUN — Base Builder"
    "SUNDAY — Mobility Protocol"
    "SUNDAY — Plyo & Core"
    "RECOVERY — Active Reset"
  * To clear a PM session entirely, set pm_session to null

RESPONSE RULES:
- Lead with the direct answer. No preamble.
- Keep responses under 150 words unless a detailed plan is explicitly requested.
- Use markdown: **bold** for key terms, blank lines between sections.
- Never dump everything you know — answer only what was asked.
- Talk like a coach: direct, confident, action-oriented. Short sentences.

SCENARIO MODE RULES (apply when user message starts with [SCENARIO MODE]):
1. If the request involves travel, location changes, or equipment limitations — you MUST ask clarifying questions BEFORE generating any plan changes. Always ask about travel days AND equipment in the same block — never split into multiple rounds.
2. When you need clarifying information, output a <clarifying_questions> block with 2-3 questions max. Each question must have predefined options. Never ask open-ended questions that require typing. Format:
<clarifying_questions>
[
  {"question": "Which days are you traveling?", "type": "multi_select", "options": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]},
  {"question": "What equipment will you have?", "type": "multi_select", "options": ["Dumbbells", "Treadmill", "Cables", "Squat Rack", "Stationary Bike", "Bodyweight Only", "Pool"]}
]
</clarifying_questions>
3. Never generate exercise prescriptions for a scenario until you have confirmed the user's equipment constraints. Guessing equipment leads to unexecutable workouts and breaks user trust.
4. When an equipment constraint is established, include it in every plan_change: every exercise in am_session_custom MUST be executable with ONLY the available equipment.
5. Equipment constraint reference:
   - Hotel gym: dumbbells, cables, treadmill, bench, pull-up bar, bodyweight
   - Bodyweight only: zero equipment
   - Outdoor only: running, bodyweight, park equipment (pull-up bar, bench)
6. If am_session_custom contains exercises requiring unavailable equipment, you must regenerate with valid alternatives.`;

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

    const scenarioCtx = scenarioChanges?.length > 0
      ? `\n\nACCEPTED SCENARIO CHANGES (build on these, do not contradict):\n${scenarioChanges.map((c,i) => `${i+1}. ${c.description} (${c.day || ""})`).join("\n")}`
      : "";

    const contextText = `TODAY: ${todayStr}

CURRENT WHOOP DATA:
- Recovery: ${whoopData?.recovery?.score ?? "N/A"}% (${whoopData?.recovery?.score >= 67 ? "GREEN" : whoopData?.recovery?.score >= 34 ? "YELLOW" : "RED"})
- HRV: ${whoopData?.recovery?.hrv ?? "N/A"}ms | RHR: ${whoopData?.recovery?.rhr ?? "N/A"}bpm
- Sleep: ${whoopData?.sleep?.score ?? "N/A"}% | Hours: ${whoopData?.sleep?.hours ?? "N/A"}h
- Strain: ${whoopData?.strain?.score ?? "N/A"}

CURRENT TRAINING WEEK UUID: ${currentWeek?.id ?? "N/A"}
CURRENT TRAINING WEEK LABEL: ${currentWeek?.label ?? "N/A"} — ${currentWeek?.subtitle ?? ""}
IMPORTANT: The week_id in any <plan_change> MUST be the exact UUID above (${currentWeek?.id ?? "N/A"}). Never use slug abbreviations like tw1 or p1w1.${scenarioCtx}

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
        max_tokens: 4000,
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
    const msgBase = user_id ? { user_id } : {};
    supabase.from("ai_messages").insert([
      { ...msgBase, role: "user", content: message || `[attachment: ${attachment?.name}]` },
      { ...msgBase, role: "assistant", content: cleanText },
    ]).then(() => {}).catch(() => {});

    return res.status(200).json({
      message: cleanText,
      planChange: planChange || null,
    });

  } catch (err) {
    return res.status(500).json({ error: "AI request failed", details: err.message });
  }
}
