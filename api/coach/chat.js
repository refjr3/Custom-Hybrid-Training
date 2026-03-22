import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, whoopData, currentWeek, recentActivities, attachment, user_id, scenarioChanges } = req.body;
  if (!message && !attachment) return res.status(400).json({ error: "No message or attachment provided" });

  // Resolve authenticated user_id from token if available, fall back to body
  let resolvedUserId = user_id || null;
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) resolvedUserId = user.id;
    } catch (_) {}
  }

  // Fetch user profile, flagged biomarkers, and current week schedule in parallel
  const [profileResult, bioResult, weekDaysResult] = await Promise.all([
    resolvedUserId
      ? supabase.from("user_profiles").select("*").eq("user_id", resolvedUserId).single()
      : Promise.resolve({ data: null }),
    resolvedUserId
      ? supabase.from("biomarkers").select("label,value,unit,flag").eq("user_id", resolvedUserId).in("flag", ["HIGH", "LOW"])
      : supabase.from("biomarkers").select("label,value,unit,flag").in("flag", ["HIGH", "LOW"]),
    (currentWeek?.id && resolvedUserId)
      ? supabase.from("training_days").select("day_name,am_session,pm_session,note,ai_modified").eq("user_id", resolvedUserId).eq("week_id", currentWeek.id).order("day_name")
      : Promise.resolve({ data: null }),
  ]);

  const p = profileResult.data;
  const flaggedBio = bioResult.data || [];
  const weekDays = weekDaysResult.data || [];
  const athleteName = p?.name || "the athlete";

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

  const raceGoal = p?.target_race_name
    ? `${p.target_race_name}${p.target_race_date ? ` (${p.target_race_date})` : ""}`
    : p?.race_goal ? p.race_goal.replace(/_/g, " ").toUpperCase() : "N/A";

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

  // Build current week schedule for context
  const DAY_ORDER = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
  const sortedDays = DAY_ORDER.map(d => weekDays.find(wd => wd.day_name === d)).filter(Boolean);
  const weekScheduleLines = sortedDays.length > 0
    ? sortedDays.map(d => `- ${d.day_name}: AM=${d.am_session || "REST"} | PM=${d.pm_session || "—"}${d.ai_modified ? " [AI MODIFIED]" : ""}${d.note ? ` | Note: ${d.note}` : ""}`).join("\n")
    : "- No schedule loaded";

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

CURRENT WEEK: ${currentWeek?.label ?? "N/A"}
${weekScheduleLines}

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

PLAN CHANGE — SINGLE DAY (use for modifying one session):
<plan_change>
{"type": "modify_day", "week_id": "${currentWeek?.label ?? "CURRENT WEEK"}", "day": "<MON|TUE|WED|THU|FRI|SAT|SUN>", "description": "One-line summary", "changes": {"note": "<coaching instruction>"}}
</plan_change>

PLAN CHANGE — REMAP FULL WEEK (use when restructuring multiple days at once):
<plan_change>
{"type": "remap_week", "week_id": "${currentWeek?.label ?? "CURRENT WEEK"}", "description": "One-line summary", "days": [
  {"day": "MON", "changes": {"am_session": "...", "note": "..."}},
  {"day": "WED", "changes": {"am_session": "...", "note": "..."}},
  {"day": "FRI", "changes": {"am_session": "...", "note": "..."}}
]}
</plan_change>

Rules for plan_change JSON:
- "week_id" must be the week label exactly as shown above (e.g. "${currentWeek?.label ?? "TAPER WK 1"}"). Never use IDs, UUIDs, slugs, or database identifiers.
- "day" MUST be 3-letter uppercase: MON, TUE, WED, THU, FRI, SAT, SUN
- "changes" keys: am_session, pm_session, am_session_custom, pm_session_custom, note
- Use remap_week when the user approves changes to 2+ days (e.g. full week restructure)
- When the user asks to restructure a full week or sends a training architecture, you MUST generate a remap_week plan_change that includes ALL 7 days. Never generate a modify_day for a full week request.
- For a full week remap, gather all session preferences in one <clarifying_questions> block before generating anything. Ask about: strength format, cardio format, HYROX format, recovery preference.
- Never expose technical concepts (UUIDs, database IDs, slugs) to the user

When suggesting adding a new supplement:
<plan_change>
{"type": "add_supplement", "description": "One-line summary", "supplement": {"name": "<name>", "dose": "<amount>", "note": "<rationale>", "timing": "<AM|PM|NIGHT|ANY|PRE-WORKOUT|POST-WORKOUT>", "time_group": "<MORNING|AFTERNOON|NIGHT|DAILY TARGETS>"}}
</plan_change>

WHEN TO UPDATE am_session vs note:
- Same workout, adjusted volume/intensity → "note" only
- Replacing session type entirely → update am_session + note
- Fully custom workout → am_session_custom markdown + am_session (closest WL key) + note

CRITICAL — am_session/pm_session must be exactly one of:
"FOR TIME — Ultimate HYROX", "FOR TIME — Hyrox Full Runs Half Stations", "FOR TIME — Hyrox Full Send",
"AMRAP 40 — Hyrox Grind", "AMRAP 60 — Ski Row Burpee", "EMOM 60 — Hyrox Stations", "EMOM 40 — Full Hyrox",
"INTERVAL — 6 Rounds Run Ski Wall Balls", "STRENGTH A — Full Body Power", "STRENGTH B — Full Body Pull",
"STRENGTH C — Full Body Hybrid", "THRESHOLD — 10×2 Min", "TEMPO — 20 Min Sustained",
"VO2 MAX — Short Intervals", "ZONE 2 — Easy Aerobic", "LONG RUN — Base Builder",
"SUNDAY — Mobility Protocol", "SUNDAY — Plyo & Core", "RECOVERY — Active Reset"
Or null to clear.

RESPONSE RULES:
- Lead with the direct answer. No preamble.
- Keep responses under 150 words unless a detailed plan is explicitly requested.
- Use markdown: **bold** for key terms, blank lines between sections.
- Never dump everything you know — answer only what was asked.
- Talk like a coach: direct, confident, action-oriented. Short sentences.

CLARIFYING QUESTIONS (apply in ALL modes):
When you need clarifying information, identify ALL questions you need in one pass and ask them together in a SINGLE <clarifying_questions> block. Never send multiple rounds of questions. Maximum 3 questions per block. After receiving answers, proceed directly to generating the plan — do not ask follow-up clarifying questions.
Before generating any clarifying questions, re-read the entire conversation history to check if the answer is already there. Only ask for information that was not already provided.
<clarifying_questions>
[{"question":"...", "type":"multi_select", "options":["A","B","C"]}]
</clarifying_questions>

SCENARIO MODE RULES (when message starts with [SCENARIO MODE]):
1. Travel/location/equipment requests → ask clarifying questions FIRST (days + equipment in one block)
2. Never generate exercises until equipment constraints are confirmed
3. Equipment reference: Hotel gym=dumbbells/cables/treadmill/bench/pull-up bar; Bodyweight=zero; Outdoor=running/bodyweight/park
4. Every exercise must match available equipment or regenerate`;

  try {
    // Fetch last 20 messages for conversation history, scoped to user
    let historyMessages = [];
    try {
      const historyQuery = supabase
        .from("ai_messages")
        .select("role, content")
        .order("created_at", { ascending: false })
        .limit(20);
      if (resolvedUserId) historyQuery.eq("user_id", resolvedUserId);
      historyQuery.neq("role", "proactive");
      const { data } = await historyQuery;
      if (data && data.length > 0) {
        const reversed = data.reverse();
        const validated = [];
        let expectedRole = "user";
        for (const m of reversed) {
          if (m.role === expectedRole) {
            validated.push(m);
            expectedRole = expectedRole === "user" ? "assistant" : "user";
          }
        }
        if (validated.length > 0 && validated[validated.length - 1].role === "user") {
          validated.pop();
        }
        historyMessages = validated;
      }
    } catch (e) {}

    console.log(`[coach/chat] user=${resolvedUserId?.slice(0,8) || "anon"} history=${historyMessages.length} msgs`);

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
- Strain: ${whoopData?.strain?.score ?? "N/A"}${scenarioCtx}

User message: ${message || "(see attached file)"}`;

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

    // Persist messages scoped to user
    if (resolvedUserId) {
      supabase.from("ai_messages").insert([
        { user_id: resolvedUserId, role: "user", content: message || `[attachment: ${attachment?.name}]` },
        { user_id: resolvedUserId, role: "assistant", content: cleanText },
      ]).then(() => {}).catch(() => {});
    }

    return res.status(200).json({
      message: cleanText,
      planChange: planChange || null,
    });

  } catch (err) {
    return res.status(500).json({ error: "AI request failed", details: err.message });
  }
}
