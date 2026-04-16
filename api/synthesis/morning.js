import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const HIGH_INTENSITY_PATTERNS = [
  "FOR TIME", "AMRAP", "EMOM", "HYROX", "THRESHOLD", "VO2 MAX",
  "STRENGTH A", "STRENGTH B", "STRENGTH C", "INTERVAL",
];

function isHighIntensity(sessionName) {
  if (!sessionName) return false;
  const upper = sessionName.toUpperCase();
  return HIGH_INTENSITY_PATTERNS.some((p) => upper.includes(p));
}

function fmt(v) {
  if (v == null || v === "") return "—";
  if (typeof v === "number" && !Number.isFinite(v)) return "—";
  return String(v);
}

async function handleMorningBrief(req, res) {
  const ctx = req.body?.context || {};
  const recovery = fmt(ctx.recovery);
  const hrv = fmt(ctx.hrv);
  const sleep = fmt(ctx.sleep);
  const rhr = fmt(ctx.rhr);
  const todaySession = fmt(ctx.todaySession);
  const tomorrowSession = fmt(ctx.tomorrowSession);
  const weekNum = fmt(ctx.weekNum);
  const phase = fmt(ctx.phase);
  const daysToRace = fmt(ctx.daysToRace);
  const weeklyZ2Minutes = fmt(ctx.weeklyZ2Minutes);
  const complianceThisWeek = fmt(ctx.complianceThisWeek);

  const prompt = `You are a hybrid athlete coach. Give a 2-3 sentence morning brief for this athlete.
Be direct, specific, and motivating. Reference their actual data. No fluff.

Recovery: ${recovery}% | HRV: ${hrv}ms | Sleep: ${sleep}%
RHR: ${rhr} bpm
Today: ${todaySession}
Tomorrow: ${tomorrowSession}
Phase: Week ${weekNum} - ${phase}
Days to race: ${daysToRace}
Weekly Z2 so far: ${weeklyZ2Minutes} min
Sessions completed this week: ${complianceThisWeek}

Keep it under 60 words. Sound like a coach, not a bot.`;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ brief: "", error: "missing_ai_key" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 220,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("[synthesis/morning brief] Claude error:", data.error);
      return res.status(200).json({ brief: "", error: "ai_error" });
    }

    const text = (data.content?.[0]?.text || "").trim();
    return res.status(200).json({ brief: text || "" });
  } catch (err) {
    console.error("[synthesis/morning brief]", err);
    return res.status(200).json({ brief: "", error: "exception" });
  }
}

async function handleLegacyRecoverySynthesis(req, res, user) {
  const { recovery_score, session_name, week_id, day } = req.body;

  if (recovery_score === undefined || recovery_score === null) {
    return res.status(200).json({ modified: false, reason: "no_whoop" });
  }

  if (recovery_score >= 35) {
    return res.status(200).json({ modified: false, reason: "recovery_ok" });
  }

  if (!isHighIntensity(session_name)) {
    return res.status(200).json({ modified: false, reason: "session_not_intense" });
  }

  if (!week_id || !day) {
    return res.status(200).json({ modified: false, reason: "missing_plan_context" });
  }

  try {
    const prompt = `The athlete's WHOOP recovery is ${recovery_score}% (RED zone — under 35%). Their scheduled session is "${session_name}".

Generate a RECOVERY-APPROPRIATE replacement session. Rules:
- Max effort: Z2 (conversational pace)
- Duration: 25–35 min
- Can include: easy jog, mobility, foam rolling, contrast therapy
- NO high intensity, NO heavy lifts, NO intervals

Return ONLY a JSON object (no markdown fences):
{
  "am_session_custom": "## RECOVERY SESSION\\n\\n- 20 min easy jog @ Z2 (HR < 140)\\n- 10 min hip & thoracic mobility\\n- Contrast therapy if available",
  "note": "One-line explanation of why the session was modified",
  "replacement_type": "RECOVERY — Active Reset"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("[synthesis] Claude error:", data.error);
      return res.status(200).json({ modified: false, reason: "ai_error" });
    }

    const text = data.content?.[0]?.text || "";
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] || text);
    } catch (e) {
      console.error("[synthesis] Failed to parse Claude response:", text);
      return res.status(200).json({ modified: false, reason: "parse_error" });
    }

    const DAY_MAP = {
      monday: "MON",
      tuesday: "TUE",
      wednesday: "WED",
      thursday: "THU",
      friday: "FRI",
      saturday: "SAT",
      sunday: "SUN",
    };
    const normalizedDay = DAY_MAP[day.toLowerCase()] || day.toUpperCase().slice(0, 3);

    const weekRow = await supabase
      .from("training_weeks")
      .select("id, week_id")
      .eq("id", week_id)
      .eq("user_id", user.id)
      .single();

    if (!weekRow.data) {
      return res.status(200).json({ modified: false, reason: "week_not_found" });
    }

    const updatePayload = {
      ai_modified: true,
      ai_modification_note: parsed.note || `Recovery ${recovery_score}% — session auto-adjusted`,
      am_session_custom: parsed.am_session_custom || null,
    };

    if (parsed.replacement_type) {
      updatePayload.am_session = parsed.replacement_type;
    }

    await supabase
      .from("training_days")
      .update(updatePayload)
      .eq("week_id", weekRow.data.week_id)
      .eq("day_name", normalizedDay)
      .eq("user_id", user.id);

    return res.status(200).json({
      modified: true,
      note: updatePayload.ai_modification_note,
      custom_session: updatePayload.am_session_custom,
    });
  } catch (err) {
    console.error("[synthesis] error:", err);
    return res.status(200).json({ modified: false, reason: "exception" });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  if (req.body?.mode === "brief") {
    return handleMorningBrief(req, res);
  }

  return handleLegacyRecoverySynthesis(req, res, user);
}
