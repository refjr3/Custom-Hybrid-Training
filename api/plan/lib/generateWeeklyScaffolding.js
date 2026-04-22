/**
 * Stage 2 — session-level scaffolding for every week in the block.
 */

const DEFAULT_MODEL = process.env.ANTHROPIC_PLAN_MODEL || "claude-3-5-sonnet-20241022";

function stripJsonFences(text) {
  return String(text || "")
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
}

/**
 * @param {import('@anthropic-ai/sdk').default} anthropic
 * @param {Record<string, unknown>} ctx generation_context
 * @param {Record<string, unknown>} skeleton parsed skeleton from stage 1
 */
export async function generateWeeklyScaffolding(anthropic, ctx, skeleton) {
  const profile = ctx?.profile || {};
  const intake = ctx?.intake || {};
  const blockWeeks = Math.max(1, Math.min(52, Number(skeleton.block_length_weeks) || 8));
  const phases = Array.isArray(skeleton.phases) ? skeleton.phases : [];
  const defaultDays = skeleton.weekly_pattern?.default_days || {};

  const phaseSummary = phases.length
    ? phases.map((p) => `${p.name} (weeks ${p.start_week}-${p.end_week}): ${p.goal}`).join("; ")
    : "Single phase";

  const prompt = `Using this plan skeleton, generate session-level details for each week.

SKELETON:
- Block: ${blockWeeks} weeks
- Phases: ${phaseSummary}
- Weekly pattern: ${JSON.stringify(defaultDays)}
- Training days: ${intake.daysPerWeek ?? 4} sessions per week (non-rest)
- Unavailable: ${Array.isArray(intake.unavailableDays) ? intake.unavailableDays.join(", ") || "none" : "none"}

Generate a JSON array of exactly ${blockWeeks} weeks, where each week has 7 days (keys mon..sun lowercase) with session names.

For each week, progressively adjust volume/intensity based on the phase. For deload weeks (typically every 4th), reduce volume by 30-40%.

RESPOND WITH ONLY THIS JSON (no preamble):

[
  {
    "week_number": 1,
    "phase": "Base",
    "is_deload": false,
    "subtitle": "Establishing rhythm",
    "days": {
      "mon": { "session_type": "strength", "name": "Lower body strength", "notes": "Sets/reps to be detailed" },
      "tue": { "session_type": "rest", "name": "Rest" },
      "wed": { "session_type": "z2_aerobic", "name": "Z2 Erg · 45 min", "notes": "Keep HR conversational" },
      "thu": { "session_type": "rest", "name": "Rest" },
      "fri": { "session_type": "strength", "name": "Upper body strength", "notes": "Moderate loads" },
      "sat": { "session_type": "long_run", "name": "Long run · 60 min Z2", "notes": "Build aerobic base" },
      "sun": { "session_type": "rest", "name": "Rest" }
    }
  }
]

IMPORTANT:
- The array length must be exactly ${blockWeeks}.
- Progress duration/intensity across weeks within each phase
- Every 4th week should be a deload (lower volume)
- Days not used for training must be "rest"
- Session names should be specific (e.g. "Z2 Erg · 60 min" not just "Easy cardio")
- Keep names under 40 characters
- Athlete experience: ${profile.experience || "unknown"}; respect conservative progression if beginner.`;

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content?.[0]?.type === "text" ? message.content[0].text : "";
  const cleaned = stripJsonFences(text);

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error("weeks_not_array");
    return parsed;
  } catch (e) {
    console.error("[weeks] JSON parse failed:", cleaned.slice(0, 500));
    throw new Error("weeks_parse_failed");
  }
}
