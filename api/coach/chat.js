import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, whoopData, currentWeek, recentActivities, attachment, user_id, scenarioChanges, session_id } = req.body;
  if (!message && !attachment) return res.status(400).json({ error: "No message or attachment provided" });
  if (!session_id) return res.status(400).json({ error: "session_id is required" });
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(session_id)) return res.status(400).json({ error: "session_id must be a valid UUID" });

  // Resolve authenticated user_id from token if available, fall back to body
  let resolvedUserId = user_id || null;
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) resolvedUserId = user.id;
    } catch (_) {}
  }

  // Resolve current week row so we can map week UUID -> week slug for training_days.
  let currentWeekRow = null;
  if (currentWeek?.id && resolvedUserId) {
    try {
      const { data } = await supabase
        .from("training_weeks")
        .select("id, week_id, block_id, label")
        .eq("user_id", resolvedUserId)
        .eq("id", currentWeek.id)
        .maybeSingle();
      currentWeekRow = data || null;
    } catch (_) {}
  }

  const currentWeekSlug = currentWeekRow?.week_id || null;

  // Fetch user profile, flagged biomarkers, and current week schedule in parallel
  const [profileResult, bioResult, weekDaysResult] = await Promise.all([
    resolvedUserId
      ? supabase.from("user_profiles").select("*").eq("user_id", resolvedUserId).single()
      : Promise.resolve({ data: null }),
    resolvedUserId
      ? supabase.from("biomarkers").select("label,value,unit,flag").eq("user_id", resolvedUserId).in("flag", ["HIGH", "LOW"])
      : supabase.from("biomarkers").select("label,value,unit,flag").in("flag", ["HIGH", "LOW"]),
    (currentWeekSlug && resolvedUserId)
      ? supabase
          .from("training_days")
          .select("day_name,am_session,pm_session,note,ai_modified,am_session_blocks,pm_session_blocks")
          .eq("user_id", resolvedUserId)
          .eq("week_id", currentWeekSlug)
          .order("day_name")
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
  const hasManualBlockEdits = (blocks) => Array.isArray(blocks) && blocks.some((b) => b?.is_modified);
  const weekScheduleLines = sortedDays.length > 0
    ? sortedDays.map((d) => {
        const manualAm = hasManualBlockEdits(d.am_session_blocks);
        const manualPm = hasManualBlockEdits(d.pm_session_blocks);
        const manualTag = manualAm || manualPm ? " [MANUALLY MODIFIED]" : "";
        const aiTag = !manualTag && d.ai_modified ? " [AI MODIFIED]" : "";
        const blockTag = manualTag ? " | Session blocks contain manual edits" : "";
        return `- ${d.day_name}: AM=${d.am_session || "REST"} | PM=${d.pm_session || "—"}${manualTag}${aiTag}${blockTag}${d.note ? ` | Note: ${d.note}` : ""}`;
      }).join("\n")
    : "- No schedule loaded";

  // Build dynamic week scope context for multi-week clarifying flows.
  let blockWeekLabels = [];
  if (currentWeekRow?.block_id && resolvedUserId) {
    try {
      const { data: blockWeeks } = await supabase
        .from("training_weeks")
        .select("label, week_order")
        .eq("user_id", resolvedUserId)
        .eq("block_id", currentWeekRow.block_id)
        .order("week_order", { ascending: true });
      blockWeekLabels = (blockWeeks || []).map((w) => w.label).filter(Boolean);
    } catch (_) {}
  }
  if (blockWeekLabels.length === 0 && currentWeekRow?.label) {
    blockWeekLabels = [currentWeekRow.label];
  }
  if (blockWeekLabels.length === 0 && currentWeek?.label) {
    blockWeekLabels = [currentWeek.label];
  }
  const blockWeekCount = blockWeekLabels.length;
  const blockWeeksLines = blockWeekCount > 0
    ? blockWeekLabels.map((label, idx) => `${idx + 1}. ${label}`).join("\n")
    : "- Unknown";

  const DAY_ABBREVS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
  const DAY_PATTERNS = [
    { rx: /\bMON(?:DAY)?\b/gi, day: "MON" },
    { rx: /\bTUE(?:S|SDAY)?\b/gi, day: "TUE" },
    { rx: /\bWED(?:NESDAY)?\b/gi, day: "WED" },
    { rx: /\bTHU(?:R|RSDAY)?\b/gi, day: "THU" },
    { rx: /\bFRI(?:DAY)?\b/gi, day: "FRI" },
    { rx: /\bSAT(?:URDAY)?\b/gi, day: "SAT" },
    { rx: /\bSUN(?:DAY)?\b/gi, day: "SUN" },
  ];
  const unique = (arr) => [...new Set(arr)];
  const parseQuestionPairs = (text) => {
    if (!text) return [];
    const pairs = [];
    const re = /([^:\n]{3,140})\s*:\s*([^\n.]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      pairs.push({ question: m[1].trim(), answer: m[2].trim() });
    }
    return pairs;
  };
  const extractDaysFromText = (text) => {
    if (!text) return [];
    const found = [];
    for (const p of DAY_PATTERNS) {
      if (p.rx.test(text)) found.push(p.day);
      p.rx.lastIndex = 0;
    }
    return unique(found);
  };

  // Fetch full session history first so we can derive knowledge state before prompting.
  let historyMessages = [];
  let rawHistoryMessages = [];
  try {
    if (!resolvedUserId) {
      console.warn("[coach/chat] no user_id for history fetch — skipping");
    } else {
      const historyQuery = supabase
        .from("ai_messages")
        .select("role, content")
        .eq("user_id", resolvedUserId)
        .eq("session_id", session_id)
        .neq("role", "proactive")
        .order("created_at", { ascending: false })
        .limit(100);
      const { data, error: histErr } = await historyQuery;
      if (histErr) console.error("[coach/chat] history fetch error:", histErr.message);
      if (data && data.length > 0) {
        rawHistoryMessages = data.reverse();
        const validated = [];
        let expectedRole = "user";
        for (const m of rawHistoryMessages) {
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
    }
  } catch (_) {}

  const userHistoryTexts = rawHistoryMessages
    .filter((m) => m.role === "user")
    .map((m) => String(m.content || ""))
    .filter(Boolean);
  const allUserTexts = [...userHistoryTexts, String(message || "")].filter(Boolean);

  const sessionKnowledge = {
    provided: {},
    confirmed: {},
    unknown: [],
  };

  const userJoined = allUserTexts.join("\n");
  const architectureProvided =
    !!attachment ||
    /architecture|weekly structure|training block|training plan|week\s*\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(userJoined);
  const hyroxDays = unique(
    allUserTexts
      .filter((t) => /hyrox/i.test(t))
      .flatMap((t) => extractDaysFromText(t))
  );
  const weekCountFromText = (() => {
    const match = userJoined.match(/\b(\d{1,2})\s+weeks?\b/i);
    return match ? Number(match[1]) : null;
  })();

  sessionKnowledge.provided = {
    architecture_provided: architectureProvided,
    hyrox_days: hyroxDays,
    weekly_structure_known: architectureProvided || hyroxDays.length > 0,
    week_count: blockWeekCount || weekCountFromText || null,
    block_weeks: blockWeekLabels,
    attachment_provided: !!attachment,
  };

  const confirmedScope = { value: null };
  const confirmedFormats = {};
  const confirmedFocus = {};

  for (const text of userHistoryTexts) {
    for (const pair of parseQuestionPairs(text)) {
      const q = pair.question.toLowerCase();
      const ans = pair.answer;
      if (q.includes("same structure across all weeks") || q.includes("differ per week")) {
        confirmedScope.value = ans;
      }
      if (q.includes("format")) {
        const w = q.match(/week\s*([0-9]{1,2})/i);
        if (w?.[1]) {
          confirmedFormats[`week_${w[1]}`] = ans;
        } else {
          confirmedFormats.all_weeks = ans;
        }
      }
      if (q.includes("focus")) {
        const values = ans.split(",").map((s) => s.trim()).filter(Boolean);
        const w = q.match(/week\s*([0-9]{1,2})/i);
        if (w?.[1]) {
          confirmedFocus[`week_${w[1]}`] = values;
        } else {
          confirmedFocus.all_weeks = values;
        }
      }
    }
  }

  sessionKnowledge.confirmed = {
    scope: confirmedScope.value,
    format_per_week: confirmedFormats,
    focus_per_week: confirmedFocus,
  };

  const hasScope = !!sessionKnowledge.confirmed.scope;
  const hasFormat = !!confirmedFormats.all_weeks || Object.keys(confirmedFormats).length >= Math.max(blockWeekCount, 1);
  const hasFocus = !!confirmedFocus.all_weeks || Object.keys(confirmedFocus).length >= Math.max(blockWeekCount, 1);
  if (!hasScope) sessionKnowledge.unknown.push("scope (same/different)");
  if (!hasFormat) sessionKnowledge.unknown.push("format per week");
  if (!hasFocus) sessionKnowledge.unknown.push("focus per week");

  const sessionKnowledgeText = JSON.stringify(sessionKnowledge, null, 2);

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

CURRENT BLOCK WEEKS (${blockWeekCount}):
${blockWeeksLines}

FLAGGED BIOMARKERS:
${bioLines}

SUPPLEMENTS ON STACK: ${suppLine}

SESSION KNOWLEDGE STATE (derived from conversation history + provided inputs):
\`\`\`json
${sessionKnowledgeText}
\`\`\`

Use this state as the source of truth.
- Only ask clarifying questions for items that remain in "unknown".
- Never re-ask items in "confirmed".
- Never ask for details already inferable from "provided".

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
Before asking ANY question, re-read the entire conversation history to check if the answer is already there. Only ask for information not already provided. Maximum 3 questions per clarifying block. After each response, either continue to the next required step/week or generate the plan immediately.
- At the start of each response, mentally build a list of everything already known from this conversation. Never ask about anything on that list.
- If a question was answered in a previous message — even 10 messages ago — treat that answer as locked and use it silently.
- Track confirmed answers with a mental checklist: scope (same/different), format per week, focus per week. Once checked, never ask again.
- Before asking any question, check: is this answer already visible in what the user provided? If yes, do not ask.
- If the user provided training architecture, NEVER ask:
  - how many sessions per week
  - which days have HYROX
  - what the weekly structure looks like
  - how many weeks exist
- Only ask session-specific details that cannot be inferred from architecture: format (AMRAP/EMOM/For Time), focus stations, intensity level.

CONTEXT LOCKING RULES:
- "Once a user confirms an answer in this session, NEVER ask that question again. Treat confirmed answers as locked context."
- "Before generating any clarifying question, scan the full conversation history for existing answers. If the answer is already there, use it silently."
- "For refinements to an already-confirmed session, only ask about what genuinely changed. Never restart the full question flow for a small tweak."
- "Confirmed architecture = locked. Refinement requests = targeted edits only."

Hierarchical question flow (pick only the levels needed):
Level 1 — Scope (only if request spans multiple weeks):
  {"question":"Which week?", "type":"single_select", "options":["${currentWeek?.label || "CURRENT WEEK"}", "NEXT WEEK"]}
Level 2 — Days (only if request spans multiple days):
  {"question":"Which days?", "type":"multi_select", "options":["MON","TUE","WED","THU","FRI","SAT","SUN"]}
Level 3 — Session-specific (always ask, adapt to session type):
  HYROX: follow the HYROX Session Logic Tree below (this OVERRIDES generic HYROX prompts)
  Run: {"question":"Type?", "type":"single_select", "options":["Threshold","Tempo","Zone 2","Fartlek","Track Workout"]}
  Strength: {"question":"Focus?", "type":"single_select", "options":["Push","Pull","Full Body","Lower","Upper"]}
  Recovery: {"question":"Modality?", "type":"single_select", "options":["Easy Run","Bike","Swim","Row","Walk","Mobility Only"]}

HYROX Session Logic Tree (mandatory):
Trigger this flow immediately when a training architecture includes HYROX, or a remap request touches a HYROX session/day, or HYROX is present in user-provided text/image context. Do NOT wait until after remap confirmation — ask before building.

Step 1 — ask this FIRST before anything else:
{"question":"Will your HYROX sessions follow the same structure across all weeks or differ per week?","type":"single_select","options":["Same across all weeks","Different per week"]}

Step 2a — if user selects "Same across all weeks", ask once and apply to every week in CURRENT BLOCK WEEKS:
[
  {"question":"Format?","type":"single_select","options":["Full Sim","Half Sim","AMRAP","EMOM","For Time","Compromised Running Only"]},
  {"question":"Focus stations?","type":"multi_select","options":["Sled Push","Sled Pull","Ski Erg","Row Erg","Wall Balls","Sandbag Lunges","Farmers Carry","Burpee Broad Jump","Compromised Running"]}
]

Step 2b — if user selects "Different per week", ask one week at a time and continue until ALL weeks in CURRENT BLOCK WEEKS are covered:
[
  {"question":"Week X — Format?","type":"single_select","options":["Full Sim","Half Sim","AMRAP","EMOM","For Time","Compromised Running Only"]},
  {"question":"Week X — Focus stations?","type":"multi_select","options":["Sled Push","Sled Pull","Ski Erg","Row Erg","Wall Balls","Sandbag Lunges","Farmers Carry","Burpee Broad Jump","Compromised Running"]}
]
After user confirms Week X, automatically move to Week X+1 with the same two questions until every week in the block is answered.

Scale rule:
- Never assume a fixed week count.
- Read the number of weeks from CURRENT BLOCK WEEKS and the active plan structure context.
- If "Different per week" is selected, loop through all weeks dynamically (2, 10, 16, or any count).

Format:
<clarifying_questions>
[{"question":"...", "type":"multi_select", "options":["A","B","C"]}]
</clarifying_questions>

CONVERSATIONAL REFINEMENT:
For small refinements to an already-generated session ("make it a ladder", "add sled pulls", "change to AMRAP"), make targeted edits to the existing plan_change — do not regenerate the entire session or ask new clarifying questions. Only restart the question flow if the user wants a fundamentally different structure (different day, different week, full remap).

SCENARIO MODE RULES (when message starts with [SCENARIO MODE]):
1. Travel/location/equipment requests → ask clarifying questions FIRST (days + equipment in one block)
2. Never generate exercises until equipment constraints are confirmed
3. Equipment reference: Hotel gym=dumbbells/cables/treadmill/bench/pull-up bar; Bodyweight=zero; Outdoor=running/bodyweight/park
4. Every exercise must match available equipment or regenerate`;

  try {
    console.log(`[coach/chat] user=${resolvedUserId?.slice(0,8) || "anon"} session=${session_id.slice(0,8)} history=${historyMessages.length} msgs`);

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
      const { error: insertErr } = await supabase.from("ai_messages").insert([
        { user_id: resolvedUserId, session_id, role: "user", content: message || `[attachment: ${attachment?.name}]` },
        { user_id: resolvedUserId, session_id, role: "assistant", content: cleanText },
      ]);
      if (insertErr) {
        console.error("[coach/chat] failed to save messages:", insertErr.message);
      } else {
        console.log("[coach/chat] saved 2 messages for user", resolvedUserId.slice(0,8));
      }
    } else {
      console.warn("[coach/chat] no resolvedUserId — messages NOT saved (no auth token?)");
    }

    return res.status(200).json({
      message: cleanText,
      planChange: planChange || null,
    });

  } catch (err) {
    return res.status(500).json({ error: "AI request failed", details: err.message });
  }
}
