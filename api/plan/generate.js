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

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.round(n));
}

function toDaysPerWeek(value, fallback = 5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(7, Math.round(n)));
}

function normalizeSessionPreference(value) {
  const v = String(value || "").toLowerCase();
  if (v === "am") return "AM";
  if (v === "pm") return "PM";
  return "Both";
}

function normalizeEquipment(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((x) => String(x || "").trim()).filter(Boolean))];
}

function buildPhaseStructure({ customPhases, totalWeeks, legacyPhases, legacyWeeksPerBlock }) {
  const rebalanceToTotal = (rows, targetTotal) => {
    const next = rows.map((r) => ({ ...r, weeks: Math.max(1, toPositiveInt(r.weeks, 1)) }));
    let sum = next.reduce((s, r) => s + r.weeks, 0);
    if (sum > targetTotal) {
      let remove = sum - targetTotal;
      for (let i = next.length - 1; i >= 0 && remove > 0; i--) {
        const canTake = Math.max(0, next[i].weeks - 1);
        const take = Math.min(canTake, remove);
        next[i].weeks -= take;
        remove -= take;
      }
    } else if (sum < targetTotal) {
      let add = targetTotal - sum;
      let i = 0;
      while (add > 0) {
        next[i % next.length].weeks += 1;
        add -= 1;
        i += 1;
      }
    }
    return next;
  };

  const cleanedCustom = Array.isArray(customPhases)
    ? customPhases
        .map((p, idx) => ({
          name: String(p?.name || `PHASE ${idx + 1}`).trim().toUpperCase(),
          weeks: toPositiveInt(p?.weeks, 1),
        }))
        .filter((p) => p.name)
    : [];

  if (cleanedCustom.length > 0) {
    const target = toPositiveInt(totalWeeks, cleanedCustom.reduce((s, p) => s + p.weeks, 0));
    return rebalanceToTotal(cleanedCustom, target);
  }

  const weeks = toPositiveInt(totalWeeks, toPositiveInt(legacyPhases, 3) * toPositiveInt(legacyWeeksPerBlock, 6));
  const defaultNames = ["BASE", "BUILD", "PEAK", "TAPER"];
  const weights = [30, 40, 20, 10];
  const rows = defaultNames.map((name, idx) => ({
    name,
    weeks: Math.max(1, Math.round((weeks * weights[idx]) / 100)),
  }));

  return rebalanceToTotal(rows, weeks);
}

function buildPrompt(profile, planStart, builder = {}) {
  const {
    name, sports = [], experience_level, target_race_name, target_race_date,
    weekly_training_hours, dob, lthr, z2_min, z2_max,
    weeks_per_block = 6, phases = 3, deload_preference = "every_block",
  } = profile;
  const {
    totalWeeks,
    daysPerWeek,
    sessionPreference,
    equipment,
    phaseStructure,
  } = builder;

  const ageYears = dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const lthrVal   = lthr ?? (ageYears ? 180 - ageYears : 163);
  const z2MinVal  = z2_min ?? Math.round(lthrVal * 0.68);
  const z2MaxVal  = z2_max ?? Math.round(lthrVal * 0.83);
  const threshMin = Math.round(lthrVal * 0.95);
  const threshMax = Math.round(lthrVal * 1.05);

  const sportLabel = sports.length > 0 ? sports.join(", ") : "hybrid";
  const raceName = target_race_name || "target event";
  const raceDate = target_race_date || "TBD";
  const totalWeeksValue = toPositiveInt(
    totalWeeks,
    phaseStructure.reduce((sum, p) => sum + p.weeks, 0) || (phases * weeks_per_block)
  );
  const daysPerWeekValue = toDaysPerWeek(daysPerWeek, 5);
  const sessionPrefValue = normalizeSessionPreference(sessionPreference);
  const equipmentList = equipment.length > 0 ? equipment : ["Running/Outdoor", "Bodyweight"];
  const phaseStructureLabel = phaseStructure.map((p) => `${p.name} ${p.weeks} wks`).join(" -> ");
  const phaseCount = phaseStructure.length;

  const validKeyList = [...VALID_WORKOUT_KEYS].map(k => `  "${k}"`).join("\n");
  const planStartStr = fmtDate(planStart);
  const blockRules = phaseStructure.map((p, idx) => `${String(idx + 1).padStart(2, "0")} ${p.name}: ${p.weeks} weeks`).join("\n");

  // Show one minimal example week so Claude understands the exact JSON shape
  const exampleDay = `{"day_name":"MON","am_session":"ZONE 2 — Easy Aerobic","pm_session":null,"note":"45 min easy Z2.","is_sunday":false}`;

  return `Generate a ${totalWeeksValue}-week training plan for a ${sportLabel} athlete.
Race: ${raceName} on ${raceDate} (${totalWeeksValue} weeks away)
Experience: ${experience_level ?? "intermediate"}
Training days per week: ${daysPerWeekValue}
Session preference: ${sessionPrefValue}
Available equipment: ${equipmentList.join(", ")}
Phase structure: ${phaseStructureLabel}
Deload: ${deload_preference}
LTHR: ${lthrVal} bpm
Z2: ${z2MinVal}-${z2MaxVal} bpm

ATHLETE:
- Name: ${name || "the athlete"}
- Sports: ${sportLabel}
- Weekly hours target: ${weekly_training_hours ?? 8}h
- Z2 zone: ${z2MinVal}–${z2MaxVal} bpm | Threshold: ${threshMin}–${threshMax} bpm
- Race: ${raceName}${target_race_date ? ` on ${target_race_date}` : ""}

PLAN STRUCTURE:
- Total weeks: ${totalWeeksValue}
- Blocks/phases (${phaseCount}):
${blockRules}
- Plan starts: ${planStartStr}
- Deload rule: ${deloadInstruction(deload_preference, weeks_per_block)}

SPORT FOCUS: ${sportFocus(sports)}

VALID SESSION KEYS — use ONLY these exact strings for am_session / pm_session, or null:
${validKeyList}

Generate:
- First 4 weeks in full detail with complete workouts
- Remaining weeks as outlines with session types only
- Every session must use only the available equipment listed
- Respect the training days per week — never schedule more sessions than specified
- Output as structured JSON matching the training_days schema

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
1. Exactly ${phaseCount} blocks and each block must match this exact duration map:
${blockRules}
2. Each week must have exactly 7 days (MON TUE WED THU FRI SAT SUN — in that order).
3. Keep training-day count <= ${daysPerWeekValue} per week (non-rest days). Never exceed this cap.
4. Session preference must be respected:
   - AM: use am_session for planned sessions; keep pm_session null.
   - PM: use pm_session for planned sessions; keep am_session null.
   - Both: may use AM or PM, but still keep weekly total sessions <= ${daysPerWeekValue}.
5. am_session and pm_session must be null or one of the valid keys above. No other strings allowed.
6. Sunday: is_sunday=true, use "SUNDAY — Mobility Protocol" or "SUNDAY — Plyo & Core".
7. Rest days: am_session=null, pm_session=null, note="Rest day."
8. Final block should trend into peak/taper toward the race.
9. block_id must be a unique slug prefixed with a zero-padded number (e.g. "01_base", "02_build", "03_peak").
10. Notes: max 60 characters each.
11. Never prescribe equipment not listed in: ${equipmentList.join(", ")}.
12. Scale workload to roughly ${weekly_training_hours ?? 8} hours/week.
13. Weeks 1-4 should include richer notes; later weeks can be concise session-type outlines.`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });
  const userId = user.id;

  const profileData = req.body?.profile || null;
  let profile = profileData;
  if (!profile) {
    // Use defaults from request body when profile lookup is unavailable.
    profile = {
      sports: req.body?.sports || [],
      target_race_date: req.body?.target_race_date,
      weeks_per_block: req.body?.weeks_per_block || 4,
      phases: req.body?.phases || ["Base", "Build", "Peak", "Taper"],
    };
  }
  profile = {
    ...profile,
    user_id: req.body?.user_id || profile?.user_id || userId,
  };

  // ── Check generation_status and decide whether to proceed ─────────────────
  let genStatus = "pending";
  const { data: profileRow, error: profileErr } = await supabase
    .from("user_profiles")
    .select("generation_status")
    .eq("user_id", userId)
    .single();

  if (profileErr && profileErr.code !== "PGRST116") {
    // Fallback path: continue with request-body profile defaults.
    console.warn("[plan/generate] profile fetch failed, using request fallback:", profileErr.message);
  } else {
    genStatus = profileRow?.generation_status ?? "pending";
  }

  if (genStatus === "complete") {
    // Completed plan exists — honour idempotency, don't regenerate
    const { count } = await supabase
      .from("training_weeks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (count > 0) {
      console.log("[plan/generate] plan already complete for", userId, "— skipping");
      return res.status(200).json({ success: true, message: "Plan already exists", weeks_created: 0 });
    }
    // Status says complete but rows are gone — fall through and regenerate
  }

  if (genStatus === "in_progress" || genStatus === "failed") {
    // Previous attempt was interrupted or failed — clear partial data and retry
    console.log(`[plan/generate] status=${genStatus} for ${userId} — clearing partial data and retrying`);

    const [{ error: delDaysErr }, { error: delWeeksErr }, { error: delBlocksErr }] = await Promise.all([
      supabase.from("training_days").delete().eq("user_id", userId),
      supabase.from("training_weeks").delete().eq("user_id", userId),
      supabase.from("training_blocks").delete().eq("user_id", userId),
    ]);

    if (delDaysErr || delWeeksErr || delBlocksErr) {
      const msg = (delDaysErr || delWeeksErr || delBlocksErr).message;
      console.error("[plan/generate] cleanup error:", msg);
      return res.status(500).json({ error: "Failed to clear partial plan data", details: msg });
    }
  }

  const daysPerWeek = toDaysPerWeek(
    req.body?.days_per_week ?? profile?.days_per_week,
    5
  );
  const sessionPreference = normalizeSessionPreference(
    req.body?.session_preference ?? profile?.session_preference
  );
  const equipment = normalizeEquipment(
    req.body?.equipment ?? profile?.equipment
  );
  const totalWeeks = toPositiveInt(
    req.body?.total_weeks ?? profile?.total_weeks,
    toPositiveInt(profile?.phases, 3) * toPositiveInt(profile?.weeks_per_block, 6)
  );
  const phaseStructure = buildPhaseStructure({
    customPhases: req.body?.phases ?? profile?.custom_phases,
    totalWeeks,
    legacyPhases: profile?.phases,
    legacyWeeksPerBlock: profile?.weeks_per_block,
  });

  const builderContext = {
    totalWeeks,
    daysPerWeek,
    sessionPreference,
    equipment,
    phaseStructure,
  };

  // Mark generation as in_progress
  await supabase
    .from("user_profiles")
    .update({ generation_status: "in_progress" })
    .eq("user_id", userId);

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
        messages:   [{ role: "user", content: buildPrompt(profile, planStart, builderContext) }],
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
      await supabase
        .from("user_profiles")
        .update({ generation_status: "failed" })
        .eq("user_id", userId);
      return res.status(500).json({ error: "Could not parse generated plan", details: parseErr.message });
    }

    // ── Insert training_blocks → training_weeks → training_days ──────────
    const blocks = Array.isArray(plan.blocks) ? plan.blocks : [];
    let globalWeekIndex = 0;
    let weeksCreated = 0;

    for (const block of blocks) {
      // 1. Insert training_block row first
      const { error: blockErr } = await supabase
        .from("training_blocks")
        .insert({
          user_id:  userId,
          block_id: block.block_id,
          phase:    block.phase  || block.block_id,
          label:    block.label  || block.block_id,
        });

      if (blockErr) {
        console.error("[plan/generate] block insert error:", blockErr.message);
        await supabase
          .from("user_profiles")
          .update({ generation_status: "failed" })
          .eq("user_id", userId);
        return res.status(500).json({ error: "Failed to insert training block", details: blockErr.message });
      }

      const weeksList = Array.isArray(block.weeks) ? block.weeks : [];

      for (let wi = 0; wi < weeksList.length; wi++) {
        const week     = weeksList[wi];
        const weekSlug = `${userId.slice(0, 8)}_${block.block_id}_w${wi + 1}`;
        const weekStart = addDays(planStart, globalWeekIndex * 7);
        const weekEnd   = addDays(weekStart, 6);

        // 2. Insert training_week row, referencing the block_id slug
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
          await supabase
            .from("user_profiles")
            .update({ generation_status: "failed" })
            .eq("user_id", userId);
          return res.status(500).json({ error: "Failed to insert training week", details: weekErr.message });
        }

        // 3. Build and insert day rows
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
            await supabase
              .from("user_profiles")
              .update({ generation_status: "failed" })
              .eq("user_id", userId);
            return res.status(500).json({ error: "Failed to insert training days", details: daysErr.message });
          }
        }

        globalWeekIndex++;
        weeksCreated++;
      }
    }

    // Mark generation as complete
    await supabase
      .from("user_profiles")
      .update({ generation_status: "complete" })
      .eq("user_id", userId);

    console.log(`[plan/generate] created ${weeksCreated} weeks for user ${userId}`);
    return res.status(200).json({ success: true, weeks_created: weeksCreated });

  } catch (err) {
    console.error("[plan/generate] error:", err.message);
    await supabase
      .from("user_profiles")
      .update({ generation_status: "failed" })
      .eq("user_id", userId);
    return res.status(500).json({ error: "Plan generation failed", details: err.message });
  }
}
