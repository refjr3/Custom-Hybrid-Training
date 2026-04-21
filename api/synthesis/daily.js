import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { getAccessTokenFromRequest } from "../lib/sessionToken.js";
import { resolveMetrics, resolveMetricsRange } from "../metrics/resolver.js";
import {
  getCalendarYmdInTimeZone,
  addCalendarDaysToIsoYmd,
  formatEasternYmdFromDate,
} from "../../lib/getLocalToday.js";
import { getActiveVariantId, applyTrainingVariantFilter } from "../lib/getActiveVariant.js";
import {
  evaluateReadiness,
  evaluateHRV,
  evaluateRHR,
  evaluateSleepDuration,
  evaluateSleepStage,
  evaluateSleepAwake,
  evaluateSleepScore,
  evaluateZ2Weekly,
} from "../lib/thresholds.js";

const MONTH_TO_INDEX = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function dateLabelToIso(dateLabel, yearHint) {
  if (!dateLabel || typeof dateLabel !== "string") return null;
  const y = yearHint || new Date().getFullYear();
  const match = dateLabel.trim().match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (!match) return null;
  const monthIdx = MONTH_TO_INDEX[match[1].toLowerCase()];
  if (monthIdx === undefined) return null;
  const parsed = new Date(Date.UTC(y, monthIdx, Number(match[2]), 12, 0, 0));
  if (!Number.isFinite(parsed.getTime())) return null;
  return formatEasternYmdFromDate(parsed);
}

function isoAtUtcNoon(isoYmd) {
  const [yy, mm, dd] = String(isoYmd).split("-").map(Number);
  if (!yy || !mm || !dd) return new Date();
  return new Date(Date.UTC(yy, mm - 1, dd, 12, 0, 0));
}

function mondayIsoOnOrBefore(todayIso, tz) {
  let cur = todayIso;
  for (let i = 0; i < 7; i++) {
    const label = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(isoAtUtcNoon(cur));
    if (label === "Mon") return cur;
    const prev = addCalendarDaysToIsoYmd(cur, -1);
    if (!prev || prev === cur) break;
    cur = prev;
  }
  return todayIso;
}

function jsWeekdayFromTz(tz) {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "weekday")?.value;
  const mapToJs = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return mapToJs[wd] ?? new Date().getDay();
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "no_auth" });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "invalid" });

    const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();

    const tz = profile?.time_zone || "America/New_York";
    const today = getCalendarYmdInTimeZone(tz) || new Date().toISOString().slice(0, 10);
    const yearHint = parseInt(String(today).slice(0, 4), 10) || new Date().getFullYear();

    const todayMetrics = await resolveMetrics(user.id, today);

    const { data: baselines } = await supabase.from("user_baselines").select("*").eq("user_id", user.id).maybeSingle();

    const activeVariantId = await getActiveVariantId(supabase, user.id);

    const weekStart = mondayIsoOnOrBefore(today, tz);
    const weekMetrics = await resolveMetricsRange(user.id, weekStart, today);
    const weeklyZ2 = weekMetrics.reduce((sum, m) => sum + (m.z2_minutes || 0), 0);

    const { data: dayRows } = await applyTrainingVariantFilter(
      supabase.from("training_days").select("*").eq("user_id", user.id),
      activeVariantId
    );

    const todayDay =
      (dayRows || []).find((d) => dateLabelToIso(d.date_label, yearHint) === today) || null;

    const flags = {
      readiness: evaluateReadiness(todayMetrics?.readiness_score),
      hrv: evaluateHRV(todayMetrics?.hrv_rmssd, baselines?.baseline_hrv_rmssd),
      rhr: evaluateRHR(todayMetrics?.resting_hr, baselines?.baseline_resting_hr),
      sleep_duration: evaluateSleepDuration(todayMetrics?.sleep_total_min),
      sleep_score: evaluateSleepScore(todayMetrics?.sleep_score),
      sleep_deep: evaluateSleepStage(todayMetrics?.sleep_deep_min, baselines?.baseline_sleep_deep_min, "Deep"),
      sleep_awake: evaluateSleepAwake(todayMetrics?.sleep_awake_min, baselines?.baseline_sleep_awake_min),
      z2_weekly: evaluateZ2Weekly(weeklyZ2, 240, jsWeekdayFromTz(tz), baselines?.baseline_z2_weekly_min),
    };

    const bodyFlagColors = [
      flags.readiness,
      flags.hrv,
      flags.rhr,
      flags.sleep_duration,
      flags.sleep_score,
      flags.sleep_deep,
      flags.sleep_awake,
    ]
      .filter(Boolean)
      .map((f) => f.color);

    let overallColor;
    if (bodyFlagColors.includes("red")) overallColor = "red";
    else if (bodyFlagColors.filter((c) => c === "amber").length >= 2) overallColor = "amber";
    else overallColor = "green";

    const flagSummary = Object.entries(flags)
      .filter(([, f]) => f)
      .map(([k, f]) => `${k}: ${f.color} · ${f.text}`)
      .join("\n");

    const plannedSession = todayDay?.am_session_custom || todayDay?.am_session || "rest day";

    const dayIdx = (() => {
      const d = jsWeekdayFromTz(tz);
      return d === 0 ? 7 : d;
    })();

    const dayOfWeek = dayIdx;
    const sleepLine =
      todayMetrics?.sleep_total_min != null
        ? `${Math.round(todayMetrics.sleep_total_min / 60)}h ${todayMetrics.sleep_total_min % 60}m`
        : "n/a";

    const prompt = `You are ${profile?.name || "an athlete"}'s hybrid training coach. Write a SHORT daily read (max 2 sentences for summary, 1 for action).

COACHING PHILOSOPHY:
- You are a grinder, not a worrier. Default stance: get the session done.
- Only recommend pulling back, modifying, or skipping when body signals are CLEARLY off:
  * Readiness red (below 34), OR
  * HRV down more than 15% from baseline, OR
  * RHR up more than 8 bpm above baseline, OR
  * Sleep under 6 hours total, OR
  * Multiple amber flags pointing the same direction
- Pacing metrics (Z2 weekly behind pace on Mon/Tue/Wed) are NOT reasons to pull back from today's planned session. Mention them as callouts but don't override the session.
- When body signals are green or mixed-green, call for full execution.
- When body signals are mixed with one yellow, note it but keep the session.
- When body signals are clearly red, pull back specifically and briefly.

Today's metrics:
- Readiness: ${todayMetrics?.readiness_score ?? "n/a"} (${todayMetrics?.readiness_color ?? "n/a"})
- HRV: ${todayMetrics?.hrv_rmssd != null ? todayMetrics.hrv_rmssd.toFixed(0) : "n/a"}ms (baseline ${baselines?.baseline_hrv_rmssd != null ? baselines.baseline_hrv_rmssd.toFixed(0) : "n/a"})
- RHR: ${todayMetrics?.resting_hr ?? "n/a"} (baseline ${baselines?.baseline_resting_hr != null ? baselines.baseline_resting_hr.toFixed(0) : "n/a"})
- Sleep: ${sleepLine}, score ${todayMetrics?.sleep_score ?? "n/a"}
- Deep sleep: ${todayMetrics?.sleep_deep_min != null ? todayMetrics.sleep_deep_min.toFixed(0) : "n/a"}min (baseline ${baselines?.baseline_sleep_deep_min != null ? baselines.baseline_sleep_deep_min.toFixed(0) : "n/a"})
- Awake: ${todayMetrics?.sleep_awake_min != null ? todayMetrics.sleep_awake_min.toFixed(0) : "n/a"}min
- Weekly Z2: ${weeklyZ2}min of 240 target (day ${dayOfWeek} of 7 — ${dayOfWeek <= 2 ? "week just started" : dayOfWeek >= 5 ? "late in week" : "mid-week"})

Today's plan: ${plannedSession}

Thresholds evaluated:
${flagSummary}

Respond exactly as:
HEADLINE: [4-6 words, punchy, confident]
SUMMARY: [1-2 sentences reading the body state, not the pacing]
ACTION: [1 sentence — what to do with today's planned session. Default: execute as written.]

Be direct. Use the athlete's name occasionally, not every time. No fluff. When body is green, say go.`;

    let headline = "Today";
    let summary = "";
    let action = "";

    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      });
      const responseText = message.content[0]?.text || "";
      headline = (responseText.match(/HEADLINE:\s*(.+)/i)?.[1] || headline).trim();
      summary = (responseText.match(/SUMMARY:\s*(.+)/i)?.[1] || "").trim();
      action = (responseText.match(/ACTION:\s*(.+)/i)?.[1] || "").trim();
    } else {
      headline =
        overallColor === "green"
          ? "Go get it."
          : overallColor === "amber"
            ? "Stay the course."
            : "Ease off today.";
      summary =
        overallColor === "green"
          ? "Body signals support training — execute the plan."
          : overallColor === "amber"
            ? "A few yellow lights; still bias toward doing the work as written unless you spike worse."
            : "Recovery signals are off; pull back and prioritize sleep.";
      action =
        overallColor === "red"
          ? "Swap today for easy Z2 or full rest per feel."
          : `Execute today's session as written: ${plannedSession}.`;
    }

    return res.status(200).json({
      date: today,
      color: overallColor,
      headline,
      summary,
      action,
      flags,
      metrics_snapshot: {
        readiness: todayMetrics?.readiness_score,
        sleep_hours: todayMetrics?.sleep_total_min ? todayMetrics.sleep_total_min / 60 : null,
        weekly_z2: weeklyZ2,
        z2_target: 240,
        day_of_week: dayIdx,
      },
      planned_session: plannedSession,
    });
  } catch (err) {
    console.error("[synthesis/daily]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
