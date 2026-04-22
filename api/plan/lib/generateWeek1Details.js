/**
 * Stage 3 — full exercise blocks for week 1 only (lazy detail for later weeks later).
 */

import { PLAN_GENERATION_MODEL } from "./generateSkeleton.js";

function stripJsonFences(text) {
  return String(text || "")
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
}

const TO_UPPER = {
  mon: "MON",
  tue: "TUE",
  wed: "WED",
  thu: "THU",
  fri: "FRI",
  sat: "SAT",
  sun: "SUN",
};

function normalizeDayKey(k) {
  const s = String(k).toLowerCase();
  return TO_UPPER[s] || (["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].includes(String(k).toUpperCase()) ? String(k).toUpperCase() : null);
}

function formatEquipment(equipment) {
  if (Array.isArray(equipment)) return equipment.filter(Boolean).join(", ") || "minimal";
  if (equipment && typeof equipment === "object") return JSON.stringify(equipment);
  if (equipment) return String(equipment);
  return "minimal";
}

/**
 * @param {import('@anthropic-ai/sdk').default} anthropic
 * @param {Record<string, unknown>} ctx
 * @param {Record<string, unknown>} skeleton
 * @param {Record<string, unknown>} week first week object from scaffolding
 * @param {string} week1WeekId concrete training_weeks.week_id for week 1
 */
export async function generateWeek1Details(anthropic, ctx, skeleton, week, supabase, userId, variantId, week1WeekId) {
  const profile = ctx?.profile || {};
  const intake = ctx?.intake || {};

  const lines = Object.entries(week?.days && typeof week.days === "object" ? week.days : {})
    .filter(([k, d]) => d && String(d.session_type || "").toLowerCase() !== "rest")
    .map(([day, d]) => `${day}: ${d.name} (${d.session_type})`)
    .join("\n");

  const prompt = `Generate detailed exercise blocks for week 1 of this training plan.

Athlete: ${profile.experience || "intermediate"} ${profile.sport || profile.focus || "hybrid athlete"}
Equipment: ${formatEquipment(profile.equipment)}
Main focus: ${intake.mainFocus || "general fitness"}

For each training day in week 1 (not rest days), produce warmup + main + cooldown blocks.

WEEK 1 SESSIONS:
${lines || "(no sessions — still output {})"}

RESPOND WITH JSON (no preamble) where TOP-LEVEL keys are lowercase three-letter weekdays mon..sun.
Only include keys for days that have real sessions (not rest). Example shape:

{
  "mon": {
    "am_session_blocks": [
      {
        "type": "warmup",
        "duration_min": 10,
        "exercises": [
          { "name": "Row", "details": "5 min Z1-Z2 easy", "sets": 1, "reps": null, "weight": null, "rest": null }
        ]
      },
      {
        "type": "main",
        "duration_min": 40,
        "exercises": [
          { "name": "Back squat", "details": "Heavy barbell", "sets": 4, "reps": "5", "weight": "RPE 7-8", "rest": "2-3 min" }
        ]
      },
      {
        "type": "cooldown",
        "duration_min": 5,
        "exercises": [
          { "name": "Walk + hip mobility", "details": "Loose walking + 90-90 stretch" }
        ]
      }
    ]
  }
}

Adjust to equipment and experience level. Blocks must be a JSON array suitable for the client.`;

  const message = await anthropic.messages.create({
    model: PLAN_GENERATION_MODEL,
    max_tokens: 6000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content?.[0]?.type === "text" ? message.content[0].text : "";
  const cleaned = stripJsonFences(text);

  let details;
  try {
    details = JSON.parse(cleaned);
  } catch (e) {
    console.error("[week1 details] parse failed:", cleaned.slice(0, 500));
    return;
  }

  if (!details || typeof details !== "object") return;

  for (const [dayKey, daySpec] of Object.entries(details)) {
    const dayUpper = normalizeDayKey(dayKey);
    if (!dayUpper) continue;
    const blocks = daySpec?.am_session_blocks;
    if (!Array.isArray(blocks) || blocks.length === 0) continue;

    const { error } = await supabase
      .from("training_days")
      .update({ am_session_blocks: blocks })
      .eq("user_id", userId)
      .eq("variant_id", variantId)
      .eq("week_id", week1WeekId)
      .eq("day_name", dayUpper);

    if (error) {
      console.error("[week1 details] update failed", dayUpper, error.message);
    }
  }
}
