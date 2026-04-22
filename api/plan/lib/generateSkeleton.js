/**
 * Stage 1 — Claude produces macro plan structure (phases, weekly pattern, reasoning).
 * Context shape matches `buildIntakeGenerationContext` in the app (profile / intake / baselines).
 */

export const PLAN_GENERATION_MODEL = process.env.ANTHROPIC_PLAN_MODEL || "claude-sonnet-4-6";

function stripJsonFences(text) {
  return String(text || "")
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
}

function formatEquipment(equipment) {
  if (Array.isArray(equipment)) return equipment.filter(Boolean).join(", ") || "minimal";
  if (equipment && typeof equipment === "object") return JSON.stringify(equipment);
  if (equipment) return String(equipment);
  return "minimal";
}

/**
 * @param {import('@anthropic-ai/sdk').default} anthropic
 * @param {Record<string, unknown>} ctx generation_context from plan_generation_requests
 * @param {Record<string, unknown>} request full plan_generation_requests row (for top-level race_date etc.)
 */
export async function generateSkeleton(anthropic, ctx, request) {
  const profile = ctx?.profile || {};
  const intake = ctx?.intake || {};
  const baselines = ctx?.baselines;

  const raceDate = intake.raceDate || request?.race_date || profile.race_date || null;
  const daysUntilRace = raceDate
    ? Math.round((new Date(`${String(raceDate).slice(0, 10)}T12:00:00Z`) - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const sport = profile.sport || profile.focus || "hybrid / HYROX";
  const experience = profile.experience || "Not specified";
  const weeklyHours = profile.weekly_hours != null ? String(profile.weekly_hours) : "Not specified";
  const daysPerWeek = intake.daysPerWeek ?? request?.days_per_week ?? 4;
  const flexibility = intake.flexibility || request?.schedule_flexibility || "flexible";
  const unavailable = Array.isArray(intake.unavailableDays)
    ? intake.unavailableDays.join(", ")
    : "none";
  const mainFocus = intake.mainFocus || "general conditioning";
  const equipment = formatEquipment(profile.equipment);
  const injuries = profile.injuries ? String(profile.injuries) : "";

  const baselineLines = baselines
    ? `- Recovery avg: ${baselines.recovery != null ? Number(baselines.recovery).toFixed(0) : "n/a"}
- HRV: ${baselines.hrv != null ? Number(baselines.hrv).toFixed(0) : "n/a"}ms
- RHR: ${baselines.rhr != null ? Number(baselines.rhr).toFixed(0) : "n/a"}bpm
- Sleep: ${baselines.sleep_total ? (Number(baselines.sleep_total) / 60).toFixed(1) + "h" : "n/a"}
- Data history: ${baselines.days_of_data ?? "n/a"} days`
    : "- No wearable baseline yet";

  const raceLine = raceDate
    ? `- Target race: ${profile.race || "event"} on ${raceDate}${daysUntilRace != null ? ` (~${daysUntilRace} days away)` : ""}`
    : "- No specific race";

  const prompt = `You are an elite hybrid training coach. Generate a training plan skeleton for this athlete.

ATHLETE:
- Sport focus: ${sport}
- Primary focus right now: ${mainFocus}
- Experience: ${experience}
- Weekly capacity: ${weeklyHours} hrs, ${daysPerWeek} days / week
- Schedule: ${flexibility === "strict" ? "keep same days each week" : "flexible week-to-week"}
- Days unavailable: ${unavailable}
- Equipment: ${equipment}
${injuries ? `- Injuries/limitations: ${injuries}` : ""}
${raceLine}

BASELINES:
${baselineLines}

TASK:
Output a JSON object with the plan skeleton. Pick block length and phases based on:
- If race is less than 4 weeks away: race-prep taper mode (4 weeks max)
- If race is 4-12 weeks: build-focused block ending with taper
- If race is 12+ weeks: full periodization with base/build/peak/taper
- If no race: 8 or 12 weeks of cycles matching their focus

RESPOND WITH ONLY THIS JSON STRUCTURE (no preamble, no code fences):

{
  "variant_name": "Plan name — descriptive, e.g. 'HYROX Build · 12 weeks · Apr-Jul'",
  "block_length_weeks": 12,
  "phases": [
    {
      "name": "Base",
      "start_week": 1,
      "end_week": 4,
      "goal": "Build aerobic foundation and movement quality",
      "intensity_focus": "low"
    }
  ],
  "weekly_pattern": {
    "description": "4 sessions: 2 strength, 1 Z2 aerobic, 1 long run",
    "default_days": {
      "mon": { "session_type": "strength", "name": "Lower body strength", "priority": "high" },
      "tue": { "session_type": "rest", "name": "Rest" },
      "wed": { "session_type": "z2_aerobic", "name": "Z2 Erg", "priority": "high" },
      "thu": { "session_type": "rest", "name": "Rest" },
      "fri": { "session_type": "strength", "name": "Upper body strength", "priority": "high" },
      "sat": { "session_type": "long_run", "name": "Long run Z2", "priority": "medium" },
      "sun": { "session_type": "rest", "name": "Rest" }
    }
  },
  "training_priorities": ["long_run", "strength", "z2_aerobic"],
  "reasoning": {
    "summary": "One paragraph explaining the big picture choices. Direct, warm, coach voice. Reference specific data: their sport, their time availability, their race date.",
    "block_length": "Why this many weeks.",
    "phase_choice": "Why these phases in this order.",
    "session_mix": "Why this weekly pattern fits their goals."
  }
}

IMPORTANT:
- Respect days_per_week (${daysPerWeek}) and unavailable days. Never put sessions on unavailable days (use rest on those weekdays).
- Adjust intensity to experience level. Beginner = slower build. Elite = more aggressive.
- Reference their actual numbers in reasoning ("with ${weeklyHours} hrs/week...", division if known, etc.)
- Session types must be from: strength, z2_aerobic, threshold, long_run, hyrox, recovery, brick, rest`;

  const message = await anthropic.messages.create({
    model: PLAN_GENERATION_MODEL,
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content?.[0]?.type === "text" ? message.content[0].text : "";
  const cleaned = stripJsonFences(text);

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object") throw new Error("empty_skeleton");
    return parsed;
  } catch (e) {
    console.error("[skeleton] JSON parse failed:", cleaned.slice(0, 500));
    throw new Error("skeleton_parse_failed");
  }
}
