import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ALLOWED_AM_SESSIONS = [
  "FOR TIME — Hyrox Full Runs Half Stations",
  "FOR TIME — Hyrox Half Runs Full Stations",
  "AMRAP — Hyrox Full Sim",
  "EMOM — Hyrox Skills",
  "STRENGTH A — Full Body Power",
  "STRENGTH B — Lower Dominant",
  "STRENGTH C — Upper Dominant",
  "THRESHOLD — 10x2 Min",
  "TEMPO — 20 Min Sustained",
  "VO2 MAX — 6x3 Min",
  "ZONE 2 — Easy Aerobic",
  "LONG RUN — Zone 2 Base",
  "RACE SIMULATION — Full HYROX",
  "RECOVERY — Active Reset",
  "MOBILITY — Full Protocol",
];
const VALID_WORKOUT_KEYS = new Set(ALLOWED_AM_SESSIONS);

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
const DEFAULT_EQUIPMENT = [
  "Full Gym",
  "HYROX Equipment",
  "Dumbbells",
  "Bodyweight",
  "Running/Outdoor",
  "Pool",
  "Cycling",
];

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

function weeksUntilRaceDate(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - today.getTime();
  if (diffMs <= 0) return 12;
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));
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

function buildPrompt(profile, builder = {}) {
  const sports = Array.isArray(profile?.sports) ? profile.sports : [];
  const sport = sports[0] || profile?.race_goal || "hybrid";
  const raceName = profile?.target_race_name || "No race set";
  const raceDate = profile?.target_race_date || "TBD";
  const totalWeeks = toPositiveInt(builder?.totalWeeks, 12);
  const daysPerWeek = toDaysPerWeek(builder?.daysPerWeek, 5);
  const phaseStructure = Array.isArray(builder?.phaseStructure) ? builder.phaseStructure : [];
  const fallback = [Math.max(1, Math.round(totalWeeks * 0.3)), Math.max(1, Math.round(totalWeeks * 0.4)), Math.max(1, Math.round(totalWeeks * 0.2)), Math.max(1, totalWeeks - (Math.round(totalWeeks * 0.3) + Math.round(totalWeeks * 0.4) + Math.round(totalWeeks * 0.2)))];
  const getPhaseWeeks = (name, idx) => {
    const row = phaseStructure.find((p) => String(p?.name || "").toUpperCase().includes(name));
    return toPositiveInt(row?.weeks, fallback[idx]);
  };
  const baseWeeks = getPhaseWeeks("BASE", 0);
  const buildWeeks = getPhaseWeeks("BUILD", 1);
  const peakWeeks = getPhaseWeeks("PEAK", 2);
  const taperWeeks = getPhaseWeeks("TAPER", 3);
  const allowed = ALLOWED_AM_SESSIONS.map((s) => `"${s}"`).join(", ");

  return `Generate a ${totalWeeks}-week ${sport} training plan.
Race: ${raceName} on ${raceDate}.
Training days per week: ${daysPerWeek}.
Phases: Base (${baseWeeks}wk) → Build (${buildWeeks}wk) → Peak (${peakWeeks}wk) → Taper (${taperWeeks}wk).

Return ONLY valid JSON array. No markdown. No explanation.
Each week has week_label, phase, week_order, and days array.
Each day has day_name (MON/TUE/WED/THU/FRI/SAT/SUN), am_session (from allowed list or null), note (one sentence or null).
Rest days have null am_session.
Allowed am_session values: [${allowed}]`;
}

function toSlug(value, fallback = "block") {
  const clean = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || fallback;
}

function buildBlocksFromWeeks(weeksArray, phaseStructure) {
  const normalizedWeeks = Array.isArray(weeksArray) ? weeksArray : [];
  const byPhase = new Map();
  const weekLabels = [];
  normalizedWeeks.forEach((week, idx) => {
    const phase = String(week?.phase || "Base");
    const key = phase.toUpperCase();
    if (!byPhase.has(key)) byPhase.set(key, []);
    byPhase.get(key).push({ ...week, week_order: Number(week?.week_order) || (idx + 1) });
    weekLabels.push({ key, order: Number(week?.week_order) || (idx + 1) });
  });

  const orderedPhases = [];
  const used = new Set();
  (phaseStructure || []).forEach((p) => {
    const key = String(p?.name || "").toUpperCase();
    if (byPhase.has(key) && !used.has(key)) {
      orderedPhases.push(key);
      used.add(key);
    }
  });
  weekLabels
    .sort((a, b) => a.order - b.order)
    .forEach(({ key }) => {
      if (!used.has(key) && byPhase.has(key)) {
        orderedPhases.push(key);
        used.add(key);
      }
    });

  return orderedPhases.map((phaseKey, idx) => {
    const phaseWeeks = (byPhase.get(phaseKey) || []).sort((a, b) => (a.week_order || 0) - (b.week_order || 0));
    return {
      block_id: `${String(idx + 1).padStart(2, "0")}_${toSlug(phaseKey, "phase")}`,
      phase: phaseKey,
      label: `${phaseKey} BLOCK`,
      weeks: phaseWeeks.map((w) => ({
        label: w.week_label || `WEEK ${w.week_order || 1}`,
        subtitle: null,
        is_deload: false,
        days: Array.isArray(w.days) ? w.days : [],
      })),
    };
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
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
        sports: req.body?.sports || (req.body?.sport ? [req.body.sport] : []),
        race_goal: req.body?.sport || req.body?.race_goal || null,
        target_race_name: req.body?.race_name || null,
        target_race_date: req.body?.race_date || req.body?.target_race_date || null,
        weeks_per_block: req.body?.weeks_per_block || 4,
        phases: req.body?.phases || ["Base", "Build", "Peak", "Taper"],
        days_per_week: req.body?.days_per_week || 5,
      };
    }
    profile = {
      ...profile,
      user_id: req.body?.user_id || profile?.user_id || userId,
    };
    // Normalize the simplified 3-question payload.
    const simpleSport = String(req.body?.sport || "").trim().toLowerCase();
    const simpleRaceName = typeof req.body?.race_name === "string" ? req.body.race_name.trim() : "";
    const simpleRaceDate = typeof req.body?.race_date === "string" ? req.body.race_date : null;
    if (simpleSport) {
      profile.sports = [simpleSport];
      profile.race_goal = simpleSport;
    }
    if ((!Array.isArray(profile?.sports) || profile.sports.length === 0) && profile?.race_goal) {
      profile.sports = [String(profile.race_goal).toLowerCase()];
    }
    profile.target_race_name = simpleRaceName || profile?.target_race_name || null;
    profile.target_race_date = simpleRaceDate || profile?.target_race_date || null;

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
      return res.status(200).json({ success: true, message: "Plan already exists", weeks_created: 0 });
    }
    // Status says complete but rows are gone — fall through and regenerate
    }

    if (genStatus === "in_progress" || genStatus === "failed") {
    // Previous attempt was interrupted or failed — clear partial data and retry
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

    const inferredWeeks = weeksUntilRaceDate(req.body?.race_date || profile?.target_race_date);
    const daysPerWeek = toDaysPerWeek(req.body?.days_per_week ?? profile?.days_per_week, 5);
    const sessionPreference = normalizeSessionPreference(
      req.body?.session_preference ?? profile?.session_preference
    );
    const equipment = normalizeEquipment(
      req.body?.equipment ?? profile?.equipment
    );
    const totalWeeks = toPositiveInt(req.body?.total_weeks, inferredWeeks ?? 12);
    const phaseStructure = buildPhaseStructure({
      customPhases: req.body?.phases,
      totalWeeks,
      legacyPhases: 4,
      legacyWeeksPerBlock: Math.max(1, Math.round(totalWeeks / 4)),
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
        messages:   [{ role: "user", content: buildPrompt(profile, builderContext) }],
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
    const generatedWeeks = Array.isArray(plan)
      ? plan
      : (Array.isArray(plan.weeks) ? plan.weeks : []);
    const blocks = [{
      block_id: "01_plan",
      phase: "PLAN",
      label: "Generated Plan",
      weeks: generatedWeeks,
    }];
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

    return res.status(200).json({ success: true, weeks_created: weeksCreated });

    } catch (err) {
      console.error("[generate] error:", err.message, err.stack);
      await supabase
        .from("user_profiles")
        .update({ generation_status: "failed" })
        .eq("user_id", userId);
      return res.status(500).json({
        error: err.message,
        step: "see logs",
      });
    }
  } catch (err) {
    console.error("[generate] error:", err.message, err.stack);
    return res.status(500).json({
      error: err.message,
      step: "see logs",
    });
  }
}
