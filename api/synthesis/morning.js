import { createClient } from "@supabase/supabase-js";
import { getActiveVariantId, applyTrainingVariantFilter } from "../lib/getActiveVariant.js";

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

async function handleMorningBrief(req, res) {
  const b = req.body || {};
  const c = b.context || {};
  const recovery = b.recovery ?? c.recovery;
  const hrv = b.hrv ?? c.hrv;
  const sleep = b.sleep ?? c.sleep;
  const rhr = b.rhr ?? c.rhr;
  const todaySessionRaw = b.todaySession ?? c.todaySession;
  const tomorrowSessionRaw = b.tomorrowSession ?? c.tomorrowSession;
  const weekNum = b.weekNum ?? c.weekNum;
  const phase = b.phase ?? c.phase;
  const daysToRace = b.daysToRace ?? c.daysToRace;
  const weeklyZ2Minutes = b.weeklyZ2Minutes ?? c.weeklyZ2Minutes;
  const complianceThisWeek = b.complianceThisWeek ?? c.complianceThisWeek;

  const todayLine =
    typeof todaySessionRaw === "string" && todaySessionRaw.trim()
      ? todaySessionRaw.split("\n")[0].trim()
      : todaySessionRaw != null && todaySessionRaw !== ""
        ? String(todaySessionRaw)
        : null;
  const tomorrowLine =
    typeof tomorrowSessionRaw === "string" && tomorrowSessionRaw.trim()
      ? tomorrowSessionRaw.split("\n")[0].trim()
      : tomorrowSessionRaw != null && tomorrowSessionRaw !== ""
        ? String(tomorrowSessionRaw)
        : null;

  const lines = [];
  if (recovery != null && recovery !== "" && Number.isFinite(Number(recovery))) {
    const r = Number(recovery);
    const band = r >= 67 ? "Green" : r >= 34 ? "Yellow" : "Red";
    lines.push(`Recovery: ${Math.round(r)}% — ${band}`);
  }
  if (hrv != null && hrv !== "" && Number.isFinite(Number(hrv))) {
    lines.push(`HRV: ${Math.round(Number(hrv))}ms`);
  }
  if (sleep != null && sleep !== "" && Number.isFinite(Number(sleep))) {
    lines.push(`Sleep score: ${Math.round(Number(sleep))}%`);
  }
  if (rhr != null && rhr !== "" && Number.isFinite(Number(rhr))) {
    lines.push(`RHR: ${Math.round(Number(rhr))}bpm`);
  }
  if (todayLine) lines.push(`Today: ${todayLine}`);
  if (tomorrowLine) lines.push(`Tomorrow: ${tomorrowLine}`);
  if (weekNum != null && weekNum !== "" && phase) {
    lines.push(`Week ${weekNum} of 22 — ${phase}`);
  } else if (weekNum != null && weekNum !== "") {
    lines.push(`Week ${weekNum} of 22`);
  } else if (phase) {
    lines.push(`Phase: ${phase}`);
  }
  if (daysToRace != null && daysToRace !== "" && Number.isFinite(Number(daysToRace)) && Number(daysToRace) >= 0) {
    lines.push(`${Math.round(Number(daysToRace))} days to HYROX Washington DC`);
  }
  if (weeklyZ2Minutes != null && weeklyZ2Minutes !== "" && Number.isFinite(Number(weeklyZ2Minutes)) && Number(weeklyZ2Minutes) > 0) {
    lines.push(`Z2 this week: ${Math.round(Number(weeklyZ2Minutes))}min`);
  }
  if (complianceThisWeek != null && complianceThisWeek !== "" && Number.isFinite(Number(complianceThisWeek))) {
    lines.push(`Sessions completed this week: ${Math.round(Number(complianceThisWeek))}`);
  }

  if (!lines.length) {
    lines.push("Training plan is loaded — anchor on execution quality and recovery discipline today.");
  }

  const prompt = `You are a high-performance hybrid athlete coach. Write a 2-3 sentence morning brief for your athlete. Be specific, direct, and motivating. Reference their actual numbers. Never say "no data" or "train by feel" unless truly nothing is available. Under 60 words.

${lines.join("\n")}`;

  const fallbackBrief = "Ready to work. Let's get after it.";

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ brief: fallbackBrief });
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("[synthesis/morning brief] Claude error:", data.error);
      return res.status(200).json({ brief: fallbackBrief });
    }

    const text = (data.content?.[0]?.text || "").trim();
    return res.status(200).json({ brief: text || fallbackBrief });
  } catch (err) {
    console.error("[synthesis/morning brief]", err);
    return res.status(200).json({ brief: fallbackBrief });
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

  const activeVariantId = await getActiveVariantId(supabase, user.id);

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

    const weekRow = await applyTrainingVariantFilter(
      supabase
        .from("training_weeks")
        .select("id, week_id")
        .eq("id", week_id)
        .eq("user_id", user.id),
      activeVariantId
    ).single();

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

    await applyTrainingVariantFilter(
      supabase
        .from("training_days")
        .update(updatePayload)
        .eq("week_id", weekRow.data.week_id)
        .eq("day_name", normalizedDay)
        .eq("user_id", user.id),
      activeVariantId
    );

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
