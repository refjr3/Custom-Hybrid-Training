import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Must match the validated set in api/plan/update.js exactly
const VALID_WORKOUT_KEYS = new Set([
  "FOR TIME — Ultimate HYROX",
  "FOR TIME — Hyrox Full Runs Half Stations",
  "FOR TIME — Hyrox Full Send",
  "AMRAP 40 — Hyrox Grind",
  "AMRAP 60 — Ski Row Burpee",
  "EMOM 60 — Hyrox Stations",
  "EMOM 40 — Full Hyrox",
  "INTERVAL — 6 Rounds Run Ski Wall Balls",
  "STRENGTH A — Full Body Power",
  "STRENGTH B — Full Body Pull",
  "STRENGTH C — Full Body Hybrid",
  "THRESHOLD — 10×2 Min",
  "TEMPO — 20 Min Sustained",
  "VO2 MAX — Short Intervals",
  "ZONE 2 — Easy Aerobic",
  "LONG RUN — Base Builder",
  "SUNDAY — Mobility Protocol",
  "SUNDAY — Plyo & Core",
  "RECOVERY — Active Reset",
]);

// ── Date helpers ──────────────────────────────────────────────────────────────

function nextMonday(from = new Date()) {
  const d = new Date(from);
  // getDay(): 0=Sun 1=Mon … 6=Sat
  // Days until next Monday: if today is Mon (1), push 7 days to avoid starting mid-week
  const diff = d.getDay() === 1 ? 7 : (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDate(d) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// ── Prompt builders ───────────────────────────────────────────────────────────

const DAY_IDX = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };

function sportFocus(sports = []) {
  if (sports.includes("hyrox"))
    return "HYROX athlete — prioritize HYROX sessions (FOR TIME, AMRAP, EMOM, INTERVAL) plus Strength and Zone 2 running. Minimum 2 HYROX sessions/week in build phases.";
  if (sports.includes("marathon") || sports.includes("half_marathon"))
    return "Runner — prioritize Zone 2 (≥60% of runs), Long Run on Saturday, Threshold or Tempo mid-week. One Strength session/week maximum.";
  if (sports.some(s => s.includes("ironman") || s.includes("triathlon")))
    return "Triathlete — prioritize Zone 2, Long Run, Threshold. Add one Strength session/week. No HYROX.";
  if (sports.includes("strength"))
    return "Strength athlete — STRENGTH A/B/C as primary sessions; supplement with Zone 2 cardio 2×/week.";
  // hybrid or default
  return "Hybrid athlete — balance HYROX (1–2×/week), Strength (2×/week), Zone 2 running (2×/week), and one quality threshold or VO2 Max session.";
}

function deloadInstruction(pref, weeksPerBlock) {
  if (pref === "every_4th")
    return "Every 4th week globally (week 4, 8, 12 …) is a deload: is_deload=true, ~60% volume, swap high-intensity to RECOVERY or ZONE 2.";
  if (pref === "every_block")
    return `The last week of every block (week ${weeksPerBlock} of each block) is a deload: is_deload=true, ~60% volume.`;
  return `Week ${Math.floor(weeksPerBlock / 2)} of each block is a light deload week: is_deload=true. Other weeks are full volume.`;
}

function buildPrompt(profile, planStart) {
  const {
    name, sports = [], experience_level, target_race_name, target_race_date,
    weekly_training_hours, dob, lthr, z2_min, z2_max,
    weeks_per_block = 6, phases = 3, deload_preference = "every_block",
  } = profile;

  const ageYears = dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const lthrVal   = lthr ?? (ageYears ? 180 - ageYears : 163);
  const z2MinVal  = z2_min ?? Math.round(lthrVal * 0.68);
  const z2MaxVal  = z2_max ?? Math.round(lthrVal * 0.83);
  const threshMin = Math.round(lthrVal * 0.95);
  const threshMax = Math.round(lthrVal * 1.05);

  const validKeyList = [...VALID_WORKOUT_KEYS].map(k => `  "${k}"`).join("\n");
  const planStartStr = fmtDate(planStart);

  // Show one minimal example week so Claude understands the exact JSON shape
  const exampleDay = `{"day_name":"MON","am_session":"ZONE 2 — Easy Aerobic","pm_session":null,"note":"45 min easy Z2.","is_sunday":false}`;

  return `Generate a ${phases}-phase periodized training plan for ${name || "the athlete"}.

ATHLETE:
- Sports: ${sports.join(", ") || "hybrid"}
- Experience: ${experience_level ?? "intermediate"}
- Weekly hours: ${weekly_training_hours ?? 8}h
- Z2 zone: ${z2MinVal}–${z2MaxVal} bpm | Threshold: ${threshMin}–${threshMax} bpm
- Race: ${target_race_name ?? "target event"}${target_race_date ? ` on ${target_race_date}` : ""}

PLAN STRUCTURE:
- ${phases} blocks, ${weeks_per_block} weeks per block (${phases * weeks_per_block} total weeks)
- Plan starts: ${planStartStr}
- Deload rule: ${deloadInstruction(deload_preference, weeks_per_block)}

SPORT FOCUS: ${sportFocus(sports)}

VALID SESSION KEYS — use ONLY these exact strings for am_session / pm_session, or null:
${validKeyList}

Return ONLY a JSON object — no markdown fences, no explanation. Shape:
{
  "blocks": [
    {
      "block_id": "01_base",
      "phase": "BASE BUILDING",
      "label": "Block 1 — Base Building",
      "weeks": [
        {
          "label": "WEEK 1",
          "subtitle": "Establish aerobic base",
          "is_deload": false,
          "days": [
            ${exampleDay},
            {"day_name":"TUE", ...},
            {"day_name":"WED", ...},
            {"day_name":"THU", ...},
            {"day_name":"FRI", ...},
            {"day_name":"SAT", ...},
            {"day_name":"SUN","am_session":"SUNDAY — Mobility Protocol","pm_session":null,"note":"Mobility + recovery.","is_sunday":true}
          ]
        }
      ]
    }
  ]
}

RULES:
1. Exactly ${phases} blocks, each exactly ${weeks_per_block} weeks, each week exactly 7 days (MON TUE WED THU FRI SAT SUN — in that order).
2. am_session and pm_session must be null or one of the valid keys above. No other strings allowed.
3. Sunday: is_sunday=true, use "SUNDAY — Mobility Protocol" or "SUNDAY — Plyo & Core".
4. Rest days: am_session=null, pm_session=null, note="Rest day."
5. Final block: taper/peak phase approaching the race date.
6. block_id must be a unique slug prefixed with a zero-padded number (e.g. "01_base", "02_build", "03_peak").
7. Notes: max 60 characters each.
8. Scale session count to roughly ${weekly_training_hours ?? 8} hours/week of total training.`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });
  const userId = user.id;

  // Idempotency: if this user already has a plan, don't overwrite it
  const { count } = await supabase
    .from("training_weeks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count > 0) {
    console.log("[plan/generate] plan already exists for", userId, "— skipping");
    return res.status(200).json({ success: true, message: "Plan already exists", weeks_created: 0 });
  }

  const profile = req.body?.profile;
  if (!profile) return res.status(400).json({ error: "profile is required in request body" });

  const planStart = nextMonday();

  try {
    // ── Call Claude to generate the plan ──────────────────────────────────
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 8192,
        system:     "You are a JSON-only training plan generator. Output only valid JSON — no markdown fences, no prose, no explanation.",
        messages:   [{ role: "user", content: buildPrompt(profile, planStart) }],
      }),
    });

    const claudeData = await claudeRes.json();
    if (claudeData.error) throw new Error(claudeData.error.message);

    let rawText = (claudeData.content?.[0]?.text || "").trim();
    // Strip markdown code fences if Claude adds them anyway
    rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let plan;
    try {
      plan = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("[plan/generate] JSON parse error. Raw (first 300):", rawText.slice(0, 300));
      return res.status(500).json({ error: "Could not parse generated plan", details: parseErr.message });
    }

    // ── Insert training_weeks + training_days ─────────────────────────────
    const blocks = Array.isArray(plan.blocks) ? plan.blocks : [];
    let globalWeekIndex = 0;
    let weeksCreated = 0;

    for (const block of blocks) {
      const weeksList = Array.isArray(block.weeks) ? block.weeks : [];

      for (let wi = 0; wi < weeksList.length; wi++) {
        const week     = weeksList[wi];
        const weekSlug = `${userId.slice(0, 8)}_${block.block_id}_w${wi + 1}`;
        const weekStart = addDays(planStart, globalWeekIndex * 7);
        const weekEnd   = addDays(weekStart, 6);

        // Insert training_week row
        const { error: weekErr } = await supabase
          .from("training_weeks")
          .insert({
            user_id:    userId,
            week_id:    weekSlug,
            block_id:   block.block_id,
            label:      week.label      || `WEEK ${globalWeekIndex + 1}`,
            dates:      `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`,
            phase:      block.phase     || block.block_id,
            subtitle:   week.subtitle   || "",
            week_order: globalWeekIndex + 1,
          });

        if (weekErr) {
          console.error("[plan/generate] week insert error:", weekErr.message);
          return res.status(500).json({ error: "Failed to insert training week", details: weekErr.message });
        }

        // Build day rows — validate session keys, compute date labels
        const days = Array.isArray(week.days) ? week.days : [];
        const daysToInsert = days.map(day => {
          const dayOffset = DAY_IDX[day.day_name] ?? 0;
          return {
            user_id:    userId,
            week_id:    weekSlug,
            day_name:   day.day_name,
            date_label: fmtDate(addDays(weekStart, dayOffset)),
            am_session: VALID_WORKOUT_KEYS.has(day.am_session) ? day.am_session : null,
            pm_session: VALID_WORKOUT_KEYS.has(day.pm_session) ? day.pm_session : null,
            note:       day.note       || null,
            is_race_day: false,
            is_sunday:  day.is_sunday  || day.day_name === "SUN",
            ai_modified: false,
          };
        });

        if (daysToInsert.length > 0) {
          const { error: daysErr } = await supabase
            .from("training_days")
            .insert(daysToInsert);

          if (daysErr) {
            console.error("[plan/generate] days insert error:", daysErr.message);
            return res.status(500).json({ error: "Failed to insert training days", details: daysErr.message });
          }
        }

        globalWeekIndex++;
        weeksCreated++;
      }
    }

    console.log(`[plan/generate] created ${weeksCreated} weeks for user ${userId}`);
    return res.status(200).json({ success: true, weeks_created: weeksCreated });

  } catch (err) {
    console.error("[plan/generate] error:", err.message);
    return res.status(500).json({ error: "Plan generation failed", details: err.message });
  }
}
