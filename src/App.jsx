import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  getLocalToday,
  formatEasternYmdFromDate,
} from "../lib/getLocalToday.js";
import AuthScreen from "./AuthScreen";
import OnboardingFlow from "./features/onboarding/OnboardingFlow.jsx";
import PlanBuilder from "./PlanBuilder";
import TodayDrawer from "./TodayDrawer.jsx";
import { useDataSources } from "./features/today/useDataSources.js";
import { ConnectPrompt } from "./features/today/ConnectPrompt.jsx";
import { RecoveryDeepDive } from "./features/today/RecoveryDeepDive.jsx";
import { Z2DeepDive } from "./features/today/Z2DeepDive.jsx";
import { SleepDeepDive } from "./features/today/SleepDeepDive.jsx";
import { DailyCallCard } from "./features/today/DailyCallCard.jsx";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
}

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder"
);

function getSyncStatus(lastSync) {
  if (!lastSync) return "gray";
  const ageMin = (Date.now() - new Date(lastSync).getTime()) / 60000;
  if (ageMin < 360) return "green";
  if (ageMin < 1440) return "amber";
  return "red";
}

const syncColors = {
  green: "#5dffa0",
  amber: "#ffaa44",
  red: "#FF3B30",
  gray: "rgba(255,255,255,0.15)",
};

/** Load or insert a minimal `user_profiles` row (replaces legacy Onboarding.jsx). */
async function fetchOrCreateUserProfile(supabaseClient, sessionUser) {
  const { data: existing, error: selErr } = await supabaseClient
    .from("user_profiles")
    .select("*")
    .eq("user_id", sessionUser.id)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;
  const { data: row, error: insErr } = await supabaseClient
    .from("user_profiles")
    .insert({
      user_id: sessionUser.id,
      name:
        sessionUser.user_metadata?.full_name ||
        (typeof sessionUser.email === "string" ? sessionUser.email.split("@")[0] : null) ||
        "Athlete",
      onboarding_completed: false,
      onboarding_step: "profile",
    })
    .select()
    .single();
  if (insErr) throw insErr;
  return row;
}

/** Full-screen cinematic splash on every cold load (phased animation). */
const SplashScreen = ({ phase }) => {
  const logoVisible = ["logo-in", "tagline", "glow", "out"].includes(phase);
  const taglineVisible = ["tagline", "glow", "out"].includes(phase);
  const glowVisible = ["glow", "out"].includes(phase);
  const exiting = phase === "out";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0D0E10",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        transition: "opacity 0.5s ease",
        opacity: exiting ? 0 : 1,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "70%",
          height: "70%",
          background: "radial-gradient(ellipse at center, rgba(201,168,117,0.15) 0%, transparent 70%)",
          transition: "opacity 1.2s ease",
          opacity: glowVisible ? 1 : 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-10%",
          width: "50%",
          height: "50%",
          background: "radial-gradient(ellipse at center, rgba(201,168,117,0.07) 0%, transparent 70%)",
          transition: "opacity 1.2s ease",
          opacity: glowVisible ? 1 : 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "2.5px",
          transition: "opacity 0.8s ease",
          opacity: taglineVisible ? 0.6 : 0,
        }}
      >
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 1,
              height: i % 5 === 0 ? 10 : 6,
              borderRadius: "0.5px",
              background: i < 12 ? "#C9A875" : "#3A3530",
              display: "block",
              opacity: i < 12 ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      <div
        style={{
          textAlign: "center",
          transition: "opacity 0.7s ease, transform 0.9s cubic-bezier(0.22,1,0.36,1)",
          opacity: logoVisible ? 1 : 0,
          transform: logoVisible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.92)",
        }}
      >
        <div
          style={{
            fontSize: 52,
            lineHeight: 1,
            letterSpacing: "-1.5px",
            marginBottom: 12,
          }}
        >
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: "#fff" }}>The </span>
          <em
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontStyle: "italic",
              fontWeight: 400,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            Lab
          </em>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: "#fff" }}>.</span>
        </div>
        <div
          style={{
            height: 1,
            background: "#C9A875",
            margin: "0 auto 14px",
            transition: "opacity 0.6s ease, width 0.8s ease",
            opacity: taglineVisible ? 1 : 0,
            width: taglineVisible ? 40 : 0,
          }}
        />
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10,
            fontWeight: 500,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "4px",
            textTransform: "uppercase",
            transition: "opacity 0.8s ease",
            opacity: taglineVisible ? 1 : 0,
          }}
        >
          Hybrid Performance OS
        </div>
      </div>
    </div>
  );
};

/** DM Sans / DM Serif + gold glass — global background in index.css */
const DS = {
  bg: "transparent",
  base: "#0D0E10",
  gold: "#C9A875",
  goldDim: "#3A3530",
  cream: "#F0EBE2",
  text: "rgba(255,255,255,0.92)",
  textMuted: "rgba(255,255,255,0.25)",
  textDim: "rgba(255,255,255,0.12)",
  green: "#5dffa0",
  red: "#ff6b6b",
  yellow: "#ffd166",
  sans: "'DM Sans', sans-serif",
  serif: "'DM Serif Display', serif",
  divider: "rgba(255,255,255,0.08)",
};

const glassCard = {
  position: "relative",
  background: "rgba(255,255,255,0.055)",
  backdropFilter: "blur(28px) saturate(1.4)",
  WebkitBackdropFilter: "blur(28px) saturate(1.4)",
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.13)",
  overflow: "hidden",
  marginBottom: 12,
};

const creamCard = {
  position: "relative",
  background: "linear-gradient(145deg, rgba(245,240,232,0.96) 0%, rgba(232,225,213,0.92) 60%, rgba(220,212,198,0.88) 100%)",
  backdropFilter: "blur(20px) saturate(1.2)",
  WebkitBackdropFilter: "blur(20px) saturate(1.2)",
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.25)",
  overflow: "hidden",
  marginBottom: 12,
};

const ghostCard = {
  position: "relative",
  background: "rgba(255,255,255,0.022)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.07)",
  overflow: "hidden",
  marginBottom: 12,
  opacity: 0.6,
};

const specularTop = (left = "8%", right = "8%") => ({
  position: "absolute",
  top: 0,
  left,
  right,
  height: 1,
  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35) 30%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.35) 70%, transparent)",
  pointerEvents: "none",
});

const lbl = {
  fontSize: 9,
  fontWeight: 600,
  color: "rgba(255,255,255,0.22)",
  letterSpacing: "2.5px",
  textTransform: "uppercase",
  marginBottom: 14,
  fontFamily: "'DM Sans',sans-serif",
};

const lblDark = {
  fontSize: 9,
  fontWeight: 600,
  color: "rgba(13,14,16,0.32)",
  letterSpacing: "2.5px",
  textTransform: "uppercase",
  marginBottom: 14,
  fontFamily: "'DM Sans',sans-serif",
};

const C = {
  bg: DS.bg,
  surface: "rgba(255,255,255,0.055)",
  card: "rgba(255,255,255,0.055)",
  card2: "rgba(255,255,255,0.08)",
  cardSolid: "rgba(18,19,22,0.92)",
  border: "rgba(255,255,255,0.13)",
  divider: DS.divider,
  text: DS.text,
  muted: DS.textMuted,
  light: "rgba(255,255,255,0.45)",
  red: DS.red,
  green: DS.green,
  yellow: DS.yellow,
  blue: "#8fa8c4",
  cyan: DS.gold,
  gold: DS.gold,
  ff: DS.sans,
  fm: DS.sans,
  fs: DS.sans,
  serif: DS.serif,
  glass: { backdropFilter: "blur(28px) saturate(1.4)", WebkitBackdropFilter: "blur(28px) saturate(1.4)" },
  radius: 22,
};
const glow = (color, i=0.3) => `0 0 20px ${color}${Math.round(i*255).toString(16).padStart(2,"0")}, 0 0 60px ${color}${Math.round(i*0.4*255).toString(16).padStart(2,"0")}`;

const PERF_CHART_W = 340;
const PERF_CHART_H = 112;
const PERF_PAD = 10;

function perfChartRange(values, padFrac = 0.08) {
  const finite = values.map(Number).filter((x) => Number.isFinite(x));
  if (!finite.length) return { min: 0, max: 1 };
  let lo = Math.min(...finite);
  let hi = Math.max(...finite);
  if (hi - lo < 1e-6) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * padFrac;
  return { min: lo - pad, max: hi + pad };
}

function perfLinePathD(values, w, h, pad, vmin, vmax) {
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const vr = Math.max(vmax - vmin, 1e-9);
  const n = values.length;
  if (n === 0) return "";
  let d = "";
  let started = false;
  values.forEach((v, i) => {
    if (v == null || !Number.isFinite(Number(v))) return;
    const x = pad + (n <= 1 ? iw / 2 : (i / Math.max(n - 1, 1)) * iw);
    const y = pad + ih - ((Number(v) - vmin) / vr) * ih;
    d += `${started ? "L" : "M"}${x},${y}`;
    started = true;
  });
  return d;
}

function fillMetricSeries(arr, fallback = null) {
  let last = fallback;
  return arr.map((v) => {
    const n = Number(v);
    if (Number.isFinite(n)) {
      last = n;
      return n;
    }
    return last != null && Number.isFinite(last) ? last : null;
  });
}

const PERF_BLOCK_WEEKS_TOTAL = 12;

function parseIsoYmdLocal(iso) {
  if (!iso || typeof iso !== "string") return null;
  const [yy, mm, dd] = iso.split("-").map(Number);
  if (!yy || !mm || !dd) return null;
  const dt = new Date(yy, mm - 1, dd);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

/** Monday (YYYY-MM-DD) of the calendar week containing `iso` (Mon–Sun, local). */
function mondayOfCalendarWeekContainingIsoLocal(iso) {
  const d = parseIsoYmdLocal(iso);
  if (!d) return null;
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sundayAfterMondayIsoLocal(monIso) {
  const d = parseIsoYmdLocal(monIso);
  if (!d) return null;
  d.setDate(d.getDate() + 6);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Plan week whose Mon–Sun calendar span contains today; week # = 1-based index within that block. */
function derivePerfPlanHeader(planBlocks) {
  if (!Array.isArray(planBlocks) || planBlocks.length === 0) return null;
  const y = new Date().getFullYear();
  const labelToIso = (label) => {
    if (!label || typeof label !== "string") return null;
    const p = new Date(`${label.trim()} ${y}`);
    if (Number.isNaN(p.getTime())) return null;
    return formatEasternYmdFromDate(p);
  };

  const todayIso = getLocalToday();

  let hitBlock = null;
  let hitWeek = null;
  let weekIndexInBlock = -1;
  let weekMon = null;
  let weekSun = null;

  outer: for (const block of planBlocks) {
    const weeks = block.weeks || [];
    for (let wi = 0; wi < weeks.length; wi++) {
      const w = weeks[wi];
      const days = w.days || [];
      const isos = days.map((d) => labelToIso(d?.date || d?.date_label)).filter(Boolean);
      if (!isos.length) continue;
      const minIso = isos.reduce((a, b) => (a < b ? a : b));
      const mon = mondayOfCalendarWeekContainingIsoLocal(minIso);
      const sun = mon ? sundayAfterMondayIsoLocal(mon) : null;
      if (!mon || !sun) continue;
      if (todayIso >= mon && todayIso <= sun) {
        hitBlock = block;
        hitWeek = w;
        weekIndexInBlock = wi;
        weekMon = mon;
        weekSun = sun;
        break outer;
      }
    }
  }

  if (!hitWeek || weekIndexInBlock < 0) {
    const b0 = planBlocks[0];
    const w0 = (b0?.weeks || [])[0];
    if (!w0) return null;
    hitBlock = b0;
    hitWeek = w0;
    weekIndexInBlock = 0;
    const isos = (w0.days || []).map((d) => labelToIso(d?.date || d?.date_label)).filter(Boolean);
    const minIso = isos.length ? isos.reduce((a, b) => (a < b ? a : b)) : todayIso;
    weekMon = mondayOfCalendarWeekContainingIsoLocal(minIso);
    weekSun = weekMon ? sundayAfterMondayIsoLocal(weekMon) : null;
  }

  const block = hitBlock || {};
  const week = hitWeek || {};
  const phaseRaw = week.phase || block.label || block.phase || block.id || "TRAINING";
  const currentPhase = String(phaseRaw).toUpperCase();
  const weekType = String(week.phase || week.label || "BASE").toUpperCase();
  const currentWeekNum = weekIndexInBlock + 1;

  let weekDateRange = "";
  if (weekMon && weekSun) {
    const a = parseIsoYmdLocal(weekMon);
    const b = parseIsoYmdLocal(weekSun);
    const opt = { month: "short", day: "numeric" };
    if (a && b) {
      weekDateRange = `${a.toLocaleDateString("en-US", opt).toUpperCase()} – ${b.toLocaleDateString("en-US", opt).toUpperCase()}`;
    }
  }
  if (!weekDateRange && week.dates) {
    weekDateRange = String(week.dates);
  }
  if (!weekDateRange) {
    weekDateRange = String(week.label || "").toUpperCase();
  }

  return {
    currentPhase,
    currentWeekNum,
    weekDateRange,
    weekType,
  };
}

function complianceInsightFallback(percent) {
  if (percent == null || Number.isNaN(percent)) return "Add a plan and log activities to see compliance.";
  if (percent === 100) return "Perfect so far. Stay the course.";
  if (percent >= 70) return "On track. Don't let the week slip.";
  if (percent >= 40) return "Falling behind. Prioritize quality sessions.";
  return "Rough week. Focus on what's left.";
}

function getLoadInsight(atl, ctl, tsb) {
  const A = Number(atl) || 0;
  const Ctl = Number(ctl) || 0;
  const T = Number(tsb) || 0;
  if (T > 5) {
    return `Your form score is +${T.toFixed(1)} — you're fresh and primed to perform. Don't waste it on easy days. Hit your quality sessions hard this week.`;
  }
  if (T > 0) {
    return `TSB of +${T.toFixed(1)} puts you in the optimal performance window. You've absorbed recent training and have gas in the tank.`;
  }
  if (T > -10) {
    return `TSB of ${T.toFixed(1)} — you're in productive fatigue territory. This is where fitness is built. Trust the process and hit your Z2 ceiling.`;
  }
  if (T > -20) {
    return `TSB of ${T.toFixed(1)} — meaningful fatigue accumulating. Your CTL of ${Ctl.toFixed(1)} shows real fitness building. Respect your recovery gates this week.`;
  }
  return `TSB of ${T.toFixed(1)} — you're carrying significant fatigue. ATL ${A.toFixed(1)} is well above CTL ${Ctl.toFixed(1)}. Red WHOOP days are non-negotiable rest right now.`;
}

function meanFinite(arr) {
  const v = arr.filter((x) => x != null && Number.isFinite(Number(x))).map(Number);
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function formatLocalYmd(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addCalendarDaysToYmd(ymd, delta) {
  const parts = String(ymd || "").split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + delta);
  return formatLocalYmd(d);
}

function mondayIsoContainingYmd(isoYmd) {
  const d = new Date(`${isoYmd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoYmd;
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatLocalYmd(d);
}

/** Earliest calendar day in the loaded plan (YYYY-MM-DD), or null. */
function deriveEarliestPlanIsoYmd(planBlocks, planYear) {
  if (!Array.isArray(planBlocks) || planBlocks.length === 0) return null;
  const y = planYear || new Date().getFullYear();
  let best = null;
  for (const b of planBlocks) {
    for (const w of b?.weeks || []) {
      for (const day of w?.days || []) {
        const label = day?.date || day?.date_label;
        if (!label) continue;
        const parsed = new Date(`${String(label).trim()} ${y}`);
        if (Number.isNaN(parsed.getTime())) continue;
        const iso = formatLocalYmd(parsed);
        if (!iso) continue;
        if (best == null || iso < best) best = iso;
      }
    }
  }
  return best;
}

function dayHasCompletionSignal(iso, row, garminActivities, unifiedMetrics) {
  if (!iso) return false;
  if (row && (row.completed === true || row.done === true || row.manual_complete === true)) return true;
  if (Array.isArray(garminActivities) && garminActivities.some(
    (a) => String(a?.start_time || "").slice(0, 10) === iso && Number(a?.duration_seconds || 0) >= 60
  )) return true;
  return Array.isArray(unifiedMetrics) && unifiedMetrics.some(
    (m) =>
      m?.source === "intervals"
      && String(m?.date || "").slice(0, 10) === iso
      && Number(m?.training_load ?? m?.strain ?? m?.active_calories ?? m?.steps ?? 0) > 0
  );
}

function dayIsPlannedTraining(row) {
  if (!row) return false;
  return !!(row.am_session || row.pm_session || row.am_session_custom || row.pm_session_custom || row.am || row.pm);
}

function weekDayLabelToIso(label, planYear) {
  if (!label) return null;
  const y = planYear || new Date().getFullYear();
  const parsed = new Date(`${String(label).trim()} ${y}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatLocalYmd(parsed);
}

/**
 * 4-week Mon-start grid. Cell values: null = before plan, 0 = neutral/future, 1 = done, -1 = missed, 2 = today in progress.
 * Sessions planned/completed: planned training days from plan start through yesterday only (not today).
 */
function buildLast4WeeksComplianceGrid({ planBlocks, garminActivities, unifiedMetrics, todayIso }) {
  const todayIsoSafe = todayIso || getDeviceLocalTodayYmd();
  const PLAN_YEAR = parseInt(String(todayIsoSafe || "").slice(0, 4), 10) || 2026;
  const planByIso = new Map();
  if (Array.isArray(planBlocks)) {
    for (const b of planBlocks) {
      for (const w of b?.weeks || []) {
        for (const day of w?.days || []) {
          const label = day?.date || day?.date_label;
          if (!label) continue;
          const parsed = new Date(`${String(label).trim()} ${PLAN_YEAR}`);
          if (Number.isNaN(parsed.getTime())) continue;
          const iso = formatLocalYmd(parsed);
          if (iso) planByIso.set(iso, day);
        }
      }
    }
  }
  const planStartIso = deriveEarliestPlanIsoYmd(planBlocks, PLAN_YEAR);
  const monThis = mondayIsoContainingYmd(todayIsoSafe);
  const gridStartIso = addCalendarDaysToYmd(monThis, -21);
  const last4WeeksCompliance = [];
  let sessionsPlanned = 0;
  let sessionsCompleted = 0;

  if (!planStartIso) {
    for (let i = 0; i < 28; i++) last4WeeksCompliance.push(0);
    return { last4WeeksCompliance, sessionsPlanned: 0, sessionsCompleted: 0, compliancePct: 0 };
  }

  const yesterdayIso = addCalendarDaysToYmd(todayIsoSafe, -1);

  for (let d = planStartIso; d && d <= yesterdayIso; d = addCalendarDaysToYmd(d, 1)) {
    const row = planByIso.get(d);
    const plannedTrain = row && (row.am_session || row.pm_session || row.am_session_custom || row.pm_session_custom || row.am || row.pm);
    if (!plannedTrain) continue;
    sessionsPlanned += 1;
    if (dayHasCompletionSignal(d, row, garminActivities, unifiedMetrics)) sessionsCompleted += 1;
  }

  for (let i = 0; i < 28; i++) {
    const iso = addCalendarDaysToYmd(gridStartIso, i);
    if (iso < planStartIso) {
      last4WeeksCompliance.push(null);
      continue;
    }
    if (iso > todayIsoSafe) {
      last4WeeksCompliance.push(0);
      continue;
    }
    const row = planByIso.get(iso);
    const plannedTrain = row && (row.am_session || row.pm_session || row.am_session_custom || row.pm_session_custom || row.am || row.pm);
    if (iso === todayIsoSafe) {
      last4WeeksCompliance.push(plannedTrain ? 2 : 0);
      continue;
    }
    if (!plannedTrain) {
      last4WeeksCompliance.push(0);
      continue;
    }
    const done = dayHasCompletionSignal(iso, row, garminActivities, unifiedMetrics);
    last4WeeksCompliance.push(done ? 1 : -1);
  }

  const compliancePct = sessionsPlanned > 0 ? Math.round((sessionsCompleted / sessionsPlanned) * 100) : 0;
  return { last4WeeksCompliance, sessionsPlanned, sessionsCompleted, compliancePct };
}

function getDeviceLocalTodayYmd() {
  return formatLocalYmd(new Date());
}

function getDeviceLocalTomorrowYmd() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalYmd(d);
}

/** Context for POST /api/synthesis/morning { mode: "brief" } (plan + wearable aggregates). */
function buildMorningBriefApiContext({
  planBlocks,
  whoopData,
  profile,
  garminActivities,
  unifiedMetrics,
  stravaConnected,
  stravaWeeklyZ2Minutes,
}) {
  const perfHdr = derivePerfPlanHeader(planBlocks);
  const recovery = whoopData?.recovery?.score ?? null;
  const hrvMilli = whoopData?.recovery?.hrv_rmssd_milli ?? whoopData?.recovery?.hrv;
  const hrv =
    hrvMilli != null && Number.isFinite(Number(hrvMilli)) ? Math.round(Number(hrvMilli)) : null;
  const sleep = whoopData?.sleep?.score ?? null;
  const rhrRaw = whoopData?.recovery?.resting_heart_rate ?? whoopData?.recovery?.rhr;
  const rhr =
    rhrRaw != null && Number.isFinite(Number(rhrRaw)) ? Math.round(Number(rhrRaw)) : null;

  let todaySession = null;
  let tomorrowSession = null;
  let complianceThisWeek = 0;
  let weeklyZ2Minutes = 0;
  if (stravaConnected && stravaWeeklyZ2Minutes != null && Number.isFinite(Number(stravaWeeklyZ2Minutes))) {
    weeklyZ2Minutes = Math.max(0, Math.round(Number(stravaWeeklyZ2Minutes)));
  }

  if (!Array.isArray(planBlocks) || planBlocks.length === 0) {
    return {
      recovery,
      hrv,
      sleep,
      rhr,
      todaySession,
      tomorrowSession,
      weekNum: perfHdr?.currentWeekNum ?? 1,
      phase: perfHdr?.currentPhase || "Training",
      daysToRace: null,
      weeklyZ2Minutes: Math.round(weeklyZ2Minutes),
      complianceThisWeek,
    };
  }

  const todayDateIso = getDeviceLocalTodayYmd();
  const tomorrowDateIso = getDeviceLocalTomorrowYmd();
  const PLAN_YEAR = parseInt(String(todayDateIso || "").slice(0, 4), 10) || 2026;
  const allPlanEntries = planBlocks
    .flatMap((b) => (b?.weeks || []).map((w) => ({ block: b, week: w })))
    .flatMap(({ block, week }) => (week?.days || []).map((day) => ({ block, week, day })));
  const dayLabelToIso = (label) => {
    if (!label) return null;
    const parsed = new Date(`${String(label).trim()} ${PLAN_YEAR}`);
    if (Number.isNaN(parsed.getTime())) return null;
    return formatLocalYmd(parsed);
  };
  const todayEntry = allPlanEntries.find(({ day }) => dayLabelToIso(day?.date || day?.date_label) === todayDateIso) || null;
  const tomorrowEntry = allPlanEntries.find(({ day }) => dayLabelToIso(day?.date || day?.date_label) === tomorrowDateIso) || null;
  const currentWeekDays = todayEntry?.week?.days || [];
  const todayCardData = todayEntry?.day || null;
  const tomorrowDayData = tomorrowEntry?.day || null;

  todaySession = todayCardData?.am_session_custom ?? null;
  tomorrowSession = tomorrowDayData?.am_session_custom ?? null;

  complianceThisWeek = currentWeekDays.filter((d) => {
    const iso = dayLabelToIso(d?.date || d?.date_label);
    if (!iso) return false;
    return dayHasCompletionSignal(iso, d, garminActivities, unifiedMetrics);
  }).length;

  const racesList = Array.isArray(profile?.races) ? profile.races : [];
  const primaryRace = racesList.find((r) => r?.is_primary && r?.date) || racesList.find((r) => r?.date) || null;
  const raceDate = primaryRace?.date || profile?.target_race_date || null;
  const raceDateObj = raceDate ? new Date(`${raceDate}T00:00:00`) : null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const daysAway = raceDateObj ? Math.max(0, Math.ceil((raceDateObj.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))) : null;

  return {
    recovery,
    hrv,
    sleep,
    rhr,
    todaySession,
    tomorrowSession,
    weekNum: perfHdr?.currentWeekNum ?? 1,
    phase: perfHdr?.currentPhase || "Training",
    daysToRace: daysAway,
    weeklyZ2Minutes: Math.round(weeklyZ2Minutes),
    complianceThisWeek,
  };
}

function PerfIntervalsBlocks({ trends, C, glow }) {
  const [loadFlipped, setLoadFlipped] = useState(false);
  if (!trends) return null;
  const { summary, hrv30, readiness30, sleep14, rhr30, rhrPrDates, vo2max30, activities } = trends;
  const localToday = getLocalToday();
  const filterMetricPoints = (arr, valueKey) =>
    (Array.isArray(arr) ? arr : []).filter((d) =>
      d?.date
      && d.date <= localToday
      && d?.[valueKey] != null
      && Number.isFinite(Number(d[valueKey]))
      && Number(d[valueKey]) !== 0
    );
  const hrv30Valid = filterMetricPoints(hrv30, "hrv");
  const readiness30Valid = filterMetricPoints(readiness30, "readiness");
  const sleep14Valid = filterMetricPoints(sleep14, "sleep_hours");
  const rhr30Valid = filterMetricPoints(rhr30, "rhr");
  const vo2max30Valid = filterMetricPoints(vo2max30, "vo2_max");
  const atl = summary?.atl ?? 0;
  const ctl = summary?.ctl ?? 0;
  const tsb = summary?.tsb ?? 0;
  const tsbColor = tsb > 0 ? C.green : tsb >= -10 ? C.yellow : C.red;
  const tsbLabel = tsb > 0 ? "FRESH" : tsb >= -10 ? "NEUTRAL" : "BUILDING";
  const loadBackParagraph = getLoadInsight(atl, ctl, tsb);

  const hrvFilled = fillMetricSeries(hrv30Valid.map((d) => d.hrv));
  const hrv7Filled = fillMetricSeries(hrv30Valid.map((d) => d.hrv7));
  const hrvPts = hrvFilled.filter((x) => x != null && Number.isFinite(Number(x)));
  const hrvCur =
    trends.current?.hrv != null && Number.isFinite(trends.current.hrv)
      ? Number(trends.current.hrv)
      : (hrvPts.length ? hrvPts[hrvPts.length - 1] : null);
  const hrvLast7 = (hrv30Valid || []).slice(-7).map((d) => d.hrv);
  const hrvAvg7 = meanFinite(hrvLast7);
  const hrvAvg30 = meanFinite((hrv30Valid || []).map((d) => d.hrv));
  const hrvRangeVals = [...hrvFilled.filter((x) => x != null && Number.isFinite(Number(x))), hrvCur, hrvAvg7, hrvAvg30].filter(
    (x) => x != null && Number.isFinite(Number(x))
  );
  const hrvRange = perfChartRange(hrvRangeVals.length ? hrvRangeVals : [50, 80]);
  const hrvPath = perfLinePathD(hrvFilled, PERF_CHART_W, PERF_CHART_H, PERF_PAD, hrvRange.min, hrvRange.max);
  const hrv7Path = perfLinePathD(hrv7Filled, PERF_CHART_W, PERF_CHART_H, PERF_PAD, hrvRange.min, hrvRange.max);
  const hrvY = (v) => {
    const ih = PERF_CHART_H - PERF_PAD * 2;
    const vr = Math.max(hrvRange.max - hrvRange.min, 1e-9);
    return PERF_PAD + ih - ((Number(v) - hrvRange.min) / vr) * ih;
  };
  const hrvIx = PERF_CHART_W - PERF_PAD;
  let hrvTrendTag = "→ STABLE";
  let hrvTrendWord = "stable relative to your 30-day baseline.";
  if (hrvAvg7 != null && hrvAvg30 != null) {
    if (hrvAvg7 > hrvAvg30 * 1.02) {
      hrvTrendTag = "↑ IMPROVING";
      hrvTrendWord = "trending up vs the 30-day baseline.";
    } else if (hrvAvg7 < hrvAvg30 * 0.98) {
      hrvTrendTag = "↓ DECLINING";
      hrvTrendWord = "trending down vs the 30-day baseline.";
    }
  }
  const hrvSentence =
    hrvCur != null && hrvAvg30 != null
      ? `Your HRV is ${(Math.round(hrvCur * 10) / 10).toFixed(1)}ms. Your baseline is ${(Math.round(hrvAvg30 * 10) / 10).toFixed(1)}ms. ${hrvTrendWord}`
      : "Log more wellness days to establish HRV context.";

  const readFilled = fillMetricSeries(readiness30Valid.map((d) => d.readiness), 50);
  const readPath = perfLinePathD(readFilled, PERF_CHART_W, PERF_CHART_H, PERF_PAD, 0, 100);
  const readLast7 = (readiness30Valid || []).slice(-7).map((d) => d.readiness);
  const readAvg7 = meanFinite(readLast7);
  const readCur = [...readFilled].reverse().find((x) => x != null && Number.isFinite(Number(x))) ?? null;

  const sleepH = sleep14Valid.map((d) => d.sleep_hours ?? 0);
  const maxSleepH = Math.max(9, ...sleepH.map(Number), 1);
  const barW = sleep14Valid.length ? (PERF_CHART_W - PERF_PAD * 2) / sleep14Valid.length - 2 : 8;
  const sleepWeekSlice = (sleep14Valid || []).slice(-7);
  const sleepWeekH = meanFinite(sleepWeekSlice.map((d) => d.sleep_hours));
  const sleepWeekScore = meanFinite(sleepWeekSlice.map((d) => d.sleep_score));
  const sleepInsight =
    sleepWeekH != null
      ? `You averaged ${(Math.round(sleepWeekH * 10) / 10).toFixed(1)} hrs over the last week. Target is 8hrs.`
      : "Sync sleep data to see weekly sleep volume vs the 8h target.";

  const rhrFilled = fillMetricSeries(rhr30Valid.map((d) => d.rhr), 55);
  const rhrVals = rhrFilled.filter((x) => x != null && Number.isFinite(x));
  const rhrRange = perfChartRange(rhrVals.length ? rhrVals : [50, 60]);
  const rhrPath = perfLinePathD(rhrFilled, PERF_CHART_W, PERF_CHART_H, PERF_PAD, rhrRange.min, rhrRange.max);
  const prSet = new Set((rhrPrDates || []).map((p) => p.date));
  const rhrLast7 = (rhr30Valid || []).slice(-7).map((d) => d.rhr);
  const rhrAvg7 = meanFinite(rhrLast7);
  const rhrCur = [...rhr30Valid].reverse().find((d) => d.rhr != null && Number.isFinite(Number(d.rhr)))?.rhr ?? null;
  const rhrWindowMin = rhrVals.length ? Math.min(...rhrVals) : null;
  const prRhrRow = (trends.personalRecordRows || []).find((r) => r.key === "lowest_rhr");
  const rhrPrBpm =
    prRhrRow?.value != null && String(prRhrRow.value).match(/\d/)
      ? Number(String(prRhrRow.value).replace(/[^\d.]/g, ""))
      : null;
  const rhrAllTimeLow = rhrPrBpm != null && Number.isFinite(rhrPrBpm) ? rhrPrBpm : rhrWindowMin;
  const rhrY = (v) => {
    const ih = PERF_CHART_H - PERF_PAD * 2;
    const vr = Math.max(rhrRange.max - rhrRange.min, 1e-9);
    return PERF_PAD + ih - ((Number(v) - rhrRange.min) / vr) * ih;
  };
  const rhrIx = PERF_CHART_W - PERF_PAD;
  const rhrSeries = (rhr30Valid || []).map((d) => d.rhr).filter((x) => x != null && Number.isFinite(Number(x)));
  const rhrLast3 = meanFinite(rhrSeries.slice(-3));
  const rhrPrev3 = meanFinite(rhrSeries.slice(-6, -3));
  const rhrImproving =
    rhrLast3 != null &&
    rhrPrev3 != null &&
    rhrSeries.length >= 6 &&
    rhrLast3 < rhrPrev3 - 0.2;
  const rhrTrendLabel = rhrImproving ? "↓ IMPROVING" : "→ STEADY";

  const vo2Filled = fillMetricSeries(vo2max30Valid.map((d) => d.vo2_max), null);
  const vo2vals = vo2Filled.filter((x) => x != null && Number.isFinite(x));
  const vo2Range = perfChartRange(vo2vals.length ? vo2vals : [40, 55]);
  const vo2Path = perfLinePathD(vo2Filled, PERF_CHART_W, PERF_CHART_H, PERF_PAD, vo2Range.min, vo2Range.max);

  const card = {
    background: C.card,
    borderRadius: C.radius,
    padding: "14px 12px",
    border: `1px solid ${C.border}`,
    marginBottom: 20,
    ...C.glass,
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: C.ff, fontSize: 18, color: C.cyan, letterSpacing: 2, marginBottom: 10 }}>TRAINING LOAD</div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setLoadFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setLoadFlipped((f) => !f);
            }
          }}
          style={{ perspective: 1000, cursor: "pointer", outline: "none" }}
        >
          <div
            style={{
              position: "relative",
              minHeight: 172,
              transformStyle: "preserve-3d",
              transition: "transform 0.6s ease",
              transform: loadFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(0deg)",
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, ...card, textAlign: "center", marginBottom: 0 }}>
                  <div style={{ fontFamily: C.fm, fontSize: 7, color: C.muted, letterSpacing: 2, marginBottom: 6 }}>ATL</div>
                  <div style={{ fontFamily: C.ff, fontSize: 28, color: C.text, fontWeight: 700 }}>{atl}</div>
                </div>
                <div style={{ flex: 1, ...card, textAlign: "center", marginBottom: 0 }}>
                  <div style={{ fontFamily: C.fm, fontSize: 7, color: C.muted, letterSpacing: 2, marginBottom: 6 }}>CTL</div>
                  <div style={{ fontFamily: C.ff, fontSize: 28, color: C.text, fontWeight: 700 }}>{ctl}</div>
                </div>
                <div style={{ flex: 1, ...card, textAlign: "center", marginBottom: 0, border: `1px solid ${tsbColor}33`, boxShadow: glow(tsbColor, 0.12) }}>
                  <div style={{ fontFamily: C.fm, fontSize: 7, color: C.muted, letterSpacing: 2, marginBottom: 6 }}>TSB</div>
                  <div style={{ fontFamily: C.ff, fontSize: 28, color: tsbColor, fontWeight: 700 }}>{tsb > 0 ? "+" : ""}{tsb}</div>
                  <div style={{ fontFamily: C.fm, fontSize: 7, color: tsbColor, letterSpacing: 2, marginTop: 4 }}>{tsbLabel}</div>
                </div>
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                minHeight: 172,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: C.card,
                borderRadius: C.radius,
                padding: "18px 16px",
                border: `1px solid ${C.border}`,
                ...C.glass,
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontFamily: C.fs, fontSize: 14, color: C.text, lineHeight: 1.55, fontWeight: 500 }}>{loadBackParagraph}</div>
              <div style={{ fontFamily: C.fm, fontSize: 9, color: C.cyan, letterSpacing: 2, marginTop: 16 }}>← FLIP BACK</div>
            </div>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontFamily: C.ff, fontSize: 16, color: C.cyan, letterSpacing: 2, marginBottom: 8 }}>HRV TREND</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8, fontFamily: C.ff, fontSize: 10, color: C.text }}>
          <span>
            NOW <span style={{ color: C.cyan }}>{hrvCur != null ? `${(Math.round(hrvCur * 10) / 10).toFixed(1)}ms` : "—"}</span>
          </span>
          <span>
            7D AVG <span style={{ color: "#fff" }}>{hrvAvg7 != null ? `${(Math.round(hrvAvg7 * 10) / 10).toFixed(1)}ms` : "—"}</span>
          </span>
          <span>
            30D AVG <span style={{ color: "#888" }}>{hrvAvg30 != null ? `${(Math.round(hrvAvg30 * 10) / 10).toFixed(1)}ms` : "—"}</span>
          </span>
          <span style={{ color: hrvTrendTag.includes("↑") ? C.green : hrvTrendTag.includes("↓") ? C.red : C.muted }}>{hrvTrendTag}</span>
        </div>
        <svg width={PERF_CHART_W} height={PERF_CHART_H} style={{ display: "block", maxWidth: "100%" }}>
          <rect x={0} y={0} width={PERF_CHART_W} height={PERF_CHART_H} fill="transparent" />
          {hrvAvg30 != null && Number.isFinite(hrvAvg30) && (
            <line
              x1={PERF_PAD}
              y1={hrvY(hrvAvg30)}
              x2={hrvIx}
              y2={hrvY(hrvAvg30)}
              stroke="rgba(136,136,136,0.6)"
              strokeDasharray="5 4"
              strokeWidth={1}
            />
          )}
          {hrvAvg7 != null && Number.isFinite(hrvAvg7) && (
            <line
              x1={PERF_PAD}
              y1={hrvY(hrvAvg7)}
              x2={hrvIx}
              y2={hrvY(hrvAvg7)}
              stroke="rgba(255,255,255,0.45)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          {hrvCur != null && Number.isFinite(hrvCur) && (
            <line
              x1={PERF_PAD}
              y1={hrvY(hrvCur)}
              x2={hrvIx}
              y2={hrvY(hrvCur)}
              stroke={`${C.cyan}99`}
              strokeWidth={1}
            />
          )}
          {hrv7Path && <path d={hrv7Path} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />}
          {hrvPath && <path d={hrvPath} fill="none" stroke={C.cyan} strokeWidth={2} />}
        </svg>
        <div style={{ fontFamily: C.fm, fontSize: 10, color: C.muted, marginTop: 10, lineHeight: 1.5, letterSpacing: 0.3 }}>
          {hrvSentence}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontFamily: C.ff, fontSize: 16, color: C.cyan, letterSpacing: 2, marginBottom: 8 }}>READINESS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 6, fontFamily: C.ff, fontSize: 10, color: C.text }}>
          <span>
            NOW <span style={{ color: C.cyan }}>{readCur != null ? `${Math.round(readCur)}` : "—"}</span>
          </span>
          <span>
            7D AVG <span style={{ color: "#fff" }}>{readAvg7 != null ? `${Math.round(readAvg7)}` : "—"}</span>
          </span>
        </div>
        <svg width={PERF_CHART_W} height={PERF_CHART_H} style={{ display: "block", maxWidth: "100%" }}>
          {(() => {
            const ih = PERF_CHART_H - PERF_PAD * 2;
            const iw = PERF_CHART_W - PERF_PAD * 2;
            return (
              <>
                <rect x={PERF_PAD} y={PERF_PAD} width={iw} height={ih * 0.3} fill="rgba(0,212,160,0.1)" />
                <text x={PERF_PAD + 6} y={PERF_PAD + 14} fill={C.green} fontFamily="DM Sans, sans-serif" fontSize={8} letterSpacing={1}>
                  READY
                </text>
                <rect x={PERF_PAD} y={PERF_PAD + ih * 0.3} width={iw} height={ih * 0.3} fill="rgba(255,214,0,0.1)" />
                <text x={PERF_PAD + 6} y={PERF_PAD + ih * 0.3 + 14} fill={C.yellow} fontFamily="DM Sans, sans-serif" fontSize={8} letterSpacing={1}>
                  CAUTION
                </text>
                <rect x={PERF_PAD} y={PERF_PAD + ih * 0.6} width={iw} height={ih * 0.4} fill="rgba(255,59,48,0.09)" />
                <text x={PERF_PAD + 6} y={PERF_PAD + ih * 0.6 + 14} fill={C.red} fontFamily="DM Sans, sans-serif" fontSize={8} letterSpacing={1}>
                  REST
                </text>
              </>
            );
          })()}
          {readAvg7 != null && Number.isFinite(readAvg7) && (() => {
            const ih = PERF_CHART_H - PERF_PAD * 2;
            const y = PERF_PAD + ih - (readAvg7 / 100) * ih;
            return (
              <line
                key="read7"
                x1={PERF_PAD}
                y1={y}
                x2={PERF_CHART_W - PERF_PAD}
                y2={y}
                stroke="rgba(255,255,255,0.35)"
                strokeDasharray="4 3"
                strokeWidth={1}
              />
            );
          })()}
          {readPath && <path d={readPath} fill="none" stroke={C.cyan} strokeWidth={2} />}
        </svg>
        <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
          Bands: READY (&gt;70), CAUTION (40–70), REST (&lt;40). Dashed line = 7-day average readiness.
        </div>
      </div>

      <div style={card}>
        <div style={{ fontFamily: C.ff, fontSize: 16, color: C.cyan, letterSpacing: 2, marginBottom: 8 }}>SLEEP</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 8, fontFamily: C.ff, fontSize: 10, color: C.text }}>
          <span>
            WK AVG HRS <span style={{ color: C.cyan }}>{sleepWeekH != null ? (Math.round(sleepWeekH * 10) / 10).toFixed(1) : "—"}</span>
          </span>
          <span>
            WK AVG SCORE <span style={{ color: "#fff" }}>{sleepWeekScore != null ? Math.round(sleepWeekScore) : "—"}</span>
          </span>
        </div>
        <svg width={PERF_CHART_W} height={PERF_CHART_H + 14} style={{ display: "block", maxWidth: "100%" }}>
          {(() => {
            const ih = PERF_CHART_H - PERF_PAD * 2;
            const iw = PERF_CHART_W - PERF_PAD * 2;
            const y8 = PERF_PAD + ih - (8 / maxSleepH) * ih;
            return (
              <line x1={PERF_PAD} y1={y8} x2={PERF_PAD + iw} y2={y8} stroke="rgba(201,168,117,0.35)" strokeDasharray="4 3" />
            );
          })()}
          {sleep14Valid.map((d, i) => {
            const ih = PERF_CHART_H - PERF_PAD * 2;
            const iw = PERF_CHART_W - PERF_PAD * 2;
            const x = PERF_PAD + (sleep14Valid.length <= 1 ? iw / 2 : (i / Math.max(sleep14Valid.length - 1, 1)) * iw) - barW / 2;
            const hRaw = Number(d.sleep_hours) || 0;
            const bh = (hRaw / maxSleepH) * ih;
            const y = PERF_PAD + ih - bh;
            const sc = Number(d.sleep_score);
            const barColor = Number.isFinite(sc) ? (sc >= 75 ? C.green : sc >= 50 ? C.yellow : C.red) : "rgba(201,168,117,0.45)";
            return (
              <g key={d.date}>
                <rect x={x} y={y} width={barW} height={Math.max(bh, 1)} rx={2} fill={barColor} opacity={0.85} />
              </g>
            );
          })}
        </svg>
        <div style={{ fontFamily: C.fm, fontSize: 10, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          {sleepInsight}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontFamily: C.ff, fontSize: 16, color: C.cyan, letterSpacing: 2, marginBottom: 8 }}>RESTING HR</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 6, fontFamily: C.ff, fontSize: 10, color: C.text }}>
          <span>
            NOW <span style={{ color: "#e07b3a" }}>{rhrCur != null ? `${Math.round(Number(rhrCur))}bpm` : "—"}</span>
          </span>
          <span>
            7D AVG <span style={{ color: "#fff" }}>{rhrAvg7 != null ? `${Math.round(rhrAvg7)}bpm` : "—"}</span>
          </span>
          <span>
            PR (LOWEST) <span style={{ color: C.green }}>{rhrAllTimeLow != null ? `${Math.round(rhrAllTimeLow)}bpm` : "—"}</span>
          </span>
          <span style={{ color: rhrImproving ? C.green : C.muted }}>{rhrTrendLabel}</span>
        </div>
        <svg width={PERF_CHART_W} height={PERF_CHART_H} style={{ display: "block", maxWidth: "100%" }}>
          {rhrAvg7 != null && Number.isFinite(rhrAvg7) && (
            <line
              x1={PERF_PAD}
              y1={rhrY(rhrAvg7)}
              x2={rhrIx}
              y2={rhrY(rhrAvg7)}
              stroke="rgba(255,255,255,0.35)"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          )}
          {rhrPath && <path d={rhrPath} fill="none" stroke="#e07b3a" strokeWidth={2} />}
          {rhr30Valid.map((d, i) => {
            if (d.rhr == null || !Number.isFinite(Number(d.rhr))) return null;
            const iw = PERF_CHART_W - PERF_PAD * 2;
            const ih = PERF_CHART_H - PERF_PAD * 2;
            const n = rhr30Valid.length;
            const x = PERF_PAD + (n <= 1 ? iw / 2 : (i / Math.max(n - 1, 1)) * iw);
            const vr = Math.max(rhrRange.max - rhrRange.min, 1e-9);
            const y = PERF_PAD + ih - ((Number(d.rhr) - rhrRange.min) / vr) * ih;
            if (!prSet.has(d.date)) return null;
            return <circle key={d.date} cx={x} cy={y} r={4} fill={C.green} stroke="#000" strokeWidth={1} />;
          })}
        </svg>
        <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
          Lower resting HR in this window is generally better recovery. Green dots mark best RHR days in the trend range.
        </div>
      </div>

      <div style={card}>
        <div style={{ fontFamily: C.ff, fontSize: 16, color: C.cyan, letterSpacing: 2, marginBottom: 8 }}>VO2 MAX</div>
        {vo2vals.length > 0 && vo2Path ? (
          <svg width={PERF_CHART_W} height={PERF_CHART_H} style={{ display: "block", maxWidth: "100%" }}>
            <path d={vo2Path} fill="none" stroke={C.green} strokeWidth={2} />
          </svg>
        ) : (
          <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2 }}>No VO2 points in this window.</div>
        )}
      </div>

      <div style={{ ...card, padding: "12px 10px" }}>
        <div style={{ fontFamily: C.ff, fontSize: 16, color: C.cyan, letterSpacing: 2, marginBottom: 10 }}>ACTIVITIES</div>
        {(activities || []).length === 0 ? (
          <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2 }}>No activities synced yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
            {(activities || []).map((a) => (
              <div
                key={`${a.activity_id}-${a.start_time || ""}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  background: C.card2,
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: C.ff, fontSize: 13, color: C.text, letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.activity_name || a.name || a.activity_type}
                  </div>
                  <div style={{ fontFamily: C.fm, fontSize: 7, color: C.muted, letterSpacing: 1, marginTop: 2 }}>
                    {a.activity_type}
                    {a.start_time ? ` · ${String(a.start_time).slice(0, 10)}` : ""}
                  </div>
                </div>
                <div style={{ fontFamily: C.fm, fontSize: 8, color: C.cyan, flexShrink: 0, textAlign: "right" }}>
                  {a.duration_seconds ? `${Math.round(a.duration_seconds / 60)}m` : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const HR_ZONES = [
  { zone:"Z1", name:"WARM UP",   pct:"69–80%",  bpm:"114–136", color:"#555" },
  { zone:"Z2", name:"EASY",      pct:"80–89%",  bpm:"132–151", color:C.green },
  { zone:"Z3", name:"AEROBIC",   pct:"89–91%",  bpm:"147–154", color:"#FFB800" },
  { zone:"Z4", name:"THRESHOLD", pct:"91–99%",  bpm:"150–168", color:"#FF7700" },
  { zone:"Z5", name:"MAXIMUM",   pct:"99–114%", bpm:"163–194", color:C.red },
];

// Supplements are now stored in Supabase (see supabase/seed_supplements.sql).
// Color per time group used when rendering the Supplements tab.
const SUPP_GROUP_COLORS = {
  MORNING: C.yellow,
  AFTERNOON: C.red,
  NIGHT: C.blue,
  "DAILY TARGETS": "#aaa",
};

const HYROX_BESTS = [
  { name: "SkiErg", icon: "◈", time: "4:09", race: "Miami", pct: 82 },
  { name: "Sled Push", icon: "▶", time: "2:34", race: "Americas", pct: 95 },
  { name: "Sled Pull", icon: "◀", time: "3:48", race: "Miami", pct: 78 },
  { name: "Burpee Broad Jump", icon: "◉", time: "4:23", race: "Americas", pct: 70 },
  { name: "Row Erg", icon: "▷", time: "4:19", race: "Americas", pct: 75 },
  { name: "Farmers Carry", icon: "▲", time: "1:37", race: "Americas", pct: 98 },
  { name: "Sandbag Lunges", icon: "◆", time: "3:59", race: "Miami", pct: 72 },
  { name: "Wall Balls", icon: "○", time: "5:02", race: "Miami", pct: 62 },
];

const BLOOD_PANEL = [
  { label: "Vitamin D", value: "26 ng/mL", status: "low", ref: "≥30 — insufficient" },
  { label: "LDL", value: "111 mg/dL", status: "watch", ref: "ref <100" },
  { label: "Creatinine", value: "1.30 mg/dL", status: "watch", ref: "ref ≤1.26" },
  { label: "Testosterone", value: "883 ng/dL", status: "optimal", ref: "optimal range" },
  { label: "HbA1c", value: "5.3%", status: "optimal", ref: "optimal" },
  { label: "hs-CRP", value: "0.4 mg/L", status: "optimal", ref: "optimal" },
  { label: "IGF-1", value: "151 ng/mL", status: "optimal", ref: "Z-score 0.0" },
  { label: "Glucose", value: "82 mg/dL", status: "optimal", ref: "fasting optimal" },
];

const statusDot = { low: "#e74c3c", watch: "#C9A875", optimal: "#2a5c38" };

const DEXA = [
  { label: "Body Fat", value: "15.4", unit: "%", status: "watch", note: "target <14%" },
  { label: "Lean Mass", value: "179", unit: "lb", status: "optimal", note: "optimal" },
  { label: "VAT Area", value: "66", unit: "cm²", status: "optimal", note: "healthy range" },
  { label: "Bone T-Score", value: "+2.2", unit: "SD", status: "optimal", note: "excellent" },
];

const HORMONES = [
  { label: "Testosterone", value: 883, min: 300, max: 1000, unit: "ng/dL" },
  { label: "Free T", value: 117, min: 50, max: 150, unit: "pg/mL" },
  { label: "Cortisol", value: 12.6, min: 6, max: 23, unit: "mcg/dL" },
  { label: "IGF-1", value: 151, min: 100, max: 300, unit: "ng/mL" },
  { label: "DHEA-S", value: 164, min: 100, max: 500, unit: "mcg/dL" },
];

const WL = {
  "FOR TIME — Ultimate HYROX": { type:"FOR TIME", duration:"~55 min", tag:"HYROX SIM", accent:C.red, steps:["1km Run","1km Ski Erg","50m Sled Push","1km Run","1km Row Erg","80m Burpee Broad Jump","1km Run","2km Bike Erg","100m Sandbag Lunges","100 Wall Balls","1km Run — FINISH"], note:"Full send. Lap button each station. Track splits — this is your benchmark." },
  "FOR TIME — Hyrox Full Runs Half Stations": { type:"FOR TIME", duration:"~45 min", tag:"HYROX SIM", accent:C.red, steps:["1km Run","500m Ski Erg","1km Run","25m Sled Push","1km Run","25m Sled Pull","1km Run","40m Burpee Broad Jump","1km Run","500m Row Erg","1km Run","100m KB Farmers Carry","1km Run","50m Sandbag Lunges","1km Run","50 Wall Balls"], note:"Full 1km runs, half station distances. Builds run durability between efforts." },
  "FOR TIME — Hyrox Full Send": { type:"FOR TIME", duration:"~50 min", tag:"HYROX SIM", accent:C.red, steps:["1km Run","50 Wall Balls","1km Ski Erg","50m Sled Push","1km Run","60m Burpee Broad Jump","1km Row Erg","100m Sandbag Lunges","1km Run — FINISH"], note:"High-intensity sim. Prioritize the runs — don't blow up on wall balls." },
  "AMRAP 40 — Hyrox Grind": { type:"AMRAP", duration:"40 min", tag:"CONDITIONING", accent:C.red, steps:["800m Run","30 Wall Balls","25m Sled Pull","15 Burpee To Plate","— Repeat for 40 min —"], note:"Count your rounds. AMRAP benchmark — beat it next time." },
  "AMRAP 60 — Ski Row Burpee": { type:"AMRAP", duration:"60 min", tag:"AEROBIC CONDITIONING", accent:C.red, steps:["500m Ski Erg","20m Burpee Broad Jump","500m Row Erg","20m Burpee Broad Jump","— Repeat for 60 min —"], note:"Aerobic monster. Pace the ski erg to sustain quality broad jumps throughout." },
  "EMOM 60 — Hyrox Stations": { type:"EMOM", duration:"60 min", tag:"STATION DRILL", accent:"#aaa", steps:["Every 2 min x 30 rounds:","Min 1 — 350m Ski Erg","Min 2 — 25m Sandbag Lunges","Min 3 — 350m Run","Min 4 — 2:00 Wall Balls","Min 5 — 2:00 Rest"], note:"EMOM keeps you honest. If you can't finish in 2 min, scale the distance." },
  "EMOM 40 — Full Hyrox": { type:"EMOM", duration:"40 min", tag:"STATION DRILL", accent:"#aaa", steps:["Every 1 min x 40 rounds (5 cycles):","Min 1 — 200m Ski Erg","Min 2 — 12 DB Deadlifts","Min 3 — 200m Row Erg","Min 4 — 20m Burpee Broad Jump","Min 5 — 200m Run","Min 6 — 20m Sled Push","Min 7 — 20 Wall Balls","Min 8 — Rest"], note:"8-minute cycle repeated 5x. Every minute has a job." },
  "INTERVAL — 6 Rounds Run Ski Wall Balls": { type:"INTERVAL", duration:"~50 min", tag:"RUNNING QUALITY", accent:C.blue, steps:["6 Rounds — 8:00 on / 2:00 rest:","800m Run","+ 400m Ski Erg","+ Max Wall Balls remaining time","— Full 2:00 rest between rounds —"], note:"480s/120s x 6. The wall balls are the finisher — push them." },
  "STRENGTH A — Full Body Power": { type:"STRENGTH", duration:"65 min", tag:"PUSH DOMINANT", accent:"#aaa", steps:["— LOWER —","Barbell Squat — 4×5 @ 80%+","Bulgarian Split Squat — 3×8/side","Leg Extension — 3×12","— PUSH —","Incline Bench Press — 4×6","Push Press — 3×5 explosive","Lateral Raise — 3×15","Explosive Plyo Push-ups — 3×8","— CORE —","Dead Bug — 3×10/side","Copenhagen Plank — 3×20 sec/side"], note:"Push dominant day. Barbell squat is your anchor — load it." },
  "STRENGTH B — Full Body Pull": { type:"STRENGTH", duration:"65 min", tag:"PULL DOMINANT", accent:"#aaa", steps:["— LOWER —","Barbell Deadlift — 4×4 @ 82%+","Hip Thrust — 4×8 heavy","Hamstring Curl — 3×12","— PULL —","Barbell Rows — 4×6 explosive","Pull-ups — 4×6 weighted","DB Bent Over Row — 3×10/side","Bicep Curls — 3×12","— CARRY —","KB Swings — 4×20 heavy"], note:"Pull dominant day. Deadlift is the anchor. KB swings finish it." },
  "STRENGTH C — Full Body Hybrid": { type:"STRENGTH", duration:"65 min", tag:"SUPERSET FORMAT", accent:"#aaa", steps:["— LOWER —","Romanian Deadlift — 4×6","Leg Extension — 3×12","— SUPERSET —","A1: Overhead DB Press — 4×10","A2: Pull-ups — 4×8","B1: Dips — 3×10","B2: DB Bent Over Row — 3×10/side","C1: Seated Tricep Extension — 3×12","C2: Bicep Curls — 3×12","— EXPLOSIVE —","Explosive Plyo Push-ups — 3×8"], note:"Superset format keeps HR elevated. Rest 60–90 sec between supersets only." },
  "THRESHOLD — 10×2 Min": { type:"THRESHOLD", duration:"45 min", tag:"Z4 · 150–168 BPM", accent:C.blue, steps:["Warm-up — 1.5 mile @ Z2","10 × 2 min @ Z4 (150–168 bpm)","40 sec standing recovery each","Cool-down — 1.5 mile easy","Strides — 4×20 sec at end"], note:"Z4 = 91–99% LTHR = 150–168 bpm on your Garmin. RMR bread-and-butter." },
  "TEMPO — 20 Min Sustained": { type:"TEMPO", duration:"40 min", tag:"Z3–Z4 · 147–168 BPM", accent:C.blue, steps:["Warm-up — 1 mile @ Z2","20 min sustained @ Z3–Z4 (147–162 bpm)","Smooth, controlled effort throughout","Cool-down — 1 mile easy"], note:"Comfortably hard. Short sentences OK, full conversation impossible." },
  "VO2 MAX — Short Intervals": { type:"VO2 MAX", duration:"40 min", tag:"Z5 · 163–194 BPM", accent:C.red, steps:["Warm-up — 1 mile @ Z2","8 × 3 min @ Z5 (163–194 bpm)","3 min active recovery jog each","Cool-down — 1 mile easy"], note:"Z5 = 99–114% LTHR. Only do this when WHOOP is GREEN. Yellow = swap to tempo." },
  "ZONE 2 — Easy Aerobic": { type:"ZONE 2", duration:"30–45 min", tag:"Z2 · 132–151 BPM", accent:C.green, steps:["HR target: Z2 — 132–151 bpm","Conversational pace — full sentences","Cadence: 175–180 spm","Duration: WHOOP dependent","Post-run: 10 min hip mobility"], note:"Walk if HR climbs above 151. No exceptions. This is your aerobic engine." },
  "LONG RUN — Base Builder": { type:"LONG RUN", duration:"75–120 min", tag:"Z2 · 132–151 BPM", accent:C.green, steps:["Full run @ conversational pace","Z2: 132–151 bpm entire run","Fuel: gel every 40–45 min","Hydration: every 20 min","Last 10%: can drift to Z3 (154 bpm)"], note:"Grows 1–2 miles each week. Most important session of the week." },
  "SUNDAY — Mobility Protocol": { type:"MOBILITY", duration:"35–45 min", tag:"ACTIVE RECOVERY", accent:C.green, steps:["— FLOW (15 min) —","Hip flexor — 3×60 sec/side","Hamstring stretch — 3×45 sec/side","Thoracic rotation — 10 reps/side","Pigeon pose — 2×60 sec/side","— FOAM ROLL (10 min) —","Quads, IT band, calves, upper back","— CONTRAST THERAPY —","Cold: 3–5 min ice bath or cold shower","Heat: 10–15 min sauna or hot bath","Repeat 2–3 rounds"], note:"Contrast therapy is the priority — drives HRV up for Monday." },
  "SUNDAY — Plyo & Core": { type:"PLYO + CORE", duration:"45–55 min", tag:"EXPLOSIVE + STABILITY", accent:"#aaa", steps:["— PLYOMETRICS —","Box Jumps — 4×6 max height","Broad Jumps — 4×5 explosive","Depth Drops — 3×5/side","Lateral Bounds — 3×8/side","Single-leg Hop — 3×6/side","— CORE —","Dead Bug — 3×12/side","Copenhagen Plank — 3×25 sec/side","Pallof Press — 3×12/side","Ab Wheel Rollout — 3×10","Hollow Body Hold — 3×30 sec","— CONTRAST THERAPY —","Cold: 3–5 min · Heat: 10–15 min"], note:"Plyo work builds explosive power for HYROX sled and burpee broad jumps." },
  "RECOVERY — Active Reset": { type:"RECOVERY", duration:"30–40 min", tag:"ACTIVE RECOVERY", accent:C.green, steps:["— ACTIVE RECOVERY RUN —","20–25 min very easy jog (HR <120 bpm)","No structure. No pace target.","— CONTRAST THERAPY —","Cold: 3–5 min cold shower or ice bath","Heat: 10–15 min sauna or hot bath","2–3 rounds if available","— WHOOP GATE —","Green >66%: Full protocol","Yellow 35–65%: Run only or therapy only","Red <35%: Therapy only. No run."], note:"Active reset beats total rest. Run flushes legs, contrast therapy resets the nervous system." },
};



const getAccent = (name) => {
  if (!name) return C.light;
  if (name.includes("🏁")||name.includes("FOR TIME")||name.includes("AMRAP")||name.includes("VO2")) return C.red;
  if (name.includes("ZONE 2")||name.includes("LONG RUN")||name.includes("RECOVERY")||name.includes("MOBILITY")) return C.green;
  if (name.includes("THRESHOLD")||name.includes("TEMPO")||name.includes("INTERVAL")) return C.blue;
  return "#888";
};

const getTypeLabel = (name) => {
  if (!name) return "CHOOSE";
  if (name.includes("🏁")) return "RACE";
  return WL[name]?.type || name.split(" — ")[0];
};

const SESSION_ICONS = {
  hyrox: "⬡",
  strength: "▲",
  zone2: "◉",
  threshold: "◈",
  tempo: "▷",
  recovery: "○",
  race: "◆",
  rest: "—",
  mobility: "✦",
  travel: "→",
};

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

const SESSION_COLORS = {
  hyrox: "#9b59b6",
  strength: "#e07b3a",
  zone2: "#4a90c4",
  threshold: "#e74c3c",
  tempo: "#f39c12",
  recovery: "#27ae60",
  race: "#f1c40f",
  rest: "#444444",
  mobility: "#1abc9c",
  travel: "#4a90c4",
};

const SPECIAL_BLOCK_ACCENTS = {
  race_week: C.yellow,
  recovery: "#6b7280",
};

const makeSpecialDay = (day, date, title, note, { isRaceDay = false } = {}) => ({
  day,
  date,
  am: null,
  pm: null,
  am_session_custom: title || null,
  pm_session_custom: null,
  am_session_blocks: [],
  pm_session_blocks: [],
  note2a: note || "",
  isRaceDay,
  isSunday: false,
  ai_modified: false,
  ai_modification_note: null,
});

const SPECIAL_PLAN_BLOCKS = [
  {
    id: "race_week",
    label: "RACE WEEK",
    weeks: [
      {
        id: "race_week_w1",
        label: "RACE WEEK",
        dates: "Apr 1 – Apr 5",
        phase: "RACE WEEK",
        subtitle: "Race execution protocol",
        days: [
          makeSpecialDay("WED", "Apr 1", "Travel Prep", "Morning creatine, 30min Z2 Echo Bike + SkiErg, Liquid IV. Depart 11am. Evening: light walk, simple carbs + protein, Liquid IV, Zinc + Mag 8:30pm, early bed."),
          makeSpecialDay("THU", "Apr 2", "Travel Day", "Morning creatine, 30min Z2 Echo Bike + SkiErg, Liquid IV. Depart 11am. Evening: light walk, simple carbs + protein, Liquid IV, Zinc + Mag 8:30pm, early bed."),
          makeSpecialDay("FRI", "Apr 3", "Shakeout Day", "Morning creatine, 20-30min Z2 SkiErg or easy run. Walk venue, visualize stations, feet up. Evening: Beetroot shot #1, simple carb dinner, Zinc + Mag 8:30pm, early bed. Tonight's sleep matters most."),
          makeSpecialDay("SAT", "Apr 4", "Race Day 8:10am", "5:30am wake, Beetroot shot #2. Breakfast: oatmeal or white rice, banana, PB, 2 eggs, Liquid IV. 6:00am Creatine. 6:30am Sodium Bicarb + water. 6:30am Adderall. 7:00am arrive venue. 7:30am light activation warmup. 7:50am Wall Ball primer, wet hands, fatigued reps. 8:10am GUN. In-race: Neversecond C30+ CAF at Row or Farmers Carry station 5-6, carry 2 gels take 1 mid-race. Skip Beta Alanine.", { isRaceDay: true }),
          makeSpecialDay("SUN", "Apr 5", "Rest", "Travel home. Full off day."),
          makeSpecialDay("MON", "Apr 6", null, "Rest day."),
          makeSpecialDay("TUE", "Apr 7", null, "Rest day."),
        ],
      },
    ],
  },
  {
    id: "recovery",
    label: "RECOVERY",
    weeks: [
      {
        id: "recovery_w1",
        label: "RECOVERY WEEK",
        dates: "Apr 6 – Apr 12",
        phase: "RECOVERY",
        subtitle: "Post-race recovery protocol",
        days: [
          makeSpecialDay("MON", "Apr 6", "Rest or Easy Walk", "Rest or 20min easy walk only. Assess soreness."),
          makeSpecialDay("TUE", "Apr 7", "Light Z2 Erg", "Light Z2 erg 20min if feeling good. No running."),
          makeSpecialDay("WED", "Apr 8", "Light Upper Body", "Light upper body only. No lower, no erg cardio."),
          makeSpecialDay("THU", "Apr 9", "Z2 Erg / Walk", "Z2 erg or easy walk 20-30min. WHOOP dependent."),
          makeSpecialDay("FRI", "Apr 10", "Rest or Mobility", "Rest or light mobility."),
          makeSpecialDay("SAT", "Apr 11", "Optional Easy Z2 Run", "Optional easy Z2 run 20-25min. Shakeout before Monday."),
          makeSpecialDay("SUN", "Apr 12", "Rest", "Rest. Full reset. Block starts tomorrow."),
        ],
      },
    ],
  },
];

const normalizePhaseLabel = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "PEAK & TEST") return "PEAK";
  return normalized;
};

const PLAN_BLOCK_ORDER = ["RACE WEEK", "RECOVERY", "ACCUMULATION", "BASE REBUILD", "INTENSIFICATION", "PEAK"];

const cloneSpecialBlock = (block) => ({
  ...block,
  weeks: (block.weeks || []).map((week) => ({
    ...week,
    days: (week.days || []).map((day) => ({ ...day })),
  })),
});

const normalizePlanBlocks = (blocks = []) => {
  const regularBlocks = blocks.map((block) => ({
    ...block,
    label: normalizePhaseLabel(block.label || block.id),
    weeks: (block.weeks || []).map((week) => ({
      ...week,
      phase: normalizePhaseLabel(week.phase),
    })),
  }));

  const merged = [...SPECIAL_PLAN_BLOCKS.map(cloneSpecialBlock), ...regularBlocks];
  return merged.sort((a, b) => {
    const ai = PLAN_BLOCK_ORDER.indexOf(a.label);
    const bi = PLAN_BLOCK_ORDER.indexOf(b.label);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
};

const resolveSessionKey = (sessionName, dayRow) => {
  const s = String(sessionName || "").toUpperCase();
  if (dayRow?.isRaceDay || s.includes("RACE")) return "race";
  if (!s || s.includes("REST")) return "rest";
  if (s.includes("TRAVEL")) return "travel";
  if (s.includes("MOBILITY")) return "mobility";
  if (s.includes("RECOVERY")) return "recovery";
  if (s.includes("STRENGTH")) return "strength";
  if (s.includes("ZONE 2") || s.includes("LONG RUN")) return "zone2";
  if (s.includes("THRESHOLD") || s.includes("VO2")) return "threshold";
  if (s.includes("TEMPO")) return "tempo";
  if (s.includes("HYROX") || s.includes("FOR TIME") || s.includes("AMRAP") || s.includes("EMOM")) return "hyrox";
  return "rest";
};

function getSessionIcon(amSession, customSession) {
  const text = (customSession || amSession || "").toLowerCase();
  if (text.includes("hyrox")) return { icon: "⬡", color: "#9b59b6" };
  if (text.includes("z2") || text.includes("zone 2") || text.includes("long")) return { icon: "◉", color: "#4a90c4" };
  if (text.includes("upper") || text.includes("strength") || text.includes("lift")) return { icon: "▲", color: "#e07b3a" };
  if (text.includes("threshold") || text.includes("track")) return { icon: "◈", color: "#e74c3c" };
  if (text.includes("tempo")) return { icon: "▷", color: "#f39c12" };
  if (text.includes("run")) return { icon: "▷", color: "#27ae60" };
  if (text.includes("mobility") || text.includes("recover")) return { icon: "○", color: "#27ae60" };
  return { icon: "—", color: "#444" };
}

const parseExerciseLine = (line) => {
  const raw = String(line || "").trim();
  if (!raw) return { name: "", detail: "" };
  if (raw.includes(" · ")) {
    const [name, ...rest] = raw.split(" · ");
    return { name: name.trim(), detail: rest.join(" · ").trim() };
  }
  const m = raw.match(/^(.*?)(?:\s{2,}|\s+)(\d+\s*[x×].*|.*\/side.*|.*sec.*|.*min.*|@.*|RPE.*)$/i);
  if (m) return { name: m[1].trim(), detail: m[2].trim() };
  return { name: raw, detail: "" };
};

const normalizeWorkoutBlocks = (sessionBlocks, workout) => {
  if (Array.isArray(sessionBlocks) && sessionBlocks.length > 0) {
    return sessionBlocks.map((block, bi) => {
      const exercises = Array.isArray(block?.exercises) ? block.exercises : [];
      const items = exercises.map((ex) => {
        if (typeof ex === "string") return parseExerciseLine(ex);
        const name = ex?.name || ex?.exercise || ex?.title || "Exercise";
        const detailParts = [];
        if (ex?.sets) detailParts.push(`${ex.sets}x`);
        if (ex?.reps) detailParts.push(String(ex.reps));
        if (ex?.distance) detailParts.push(String(ex.distance));
        if (ex?.duration) detailParts.push(String(ex.duration));
        if (ex?.target) detailParts.push(String(ex.target));
        if (ex?.note) detailParts.push(String(ex.note));
        return { name, detail: detailParts.join(" · ") };
      });
      return {
        title: String(block?.type || block?.name || `Block ${bi + 1}`).replace(/_/g, " ").toUpperCase(),
        rounds: Number(block?.rounds) || null,
        items: items.filter((i) => i.name),
      };
    });
  }

  const steps = Array.isArray(workout?.steps) ? workout.steps : [];
  if (steps.length === 0) return [];
  const blocks = [];
  let current = { title: "WORKOUT", rounds: null, items: [] };
  steps.forEach((step) => {
    if (typeof step !== "string") return;
    if (step.startsWith("—")) {
      if (current.items.length > 0) blocks.push(current);
      current = { title: step.replace(/—/g, "").trim().toUpperCase() || "WORKOUT", rounds: null, items: [] };
      return;
    }
    const parsed = parseExerciseLine(step);
    if (parsed.name) current.items.push(parsed);
  });
  if (current.items.length > 0) blocks.push(current);
  return blocks;
};

const inferWorkoutSport = (sessionName, sessionKey) => {
  const s = String(sessionName || "").toLowerCase();
  if (s.includes("ski")) return "ski_erg";
  if (s.includes("row")) return "row_erg";
  if (s.includes("bike") || s.includes("cycle")) return "bike";
  if (s.includes("swim")) return "swim";
  if (sessionKey === "strength") return "strength";
  if (sessionKey === "hyrox") return "hyrox";
  return "run";
};

const inferStepType = (rawType, blockTitle) => {
  const text = `${rawType || ""} ${blockTitle || ""}`.toLowerCase();
  if (text.includes("warm")) return "warmup";
  if (text.includes("cool")) return "cooldown";
  if (text.includes("recover")) return "recover";
  if (text.includes("rest")) return "rest";
  return "work";
};

const parseDurationFromText = (text = "", sport = "run") => {
  const source = String(text);
  const distance = source.match(/(\d+(?:\.\d+)?)\s*(km|mi|m|yd)\b/i);
  if (distance) {
    return { type: "distance", value: Number(distance[1]), unit: distance[2].toLowerCase() };
  }
  const time = source.match(/(\d+(?:\.\d+)?)\s*(min|sec)\b/i);
  if (time) {
    return { type: "time", value: Number(time[1]), unit: time[2].toLowerCase() };
  }
  return {
    type: sport === "strength" ? "time" : "distance",
    value: sport === "strength" ? 10 : 1,
    unit: sport === "strength" ? "min" : "km",
  };
};

const parseIntensityFromText = (text = "") => {
  const source = String(text);
  const zone = source.match(/\bZ([1-7])\b/i);
  if (zone) {
    return { type: "heart_rate_zone", zone: Number(zone[1]), min: null, max: null };
  }
  const hrRange = source.match(/(\d{2,3})\s*[-–]\s*(\d{2,3})\s*bpm/i);
  if (hrRange) {
    return { type: "custom_hr", zone: null, min: Number(hrRange[1]), max: Number(hrRange[2]) };
  }
  if (source.toLowerCase().includes("pace")) {
    return { type: "pace", zone: null, min: null, max: null };
  }
  return { type: "none", zone: 2, min: null, max: null };
};

const asStep = (raw, blockTitle, sport) => {
  const parsed = typeof raw === "string" ? parseExerciseLine(raw) : {
    name: raw?.name || raw?.exercise || raw?.title || "Step",
    detail: raw?.detail || [raw?.sets, raw?.reps, raw?.distance, raw?.duration, raw?.target].filter(Boolean).join(" · "),
  };
  const type = inferStepType(raw?.type, blockTitle);
  return {
    id: raw?.id || uid(),
    type,
    name: parsed.name || "Step",
    duration: parseDurationFromText(parsed.detail, sport),
    intensity: parseIntensityFromText(parsed.detail),
    notes: raw?.note || parsed.detail || "",
    color: {
      warmup: "#e74c3c",
      work: "#4a90c4",
      recover: "#f39c12",
      rest: "#7f8c8d",
      cooldown: "#27ae60",
      repeat: "#9b59b6",
      other: "#888888",
    }[type] || "#888888",
  };
};

const blocksToWorkout = (blocks, sport) => {
  const steps = [];
  (Array.isArray(blocks) ? blocks : []).forEach((block) => {
    const title = String(block?.title || block?.name || block?.type || "").toUpperCase();
    const rows = Array.isArray(block?.exercises)
      ? block.exercises
      : Array.isArray(block?.items)
        ? block.items
        : [];
    if (rows.length === 0) return;

    if ((Number(block?.rounds) || 0) > 1 || title.includes("REPEAT")) {
      steps.push({
        id: block?.id || uid(),
        type: "repeat",
        name: "Repeat",
        count: Number(block?.rounds) || 2,
        color: "#9b59b6",
        steps: rows.map((row) => asStep(row, title, sport)),
      });
      return;
    }

    rows.forEach((row) => steps.push(asStep(row, title, sport)));
  });
  return { sport, steps };
};

const formatStepDuration = (duration) => {
  if (!duration) return null;
  if (duration.type === "distance" && duration.value) return `${duration.value}${duration.unit || ""}`;
  if (duration.type === "time" && duration.value) return `${duration.value} ${duration.unit || "min"}`;
  if (duration.type === "lap_button") return "Lap Button";
  if (duration.type === "heart_rate" && duration.value) return `${duration.value} ${duration.unit || "bpm"}`;
  return null;
};

const formatStepTarget = (intensity) => {
  if (!intensity || intensity.type === "none") return null;
  if ((intensity.type === "heart_rate_zone" || intensity.type === "power_zone") && intensity.zone) {
    return `${intensity.type === "power_zone" ? "PZ" : "Z"}${intensity.zone}`;
  }
  if ((intensity.type === "custom_hr" || intensity.type === "custom_power") && intensity.min && intensity.max) {
    return `${intensity.min}-${intensity.max}`;
  }
  return String(intensity.type || "").replace(/_/g, " ");
};

const workoutToBlocks = (workout) => {
  const toExercise = (step) => ({
    id: step.id || uid(),
    name: step.name || "Step",
    sets: null,
    reps: null,
    load: null,
    distance: step?.duration?.type === "distance" ? formatStepDuration(step.duration) : null,
    duration: step?.duration?.type !== "distance" ? formatStepDuration(step.duration) : null,
    target: formatStepTarget(step.intensity),
    note: step.notes || null,
    is_ai_generated: false,
    is_modified: true,
  });

  return (Array.isArray(workout?.steps) ? workout.steps : []).map((step, index) => {
    if (step.type === "repeat") {
      return {
        id: step.id || uid(),
        type: "REPEAT",
        order: index,
        rounds: Number(step.count) || 2,
        is_ai_generated: false,
        is_modified: true,
        exercises: (Array.isArray(step.steps) ? step.steps : []).map((child) => toExercise(child)),
      };
    }
    return {
      id: step.id || uid(),
      type: String(step.type || "work").toUpperCase(),
      order: index,
      rounds: null,
      is_ai_generated: false,
      is_modified: true,
      exercises: [toExercise(step)],
    };
  });
};

const whoopColor = (s) => s >= 67 ? C.green : s >= 34 ? C.yellow : C.red;
const whoopLabel = (s) => s >= 67 ? "GREEN" : s >= 34 ? "YELLOW" : "RED";
const whoopMsg   = (s) => s >= 67 ? "Execute today's plan as written" : s >= 34 ? "Reduce intensity 20% · Skip VO2 Max" : "Recovery only · Contrast therapy · Rest";

const Ring = ({ score, size=120, stroke=10, color, label, sublabel, glowEffect, progress, formatValue }) => {
  const numericScore = Number(score) || 0;
  const ringProgress = Number.isFinite(progress) ? progress : numericScore;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(ringProgress, 100)) / 100) * circ;
  const displayValue = typeof formatValue === "function" ? formatValue(numericScore) : numericScore;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0, filter: glowEffect ? `drop-shadow(0 0 12px ${color}66)` : "none" }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontFamily:C.ff, fontSize:size*0.32, color, lineHeight:1, letterSpacing:-1, fontWeight:700 }}>{displayValue}</div>
        {label && <div style={{ fontFamily:C.fm, fontSize:size*0.065, color:C.muted, letterSpacing:3, marginTop:3, textTransform:"uppercase" }}>{label}</div>}
        {sublabel && <div style={{ fontFamily:C.fm, fontSize:size*0.06, color, letterSpacing:2, marginTop:1, fontWeight:700 }}>{sublabel}</div>}
      </div>
    </div>
  );
};

const MetricRing = ({ label, value, color, unit = "", max = 100, sublabel = null }) => {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  const displayValue = label === "STRAIN" ? Math.round(safeValue * 10) / 10 : Math.round(safeValue);
  const progress = max > 0 ? (safeValue / max) * 100 : 0;
  return (
    <Ring
      score={displayValue}
      progress={progress}
      size={108}
      stroke={10}
      color={color}
      label={label}
      sublabel={sublabel || unit}
      glowEffect
      formatValue={(v) => (label === "STRAIN" ? (Math.round(v * 10) / 10).toFixed(1) : `${Math.round(v)}`)}
    />
  );
};

const StatPill = ({ label, value, color }) => (
  <div style={{ background:C.card, borderRadius:C.radius, padding:"12px 14px", flex:1, textAlign:"center", border:`1px solid ${C.border}`, ...C.glass }}>
    <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6, textTransform:"uppercase" }}>{label}</div>
    <div style={{ fontFamily:C.ff, fontSize:24, color: color || C.cyan, fontWeight:700, letterSpacing:-0.5 }}>{value}</div>
  </div>
);

const TodayCard = ({ name, onTap }) => {
  if (!name) return null;
  const w = WL[name];
  if (!w) return null;
  const accent = getAccent(name);
  return (
    <div onClick={onTap} style={{ background:C.card, borderRadius:C.radius, overflow:"hidden", cursor:"pointer", border:`1px solid ${accent}22`, boxShadow:`0 0 30px ${accent}08`, ...C.glass, transition:"transform 0.1s ease" }}>
      <div style={{ padding:"16px 18px 14px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ background:`${accent}15`, border:`1px solid ${accent}33`, borderRadius:20, padding:"4px 12px", fontFamily:C.fm, fontSize:7, color:accent, letterSpacing:3, textTransform:"uppercase" }}>{w.type}</div>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2 }}>{w.duration}</div>
        </div>
        <div style={{ fontFamily:C.ff, fontSize:26, color:C.text, letterSpacing:0.5, marginTop:10, lineHeight:1.05 }}>{name.split(" — ")[1] || name}</div>
        <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginTop:6, textTransform:"uppercase" }}>{w.tag}</div>
      </div>
      <div style={{ padding:"10px 18px", display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none" }}>
        {w.steps.filter(s => !s.startsWith("—")).slice(0,4).map((s,i) => (
          <div key={i} style={{ background:C.card2, borderRadius:8, padding:"6px 10px", fontFamily:C.fm, fontSize:7, color:C.muted, flexShrink:0, letterSpacing:0.5 }}>{s}</div>
        ))}
      </div>
    </div>
  );
};

const stripPlanChange = (text) =>
  text ? text.replace(/<plan_change>[\s\S]*?<\/plan_change>/g, "").replace(/<clarifying_questions>[\s\S]*?<\/clarifying_questions>/g, "").trim() : text;

const parseClarifyingQuestions = (text) => {
  if (!text) return null;
  const match = text.match(/<clarifying_questions>([\s\S]*?)<\/clarifying_questions>/);
  if (!match) return null;
  try {
    const jsonMatch = match[1].match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch?.[0] || match[1]);
  } catch (_) { return null; }
};

const normalizeClarifyingQuestions = (questions) =>
  (Array.isArray(questions) ? questions : []).map((q, idx) => ({
    ...q,
    id: String(q?.id || `q_${idx}`),
    options: Array.isArray(q?.options) ? q.options : [],
    branches: q?.branches && typeof q.branches === "object" ? q.branches : null,
  }));

const getClarifyingFlow = (questions, selectionsById) => {
  const normalized = normalizeClarifyingQuestions(questions);
  const byId = new Map(normalized.map((q) => [q.id, q]));
  if (normalized.length === 0) return { normalized, byId, sequence: [] };

  const root = normalized[0];
  const rootSelection = selectionsById[root.id] || [];
  const selectedRoot = rootSelection[0];

  if (root.branches) {
    if (!selectedRoot) return { normalized, byId, sequence: [root.id] };
    const rawBranchIds = Array.isArray(root.branches[selectedRoot]) ? root.branches[selectedRoot] : [];
    const branchIds = rawBranchIds
      .map((id) => String(id))
      .filter((id) => byId.has(id));
    return { normalized, byId, sequence: [root.id, ...branchIds] };
  }

  return { normalized, byId, sequence: normalized.map((q) => q.id) };
};

const renderMarkdown = (text) => {
  if (!text) return null;
  const clean = stripPlanChange(text);
  const lines = clean.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return <span key={i}>{parts}{i < lines.length - 1 && <br />}</span>;
  });
};

const PERSONAS = [
  { id:"grinder",   label:"THE GRINDER",   sub:"Push through · Motivational", color:"#FF3B30" },
  { id:"scientist", label:"THE SCIENTIST", sub:"Data-driven · Clinical", color:"#C9A875" },
  { id:"sage",      label:"THE SAGE",      sub:"Mindful · RPE-based", color:"#00D4A0" },
];

const createSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const PLAN_BUILDER_DISMISS_KEY = "plan_builder_dismissed";

const makeInitialChatMessages = (userName) => ([
  { role:"assistant", content:`Hey ${userName || "there"} — I have your WHOOP data, training plan, and biomarkers loaded. What do you need?`, planChange:null }
]);

const AIChat = ({ whoopData, currentWeek, recentActivities, onPlanChange, userName, persona, onPersonaChange, proactiveBadge, authToken, expandRequest }) => {
  const [messages, setMessages] = useState(makeInitialChatMessages(userName));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const expandRequestPrev = useRef(0);
  const [attachment, setAttachment] = useState(null);
  const [showPersonas, setShowPersonas] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatCqSelections, setChatCqSelections] = useState({});
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState(() => new Set());
  const [answeredQuestionValues, setAnsweredQuestionValues] = useState({});
  const [autoSubmittedQuestionBlocks, setAutoSubmittedQuestionBlocks] = useState(() => new Set());
  const [answeredQuestions, setAnsweredQuestions] = useState({});
  const [pendingReview, setPendingReview] = useState(null);
  const [chatSessionId, setChatSessionId] = useState(createSessionId);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const toggleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      setInput(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  useEffect(() => {
    if (expanded) messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, expanded]);

  useEffect(() => {
    if (expandRequest != null && expandRequest > expandRequestPrev.current) {
      expandRequestPrev.current = expandRequest;
      setExpanded(true);
    }
  }, [expandRequest]);

  const startFreshSession = () => {
    setMessages(makeInitialChatMessages(userName));
    setChatCqSelections({});
    setAnsweredQuestionIds(new Set());
    setAnsweredQuestionValues({});
    setAutoSubmittedQuestionBlocks(new Set());
    setAnsweredQuestions({});
    setPendingReview(null);
    setInput("");
    setAttachment(null);
    setShowPersonas(false);
    setLoading(false);
    setChatSessionId(createSessionId());
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const submitClarifyingAnswers = (messageIndex, answers) => {
    if (!answers?.trim()) return;
    setMessages(prev => prev.map((mm, mi) => mi === messageIndex ? { ...mm, cqSubmitted:true } : mm));
    setMessages(prev => [...prev, { role:"user", content:answers, planChange:null }]);
    setLoading(true);
    fetch("/api/coach/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json", ...(authToken ? {"Authorization":`Bearer ${authToken}`} : {})},
      body: JSON.stringify({
        message: answers,
        whoopData,
        currentWeek:{ id:currentWeek?.id, label:currentWeek?.label, subtitle:currentWeek?.subtitle },
        recentActivities:recentActivities?.slice(0,5),
        session_id: chatSessionId,
      }),
    }).then(r=>r.json()).then(data => {
      const cqs2 = parseClarifyingQuestions(data.message);
      setMessages(prev => [...prev, { role:"assistant", content:data.message||"Something went wrong.", planChange:data.planChange||null, clarifyingQuestions:cqs2 }]);
    }).catch(() => {
      setMessages(prev => [...prev, { role:"assistant", content:"Connection error. Try again.", planChange:null }]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (loading) return;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m?.clarifyingQuestions || m.cqSubmitted) continue;
      const msgKey = `chat_${i}`;
      if (autoSubmittedQuestionBlocks.has(msgKey)) continue;
      const normalizedAll = normalizeClarifyingQuestions(m.clarifyingQuestions);
      if (normalizedAll.length === 0) continue;
      const answered = answeredQuestions[msgKey] || [];
      const remaining = normalizedAll.filter((q) => !answeredQuestionIds.has(q.id) || answered.includes(q.id));
      if (remaining.length > 0) continue;

      const answers = normalizedAll.map((q) => {
        const sel = answeredQuestionValues[q.id] || [];
        return `${q?.question?.replace("?","")}:  ${sel.join(", ") || "Not specified"}`;
      }).join(". ");

      setAutoSubmittedQuestionBlocks((prev) => {
        const next = new Set(prev);
        next.add(msgKey);
        return next;
      });
      submitClarifyingAnswers(i, answers);
      break;
    }
  }, [messages, loading, answeredQuestions, answeredQuestionIds, answeredQuestionValues, autoSubmittedQuestionBlocks]);

  const sendMessage = async () => {
    if ((!input.trim() && !attachment) || loading) return;
    const userMsg = input.trim();
    const currentAttachment = attachment;
    const activeSessionId = chatSessionId || createSessionId();
    if (!chatSessionId) setChatSessionId(activeSessionId);
    setInput("");
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages(prev => [...prev, { role:"user", content:userMsg || `[${currentAttachment?.name}]`, planChange:null, attachment:currentAttachment }]);
    setLoading(true);
    try {
      if (currentAttachment && !currentAttachment.data) {
        setMessages(prev => [...prev, { role:"assistant", content:"File upload failed — please try again.", planChange:null }]);
        setLoading(false);
        return;
      }
      const res = await fetch("/api/coach/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json", ...(authToken ? { "Authorization":`Bearer ${authToken}` } : {}) },
        body: JSON.stringify({
          message: userMsg,
          whoopData,
          currentWeek: { id: currentWeek?.id, label: currentWeek?.label, subtitle: currentWeek?.subtitle },
          recentActivities: recentActivities?.slice(0,5),
          attachment: currentAttachment || null,
          session_id: activeSessionId,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setMessages(prev => [...prev, { role:"assistant", content:`Error: ${errData.error || "Request failed"}. Try again.`, planChange:null }]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const cqs = parseClarifyingQuestions(data.message);
      setMessages(prev => [...prev, { role:"assistant", content: data.message || "Something went wrong.", planChange: data.planChange || null, clarifyingQuestions: cqs }]);
    } catch (e) {
      setMessages(prev => [...prev, { role:"assistant", content:"Connection error. Try again.", planChange:null }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (planChange, action) => {
    if (action === "accept") {
      setMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeStatus:"applying" } : m));
      console.log("[AIChat] APPLY TO PLAN — sending to onPlanChange:", JSON.stringify(planChange));
      try {
        const result = await onPlanChange(planChange);
        const count = result?.modifiedCount ?? (planChange.type === "remap_week" ? (planChange.days?.length || 0) : 1);
        const confirmedWeeks = planChange.type === "remap_week" && result?.weeksUpdated
          ? Object.entries(result.weeksUpdated)
          : [];
        const perWeekHint = confirmedWeeks.length > 0
          ? `\n\n**Confirmed writes:**\n${confirmedWeeks.map(([weekName, weekCount]) => `- ${weekName}: ${weekCount}`).join("\n")}`
          : "";
        setMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeStatus:"accepted" } : m));
        setMessages(prev => [...prev, { role:"assistant", content:`✓ **Plan updated** — ${count} session${count>1?"s":""} modified.${perWeekHint}`, planChange:null }]);
      } catch (e) {
        console.error("[AIChat] APPLY failed:", e);
        setMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeStatus:null } : m));
        const errMsg = e?.message || "Plan update failed — tap to retry";
        setMessages(prev => [...prev, { role:"assistant", content:errMsg, planChange:null }]);
      }
    } else {
      setMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeStatus:"rejected" } : m));
    }
  };

  if (!expanded) {
    return (
      <div style={{ position:"fixed", bottom:88, left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:440, zIndex:150 }}>
        <button
          type="button"
          onClick={() => { startFreshSession(); setExpanded(true); }}
          style={{
            position:"relative",
            width:"100%",
            padding:"13px 18px",
            background:"rgba(255,255,255,0.042)",
            backdropFilter:"blur(24px)",
            WebkitBackdropFilter:"blur(24px)",
            borderRadius:16,
            border:"1px solid rgba(255,255,255,0.1)",
            overflow:"hidden",
            margin:"4px 0 0",
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between",
            cursor:"pointer",
          }}
        >
          <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.25) 50%,transparent)", pointerEvents:"none" }} />
          <div style={{ display:"flex", alignItems:"center", gap:12, textAlign:"left", position:"relative", zIndex:1 }}>
            <div style={{ position:"relative", width:32, height:32, borderRadius:"50%", background:"rgba(201,168,117,0.12)", border:"1px solid rgba(201,168,117,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:14, color:DS.gold }}>✦</span>
              {proactiveBadge > 0 && (
                <div style={{ position:"absolute", top:-4, right:-4, width:16, height:16, borderRadius:"50%", background:C.red, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontFamily:C.fs, fontSize:8, color:"#fff", fontWeight:700 }}>{proactiveBadge}</span>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.18)", letterSpacing:"2.5px", textTransform:"uppercase", marginBottom:3, fontFamily:C.fs }}>AI Coach</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.35)", fontFamily:C.fs }}>Ask about today&apos;s session…</div>
            </div>
          </div>
          <div style={{ width:32, height:32, background:"rgba(201,168,117,0.12)", border:"1px solid rgba(201,168,117,0.2)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:DS.gold, fontSize:14, position:"relative", zIndex:1 }}>↗</div>
        </button>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:150, background:"rgba(10,10,10,0.95)", display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => setShowPersonas(p => !p)} style={{ width:36, height:36, borderRadius:"50%", background:`${C.cyan}15`, border:`1px solid ${C.cyan}33`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <span className={loading ? "pulse" : ""} style={{ fontSize:16, color:C.cyan }}>✦</span>
          </button>
          <div>
            <div style={{ fontFamily:C.ff, fontSize:16, color:C.text, letterSpacing:1 }}>AI COACH</div>
            <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:2 }}>● {(PERSONAS.find(p => p.id === persona)?.label || "THE GRINDER")} · WHOOP {whoopData?.recovery?.score ?? "--"}%</div>
          </div>
        </div>
        <button onClick={() => setExpanded(false)} style={{ background:C.cardSolid, border:"none", color:C.muted, width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:14 }}>✕</button>
      </div>
      {isRecording && (
        <div style={{ padding:"8px 20px", background:`${C.red}15`, borderBottom:`1px solid ${C.red}33`, display:"flex", alignItems:"center", gap:8 }}>
          <span className="pulse" style={{ color:C.red, fontSize:10 }}>●</span>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.red, letterSpacing:3 }}>RECORDING — TAP MIC TO STOP</div>
        </div>
      )}
      {showPersonas && (
        <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:8 }}>
          {PERSONAS.map(p => (
            <button key={p.id} onClick={() => { onPersonaChange(p.id); setShowPersonas(false); }}
              style={{
                flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", textAlign:"center",
                background: persona === p.id ? `${p.color}15` : C.cardSolid,
                border:`1px solid ${persona === p.id ? p.color+"55" : C.border}`,
              }}>
              <div style={{ fontFamily:C.ff, fontSize:11, color: persona === p.id ? p.color : C.text, letterSpacing:1 }}>{p.label}</div>
              <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:1, marginTop:2 }}>{p.sub}</div>
            </button>
          ))}
        </div>
      )}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems: m.role==="user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth:"85%", padding:"12px 16px", borderRadius: m.role==="user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role==="user" ? "rgba(255,170,68,0.14)" : C.card, color: m.role==="user" ? C.text : C.text, border: m.role==="user" ? `1px solid ${C.cyan}33` : `1px solid ${C.border}`, ...C.glass }}>
              {m.attachment?.media_type?.startsWith("image/") && (
                <img src={`data:${m.attachment.media_type};base64,${m.attachment.data}`} alt={m.attachment.name} style={{ width:"100%", borderRadius:8, marginBottom: m.content ? 8 : 0, display:"block" }} />
              )}
              {m.attachment?.media_type === "application/pdf" && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom: m.content ? 8 : 0, background:"rgba(0,0,0,0.15)", borderRadius:8, padding:"6px 10px" }}>
                  <span style={{ fontSize:14 }}>📄</span>
                  <span style={{ fontFamily:C.fm, fontSize:9, letterSpacing:1 }}>{m.attachment.name}</span>
                </div>
              )}
              {m.content && <div style={{ fontFamily:C.fs, fontSize:13, lineHeight:1.6 }}>{renderMarkdown(m.content)}</div>}
            </div>
            {m.clarifyingQuestions && !m.cqSubmitted && (
              <div style={{ maxWidth:"90%", marginTop:8, width:"100%" }}>
                {(() => {
                  const normalizedAll = normalizeClarifyingQuestions(m.clarifyingQuestions);
                  const msgKey = `chat_${i}`;
                  const answered = answeredQuestions[msgKey] || [];
                  const normalized = normalizedAll.filter((q) => !answeredQuestionIds.has(q.id) || answered.includes(q.id));
                  const selectionsById = Object.fromEntries(
                    normalized.map((q) => [q.id, chatCqSelections[`${msgKey}_${q.id}`] || []])
                  );
                  const { byId, sequence } = getClarifyingFlow(normalized, selectionsById);
                  const nextQuestionId = sequence.find((qid) => !answered.includes(qid)) || null;
                  const activeQuestion = nextQuestionId ? byId.get(nextQuestionId) : null;
                  const activeSelection = activeQuestion ? (selectionsById[activeQuestion.id] || []) : [];
                  const allAnswered = sequence.length > 0 && sequence.every((qid) => answered.includes(qid));
                  const questionIdx = activeQuestion ? Math.min(answered.length + 1, sequence.length) : sequence.length;

                  return (
                    <>
                      {sequence.length > 0 && (
                        <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2, marginBottom:6 }}>
                          Question {questionIdx} of {sequence.length}
                        </div>
                      )}

                      {activeQuestion && (
                        <div style={{ background:C.card, borderRadius:12, padding:"12px 14px", marginBottom:6, border:`1px solid ${C.border}`, ...C.glass }}>
                          <div style={{ fontFamily:C.fs, fontSize:13, color:C.text, marginBottom:10, lineHeight:1.4 }}>{activeQuestion.question}</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                            {activeQuestion.options.map((opt, oi) => {
                              const on = activeSelection.includes(opt);
                              return (
                                <button key={oi} onClick={() => {
                                  setChatCqSelections((prev) => {
                                    const key = `${msgKey}_${activeQuestion.id}`;
                                    const cur = prev[key] || [];
                                    let next = [];
                                    if (activeQuestion.type === "single_select") {
                                      next = [opt];
                                    } else {
                                      next = on ? cur.filter((x) => x !== opt) : [...cur, opt];
                                    }
                                    return { ...prev, [key]: next };
                                  });
                                }} style={{
                                  padding:"6px 12px", borderRadius:20, cursor:"pointer",
                                  background: on ? `${C.cyan}22` : C.cardSolid,
                                  border: `1px solid ${on ? C.cyan : C.border}`,
                                  fontFamily:C.fm, fontSize:10, color: on ? C.cyan : C.muted, letterSpacing:1,
                                }}>{opt}</button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {activeQuestion && (
                        <button
                          onClick={() => {
                            if (activeSelection.length === 0) return;
                            const selectedNow = [...activeSelection];
                            setAnsweredQuestions((prev) => {
                              const cur = prev[msgKey] || [];
                              if (cur.includes(activeQuestion.id)) return prev;
                              return { ...prev, [msgKey]: [...cur, activeQuestion.id] };
                            });
                            setAnsweredQuestionIds((prev) => {
                              const next = new Set(prev);
                              next.add(activeQuestion.id);
                              return next;
                            });
                            setAnsweredQuestionValues((prev) => ({ ...prev, [activeQuestion.id]: selectedNow }));
                          }}
                          disabled={activeSelection.length === 0}
                          style={{ width:"100%", padding:"12px", background:activeSelection.length ? C.cyan : C.cardSolid, color:activeSelection.length ? "#000" : C.muted, border:"none", borderRadius:10, cursor:activeSelection.length ? "pointer" : "default", fontFamily:C.ff, fontSize:13, letterSpacing:2, marginTop:4 }}
                        >
                          CONFIRM ANSWER →
                        </button>
                      )}

                      {allAnswered && (
                        <button onClick={() => {
                          const answers = sequence.map((qid) => {
                            const q = byId.get(qid);
                            const sel = selectionsById[qid] || [];
                            return `${q?.question?.replace("?","")}:  ${sel.join(", ") || "Not specified"}`;
                          }).join(". ");
                          submitClarifyingAnswers(i, answers);
                        }} style={{ width:"100%", padding:"12px", background:C.cyan, color:"#000", border:"none", borderRadius:10, cursor:"pointer", fontFamily:C.ff, fontSize:13, letterSpacing:2, marginTop:4 }}>FINAL CONFIRM →</button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            {m.cqSubmitted && <div style={{ fontFamily:C.fm, fontSize:8, color:C.green, letterSpacing:2, marginTop:4 }}>✓ ANSWERS SENT</div>}
            {m.planChange && !m.planChangeStatus && (
              <div style={{ maxWidth:"85%", marginTop:8, background:C.card2, borderRadius:12, padding:"12px 14px", border:`1px solid ${C.green}44` }}>
                <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:3, marginBottom:6 }}>PROPOSED CHANGE</div>
                <div style={{ fontFamily:C.ff, fontSize:14, color:C.text, marginBottom:4 }}>{m.planChange.description}</div>
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button onClick={() => setPendingReview({ planChange:m.planChange, msgIdx:i })} style={{ flex:1, padding:"10px", background:C.green, color:"#000", border:"none", borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:12, letterSpacing:2 }}>REVIEW CHANGES</button>
                  <button onClick={() => handlePlanChange(m.planChange, "reject")} style={{ flex:1, padding:"10px", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:12, letterSpacing:2 }}>DISMISS</button>
                </div>
              </div>
            )}
            {m.planChange && m.planChangeStatus && (
              <div style={{ fontFamily:C.fm, fontSize:8, color: m.planChangeStatus==="accepted" ? C.green : m.planChangeStatus==="applying" ? C.cyan : C.muted, letterSpacing:2, marginTop:4 }}>
                {m.planChangeStatus === "accepted" ? "✓ APPLIED TO PLAN" : m.planChangeStatus === "applying" ? "APPLYING..." : "✕ DISMISSED"}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", alignItems:"flex-start" }}>
            <div style={{ background:C.card, borderRadius:"16px 16px 16px 4px", padding:"12px 16px", border:`1px solid ${C.border}`, ...C.glass }}>
              <div className="shimmer" style={{ fontFamily:C.fm, fontSize:11, letterSpacing:3 }}>THINKING</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding:"8px 20px 0", display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
        {["What should I do today?","Adjust for my WHOOP score","Log new blood work","How was my last run?"].map((p,i) => (
          <button key={i} onClick={() => setInput(p)} style={{ flexShrink:0, padding:"6px 12px", background:C.card, border:`1px solid ${C.border}`, borderRadius:20, cursor:"pointer", fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1, whiteSpace:"nowrap" }}>{p}</button>
        ))}
      </div>
      {attachment && (
        <div style={{ padding:"0 20px 8px", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
            {attachment.media_type?.startsWith("image/") ? (
              <img src={`data:${attachment.media_type};base64,${attachment.data}`} alt="" style={{ width:28, height:28, borderRadius:4, objectFit:"cover", flexShrink:0 }} />
            ) : (
              <span style={{ fontSize:13 }}>📄</span>
            )}
            <span style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:1, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{attachment.name}</span>
            <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", padding:0, fontSize:14, flexShrink:0, lineHeight:1 }}>×</button>
          </div>
        </div>
      )}
      <div style={{ padding:"12px 20px 20px", display:"flex", gap:10, flexShrink:0, alignItems:"flex-end" }}>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display:"none" }} onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => { try { setAttachment({ data: reader.result.split(",")[1], media_type: file.type, name: file.name }); } catch(_) { setMessages(prev => [...prev, { role:"assistant", content:"Failed to read file. Try a smaller image or PDF.", planChange:null }]); } };
          reader.onerror = () => setMessages(prev => [...prev, { role:"assistant", content:"File upload failed. Please try again.", planChange:null }]);
          reader.readAsDataURL(file);
        }} />
        <textarea
          ref={textareaRef}
          value={input}
          rows={1}
          onChange={e => {
            setInput(e.target.value);
            const el = textareaRef.current;
            if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }
          }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask your coach anything..."
          style={{ flex:1, background:C.card, border:`1px solid ${C.cyan}22`, borderRadius:12, padding:"12px 16px", color:C.text, fontFamily:C.fs, fontSize:14, outline:"none", resize:"none", overflow:"hidden", lineHeight:"1.5", maxHeight:120, ...C.glass }}
        />
        <button onClick={() => fileInputRef.current?.click()} style={{ width:36, height:36, background: attachment ? `${C.green}22` : C.card2, border:`1px solid ${attachment ? C.green+"44" : C.border}`, borderRadius:10, cursor:"pointer", color: attachment ? C.green : C.muted, fontSize:16, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }} title="Attach image or PDF">📎</button>
        <button onClick={toggleVoice} style={{ width:36, height:36, background: isRecording ? `${C.red}22` : C.card2, border:`1px solid ${isRecording ? C.red+"44" : C.border}`, borderRadius:10, cursor:"pointer", color: isRecording ? C.red : C.muted, fontSize:16, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }} title={isRecording ? "Stop recording" : "Voice input"}>
          {isRecording ? <span className="pulse" style={{ fontSize:14 }}>●</span> : "🎙"}
        </button>
        <button onClick={sendMessage} disabled={loading || (!input.trim() && !attachment)} style={{ width:48, height:48, background: (input.trim() || attachment) ? C.green : C.card, border:"none", borderRadius:12, cursor: (input.trim() || attachment) ? "pointer" : "default", color: (input.trim() || attachment) ? "#000" : C.muted, fontSize:18, flexShrink:0 }}>↑</button>
      </div>
      {pendingReview && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(10,10,10,0.97)", display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>
          <div style={{ padding:"20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontFamily:C.ff, fontSize:20, color:C.cyan, letterSpacing:2 }}>REVIEW CHANGES</div>
            <button onClick={() => setPendingReview(null)} style={{ background:C.cardSolid, border:"none", color:C.muted, width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:14 }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
            {(() => {
              const pc = pendingReview.planChange;
              const days = pc.type === "remap_week" ? (pc.days || []) : [{ day:pc.day, changes:pc.changes }];
              return days.map((d, di) => (
                <div key={di} style={{ background:C.card, borderRadius:C.radius, padding:"14px 16px", marginBottom:10, border:`1px solid ${C.border}`, ...C.glass }}>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:8 }}>{d.day || "SESSION"}</div>
                  <div style={{ display:"flex", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2, marginBottom:4 }}>CURRENT</div>
                      <div style={{ fontFamily:C.fs, fontSize:12, color:C.muted, lineHeight:1.5 }}>{d.changes?.am_session || d.changes?.note || "Current session"}</div>
                    </div>
                    <div style={{ width:1, background:C.border }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:C.fm, fontSize:6, color:C.cyan, letterSpacing:2, marginBottom:4 }}>PROPOSED</div>
                      <div style={{ fontFamily:C.fs, fontSize:12, color:C.cyan, lineHeight:1.5 }}>{pc.description}</div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
          <div style={{ padding:"16px 20px 24px" }}>
            <button onClick={async () => { await handlePlanChange(pendingReview.planChange, "accept"); setPendingReview(null); }} style={{ width:"100%", padding:"16px", background:C.green, color:"#000", border:"none", borderRadius:12, cursor:"pointer", fontFamily:C.ff, fontSize:16, letterSpacing:3, marginBottom:10 }}>APPLY TO PLAN</button>
            <button onClick={() => { handlePlanChange(pendingReview.planChange, "reject"); setPendingReview(null); }} style={{ width:"100%", padding:"10px", background:"transparent", color:C.muted, border:"none", cursor:"pointer", fontFamily:C.fm, fontSize:9, letterSpacing:2 }}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Render a custom AI-generated session written in simple markdown.
// Supports: ## headers, - / * bullets, **bold**, blank-line separators.
const renderCustomSession = (md, accent) => {
  if (!md) return null;
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Section header
    if (line.startsWith("## ")) {
      out.push(
        <div key={i} style={{ fontFamily:C.fm, fontSize:8, color:accent, letterSpacing:3, padding:"14px 0 4px", marginTop:4 }}>
          {line.slice(3).toUpperCase()}
        </div>
      );
    // Bullet item — gather consecutive bullets into a block
    } else if (line.match(/^[-*] /)) {
      const text = line.slice(2);
      const inlineParts = text.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={j} style={{ color:C.text }}>{p.slice(2,-2)}</strong>
          : p
      );
      out.push(
        <div key={i} style={{ display:"flex", gap:14, padding:"11px 16px", background:C.card, borderRadius:12, borderLeft:`3px solid ${accent}`, marginBottom:6 }}>
          <span style={{ fontFamily:C.ff, fontSize:11, color:C.light, minWidth:20, marginTop:1 }}>{String(out.filter(x=>x).length).padStart(2,"0")}</span>
          <span style={{ fontFamily:C.fs, fontSize:14, color:C.text, lineHeight:1.5 }}>{inlineParts}</span>
        </div>
      );
    // Empty line — small spacer
    } else if (line.trim() === "") {
      out.push(<div key={i} style={{ height:6 }} />);
    // Plain text paragraph with inline bold support
    } else {
      const inlineParts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={j}>{p.slice(2,-2)}</strong>
          : p
      );
      out.push(
        <div key={i} style={{ fontFamily:C.fs, fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:4 }}>
          {inlineParts}
        </div>
      );
    }
    i++;
  }
  return <div style={{ display:"flex", flexDirection:"column", gap:0 }}>{out}</div>;
};

const SESSION_TYPES = ["ZONE 2","THRESHOLD","HYROX","STRENGTH","TEMPO","VO2 MAX","RECOVERY","MOBILITY","RACE"];
const BLOCK_TYPES = ["FOR TIME","AMRAP","EMOM","INTERVALS","GENERAL"];
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const SessionModal = ({ name, dayData, sess, weekId, onClose, onSessSwitch, sundayChoice, setSundayChoice, supabase, session: authSession, onSaved }) => {
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editBlocks, setEditBlocks] = useState([]);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editToast, setEditToast] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);

  if (!name && !dayData?.isSunday && !dayData?.isRaceDay) return null;
  const w = name ? WL[name] : null;
  const accent = name ? getAccent(name) : C.muted;
  const customContent = sess === "am" ? dayData?.am_session_custom : dayData?.pm_session_custom;
  const showCustom = !!(customContent && dayData?.ai_modified);
  const currentBlocks = sess === "am" ? dayData?.am_session_blocks : dayData?.pm_session_blocks;
  const hasManualEdits = Array.isArray(currentBlocks) && currentBlocks.some((b) => b?.is_modified);
  const sessionStatus = hasManualEdits
    ? { label: "MODIFIED", color: C.yellow }
    : { label: "AI GENERATED", color: C.cyan };

  const enterEdit = () => {
    setEditName(name || "");
    setEditType(w?.type || "");
    setEditDuration(w?.duration?.replace(/[^0-9]/g,"") || "");
    setEditNote(dayData?.note2a || w?.note || "");
    const existing = sess === "am" ? dayData?.am_session_blocks : dayData?.pm_session_blocks;
    if (existing && existing.length > 0) {
      setEditBlocks(JSON.parse(JSON.stringify(existing)));
    } else if (w?.steps) {
      setEditBlocks([{
        id:uid(), type:"GENERAL", duration:null, rounds:null, order:0,
        exercises: w.steps.filter(s => !s.startsWith("—")).map((s,i) => ({ id:uid(), name:s, sets:null, reps:null, note:null })),
        is_ai_generated: !!dayData?.ai_modified, is_modified:false,
      }]);
    } else {
      setEditBlocks([]);
    }
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!supabase || !authSession?.access_token || !dayData) return;
    setSaving(true);
    const blocksKey = sess === "am" ? "am_session_blocks" : "pm_session_blocks";
    const ordered = editBlocks.map((b,i) => ({ ...b, order:i }));
    const manuallyEditedBlocks = ordered.map((b) => ({ ...b, is_modified: true, is_ai_generated: false }));
    const update = {
      [blocksKey]: manuallyEditedBlocks,
      note: editNote,
      ai_modified: false,
      ai_modification_note: null,
    };
    try {
      // weekId is the UUID from training_weeks; training_days.week_id is the slug
      // Look up the slug first, then update training_days
      const { data: weekRow } = await supabase
        .from("training_weeks").select("week_id").eq("id", weekId).single();
      const wkSlug = weekRow?.week_id || weekId;
      const { error } = await supabase
        .from("training_days")
        .update(update)
        .eq("week_id", wkSlug)
        .eq("day_name", dayData.day);
      if (error) throw error;
      setToast("✓ Saved");
      setTimeout(() => { setToast(null); setEditMode(false); if (onSaved) onSaved(); }, 1200);
    } catch (e) {
      setToast("Save failed: " + e.message);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const addBlock = () => {
    setEditBlocks(prev => [...prev, {
      id:uid(), type:"GENERAL", duration:20, rounds:null, order:prev.length,
      exercises:[{ id:uid(), name:"New exercise", sets:3, reps:"10", note:null }],
      is_ai_generated:false, is_modified:true,
    }]);
  };

  const dupBlock = (idx) => {
    const b = editBlocks[idx];
    const nb = { ...JSON.parse(JSON.stringify(b)), id:uid(), is_ai_generated:false, is_modified:true };
    setEditBlocks(prev => [...prev.slice(0,idx+1), nb, ...prev.slice(idx+1)]);
  };

  const delBlock = (idx) => setEditBlocks(prev => prev.filter((_,i) => i !== idx));

  const updateBlock = (idx, updates) => {
    setEditBlocks(prev => prev.map((b,i) => {
      if (i !== idx) return b;
      return { ...b, ...updates, is_modified:true };
    }));
  };

  const addExercise = (blockIdx) => {
    updateBlock(blockIdx, {
      exercises: [...editBlocks[blockIdx].exercises, { id:uid(), name:"", sets:3, reps:"10", note:null }],
    });
  };

  const updateExercise = (blockIdx, exIdx, updates) => {
    const exs = editBlocks[blockIdx].exercises.map((e,i) => i === exIdx ? { ...e, ...updates } : e);
    updateBlock(blockIdx, { exercises:exs });
  };

  const delExercise = (blockIdx, exIdx) => {
    updateBlock(blockIdx, { exercises:editBlocks[blockIdx].exercises.filter((_,i) => i !== exIdx) });
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); };
  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) return;
    setEditBlocks(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    setDragIdx(null);
  };

  const inputStyle = { padding:"10px 12px", background:C.cardSolid, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontFamily:C.fs, fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" };

  if (editMode) {
    return (
      <div style={{ position:"fixed", inset:0, zIndex:200, background:C.bg, overflowY:"auto" }}>
        <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:C.bg, zIndex:10 }}>
            <div style={{ fontFamily:C.ff, fontSize:18, color:C.cyan, letterSpacing:2 }}>EDIT SESSION</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setEditMode(false)} style={{ padding:"8px 14px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:11, color:C.muted, letterSpacing:2 }}>CANCEL</button>
              <button onClick={saveEdit} disabled={saving} style={{ padding:"8px 14px", background:C.green, border:"none", borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:11, color:"#000", letterSpacing:2 }}>{saving ? "..." : "SAVE"}</button>
            </div>
          </div>

          <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:4 }}>SESSION NAME</div>
              <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6 }}>TYPE</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {SESSION_TYPES.map(t => (
                  <button key={t} onClick={() => setEditType(t)} style={{ padding:"5px 10px", borderRadius:16, cursor:"pointer", background: editType===t ? `${C.cyan}22` : C.cardSolid, border:`1px solid ${editType===t ? C.cyan : C.border}`, fontFamily:C.fm, fontSize:8, color: editType===t ? C.cyan : C.muted, letterSpacing:1 }}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:4 }}>DURATION</div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} style={{ ...inputStyle, width:80 }} />
                  <span style={{ fontFamily:C.fm, fontSize:9, color:C.muted }}>min</span>
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:4 }}>NOTE</div>
              <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={2} style={{ ...inputStyle, resize:"vertical" }} />
            </div>
          </div>

          <div style={{ padding:"0 20px" }}>
            <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:10 }}>WORKOUT BLOCKS</div>
            {editBlocks.map((block, bi) => (
              <div key={block.id} draggable onDragStart={() => handleDragStart(bi)} onDragOver={e => handleDragOver(e, bi)} onDrop={() => handleDrop(bi)}
                style={{ background:C.card, borderRadius:12, padding:"12px", marginBottom:8, border:`1px solid ${dragIdx===bi ? C.cyan+"55" : C.border}`, ...C.glass }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ cursor:"grab", color:C.light, fontSize:14 }}>⠿</span>
                    <div style={{ fontFamily:C.ff, fontSize:14, color:C.text, letterSpacing:1 }}>{block.type}</div>
                    {block.is_ai_generated && !block.is_modified && <span style={{ fontFamily:C.fm, fontSize:6, color:C.cyan, letterSpacing:2, background:`${C.cyan}15`, padding:"2px 6px", borderRadius:8 }}>AI</span>}
                    {block.is_modified && <span style={{ fontFamily:C.fm, fontSize:6, color:C.yellow, letterSpacing:2, background:`${C.yellow}15`, padding:"2px 6px", borderRadius:8 }}>MODIFIED</span>}
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={() => setExpandedBlock(expandedBlock === bi ? null : bi)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13, padding:4 }}>✏️</button>
                    <button onClick={() => dupBlock(bi)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13, padding:4 }}>📋</button>
                    <button onClick={() => delBlock(bi)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:13, padding:4 }}>🗑</button>
                  </div>
                </div>

                {expandedBlock !== bi && (
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    {block.exercises.slice(0,4).map((ex,ei) => (
                      <div key={ei} style={{ fontFamily:C.fs, fontSize:11, color:C.muted, lineHeight:1.4 }}>
                        {ex.name}{ex.sets ? ` · ${ex.sets}×${ex.reps||""}` : ""}{ex.note ? ` — ${ex.note}` : ""}
                      </div>
                    ))}
                    {block.exercises.length > 4 && <div style={{ fontFamily:C.fm, fontSize:9, color:C.light }}>+{block.exercises.length-4} more</div>}
                  </div>
                )}

                {expandedBlock === bi && (
                  <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:8 }}>
                    <div style={{ display:"flex", gap:6 }}>
                      {BLOCK_TYPES.map(bt => (
                        <button key={bt} onClick={() => updateBlock(bi, { type:bt })} style={{ padding:"4px 8px", borderRadius:12, cursor:"pointer", background:block.type===bt ? `${C.cyan}22` : C.cardSolid, border:`1px solid ${block.type===bt ? C.cyan : C.border}`, fontFamily:C.fm, fontSize:7, color:block.type===bt ? C.cyan : C.muted }}>{bt}</button>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2, marginBottom:2 }}>DURATION</div>
                        <input type="number" value={block.duration||""} onChange={e => updateBlock(bi,{duration:parseInt(e.target.value)||null})} style={{ ...inputStyle, fontSize:11 }} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2, marginBottom:2 }}>ROUNDS</div>
                        <input type="number" value={block.rounds||""} onChange={e => updateBlock(bi,{rounds:parseInt(e.target.value)||null})} style={{ ...inputStyle, fontSize:11 }} />
                      </div>
                    </div>
                    {block.exercises.map((ex,ei) => (
                      <div key={ex.id} style={{ display:"flex", gap:4, alignItems:"flex-start" }}>
                        <div style={{ flex:2 }}><input value={ex.name} onChange={e => updateExercise(bi,ei,{name:e.target.value})} placeholder="Exercise" style={{ ...inputStyle, fontSize:11 }} /></div>
                        <div style={{ width:40 }}><input type="number" value={ex.sets||""} onChange={e => updateExercise(bi,ei,{sets:parseInt(e.target.value)||null})} placeholder="S" style={{ ...inputStyle, fontSize:11, textAlign:"center" }} /></div>
                        <div style={{ width:50 }}><input value={ex.reps||""} onChange={e => updateExercise(bi,ei,{reps:e.target.value})} placeholder="Reps" style={{ ...inputStyle, fontSize:11, textAlign:"center" }} /></div>
                        <button onClick={() => delExercise(bi,ei)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:11, padding:4, marginTop:6 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => addExercise(bi)} style={{ padding:"6px", background:"transparent", border:`1px dashed ${C.border}`, borderRadius:6, cursor:"pointer", fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:2 }}>+ ADD EXERCISE</button>
                  </div>
                )}
              </div>
            ))}
            <button onClick={addBlock} style={{ width:"100%", padding:"12px", background:"transparent", border:`1px dashed ${C.cyan}44`, borderRadius:12, cursor:"pointer", fontFamily:C.ff, fontSize:12, color:C.cyan, letterSpacing:2, marginBottom:20 }}>+ ADD BLOCK</button>
          </div>
        </div>
        {toast && (
          <div style={{ position:"fixed", bottom:40, left:"50%", transform:"translateX(-50%)", background:C.cardSolid, border:`1px solid ${C.green}44`, borderRadius:10, padding:"10px 20px", zIndex:300 }}>
            <div style={{ fontFamily:C.fm, fontSize:9, color:C.green, letterSpacing:2 }}>{toast}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(10,10,10,0.97)", overflowY:"auto" }}>
      <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"sticky", top:0, background:C.bg, zIndex:10 }}>
          <div>
            {w && <div style={{ fontFamily:C.fm, fontSize:8, color:accent, letterSpacing:3, marginBottom:6 }}>{w.type} · {w.tag}</div>}
            {dayData?.isRaceDay ? (
              <div style={{ fontFamily:C.ff, fontSize:36, color:C.red, lineHeight:1 }}>RACE DAY<br/>MIAMI 🏁</div>
            ) : w ? (
              <div style={{ fontFamily:C.ff, fontSize:28, color:C.text, letterSpacing:0.5, lineHeight:1.1 }}>{name.split(" — ")[1] || name}</div>
            ) : (
              <div style={{ fontFamily:C.ff, fontSize:24, color:C.muted }}>SUNDAY SESSION</div>
            )}
            {w && <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, marginTop:4 }}>{w.duration}</div>}
            {!dayData?.isRaceDay && (name || customContent) && (
              <div
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  background: `${sessionStatus.color}22`,
                  border: `1px solid ${sessionStatus.color}44`,
                  borderRadius: 20,
                  padding: "3px 10px",
                  fontFamily: C.fm,
                  fontSize: 7,
                  color: sessionStatus.color,
                  letterSpacing: 2,
                }}
              >
                {sessionStatus.label}
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={enterEdit} style={{ background:C.card, border:`1px solid ${C.border}`, color:C.cyan, width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>✏️</button>
            <button onClick={onClose} style={{ background:C.card, border:"none", color:C.muted, width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:16 }}>✕</button>
          </div>
        </div>
        {dayData?.pm && (
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
            {[["am","AM"],["pm","PM"]].map(([s,l]) => (
              <button key={s} onClick={() => onSessSwitch(s)} style={{ flex:1, padding:"12px", fontFamily:C.ff, fontSize:13, letterSpacing:3, background:"transparent", color: sess===s ? C.text : C.muted, border:"none", borderBottom:`2px solid ${sess===s ? accent : "transparent"}`, cursor:"pointer" }}>{l} SESSION</button>
            ))}
          </div>
        )}
        {dayData?.ai_modified && dayData?.ai_modification_note && (
          <div style={{ padding:"14px 20px", background:"#FF770011", borderBottom:`1px solid #FF770033` }}>
            <div style={{ fontFamily:C.fm, fontSize:7, color:"#FF7700", letterSpacing:3, marginBottom:5 }}>⚡ AI ADJUSTMENT</div>
            <div style={{ fontFamily:C.fs, fontSize:13, color:C.text, lineHeight:1.6 }}>{dayData.ai_modification_note}</div>
          </div>
        )}
        {dayData?.isSunday && (
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:12 }}>CHOOSE YOUR SESSION</div>
            <div style={{ display:"flex", gap:10 }}>
              {[["mobility","MOBILITY","+ Contrast Therapy"],["plyo","PLYO + CORE","+ Contrast Therapy"]].map(([key,label,sub]) => (
                <button key={key} onClick={() => setSundayChoice(p => ({...p,[weekId]:key}))} style={{ flex:1, padding:"14px 10px", background: sundayChoice[weekId]===key ? accent : C.card, color: sundayChoice[weekId]===key ? "#000" : C.text, border:`1px solid ${sundayChoice[weekId]===key ? accent : C.border}`, borderRadius:12, cursor:"pointer", fontFamily:C.ff, fontSize:14, letterSpacing:2 }}>
                  {label}<div style={{ fontFamily:C.fm, fontSize:7, color: sundayChoice[weekId]===key ? "#00000088" : C.muted, marginTop:4 }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ padding:"20px", flex:1 }}>
          {dayData?.isRaceDay ? (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {["Wake 3 hrs before gun — calm morning","High carb, low fiber breakfast — no dairy","10 min easy jog + 4 strides","Skip stimulants — the race environment is your caffeine","EXECUTE YOUR PACING STRATEGY — TRUST THE WORK"].map((s,i) => (
                <div key={i} style={{ display:"flex", gap:14, padding:"14px 16px", background: i===4 ? C.red : C.card, borderRadius:12, alignItems:"flex-start" }}>
                  <span style={{ fontFamily:C.ff, fontSize:11, color: i===4?"rgba(255,255,255,0.5)":C.light, minWidth:20, marginTop:1 }}>{String(i+1).padStart(2,"0")}</span>
                  <span style={{ fontFamily:C.fs, fontSize:14, color: i===4?"#fff":C.text, fontWeight: i===4?700:400, lineHeight:1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          ) : showCustom ? (
            <>
              {renderCustomSession(customContent, accent)}
              {dayData?.note2a && (
                <div style={{ background:C.card, borderRadius:12, padding:"14px 16px", borderLeft:`3px solid ${C.border}`, marginTop:16 }}>
                  <div style={{ fontFamily:C.fm, fontSize:8, color:C.red, letterSpacing:3, marginBottom:6 }}>COACH NOTE</div>
                  <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted, lineHeight:1.8 }}>{dayData.note2a}</div>
                </div>
              )}
            </>
          ) : w ? (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
                {w.steps.map((s,i) => {
                  const isDivider = s.startsWith("—");
                  return isDivider ? (
                    <div key={i} style={{ fontFamily:C.fm, fontSize:8, color:C.light, letterSpacing:3, padding:"8px 0 2px" }}>{s.replace(/—/g,"").trim()}</div>
                  ) : (
                    <div key={i} style={{ display:"flex", gap:14, padding:"13px 16px", background:C.card, borderRadius:12, borderLeft:`3px solid ${accent}`, alignItems:"flex-start" }}>
                      <span style={{ fontFamily:C.ff, fontSize:11, color:C.light, minWidth:20, marginTop:1 }}>{String(i+1).padStart(2,"0")}</span>
                      <span style={{ fontFamily:C.fs, fontSize:14, color:C.text, lineHeight:1.5 }}>{s}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ background:C.card, borderRadius:12, padding:"14px 16px", borderLeft:`3px solid ${C.border}` }}>
                <div style={{ fontFamily:C.fm, fontSize:8, color:C.red, letterSpacing:3, marginBottom:6 }}>COACH NOTE</div>
                <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted, lineHeight:1.8 }}>{dayData?.note2a || w.note}</div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [nav, setNav]         = useState("today");
  const [blockId, setBlockId] = useState("taper");
  const [weekId, setWeekId]   = useState("tw1");
  const [selDay, setSelDay]   = useState(null);
  const [sess, setSess]       = useState("am");
  const [sundayChoice, setSundayChoice] = useState({});
  const [whoopData, setWhoopData]       = useState(null);
  const [whoopLoading, setWhoopLoading] = useState(true);
  const [whoopConnected, setWhoopConnected] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaWeeklyZ2Minutes, setStravaWeeklyZ2Minutes] = useState(null);
  const [stravaWeeklyZ2Loading, setStravaWeeklyZ2Loading] = useState(false);
  const [stravaWeeklyZ2Error, setStravaWeeklyZ2Error] = useState("");
  const [stravaBestEfforts, setStravaBestEfforts] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [biomarkers, setBiomarkers] = useState([]);
  const [planBlocks, setPlanBlocks] = useState([]);
  const [planLoading, setPlanLoading] = useState(true);
  const [supplements, setSupplements] = useState([]);
  const [suppsLoading, setSuppsLoading] = useState(true);
  const [synthesisNote, setSynthesisNote] = useState(null);
  const [bloodworkUploading, setBloodworkUploading] = useState(false);
  const [bloodworkResult, setBloodworkResult] = useState(null);
  const bloodworkInputRef = useRef(null);
  const [coachPersona, setCoachPersona] = useState("grinder");
  const [showEntrance, setShowEntrance] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [splashPhase, setSplashPhase] = useState("dark");
  const [garminActivities, setGarminActivities] = useState([]);
  const [garminConnected, setGarminConnected] = useState(false);
  const [proactiveMessages, setProactiveMessages] = useState([]);
  const [proactiveBadge, setProactiveBadge] = useState(0);
  const [weeklyReview, setWeeklyReview] = useState(null);
  const [coachBrief, setCoachBrief] = useState("");
  const [coachBriefLoading, setCoachBriefLoading] = useState(false);
  const [coachExpandSignal, setCoachExpandSignal] = useState(0);
  const [showReadinessBreakdown, setShowReadinessBreakdown] = useState(false);
  const [unifiedMetrics, setUnifiedMetrics] = useState([]);
  const [intervalsSyncing, setIntervalsSyncing] = useState(false);
  const [intervalsSyncError, setIntervalsSyncError] = useState("");
  const [intervalsLastSyncedAt, setIntervalsLastSyncedAt] = useState(null);
  const [intervalsSyncSummary, setIntervalsSyncSummary] = useState(null);
  const [perfTrends, setPerfTrends] = useState(null);
  const [perfTrendsLoading, setPerfTrendsLoading] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [labMessages, setLabMessages] = useState([]);
  const [labInput, setLabInput] = useState("");
  const [labLoading, setLabLoading] = useState(false);
  const [scenarioChanges, setScenarioChanges] = useState([]);
  const [showLabReview, setShowLabReview] = useState(false);
  const [labToast, setLabToast] = useState(null);
  const [planBuilderOpen, setPlanBuilderOpen] = useState(false);
  const [planBuilderDismissUntil, setPlanBuilderDismissUntil] = useState(0);
  const [showRecoveryGates, setShowRecoveryGates] = useState(false);
  const [showAiAdjustments, setShowAiAdjustments] = useState(true);
  const [labContext, setLabContext] = useState("");
  const [labTargetDay, setLabTargetDay] = useState(null);
  const [cqSelections, setCqSelections] = useState({});
  const [labAnsweredQuestions, setLabAnsweredQuestions] = useState({});
  const [labSessionId, setLabSessionId] = useState(createSessionId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSection, setDrawerSection] = useState("menu");
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [z2ModalOpen, setZ2ModalOpen] = useState(false);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  // Auth state is declared with the rest of top-level hooks to keep hook order stable.
  const [session, setSession]       = useState(null);
  const [profile, setProfile]       = useState(null);
  const dataSources = useDataSources(profile);
  const [profileBootstrapError, setProfileBootstrapError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const dataFetched = useRef(false);
  /** After OAuth, session may load after URL is cleaned — refetch Strava once JWT exists. */
  const stravaOAuthReturnRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from("user_profiles").select("*").eq("user_id", session.user.id).single();
    if (data) setProfile(data);
  }, [session?.user?.id]);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashPhase("logo-in"), 300);
    const t2 = setTimeout(() => setSplashPhase("tagline"), 1100);
    const t3 = setTimeout(() => setSplashPhase("glow"), 1800);
    const t4 = setTimeout(() => setSplashPhase("out"), 2600);
    const t5 = setTimeout(() => setSplashDone(true), 3100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  useEffect(() => {
  }, [selDay, weekId, sess]);

  // Initialise auth on mount; listen for session changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setProfileBootstrapError(null);
        fetchOrCreateUserProfile(supabase, session.user)
          .then((p) => {
            setProfile(p);
            setAuthLoading(false);
          })
          .catch((err) => {
            console.error("[App] profile bootstrap", err);
            setProfileBootstrapError(err?.message || "Profile setup failed");
            setProfile(null);
            setAuthLoading(false);
          });
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setProfileBootstrapError(null);
        fetchOrCreateUserProfile(supabase, newSession.user)
          .then((data) => {
            setProfile((prev) => {
              if (prev?.user_id === data?.user_id) return prev;
              return data || null;
            });
            setAuthLoading(false);
          })
          .catch((err) => {
            console.error("[App] profile bootstrap (auth change)", err);
            setProfileBootstrapError(err?.message || "Profile setup failed");
            setProfile(null);
            setAuthLoading(false);
          });
      } else {
        setProfile(null);
        setProfileBootstrapError(null);
        dataFetched.current = false;
        setStravaWeeklyZ2Minutes(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const rawUntil = localStorage.getItem(PLAN_BUILDER_DISMISS_KEY);
    const until = Number(rawUntil);
    if (Number.isFinite(until) && until > 0 && Date.now() < until) {
      setPlanBuilderDismissUntil(until);
      return;
    }
    const rawDismissed = localStorage.getItem("plan_builder_dismissed");
    const dismissedAt = Number(rawDismissed);
    if (Number.isFinite(dismissedAt) && (Date.now() - dismissedAt) < 24 * 60 * 60 * 1000) {
      const untilTs = dismissedAt + 24 * 60 * 60 * 1000;
      setPlanBuilderDismissUntil(untilTs);
      localStorage.setItem(PLAN_BUILDER_DISMISS_KEY, String(untilTs));
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("whoop_connected") === "true") {
      window.history.replaceState({}, "", "/");
      if (session?.access_token) fetchWhoopData();
    }
    if (params.get("strava") === "connected") {
      stravaOAuthReturnRef.current = true;
      window.history.replaceState({}, "", "/");
      setStravaConnected(true);
    }
    if (stravaOAuthReturnRef.current && session?.access_token) {
      stravaOAuthReturnRef.current = false;
      void fetchStravaWeeklyZ2();
      void fetchStravaBestEfforts();
    }
    if (params.get("error")) {
      console.error("Auth error:", params.get("error"));
      window.history.replaceState({}, "", "/");
    }
  }, [session?.access_token]);

  // Data fetches — only run once per session when profile is first loaded
  useEffect(() => {
    if (!profile || dataFetched.current) return;
    dataFetched.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") window.history.replaceState({}, "", "/");

    if (profile.connected_wearables?.whoop) {
      setWhoopConnected(true);
    }
    if (profile.coach_persona) {
      setCoachPersona(profile.coach_persona);
    }
    if (profile.connected_wearables?.garmin) {
      setGarminConnected(true);
    }
    if (
      profile.connected_wearables?.strava
      || Boolean(profile.strava_access_token)
      || Boolean(profile.connected_wearables?.strava_access_token)
    ) {
      setStravaConnected(true);
    }
    if (params.get("garmin_connected") === "true") {
      setGarminConnected(true);
      window.history.replaceState({}, "", "/");
    }
    if (params.get("strava_connected") === "true") {
      setStravaConnected(true);
      window.history.replaceState({}, "", "/");
    }
    if (params.get("strava") === "connected") {
      setStravaConnected(true);
      window.history.replaceState({}, "", "/");
    }

    fetchBiomarkers();
    fetchSupplements();
    fetchPlan(session?.access_token);
    fetchGarminActivities();
    fetchUnifiedMetrics();
    fetchIntervalsSync();
    fetchStravaBestEfforts();
    fetchStravaWeeklyZ2();
  }, [profile]);

  useEffect(() => {
    if (nav !== "perf" || !session?.access_token) return;
    let cancelled = false;
    setPerfTrendsLoading(true);
    fetch("/api/metrics/trends", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) return null;
        return data;
      })
      .then((data) => {
        if (!cancelled) setPerfTrends(data);
      })
      .catch(() => {
        if (!cancelled) setPerfTrends(null);
      })
      .finally(() => {
        if (!cancelled) setPerfTrendsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nav, session?.access_token]);

  const fetchWhoopData = async () => {
    try {
      const { data: live } = await supabase.auth.getSession();
      const token = live?.session?.access_token || session?.access_token;

      if (token) {
        const res = await fetch("/api/whoop/sync", {
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          if (profile && !profile.connected_wearables?.whoop) {
            setWhoopConnected(false);
          }
          setWhoopLoading(false);
          return;
        }
        if (data?.throttled && data?.recovery == null) {
          setWhoopLoading(false);
          return;
        }
        if (import.meta.env.DEV) {
          console.log("[WHOOP sync]", JSON.stringify(data, null, 2));
        }
        const { throttled: _t, ...rest } = data;
        setWhoopData(rest);
        setWhoopConnected(true);
        return;
      }

      const res = await fetch("/api/whoop/recovery", { credentials: "include" });
      if (res.status === 401) {
        if (profile && !profile.connected_wearables?.whoop) {
          setWhoopConnected(false);
        }
        setWhoopLoading(false);
        return;
      }
      const data = await res.json();
      if (import.meta.env.DEV) {
        console.log("[WHOOP data]", JSON.stringify(data, null, 2));
      }
      setWhoopData(data);
      setWhoopConnected(true);
    } catch (e) {
      if (profile && !profile.connected_wearables?.whoop) {
        setWhoopConnected(false);
      }
    } finally {
      setWhoopLoading(false);
    }
  };

  const fetchBiomarkers = async () => {
    try {
      const { data } = await supabase.from("biomarkers").select("*").order("date_collected", { ascending:false });
      if (data) setBiomarkers(data);
    } catch (e) {}
  };

  const fetchSupplements = async () => {
    try {
      const { data } = await supabase.from("supplements").select("*").order("sort_order");
      if (data) setSupplements(data);
    } catch (e) {}
    finally { setSuppsLoading(false); }
  };

  const fetchGarminActivities = async () => {
    try {
      const { data } = await supabase
        .from("garmin_activities")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(20);
      if (data) setGarminActivities(data);
    } catch (_) {}
  };

  const fetchUnifiedMetrics = async () => {
    try {
      const { data } = await supabase
        .from("unified_metrics")
        .select("*")
        .order("date", { ascending: false })
        .limit(90);
      if (data) {
        setUnifiedMetrics(data);
        const latestIntervals = [...data]
          .filter((m) => m?.source === "intervals")
          .sort((a, b) => new Date(b?.created_at || b?.date || 0).getTime() - new Date(a?.created_at || a?.date || 0).getTime())[0];
        if (latestIntervals) {
          setIntervalsLastSyncedAt(latestIntervals.intervals_synced_at || latestIntervals.created_at || latestIntervals.date || null);
        }
      }
    } catch (_) {}
  };

  const fetchIntervalsSync = async () => {
    if (!session?.access_token) return;
    setIntervalsSyncing(true);
    setIntervalsSyncError("");
    try {
      const res = await fetch("/api/intervals/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json().catch(() => ({}));
      console.log("[sync] result:", data);
      if (!res.ok) {
        throw new Error(data.details || data.error || "Intervals sync failed");
      }
      setIntervalsSyncSummary({
        wellness_synced: data.wellness_synced,
        activities_synced: data.activities_synced,
        date_range: data.date_range,
      });
      if (data?.last_synced_at) setIntervalsLastSyncedAt(data.last_synced_at);
      await fetchUnifiedMetrics();
      await fetchGarminActivities();
    } catch (e) {
      setIntervalsSyncError(e.message || "Intervals sync failed");
      setIntervalsSyncSummary(null);
      await fetchWhoopData();
    } finally {
      setIntervalsSyncing(false);
    }
  };

  const fetchStravaBestEfforts = async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch("/api/strava/best-efforts", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(session.user?.id ? { "x-user-id": session.user.id } : {}),
        },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (data?.error === "strava_not_connected" || data?.error === "strava_reconnect_required") {
        setStravaConnected(false);
        setStravaBestEfforts(null);
        return;
      }
      setStravaConnected(true);
      if (data?.bestEfforts && typeof data.bestEfforts === "object") {
        setStravaBestEfforts(data.bestEfforts);
      } else {
        setStravaBestEfforts({});
      }
    } catch {
      setStravaBestEfforts({});
    }
  };

  const z2WeeklyLocalKey = (uid) => (uid ? `lab:z2_weekly_minutes:${uid}` : null);
  const z2WeeklyFetchAtKey = (uid) => (uid ? `lab:z2_weekly_fetch_at:${uid}` : null);

  const fetchStravaWeeklyZ2 = async () => {
    if (!session?.access_token) return;
    const uid = session.user?.id;
    const lsKey = z2WeeklyLocalKey(uid);
    const fetchAtKey = z2WeeklyFetchAtKey(uid);
    let hadPositiveLocal = false;
    let rawMinutes = null;
    if (lsKey) {
      try {
        rawMinutes = localStorage.getItem(lsKey);
        const n = parseInt(rawMinutes, 10);
        if (Number.isFinite(n) && n > 0) hadPositiveLocal = true;
        if (Number.isFinite(n) && n >= 0) setStravaWeeklyZ2Minutes(n);
      } catch (_) {}
    }

    let lastFetch = 0;
    if (fetchAtKey) {
      try {
        lastFetch = parseInt(localStorage.getItem(fetchAtKey) || "0", 10);
      } catch (_) {
        lastFetch = 0;
      }
    }
    const ageMin = (Date.now() - (Number.isFinite(lastFetch) && lastFetch > 0 ? lastFetch : 0)) / 1000 / 60;
    if (
      fetchAtKey &&
      lsKey &&
      rawMinutes != null &&
      rawMinutes !== "" &&
      ageMin < 60 &&
      Number.isFinite(parseInt(rawMinutes, 10))
    ) {
      if (import.meta.env.DEV) {
        console.log("[z2] using local cache, skipping fetch", { ageMin: Math.round(ageMin * 10) / 10 });
      }
      return;
    }

    setStravaWeeklyZ2Loading(true);
    setStravaWeeklyZ2Error("");
    try {
      const res = await fetch("/api/strava/weekly-z2", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(uid ? { "x-user-id": uid } : {}),
        },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (
        res.ok &&
        fetchAtKey &&
        data.error !== "strava_not_connected" &&
        data.error !== "strava_reconnect_required"
      ) {
        try {
          localStorage.setItem(fetchAtKey, String(Date.now()));
        } catch (_) {}
      }
      if (data.error === "strava_not_connected" || data.error === "strava_reconnect_required") {
        setStravaConnected(false);
        setStravaWeeklyZ2Minutes(0);
        if (lsKey) {
          try {
            localStorage.removeItem(lsKey);
          } catch (_) {}
        }
        if (fetchAtKey) {
          try {
            localStorage.removeItem(fetchAtKey);
          } catch (_) {}
        }
        return;
      }
      if (!res.ok) {
        setStravaWeeklyZ2Error(String(data.error || "Failed loading Strava Z2"));
        if (!hadPositiveLocal) setStravaWeeklyZ2Minutes(0);
        return;
      }
      const mins = data.weeklyZ2Minutes ?? data.totalMinutes;
      if (typeof mins === "number" && Number.isFinite(mins)) {
        const m = Math.max(0, mins);
        const fromCache = data.fromCache === true;
        if (m > 0 || fromCache) {
          setStravaWeeklyZ2Minutes(m);
          setStravaConnected(true);
          if (lsKey) {
            try {
              localStorage.setItem(lsKey, String(m));
            } catch (_) {}
          }
        } else {
          console.warn(
            "[Z2] API returned 0 (live Strava), keeping last value if any. Error:",
            data.error,
            "rateLimited:",
            data.rateLimited
          );
          if (!hadPositiveLocal) {
            const raw = lsKey ? localStorage.getItem(lsKey) : null;
            const prev = raw != null ? parseInt(raw, 10) : NaN;
            if (!Number.isFinite(prev) || prev <= 0) {
              setStravaWeeklyZ2Minutes(0);
              setStravaConnected(true);
            }
          }
        }
      } else if (!hadPositiveLocal) {
        setStravaWeeklyZ2Minutes(0);
      }
    } catch (e) {
      setStravaWeeklyZ2Error(e?.message || "Failed loading Strava Z2");
      if (!hadPositiveLocal) setStravaWeeklyZ2Minutes(0);
    } finally {
      setStravaWeeklyZ2Loading(false);
    }
  };

  useEffect(() => {
    if (nav !== "perf" || !stravaConnected || !session?.access_token) return;
    fetchStravaBestEfforts();
  }, [nav, stravaConnected, session?.access_token]);

  useEffect(() => {
    if (nav !== "today" || !session?.access_token) return;
    fetchStravaWeeklyZ2();
  }, [nav, session?.access_token]);

  useEffect(() => {
    if (nav !== "today" || !session?.access_token) return;
    void fetchWhoopData();
  }, [nav, session?.access_token]);

  const selectDefaultPlanPosition = (blocks) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return null;
    const todayIso = getLocalToday();
    const currentYear = parseInt(String(todayIso || "").slice(0, 4), 10) || new Date().getFullYear();
    let earliestWeek = null;

    const labelToPlanIso = (label) => {
      if (!label) return null;
      const parsed = new Date(`${String(label).trim()} ${currentYear}`);
      if (Number.isNaN(parsed.getTime())) return null;
      return formatEasternYmdFromDate(parsed);
    };

    for (const block of blocks) {
      for (const wk of (block?.weeks || [])) {
        const weekIsos = (wk?.days || [])
          .map((d) => labelToPlanIso(d?.date || d?.date_label))
          .filter(Boolean)
          .sort();
        if (!weekIsos.length) continue;
        const weekLo = weekIsos[0];
        const weekHi = weekIsos[weekIsos.length - 1];

        if (!earliestWeek || weekLo < earliestWeek.weekLo) {
          earliestWeek = { blockId: block.id, weekId: wk.id, weekLo };
        }

        if (todayIso >= weekLo && todayIso <= weekHi) {
          return { blockId: block.id, weekId: wk.id };
        }
      }
    }

    if (earliestWeek) {
      return { blockId: earliestWeek.blockId, weekId: earliestWeek.weekId };
    }
    return null;
  };

  // Fix #5: accept token as a parameter so callers always pass the live token —
  // avoids stale-closure reads of session?.access_token captured at definition time.
  const fetchPlan = async (token) => {
    try {
      console.log("[fetchPlan] token present:", !!token, "| token prefix:", token?.slice(0,20));
      const res = await fetch("/api/plan/days", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      console.log("[fetchPlan] status:", res.status);
      const data = await res.json().catch(() => ({}));
      console.log("[fetchPlan] response:", JSON.stringify({
        blocks: data.blocks?.length,
        firstBlock: data.blocks?.[0]?.label,
        firstBlockWeeks: data.blocks?.[0]?.weeks?.length,
        firstWeekDays: data.blocks?.[0]?.weeks?.[0]?.days?.length,
        error: data.error,
      }));
      const normalizedBlocks = normalizePlanBlocks(data.blocks || []);
      const hasDays = normalizedBlocks?.some(b => b.weeks?.some(w => w.days?.length > 0));
      console.log("[fetchPlan] hasDays:", hasDays, "| res.ok:", res.ok, "| will update state:", res.ok && hasDays);
      if (res.ok && hasDays) {
        setPlanBlocks(normalizedBlocks);
        const hasCurrentSelection = normalizedBlocks.some(
          (b) => b.id === blockId && (b.weeks || []).some((w) => w.id === weekId)
        );
        if (!hasCurrentSelection) {
          const target = selectDefaultPlanPosition(normalizedBlocks);
          if (target) {
            setBlockId(target.blockId);
            setWeekId(target.weekId);
          }
        }
      }
      console.log("[fetchPlan] planBlocks.length after fetch:", data.blocks?.length ?? 0);
    } catch (e) {
      console.log("[fetchPlan] caught error:", e.message);
    } finally {
      setPlanLoading(false);
    }
  };

  // Morning Synthesis: runs once per calendar day after WHOOP + plan data load
  useEffect(() => {
    if (!whoopData || planBlocks.length === 0 || !session?.access_token) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("synthesis_date") === today) return;

    const dayNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
    const todayDay = dayNames[new Date().getDay()];
    const currentBlock = planBlocks[0];
    const currentWeek = currentBlock?.weeks?.[0];
    const todayData = currentWeek?.days?.find(d => d.day === todayDay);
    if (!todayData || !currentWeek) {
      localStorage.setItem("synthesis_date", today);
      return;
    }

    const recoveryScore = whoopData?.recovery?.score;
    const sessionName = todayData.am;

    fetch("/api/synthesis/morning", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        recovery_score: recoveryScore,
        session_name: sessionName,
        week_id: currentWeek.id,
        day: todayDay,
      }),
    })
      .then(r => r.json())
      .then(data => {
        localStorage.setItem("synthesis_date", today);
        if (data.modified) {
          setSynthesisNote(data.note);
          fetchPlan(session.access_token);
        }
      })
      .catch(() => {
        localStorage.setItem("synthesis_date", today);
      });
  }, [whoopData, planBlocks]);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    (async () => {
      setCoachBriefLoading(true);
      try {
        const ctx = buildMorningBriefApiContext({
          planBlocks,
          whoopData,
          profile,
          garminActivities,
          unifiedMetrics,
          stravaConnected,
          stravaWeeklyZ2Minutes,
        });
        const res = await fetch("/api/synthesis/morning", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode: "brief",
            recovery: ctx.recovery,
            hrv: ctx.hrv,
            sleep: ctx.sleep,
            rhr: ctx.rhr,
            todaySession: typeof ctx.todaySession === "string" ? ctx.todaySession.split("\n")[0] : ctx.todaySession,
            tomorrowSession: typeof ctx.tomorrowSession === "string" ? ctx.tomorrowSession.split("\n")[0] : ctx.tomorrowSession,
            weekNum: ctx.weekNum,
            phase: ctx.phase,
            daysToRace: ctx.daysToRace,
            weeklyZ2Minutes: ctx.weeklyZ2Minutes,
            complianceThisWeek: ctx.complianceThisWeek,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setCoachBrief(typeof data.brief === "string" ? data.brief : "");
        }
      } catch {
        if (!cancelled) setCoachBrief("");
      } finally {
        if (!cancelled) setCoachBriefLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    session?.access_token,
    planBlocks,
    whoopData,
    profile,
    garminActivities,
    unifiedMetrics,
    stravaConnected,
    stravaWeeklyZ2Minutes,
  ]);

  // Proactive Coaching: check HRV trend + Sunday weekly review
  useEffect(() => {
    if (!whoopData || !session?.access_token) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("proactive_date") === today) return;

    const checkProactive = async () => {
      const msgs = [];
      const hrvRaw = whoopData?.recovery?.hrv_rmssd_milli ?? whoopData?.recovery?.hrv;
      const hrv = hrvRaw != null && Number.isFinite(Number(hrvRaw)) ? Math.round(Number(hrvRaw)) : null;
      if (hrv != null) {
        const storedHrvs = JSON.parse(localStorage.getItem("hrv_history") || "[]");
        storedHrvs.push({ date: today, value: hrv });
        const recent = storedHrvs.slice(-7);
        localStorage.setItem("hrv_history", JSON.stringify(recent));

        if (recent.length >= 3) {
          const last3 = recent.slice(-3).map(h => h.value);
          const declining = last3.every((v, i) => i === 0 || v < last3[i - 1]);
          if (declining) {
            try {
              const res = await fetch("/api/coaching/proactive", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
                body: JSON.stringify({ type: "hrv_trend", hrv_values: last3 }),
              });
              const data = await res.json();
              if (data.messages?.length) msgs.push(...data.messages);
            } catch (_) {}
          }
        }
      }

      if (new Date().getDay() === 0) {
        try {
          const currentWeekDays = (planBlocks[0]?.weeks?.[0]?.days) || [];
          const planned = currentWeekDays.filter(d => d.am).length;
          const completed = currentWeekDays.filter(d => {
            const dd = d.date?.split(" ")[0];
            return garminActivities.some(a => a.start_time?.startsWith(dd || "___"));
          }).length;
          const res = await fetch("/api/coaching/proactive", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
            body: JSON.stringify({
              type: "weekly_review",
              week_summary: {
                recovery: whoopData?.recovery?.score,
                hrv: whoopData?.recovery?.hrv_rmssd_milli ?? whoopData?.recovery?.hrv ?? null,
                strain: whoopData?.strain?.score,
                sleep: whoopData?.sleep?.score,
                sessions_planned: planned,
                sessions_completed: completed,
                compliance: planned > 0 ? Math.round((completed/planned)*100) : 0,
                activities: garminActivities.slice(0, 7).map(a => ({ type: a.activity_type, distance: a.distance_meters, duration: a.duration_seconds, name: a.name })),
              },
            }),
          });
          const data = await res.json();
          if (data.messages?.length) {
            const reviewMsg = data.messages.find(m => m.content);
            if (reviewMsg) setWeeklyReview(reviewMsg.content);
            msgs.push(...data.messages);
          }
        } catch (_) {}
      }

      localStorage.setItem("proactive_date", today);
      if (msgs.length > 0) {
        setProactiveMessages(msgs);
        setProactiveBadge(msgs.length);
      }
    };

    checkProactive();
  }, [whoopData]);

  const labSend = async (msg) => {
    if (!msg?.trim() || labLoading) return;
    setLabMessages(prev => [...prev, { role:"user", content:msg }]);
    setLabInput("");
    setLabLoading(true);
    try {
      const week = (planBlocks[0]?.weeks || [])[0];
      const scenarioCtx = scenarioChanges.length > 0
        ? `\n\nALREADY ACCEPTED IN THIS SESSION:\n${scenarioChanges.map((c,i) => `${i+1}. ${c.description}`).join("\n")}\nBuild on top of these. Do not contradict them.`
        : "";
      const res = await fetch("/api/coach/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          message: `[SCENARIO MODE] ${msg}${scenarioCtx}\n\nRespond with a full plan adjustment proposal. Include a <plan_change> block if applicable.`,
          whoopData,
          currentWeek: week ? { id:week.id, label:week.label, subtitle:week.subtitle } : null,
          recentActivities: garminActivities.slice(0,3),
          scenarioChanges: scenarioChanges.length > 0 ? scenarioChanges : undefined,
          session_id: labSessionId,
        }),
      });
      const data = await res.json();
      if (data.planChange?.day) {
        const wk = week?.label?.split("·")[1]?.trim() || week?.label || "";
        setLabContext(`${wk} · ${data.planChange.day}`);
        setLabTargetDay(data.planChange.day);
      }
      const cqs = parseClarifyingQuestions(data.message);
      setLabMessages(prev => [...prev, { role:"assistant", content:data.message, planChange:data.planChange, clarifyingQuestions:cqs }]);
    } catch (e) {
      setLabMessages(prev => [...prev, { role:"assistant", content:"Connection error. Try again." }]);
    } finally {
      setLabLoading(false);
    }
  };

  const handleLabAccept = (planChange) => {
    setScenarioChanges(prev => [...prev, planChange]);
    setLabMessages(prev => prev.map(m => m.planChange === planChange ? { ...m, planChangeAccepted:true } : m));
  };

  const labApplyAll = async () => {
    try {
      for (const change of scenarioChanges) {
        await handlePlanChange(change);
      }
    } catch (e) {
      setLabToast(e?.message || "Failed to apply queued changes — tap to retry");
      setTimeout(() => setLabToast(null), 5000);
      return;
    }
    setScenarioChanges([]);
    setLabMessages([]);
    setShowLabReview(false);
    setLabOpen(false);
  };

  const labDiscard = () => {
    setScenarioChanges([]);
    setLabMessages([]);
    setCqSelections({});
    setLabAnsweredQuestions({});
    setShowLabReview(false);
    setLabOpen(false);
  };

  const labClose = () => {
    setLabOpen(false);
    setLabTargetDay(null);
    if (scenarioChanges.length > 0) {
      setLabToast(`${scenarioChanges.length} change${scenarioChanges.length>1?"s":""} saved in queue — tap to review`);
      setTimeout(() => setLabToast(null), 5000);
    }
  };

  const handlePlanChange = async (planChange) => {
    const token = session?.access_token;
    const normalizeWeekKey = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const resolveActualWeekCount = (weeksUpdated, expectedWeekRef) => {
      const expectedNorm = normalizeWeekKey(expectedWeekRef);
      for (const [actualWeekRef, actualCount] of Object.entries(weeksUpdated || {})) {
        const actualNorm = normalizeWeekKey(actualWeekRef);
        if (!actualNorm) continue;
        if (actualNorm === expectedNorm || actualNorm.includes(expectedNorm) || expectedNorm.includes(actualNorm)) {
          return Number(actualCount) || 0;
        }
      }
      return 0;
    };
    try {
      if (planChange.type === "add_supplement") {
        console.log("[handlePlanChange] add_supplement:", JSON.stringify(planChange));
        const res = await fetch("/api/supplements/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(planChange),
        });
        const body = await res.json().catch(() => ({}));
        console.log("[handlePlanChange] supplement update status:", res.status, "| body:", JSON.stringify(body));
        if (!res.ok) throw new Error(body.error || "Supplement update failed — tap to retry");
        if (res.ok) await fetchSupplements();
        return { modifiedCount: 1 };
      }

      // modify_day — existing plan update logic
      console.log("[handlePlanChange] sending:", JSON.stringify(planChange));
      console.log("[handlePlanChange] token present:", !!token, "| token prefix:", token?.slice(0,20));
      const res = await fetch("/api/plan/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(planChange),
      });
      const body = await res.json().catch(() => ({}));
      console.log("[handlePlanChange] update status:", res.status, "| body:", JSON.stringify(body));

      if (!res.ok) throw new Error(body.error || "Plan update failed — tap to retry");

      let modifiedCount = 0;
      let confirmedWeeksUpdated = null;
      if (planChange.type === "remap_week") {
        const expectedWeekCounts = {};
        const fallbackWeekRef = planChange.week_id || "CURRENT WEEK";
        for (const dayChange of (planChange.days || [])) {
          const targetWeekRef = dayChange?.week_id || fallbackWeekRef;
          expectedWeekCounts[targetWeekRef] = (expectedWeekCounts[targetWeekRef] || 0) + 1;
        }

        const weeksUpdated = body.weeks_updated || {};
        confirmedWeeksUpdated = weeksUpdated;
        for (const [weekRef, expectedCount] of Object.entries(expectedWeekCounts)) {
          const actualCount = resolveActualWeekCount(weeksUpdated, weekRef);
          if (actualCount === 0) {
            throw new Error(`Week ${weekRef} failed to update — tap to retry`);
          }
          if (actualCount !== expectedCount) {
            throw new Error(`Week ${weekRef} updated ${actualCount}/${expectedCount} sessions — tap to retry`);
          }
          modifiedCount += actualCount;
        }

        if (typeof body.total === "number" && body.total !== modifiedCount) {
          throw new Error("Write confirmation mismatch — tap to retry");
        }
      } else {
        modifiedCount = Array.isArray(body.updated) ? body.updated.length : 0;
        if (modifiedCount === 0) {
          throw new Error(`Week ${planChange.week_id || "selected week"} failed to update — tap to retry`);
        }
      }

      console.log("[handlePlanChange] update confirmed — calling fetchPlan");
      await fetchPlan(token);
      console.log("[handlePlanChange] fetchPlan complete");
      return { modifiedCount, weeksUpdated: confirmedWeeksUpdated };
    } catch (e) {
      console.log("[handlePlanChange] caught error:", e.message);
      throw e;
    }
  };

  const handlePersonaChange = async (newPersona) => {
    setCoachPersona(newPersona);
    try {
      await supabase
        .from("user_profiles")
        .update({ coach_persona: newPersona })
        .eq("user_id", session.user.id);
    } catch (_) {}
  };

  const handleBloodworkUpload = async (file) => {
    if (!file || !session?.access_token) return;
    setBloodworkUploading(true);
    setBloodworkResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(",")[1];
        const res = await fetch("/api/bloodwork/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            attachment: { data: base64, media_type: file.type, name: file.name },
          }),
        });
        const data = await res.json();
        setBloodworkResult(data);
        if (data.inserted) fetchBiomarkers();
        setBloodworkUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setBloodworkResult({ error: e.message });
      setBloodworkUploading(false);
    }
  };

  // ── Cinematic splash — after all hooks, before auth routing ───────────────
  if (!splashDone) return <SplashScreen phase={splashPhase} />;

  // ── Auth routing — must come after all hooks ───────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: C.fs, maxWidth: 480, margin: "0 auto", padding: "16px 16px 88px" }}>
        <div style={{ fontFamily: C.fm, fontSize: 8, color: C.muted, letterSpacing: 3, textTransform: "uppercase" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div style={{ fontSize: 22, letterSpacing: "-0.5px", marginTop: 4 }}>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>The </span>
          <em style={{ fontFamily: "'DM Serif Display',serif", fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.5)" }}>Lab</em>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>.</span>
        </div>
        <div style={{ height: 1, background: DS.divider, marginTop: 12, marginBottom: 16 }} />
        <div style={{ display: "grid", gap: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ borderRadius: C.radius, padding: "18px 20px", background: C.card, border: `1px solid ${C.border}`, ...C.glass }}>
              <div className="shimmer" style={{ fontFamily: C.ff, fontWeight: 700, fontSize: 16, letterSpacing: 3 }}>LOADING</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!session) return <AuthScreen supabase={supabase} />;

  if (!profile) {
    if (profileBootstrapError) {
      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: C.fs, maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
          <div style={{ fontFamily: C.fm, fontSize: 10, color: C.red, marginBottom: 12 }}>PROFILE SETUP</div>
          <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 16 }}>{profileBootstrapError}</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.card,
              color: C.text,
              cursor: "pointer",
              fontFamily: C.fs,
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: C.fs, maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ fontFamily: C.fm, fontSize: 10, color: C.muted, letterSpacing: 2 }}>LOADING</div>
        <div style={{ fontSize: 15, marginTop: 8, color: "rgba(255,255,255,0.5)" }}>Setting up your profile…</div>
      </div>
    );
  }
  if (profile && !profile.onboarding_completed) {
    return (
      <OnboardingFlow
        profile={profile}
        supabase={supabase}
        user={session.user}
        onProfileRefresh={refreshProfile}
        onComplete={async () => {
          dataFetched.current = false;
          await refreshProfile();
        }}
      />
    );
  }

  const sortedBlocks = [...planBlocks].sort(
    (a, b) => Number(a?.order ?? Number.MAX_SAFE_INTEGER) - Number(b?.order ?? Number.MAX_SAFE_INTEGER)
  );
  const block   = sortedBlocks.find(b => b.id === blockId) || sortedBlocks[0] || null;
  const weeks   = block?.weeks || [];
  const week    = weeks.find(w => w.id === weekId) || weeks[0] || null;
  const weekDays = week?.days || [];
  const todayDateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const isCurrentRealWeek = weekDays.some((d) => (d?.date || "").trim() === todayDateLabel);
  const defaultSelectedDay = weekDays.length
    ? (isCurrentRealWeek
      ? (weekDays.find((d) => (d?.date || "").trim() === todayDateLabel)?.day || weekDays[0]?.day)
      : weekDays[0]?.day)
    : null;
  const selectedDayKey = selDay || defaultSelectedDay;
  const dayData = selectedDayKey ? (weekDays.find((d) => d.day === selectedDayKey) || null) : null;
  const phaseColor = SPECIAL_BLOCK_ACCENTS[block?.id] || C.green;

  const getSundayWo = (wid) => {
    const c = sundayChoice[wid];
    return c === "mobility" ? "SUNDAY — Mobility Protocol" : c === "plyo" ? "SUNDAY — Plyo & Core" : null;
  };
  const getEffAm = (d) => d.isSunday ? getSundayWo(weekId) : d.am;
  const getSessionNameForDay = (d, slot = "am") => (slot === "am" ? getEffAm(d) : d?.pm);
  const getDayDateKey = (d) => d?.date?.split(" ")[0] || "";
  const isDayCompleted = (d) => {
    const dayDateKey = getDayDateKey(d);
    if (!dayDateKey) return false;
    return garminActivities.some((a) => a.start_time?.startsWith(dayDateKey));
  };
  const deriveSessionMeta = (sessionName, dayRow) => {
    const key = resolveSessionKey(sessionName, dayRow);
    const color = SESSION_COLORS[key] || C.light;
    const icon = SESSION_ICONS[key] || "•";
    const tag = dayRow?.isRaceDay ? "RACE" : (sessionName ? getTypeLabel(sessionName).toUpperCase() : "REST");
    const label = dayRow?.isRaceDay
      ? "Race Day"
      : sessionName
        ? (String(sessionName).split(" — ")[1] || String(sessionName))
        : "Rest / Open";
    return { key, color, icon, emoji: icon, tag, label };
  };

  const getCardLabel = (d) => {
    const customText = d?.am_session_custom || d?.pm_session_custom || "";
    if (customText) {
      const lines = customText.split("\n").filter((l) => l.trim());
      return lines[0]?.slice(0, 20) || "SESSION";
    }
    return getTypeLabel(d?.am || d?.am_session || d?.pm || d?.pm_session) || "SESSION";
  };

  const getCardTag = (d) => {
    const customText = d?.am_session_custom || d?.pm_session_custom || "";
    if (customText) {
      const label = customText.split("\n")[0] || "";
      if (label.toLowerCase().includes("hyrox")) return "HYROX";
      if (label.toLowerCase().includes("z2") || label.toLowerCase().includes("zone 2")) return "Z2";
      if (label.toLowerCase().includes("upper") || label.toLowerCase().includes("lift")) return "STRENGTH";
      if (label.toLowerCase().includes("run")) return "RUN";
      if (label.toLowerCase().includes("threshold")) return "THRESHOLD";
      if (label.toLowerCase().includes("track")) return "TRACK";
      return label.split(" ").slice(0, 2).join(" ").toUpperCase();
    }
    return getTypeLabel(d?.am || d?.am_session || d?.pm || d?.pm_session) || "SESSION";
  };

  const getStructureLabel = (d) => {
    const customText = d?.am_session_custom || d?.pm_session_custom || "";
    if (customText) {
      return customText.split("\n")[0] || "SESSION";
    }
    return getTypeLabel(d?.am || d?.am_session || d?.pm || d?.pm_session) || "REST";
  };

  const selectedSessionName = dayData ? getSessionNameForDay(dayData, sess) : null;
  const selectedWorkout = selectedSessionName ? WL[selectedSessionName] : null;
  const selectedMeta = deriveSessionMeta(selectedSessionName, dayData);
  const detailTitle = dayData?.am_session_custom?.split("\n")[0] || selectedMeta?.label || "SESSION";
  const selectedCustomContent = sess === "am" ? dayData?.am_session_custom : dayData?.pm_session_custom;
  const selectedShowCustom = !!(selectedCustomContent && dayData?.ai_modified);
  const selectedCanViewWorkout = !!(dayData?.isRaceDay || selectedShowCustom || selectedWorkout);
  const selectedCoachingNote = dayData?.ai_modification_note || dayData?.note2a || dayData?.note || selectedWorkout?.note || "";
  const selectedKeyPoints = selectedWorkout?.steps?.filter((s) => !s.startsWith("—")).slice(0, 5) || [];
  const selectedWhoopRule = dayData?.note || "Execute as programmed.";
  const selectedWhoopGate = whoopLabel(whoopData?.recovery?.score ?? 0);
  const selectedDayName = dayData?.day || selectedDayKey || "";

  const weeklyAiAdjustments = (week?.days || [])
    .filter((d) => d?.ai_modified === true)
    .map((d) => ({
      day: d.day,
      summary: d.ai_modification_note || "Session details were adjusted based on your latest context.",
      session: getSessionNameForDay(d, "am") || d.pm || "Session",
    }));

  const todayLocal = getDeviceLocalTodayYmd();
  const intervalsTodayMetric = unifiedMetrics?.find(
    (m) => m?.source === "intervals" && String(m?.date || "").slice(0, 10) === todayLocal
  );

  const intervalsNum = (row, key) => {
    if (!row || row[key] == null || row[key] === "") return null;
    const n = Number(row[key]);
    return Number.isFinite(n) ? n : null;
  };

  const rec = intervalsNum(intervalsTodayMetric, "recovery_score")
    ?? Number(whoopData?.recovery?.score ?? 0);
  const whoopHrvMilli = whoopData?.recovery?.hrv_rmssd_milli ?? whoopData?.recovery?.hrv;
  const whoopHrvRounded =
    whoopHrvMilli != null && Number.isFinite(Number(whoopHrvMilli)) ? Math.round(Number(whoopHrvMilli)) : null;
  const hrv = intervalsNum(intervalsTodayMetric, "hrv") ?? whoopHrvRounded;
  const whoopRhrRaw = whoopData?.recovery?.resting_heart_rate ?? whoopData?.recovery?.rhr;
  const whoopRhrRounded =
    whoopRhrRaw != null && Number.isFinite(Number(whoopRhrRaw)) ? Math.round(Number(whoopRhrRaw)) : null;
  const rhr = intervalsNum(intervalsTodayMetric, "rhr") ?? whoopRhrRounded;
  const sleepHoursRaw = intervalsNum(intervalsTodayMetric, "sleep_hours");
  const sleepHours = sleepHoursRaw != null && sleepHoursRaw > 0
    ? Math.round(sleepHoursRaw * 10) / 10
    : Number(whoopData?.sleep?.hours ?? 0);
  const sleepEff   = whoopData?.sleep?.efficiency ?? 0;

  const todayDayNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const todayDayName  = todayDayNames[new Date().getDay()];
  const flaggedBio = biomarkers.filter(b => b.flag === "HIGH" || b.flag === "LOW");
  const noPlanLoaded = !planLoading && planBlocks.length === 0;
  const planBuilderDismissed = noPlanLoaded && planBuilderDismissUntil > 0 && (Date.now() - planBuilderDismissUntil) < (24 * 60 * 60 * 1000);
  const showNoPlanState = noPlanLoaded && !planBuilderDismissed;

  const dismissPlanBuilderFor24h = () => {
    const until = Date.now() + (24 * 60 * 60 * 1000);
    setPlanBuilderDismissUntil(until);
    localStorage.setItem(PLAN_BUILDER_DISMISS_KEY, String(until));
    localStorage.setItem("plan_builder_dismissed", String(Date.now()));
  };

  const openPlanBuilder = () => {
    setPlanBuilderOpen(true);
  };

  const NoPlanState = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontFamily: C.ff, fontSize: 28, letterSpacing: 3, color: C.muted, marginBottom: 8 }}>
          NO TRAINING PLAN FOUND<span style={{ color: C.red }}>.</span>
        </div>
        <div style={{ fontFamily: C.fm, fontSize: 9, color: C.light, letterSpacing: 2, lineHeight: 1.8, marginBottom: 16 }}>
          Build your personalized training structure now, or dismiss this reminder for 24 hours.
        </div>
        <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={openPlanBuilder}
            style={{
              padding: "12px 14px",
              background: DS.gold,
              color: "#1a0f06",
              border: "none",
              borderRadius: C.radius,
              cursor: "pointer",
              fontFamily: C.ff,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            BUILD MY PLAN
          </button>
          <button
            onClick={dismissPlanBuilderFor24h}
            style={{
              padding: "10px 12px",
              background: "transparent",
              color: C.muted,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: C.fm,
              fontSize: 10,
              letterSpacing: 2,
            }}
          >
            I'LL DO IT LATER
          </button>
        </div>
      </div>
    );
  };

  const PlanNoPlanScaffold = () => (
    <div>
      <div style={{ padding:"16px 20px 10px" }}>
        <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3, marginBottom:10 }}>TRAINING BLOCK</div>
        <div style={{ display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none" }}>
          <button style={{ flexShrink:0, padding:"8px 16px", background:C.card, color:C.cyan, border:"none", borderBottom:`2px solid ${C.cyan}`, borderRadius:0, cursor:"default", fontFamily:C.ff, fontSize:12, letterSpacing:2 }}>
            NO BLOCKS YET
          </button>
        </div>
      </div>
      <div style={{ display:"flex", overflowX:"auto", scrollbarWidth:"none", borderBottom:`1px solid ${C.border}`, paddingLeft:20 }}>
        {["WEEK 1","WEEK 2","WEEK 3","WEEK 4"].map((w) => (
          <button key={w} style={{ flexShrink:0, padding:"10px 14px", background:"transparent", color:C.muted, border:"none", borderBottom:"2px solid transparent", cursor:"default", fontFamily:C.fm, fontSize:7, letterSpacing:2, whiteSpace:"nowrap" }}>
            {w}
          </button>
        ))}
      </div>
      {showNoPlanState ? <NoPlanState /> : null}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:C.fs, maxWidth:480, margin:"0 auto", paddingBottom:88 }}>
      <TodayDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerSection("menu");
        }}
        section={drawerSection}
        setSection={setDrawerSection}
        profile={profile}
        setProfile={setProfile}
        session={session}
        supabase={supabase}
        whoopConnected={whoopConnected}
        garminConnected={garminConnected}
        stravaConnected={stravaConnected}
      />

      {showEntrance && (
        <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(15,8,0,0.94)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", animation:"entrance-fade 2.8s ease forwards", backdropFilter:"blur(8px)" }}>
          <div style={{ fontSize:64, color:DS.gold, animation:"entrance-scale 1s cubic-bezier(.175,.885,.32,1.275) forwards", transform:"scale(0)" }}>△</div>
          <div style={{ fontFamily:C.fm, fontSize:10, color:DS.gold, letterSpacing:6, marginTop:20, opacity:0, animation:"entrance-text 0.8s ease 0.6s forwards" }}>THE LAB · HYBRID PERFORMANCE</div>
          <style>{`
            @keyframes entrance-scale { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.1);opacity:1} 100%{transform:scale(1);opacity:1} }
            @keyframes entrance-text { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
            @keyframes entrance-fade { 0%,70%{opacity:1} 100%{opacity:0;pointer-events:none} }
          `}</style>
        </div>
      )}

      {nav === "today" && showNoPlanState && <NoPlanState />}

      {nav === "today" && (() => {
        const perfHdr = derivePerfPlanHeader(planBlocks);
        const TARGET_Z2_MIN = 240;
        const formatMinutesLabel = (mins) => {
          const safe = Math.max(0, Number(mins || 0));
          const hours = Math.floor(safe / 60);
          const minutes = safe % 60;
          return `${hours}h ${String(minutes).padStart(2, "0")}min`;
        };
        const todayDateIso = getDeviceLocalTodayYmd();
        const PLAN_YEAR = parseInt(String(todayDateIso || "").slice(0, 4), 10) || 2026;
        const allPlanEntries = planBlocks
          .flatMap((b) => (b?.weeks || []).map((w) => ({ block: b, week: w })))
          .flatMap(({ block, week }) => (week?.days || []).map((day) => ({ block, week, day })));
        const dayLabelToIso = (label) => {
          if (!label) return null;
          const parsed = new Date(`${String(label).trim()} ${PLAN_YEAR}`);
          if (Number.isNaN(parsed.getTime())) return null;
          return formatLocalYmd(parsed);
        };
        const tomorrowDateIso = getDeviceLocalTomorrowYmd();
        const todayEntry = allPlanEntries.find(({ day }) => dayLabelToIso(day?.date || day?.date_label) === todayDateIso) || null;
        const tomorrowEntry = allPlanEntries.find(({ day }) => dayLabelToIso(day?.date || day?.date_label) === tomorrowDateIso) || null;
        const todayCardData = todayEntry?.day || null;
        const todaySessionName = todayCardData ? getSessionNameForDay(todayCardData, "am") : null;
        const todaySessionKey = todayCardData?.am_session || todayCardData?.am;
        const todaySessionLabel = todayCardData?.am_session_custom?.split("\n")[0]
          || WL[todaySessionKey]?.title
          || todaySessionKey
          || "REST DAY";
        const todayCoachingNote = todayCardData?.note || todayCardData?.note2a || todayCardData?.am_session_custom?.split("\n").slice(1).join(" ") || "";
        const hasTodaySession = !!(todaySessionName || todayCardData?.am_session_custom || todaySessionKey);
        const todayMeta = deriveSessionMeta(todaySessionName, todayCardData);
        const todayWorkout = todaySessionName ? WL[todaySessionName] : null;
        const zoneByKey = {
          hyrox: { zone: "RACE PACE", hr: "150-170 BPM" },
          strength: { zone: "POWER", hr: "N/A" },
          zone2: { zone: "Z2", hr: "132-151 BPM" },
          threshold: { zone: "Z4", hr: "150-168 BPM" },
          tempo: { zone: "Z3-Z4", hr: "147-168 BPM" },
          recovery: { zone: "Z1-Z2", hr: "<132 BPM" },
          race: { zone: "RACE", hr: "VARIABLE" },
          rest: { zone: "REST", hr: "N/A" },
        };
        const todayZone = zoneByKey[todayMeta.key] || zoneByKey.rest;
        const todayDuration = todayWorkout?.duration || "—";

        const tomorrowDayData = tomorrowEntry?.day || null;
        const tomorrowSessionName = tomorrowDayData ? getSessionNameForDay(tomorrowDayData, "am") : null;
        const tomorrowSessionKey = tomorrowDayData?.am_session || tomorrowDayData?.am;
        const tomorrowSessionLabel = tomorrowDayData?.am_session_custom?.split("\n")[0]
          || WL[tomorrowSessionKey]?.title
          || tomorrowSessionKey
          || "REST DAY";
        const tomorrowMeta = deriveSessionMeta(tomorrowSessionName, tomorrowDayData);
        const tomorrowWorkout = tomorrowSessionName ? WL[tomorrowSessionName] : null;
        const tomorrowDuration = tomorrowWorkout?.duration || "—";

        const racesList = Array.isArray(profile?.races) ? profile.races : [];
        const primaryRace = racesList.find((r) => r?.is_primary && r?.date) || racesList.find((r) => r?.date) || null;
        const raceName = primaryRace?.name || profile?.target_race_name || null;
        const raceDate = primaryRace?.date || profile?.target_race_date || null;
        const hasRaceCountdown = !!(raceName && raceDate);
        const raceDateObj = raceDate ? new Date(`${raceDate}T00:00:00`) : null;
        const todayDateObj = new Date();
        const todayStart = new Date(todayDateObj.getFullYear(), todayDateObj.getMonth(), todayDateObj.getDate());
        const daysAway = raceDateObj ? Math.max(0, Math.ceil((raceDateObj.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))) : null;

        const gateUpper = whoopLabel(Number(rec) || 0);
        const recoveryBadge =
          gateUpper === "GREEN"
            ? { bg: "rgba(93,255,160,0.12)", border: "1px solid rgba(93,255,160,0.2)", fg: DS.green }
            : gateUpper === "YELLOW"
              ? { bg: "rgba(255,209,102,0.14)", border: "1px solid rgba(255,209,102,0.28)", fg: DS.yellow }
              : { bg: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.22)", fg: DS.red };
        const hrvDisp =
          Number.isFinite(hrv) && hrv > 0 ? `${Math.round(hrv)}ms` : "—";
        const rhrDisp =
          Number.isFinite(rhr) && rhr > 0 ? `${Math.round(rhr)}bpm` : "—";
        const sleepDisp =
          sleepHours > 0 ? `${sleepHours}hr` : "—";
        const recDisp =
          !Number.isFinite(Number(rec)) || Number(rec) <= 0
            ? "—"
            : String(Math.round(Number(rec)));
        const sessionStructure =
          (todayWorkout?.steps || [])
            .filter((s) => s && !String(s).startsWith("—"))
            .slice(0, 3)
            .map((s) => String(s).replace(/^[•\d.)\s-]+/, "").trim())
            .filter(Boolean)
            .join(" · ")
          || (todaySessionName && String(todaySessionName).includes(" — ")
            ? String(todaySessionName).split(" — ").slice(1).join(" · ")
            : `${todayZone.zone} · ${todayZone.hr}`);
        const tomorrowStructure =
          (tomorrowWorkout?.steps || [])
            .filter((s) => s && !String(s).startsWith("—"))
            .slice(0, 2)
            .map((s) => String(s).replace(/^[•\d.)\s-]+/, "").trim())
            .filter(Boolean)
            .join(" · ")
          || String(tomorrowDuration || "—");
        const gateWord = gateUpper.charAt(0) + gateUpper.slice(1).toLowerCase();
        const phaseNameHdr = perfHdr?.currentPhase || "Training";
        const currentWeekNum = perfHdr?.currentWeekNum ?? 1;
        const currentPhaseName = perfHdr?.currentPhase || "Training";
        const currentWeekDaysStrip = todayEntry?.week?.days || [];
        const weeklyZ2Minutes = stravaConnected
          ? Math.max(0, Math.round(Number(stravaWeeklyZ2Minutes ?? 0)))
          : 0;
        const z2HeaderDone = !stravaConnected
          ? "0"
          : stravaWeeklyZ2Loading && stravaWeeklyZ2Minutes == null
            ? "…"
            : String(Math.round(weeklyZ2Minutes));
        const isWeekDayDoneStrip = (d) => {
          const iso = dayLabelToIso(d?.date || d?.date_label);
          if (!iso) return false;
          if (d?.completed === true || d?.done === true || d?.manual_complete === true) return true;
          if (Array.isArray(garminActivities) && garminActivities.some((a) => String(a?.start_time || "").slice(0, 10) === iso)) return true;
          return unifiedMetrics.some(
            (m) =>
              m?.source === "intervals"
              && m?.date === iso
              && Number(m?.training_load ?? m?.strain ?? m?.active_calories ?? m?.steps ?? 0) > 0
          );
        };
        const daysCompletedThisWeek = currentWeekDaysStrip.filter(isWeekDayDoneStrip).length;
        const raceDateStr = raceDate
          ? new Date(`${raceDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "";
        const raceTypeLabel = String(raceName || "").toLowerCase().includes("double")
          ? "Doubles"
          : String(raceName || "").toLowerCase().includes("solo")
            ? "Solo"
            : "Race";

        const totalPlanWeeksRaw = planBlocks.reduce(
          (sum, b) => sum + (Array.isArray(b?.weeks) ? b.weeks.length : 0),
          0,
        );
        const totalPlanWeeks = totalPlanWeeksRaw > 0 ? totalPlanWeeksRaw : 22;
        const raceCityShort = /dc|washington/i.test(String(raceName || ""))
          ? "DC"
          : (String(raceName || "").trim().split(/\s+/).filter(Boolean).pop() || "race");

        const sleepStages = whoopData?.sleep?.stage_summary;
        const sleepStageMs = sleepStages && typeof sleepStages === "object"
          ? {
            awake: Number(sleepStages.total_awake_time_milli || sleepStages.awake_time_milli || 0),
            rem: Number(sleepStages.total_rem_sleep_time_milli || sleepStages.rem_sleep_time_milli || 0),
            light: Number(sleepStages.total_light_sleep_time_milli || sleepStages.light_sleep_time_milli || 0),
            deep: Number(sleepStages.total_slow_wave_sleep_time_milli || sleepStages.slow_wave_sleep_time_milli || 0),
          }
          : null;
        const sleepStageTotal = sleepStageMs
          ? sleepStageMs.awake + sleepStageMs.rem + sleepStageMs.light + sleepStageMs.deep
          : 0;
        const showSleepStageBar = sleepStageTotal > 0;
        const fmtStageMin = (ms) => {
          const m = Math.round(Number(ms || 0) / 60000);
          const h = Math.floor(m / 60);
          const r = m % 60;
          return h > 0 ? `${h}h ${r}m` : `${r}m`;
        };
        const inBedMs = Number(whoopData?.sleep?.total_in_bed_time_milli || 0)
          || (Number(whoopData?.sleep?.hours || 0) > 0 ? Math.round(Number(whoopData.sleep.hours) * 3600000) : 0);
        const sleepHoursDisp = inBedMs > 0 ? Math.floor(inBedMs / 3600000) : 0;
        const sleepMinsDisp = inBedMs > 0 ? Math.floor((inBedMs % 3600000) / 60000) : 0;
        const openConnectionsDrawer = () => {
          setDrawerSection("connections");
          setDrawerOpen(true);
        };
        const connectedSources = profile?.connected_sources || {};
        const recoveryLastSync = dataSources.primaryRecoverySource === "WHOOP"
          ? connectedSources?.whoop?.last_sync
          : dataSources.primaryRecoverySource === "Oura"
            ? connectedSources?.oura?.last_sync
            : connectedSources?.garmin?.last_sync;
        const activityLastSync = dataSources.primaryActivitySource === "Garmin"
          ? connectedSources?.garmin?.last_sync
          : dataSources.primaryActivitySource === "Strava"
            ? connectedSources?.strava?.last_sync
            : connectedSources?.apple_health?.last_sync;
        const sleepLastSync = dataSources.primarySleepSource === "Oura"
          ? connectedSources?.oura?.last_sync
          : dataSources.primarySleepSource === "WHOOP"
            ? connectedSources?.whoop?.last_sync
            : connectedSources?.garmin?.last_sync || connectedSources?.apple_health?.last_sync;

        return (
          <div style={{ padding: "12px 16px 20px", display: "flex", flexDirection: "column", gap: 14, overflowX: "hidden" }}>
            <div style={{ position: "relative", marginBottom: 24, paddingTop: 8, minHeight: 40 }}>
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => {
                  setDrawerOpen(true);
                  setDrawerSection("menu");
                }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                }}
              >
                <span style={{ width: 22, height: 2, background: "rgba(255,255,255,0.35)", display: "block", borderRadius: 2 }} />
                <span style={{ width: 16, height: 2, background: "rgba(255,255,255,0.35)", display: "block", borderRadius: 2 }} />
                <span style={{ width: 22, height: 2, background: "rgba(255,255,255,0.35)", display: "block", borderRadius: 2 }} />
              </button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, lineHeight: 1, letterSpacing: "-0.5px" }}>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>The </span>
                  <em style={{ fontFamily: "'DM Serif Display',serif", fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.85)" }}>Lab</em>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>.</span>
                </div>
              </div>
            </div>
            <DailyCallCard supabase={supabase} />
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "-0.1px",
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.38)",
                  }}
                >
                  Week {currentWeekNum}/{totalPlanWeeks} ·{" "}
                </span>
                <em
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontStyle: "italic",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {currentPhaseName}
                </em>
                {daysAway != null ? (
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.28)",
                    }}
                  >
                    {" "}
                    · {daysAway} days to {raceCityShort}
                  </span>
                ) : null}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: "2.5px",
                alignItems: "center",
                marginBottom: 28,
                width: "100%",
              }}
            >
              {Array.from({ length: 56 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 1,
                    flexShrink: 0,
                    borderRadius: "0.5px",
                    height: i === daysCompletedThisWeek ? 5 : 8,
                    background:
                      i < daysCompletedThisWeek
                        ? "#C9A875"
                        : i === daysCompletedThisWeek
                          ? "rgba(201,168,117,0.35)"
                          : "#3A3530",
                    flex: 1,
                    maxWidth: 4,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 42, fontWeight: 600, color: "#fff", lineHeight: 1.05, letterSpacing: "-1.5px", marginBottom: 24, fontFamily: "'DM Sans',sans-serif" }}>
              Make{" "}
              <em style={{ fontFamily: "'DM Serif Display',serif", fontStyle: "italic", fontWeight: 400, letterSpacing: "-1.2px" }}>today</em>
              <br />
              count, {profile?.name?.split(" ")[0] || "Rafael"}.
            </div>
            {dataSources.hasRecoverySource ? (
              <div onClick={() => setRecoveryModalOpen(true)} style={{ ...creamCard, cursor: "pointer" }}>
                <div style={{ position: "absolute", top: 0, left: "5%", right: "5%", height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.9) 50%,transparent)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 130, background: "radial-gradient(ellipse at top right, rgba(255,255,255,0.4) 0%, transparent 65%)", pointerEvents: "none" }} />
                <div style={{ padding: "22px 22px 18px", position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(13,14,16,0.3)", letterSpacing: "2.5px", textTransform: "uppercase", fontFamily: C.fs }}>Recovery</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(13,14,16,0.3)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                        via {dataSources.primaryRecoverySource}
                      </div>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: syncColors[getSyncStatus(recoveryLastSync)],
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ fontFamily: C.serif, fontSize: 76, color: DS.base, lineHeight: 1, letterSpacing: "-3px", fontWeight: 400 }}>{recDisp}</div>
                    <div style={{ textAlign: "right", paddingBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: recoveryBadge.fg, marginBottom: 4, fontFamily: C.fs }}>{gateWord}</div>
                      <div style={{ fontSize: 10, color: "rgba(13,14,16,0.38)", fontFamily: C.fs }}>Execute as programmed</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", borderTop: "1px solid rgba(13,14,16,0.08)", paddingTop: 14 }}>
                    {[
                      ["HRV", hrvDisp],
                      ["RHR", rhrDisp],
                      ["Sleep", sleepDisp],
                    ].map(([lbl, val]) => (
                      <div key={lbl} style={{ flex: 1, textAlign: "center", borderRight: lbl !== "Sleep" ? "1px solid rgba(13,14,16,0.08)" : "none" }}>
                        <div style={{ fontSize: 20, fontWeight: 600, color: DS.base, letterSpacing: "-0.5px", lineHeight: 1, marginBottom: 3, fontFamily: C.fs }}>{val}</div>
                        <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(13,14,16,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: C.fs }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <ConnectPrompt
                icon="💚"
                title="Connect a recovery tracker"
                description="WHOOP, Oura, or Garmin — see your daily readiness, HRV, and resting heart rate."
                onConnect={openConnectionsDrawer}
              />
            )}

            {dataSources.hasActivitySource ? (
            <div onClick={() => setZ2ModalOpen(true)} style={{ ...glassCard, cursor: "pointer" }}>
              <div style={specularTop()} />
              <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle,rgba(210,190,155,0.10) 0%,transparent 70%)", pointerEvents: "none" }} />
              <div style={{ padding: "16px 20px 18px", position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.22)", letterSpacing: "2.5px", textTransform: "uppercase", fontFamily: C.fs }}>Weekly Z2 Time</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.18)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                        via {dataSources.primaryActivitySource}
                      </div>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: syncColors[getSyncStatus(activityLastSync)],
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: DS.gold, fontFamily: C.fs }}>{z2HeaderDone} / {TARGET_Z2_MIN} min</div>
                  </div>
                </div>
                {stravaConnected && stravaWeeklyZ2Error ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: C.fs, fontSize: 10, color: C.red }}>{stravaWeeklyZ2Error}</div>
                    <button
                      type="button"
                      onClick={fetchStravaWeeklyZ2}
                      style={{
                        marginTop: 10,
                        background: "transparent",
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        padding: "8px 12px",
                        color: C.text,
                        fontFamily: C.fs,
                        fontSize: 9,
                        cursor: "pointer",
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : null}
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 4 }}>
                  {(() => {
                    const TARGET_MIN = TARGET_Z2_MIN;
                    const DONE_MIN = weeklyZ2Minutes || 0;
                    const TOTAL_TICKS = 80;
                    const LIT_TICKS = Math.min(Math.round((DONE_MIN / TARGET_MIN) * TOTAL_TICKS), TOTAL_TICKS);
                    const TICK_WIDTH = 1;
                    const TICK_GAP = 1.8;
                    const TICK_STRIDE = TICK_WIDTH + TICK_GAP;
                    const TOTAL_WIDTH = TOTAL_TICKS * TICK_STRIDE - TICK_GAP;
                    const HOUR_TICKS = [20, 40, 60, 80];
                    const HOUR_LABELS = ["1h", "2h", "3h", "4h"];
                    return (
                      <div style={{ position: "relative", width: TOTAL_WIDTH, maxWidth: "100%", minWidth: 0 }}>
                        <div style={{ display: "flex", gap: `${TICK_GAP}px`, alignItems: "flex-end" }}>
                          {Array.from({ length: TOTAL_TICKS }).map((_, i) => {
                            const isHour = HOUR_TICKS.includes(i + 1);
                            const isLit = i < LIT_TICKS;
                            return (
                              <span
                                key={i}
                                style={{
                                  width: TICK_WIDTH,
                                  height: isHour ? 11 : 6,
                                  flexShrink: 0,
                                  borderRadius: "0.5px",
                                  background: isLit ? "#C9A875" : "rgba(58,53,48,0.9)",
                                }}
                              />
                            );
                          })}
                        </div>
                        <div style={{ position: "relative", height: 16, marginTop: 4 }}>
                          {HOUR_TICKS.map((tickIdx, i) => {
                            const leftPx = (tickIdx - 1) * TICK_STRIDE;
                            return (
                              <span
                                key={tickIdx}
                                style={{
                                  position: "absolute",
                                  left: leftPx,
                                  transform: "translateX(-50%)",
                                  fontSize: 8,
                                  fontWeight: 500,
                                  color: "rgba(255,255,255,0.18)",
                                  letterSpacing: "0.5px",
                                  whiteSpace: "nowrap",
                                  fontFamily: C.fs,
                                }}
                              >
                                {HOUR_LABELS[i]}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 14, fontFamily: C.fs }}>
                  This week{" "}
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>
                    {stravaConnected ? formatMinutesLabel(weeklyZ2Minutes) : "0min"}
                  </span>
                  {" · Target "}
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{formatMinutesLabel(TARGET_Z2_MIN)}</span>
                </div>
              </div>
            </div>
            ) : (
              <ConnectPrompt
                icon="⚡"
                title="Connect an activity tracker"
                description="Strava or Garmin — track your Zone 2 training and weekly volume automatically."
                onConnect={openConnectionsDrawer}
              />
            )}

            <div style={glassCard}>
              <div style={specularTop()} />
              <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle,rgba(210,190,155,0.10) 0%,transparent 70%)", pointerEvents: "none" }} />
              <div style={{ padding: "20px 22px", position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "2.5px", textTransform: "uppercase", fontFamily: C.fs }}>
                    Today · {todayMeta.tag}
                  </div>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: DS.green, boxShadow: "0 0 8px rgba(93,255,160,0.5)", marginTop: 2 }} />
                </div>
                <div style={{ fontSize: 21, fontWeight: 600, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.1, marginBottom: 5, fontFamily: C.fs }}>
                  {hasTodaySession ? todaySessionLabel : "Rest"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5, fontFamily: C.fs }}>
                  {sessionStructure || (hasTodaySession ? "" : "Recovery is the work.")}
                </div>
                {todayCoachingNote ? (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.45, marginTop: 6, fontFamily: C.fs }}>{todayCoachingNote}</div>
                ) : null}
                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "14px 0" }} />
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: C.fs }}>
                    Duration <strong style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{todayDuration}</strong>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: C.fs }}>
                    Zone <strong style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{todayZone.zone}</strong>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: C.fs }}>
                    Phase <strong style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{phaseNameHdr}</strong>
                  </div>
                </div>
                {hasTodaySession ? (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!todayCardData) return;
                        setNav("plan");
                        if (todayEntry?.block?.id) setBlockId(todayEntry.block.id);
                        if (todayEntry?.week?.id) setWeekId(todayEntry.week.id);
                        setSelDay(todayCardData.day);
                        setSess("am");
                      }}
                      style={{ background: "transparent", border: "none", color: DS.gold, fontFamily: C.fs, fontSize: 12, fontWeight: 600, letterSpacing: 2, cursor: "pointer" }}
                    >
                      VIEW WORKOUT →
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ ...ghostCard, padding: "16px 18px" }}>
              <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.22)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 8, fontFamily: C.fs }}>Tomorrow</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#fff", lineHeight: 1.15, fontFamily: C.fs }}>{tomorrowSessionLabel}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", marginTop: 4, fontFamily: C.fs, lineHeight: 1.4 }}>{tomorrowStructure}</div>
            </div>

            <div style={glassCard}>
              <div style={specularTop()} />
              <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle,rgba(210,190,155,0.10) 0%,transparent 70%)", pointerEvents: "none" }} />
              <div style={{ padding: "20px 22px", position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.22)", letterSpacing: "2.5px", textTransform: "uppercase", fontFamily: C.fs }}>AI Coach</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "1px", fontFamily: C.fs }}>Today&apos;s brief</div>
                </div>
                {coachBriefLoading ? (
                  <div style={{ height: 60, background: "rgba(255,255,255,0.04)", borderRadius: 10, animation: "coach-brief-pulse 2s ease-in-out infinite" }} />
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.78)", lineHeight: 1.6, letterSpacing: "-0.1px", marginBottom: 16, fontFamily: C.fs }}>
                      {coachBrief || "Your coach is reviewing your data..."}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setCoachExpandSignal((s) => s + 1)}
                        style={{ background: "rgba(201,168,117,0.1)", border: "1px solid rgba(201,168,117,0.2)", borderRadius: 20, padding: "7px 14px", fontSize: 11, fontWeight: 600, color: "#C9A875", cursor: "pointer", fontFamily: C.fs }}
                      >
                        Ask your coach ↗
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {hasRaceCountdown && (
              <div style={creamCard}>
                <div style={{ position: "absolute", top: 0, left: "5%", right: "5%", height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.85) 50%,transparent)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 130, background: "radial-gradient(ellipse at top right,rgba(255,255,255,0.35) 0%,transparent 65%)", pointerEvents: "none" }} />
                <div style={{ padding: "18px 22px", position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(13,14,16,0.3)", letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 5, fontFamily: C.fs }}>Next Race</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: DS.base, letterSpacing: "-0.3px", marginBottom: 2, fontFamily: C.fs, lineHeight: 1.2 }}>{raceName}</div>
                    <div style={{ fontSize: 10, color: "rgba(13,14,16,0.38)", fontFamily: C.fs }}>
                      {raceTypeLabel} · {raceDateStr}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: C.serif, fontSize: 48, color: DS.base, lineHeight: 1, letterSpacing: "-2px" }}>{daysAway}</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(13,14,16,0.3)", letterSpacing: "2px", textTransform: "uppercase", fontFamily: C.fs }}>Days</div>
                  </div>
                </div>
              </div>
            )}

            {dataSources.hasSleepSource ? (
              whoopData?.sleep && (inBedMs > 0 || whoopData.sleep.score > 0) ? (
                <div onClick={() => setSleepModalOpen(true)} style={{ ...glassCard, cursor: "pointer" }}>
                  <div style={specularTop()} />
                  <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle,rgba(210,190,155,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />
                  <div style={{ padding: "20px 22px 16px", position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={lbl}>{"Last Night's Sleep"}</div>
                        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 44, color: "#fff", letterSpacing: "-2px", lineHeight: 1 }}>
                          {sleepHoursDisp}
                          <span style={{ fontSize: 20 }}>h</span>
                          {" "}
                          {sleepMinsDisp}
                          <span style={{ fontSize: 20 }}>m</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", paddingTop: 8 }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.18)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                            via {dataSources.primarySleepSource}
                          </div>
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: syncColors[getSyncStatus(sleepLastSync)],
                              flexShrink: 0,
                            }}
                          />
                        </div>
                        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: "#C9A875", letterSpacing: "-1px", lineHeight: 1 }}>{whoopData.sleep.score ?? "—"}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>Score</div>
                      </div>
                    </div>
                    {showSleepStageBar ? (
                      <>
                        <div style={{ height: 8, borderRadius: 4, overflow: "hidden", display: "flex", marginBottom: 10 }}>
                          <div style={{ width: `${(sleepStageMs.awake / sleepStageTotal) * 100}%`, background: "rgba(255,255,255,0.15)", minWidth: 2 }} />
                          <div style={{ width: `${(sleepStageMs.rem / sleepStageTotal) * 100}%`, background: "#C9A875", minWidth: 2 }} />
                          <div style={{ width: `${(sleepStageMs.light / sleepStageTotal) * 100}%`, background: "rgba(201,168,117,0.4)", minWidth: 2 }} />
                          <div style={{ width: `${(sleepStageMs.deep / sleepStageTotal) * 100}%`, background: "rgba(201,168,117,0.7)", minWidth: 2 }} />
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {[
                            ["Awake", "rgba(255,255,255,0.15)", fmtStageMin(sleepStageMs.awake)],
                            ["REM", "#C9A875", fmtStageMin(sleepStageMs.rem)],
                            ["Light", "rgba(201,168,117,0.4)", fmtStageMin(sleepStageMs.light)],
                            ["Deep", "rgba(201,168,117,0.7)", fmtStageMin(sleepStageMs.deep)],
                          ].map(([label, color, time]) => (
                            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block", flexShrink: 0 }} />
                              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{label} {time}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div style={glassCard}>
                  <div style={{ padding: "18px 20px", fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                    Sleep source connected. Waiting for your latest sleep sync...
                  </div>
                </div>
              )
            ) : (
              <ConnectPrompt
                icon="🌙"
                title="Connect a sleep tracker"
                description="WHOOP, Oura, or Garmin — see your sleep quality, stages, and recovery correlation."
                onConnect={openConnectionsDrawer}
              />
            )}
          </div>
        );
      })()}

      <RecoveryDeepDive
        open={recoveryModalOpen}
        onClose={() => setRecoveryModalOpen(false)}
        supabase={supabase}
        dataSources={dataSources}
      />
      <Z2DeepDive
        open={z2ModalOpen}
        onClose={() => setZ2ModalOpen(false)}
        supabase={supabase}
        dataSources={dataSources}
      />
      <SleepDeepDive
        open={sleepModalOpen}
        onClose={() => setSleepModalOpen(false)}
        supabase={supabase}
        dataSources={dataSources}
      />

      {nav === "plan" && planLoading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
          <div style={{ fontFamily:C.ff, fontSize:16, color:C.muted, letterSpacing:4 }}>LOADING PLAN...</div>
        </div>
      )}

      {nav === "plan" && !planLoading && planBlocks.length === 0 && !planBuilderDismissed && (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontFamily: C.fm, color: C.muted, letterSpacing: 3, fontSize: 10, marginBottom: 16, textTransform: "uppercase" }}>NO TRAINING PLAN FOUND</div>
          <button
            onClick={() => setPlanBuilderOpen(true)}
            style={{ background: DS.gold, color: "#1a0f06", border: "none", borderRadius: C.radius, padding: "16px 32px", fontFamily: C.ff, fontSize: 14, fontWeight: 700, letterSpacing: 2, cursor: "pointer" }}
          >
            BUILD MY PLAN
          </button>
          <button
            type="button"
            onClick={dismissPlanBuilderFor24h}
            style={{ display: "block", margin: "16px auto 0", background: "transparent", color: C.muted, fontSize: 11, border: "none", cursor: "pointer", fontFamily: C.fm, letterSpacing: 2 }}
          >
            I&apos;ll do it later
          </button>
        </div>
      )}

      {nav === "plan" && !planLoading && planBlocks.length > 0 && (
        <div style={{ padding:"0 16px 24px", background:C.bg }}>
          <div style={{ paddingTop:16 }}>
            <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:3, textTransform:"uppercase", marginBottom:10 }}>Training Block</div>
            <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", msOverflowStyle:"none" }}>
              {sortedBlocks.map((b) => {
                const active = blockId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBlockId(b.id);
                      setWeekId(b.weeks[0].id);
                      setSelDay(null);
                    }}
                    style={{
                      flexShrink:0,
                      padding:"8px 14px",
                      cursor:"pointer",
                      fontFamily:C.fm,
                      fontSize:9,
                      letterSpacing:3,
                      textTransform:"uppercase",
                      color: active ? DS.gold : C.muted,
                      borderRadius:18,
                      border: active ? "1px solid rgba(245,240,232,0.42)" : "1px solid rgba(255,255,255,0.07)",
                      background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.022)",
                      backdropFilter:"blur(20px)",
                      WebkitBackdropFilter:"blur(20px)",
                      opacity: active ? 1 : 0.6,
                    }}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop:14, display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", msOverflowStyle:"none" }}>
            {weeks.map((w) => {
              const active = weekId === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setWeekId(w.id);
                    setSelDay(null);
                  }}
                  style={{
                    flexShrink:0,
                    padding:"8px 12px",
                    cursor:"pointer",
                    textAlign:"left",
                    minWidth:76,
                    borderRadius:18,
                    color: active ? DS.gold : C.muted,
                    border: active ? "1px solid rgba(245,240,232,0.42)" : "1px solid rgba(255,255,255,0.07)",
                    background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.022)",
                    backdropFilter:"blur(20px)",
                    WebkitBackdropFilter:"blur(20px)",
                    opacity: active ? 1 : 0.6,
                  }}
                >
                  <div style={{ fontFamily:C.fm, fontSize:9, letterSpacing:3, textTransform:"uppercase" }}>{w.label.includes("·") ? w.label.split("·")[1]?.trim() : w.label}</div>
                  <div style={{ fontFamily:C.fm, fontSize:8, color:C.light, letterSpacing:1, marginTop:2 }}>{w.dates}</div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop:16, marginBottom:16 }}>
            <div style={{ fontFamily:C.fm, fontSize:9, color:phaseColor, letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>{week.phase}</div>
            <div style={{ fontFamily:C.ff, fontSize:28, color:C.text, letterSpacing:1 }}>{week.label}</div>
            <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:1, marginTop:2 }}>{week.subtitle}</div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,minmax(0,1fr))", gap:6 }}>
            {(week?.days || []).map((d) => {
              const sessionName = getSessionNameForDay(d, "am");
              const meta = deriveSessionMeta(sessionName, d);
              const isSelected = !!dayData && dayData.day === d.day && dayData.date === d.date;
              const completed = isDayCompleted(d);
              const dateLabel = d?.date?.split(" ")[1] || d?.date || "";
              const isToday = isCurrentRealWeek && (d?.date || "").trim() === todayDateLabel;
              const cardTag = getCardTag(d);
              const displayTag = String(cardTag || "SESSION").toUpperCase().slice(0, 8);
              const isRest = !cardTag || cardTag === "REST";
              const iconMeta = getSessionIcon(d?.am, d?.am_session_custom);
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelDay(null);
                      return;
                    }
                    setSelDay(d.day);
                    setSess("am");
                  }}
                  style={{
                    ...glassCard,
                    minHeight:140,
                    marginBottom:0,
                    background:"rgba(255,255,255,0.055)",
                    border: isSelected
                      ? "1px solid rgba(245,240,232,0.45)"
                      : isToday
                        ? "1px solid rgba(201,168,117,0.4)"
                        : "1px solid rgba(255,255,255,0.13)",
                    boxShadow: isToday && !isSelected ? "0 0 22px rgba(201,168,117,0.35)" : isSelected ? "0 0 18px rgba(245,240,232,0.12)" : "none",
                    borderRadius:C.radius,
                    padding:"8px 6px",
                    display:"flex",
                    flexDirection:"column",
                    alignItems:"center",
                    gap:6,
                    cursor:"pointer",
                    opacity: completed ? 0.6 : 1,
                    position:"relative",
                    overflow:"hidden",
                  }}
                >
                  <div style={specularTop()} />
                  <div style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:3, textTransform:"uppercase" }}>{d.day}</span>
                    <span style={{ fontFamily:C.fm, fontSize:10, color:C.text }}>{dateLabel}</span>
                  </div>
                  {completed && (
                    <div style={{ position:"absolute", top:6, right:d?.ai_modified ? 20 : 6, fontSize:11, color:C.green }}>
                      ✓
                    </div>
                  )}
                  {d?.ai_modified && (
                    <div style={{ position:"absolute", top:6, right:6, fontSize:11, color:"#9b59b6" }}>
                      ✦
                    </div>
                  )}
                  <div style={{ fontSize:24, lineHeight:1, color:iconMeta.color }}>{iconMeta.icon}</div>
                  {!isRest && (
                    <div style={{ background:`${meta.color}22`, border:`1px solid ${meta.color}55`, borderRadius:4, padding:"2px 6px", fontFamily:C.fm, fontSize:7, color:meta.color, letterSpacing:2, textTransform:"uppercase", maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {displayTag}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {dayData && (
            <div
              style={{
                ...glassCard,
                marginTop: 16,
                marginBottom: 0,
                overflow: "hidden",
                maxHeight: dayData ? 520 : 0,
                opacity: dayData ? 1 : 0,
                transform: dayData ? "translateY(0)" : "translateY(-6px)",
                transition: "max-height 200ms ease, opacity 200ms ease, transform 200ms ease",
              }}
            >
              <div style={specularTop()} />
              {dayData.pm && (
                <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, position:"relative", zIndex:1 }}>
                  {[["am","AM"],["pm","PM"]].map(([s,l]) => (
                    <button
                      key={s}
                      onClick={() => setSess(s)}
                      style={{ flex:1, padding:"10px 12px", background:"transparent", border:"none", borderBottom: sess===s ? `1.5px solid ${DS.gold}` : "1.5px solid transparent", color: sess===s ? C.text : C.muted, cursor:"pointer", fontFamily:C.fm, fontSize:9, letterSpacing:3, textTransform:"uppercase" }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ padding:"14px 14px 16px", display:"flex", flexDirection:"column", gap:12, position:"relative", zIndex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontFamily:C.fm, fontSize:8, color:selectedMeta.color, letterSpacing:2, textTransform:"uppercase", background:`${selectedMeta.color}22`, border:`1px solid ${selectedMeta.color}55`, borderRadius:4, padding:"2px 8px" }}>{selectedMeta.tag}</span>
                  {dayData?.ai_modified && <span style={{ fontFamily:C.fm, fontSize:8, color:"#9b59b6", letterSpacing:2, textTransform:"uppercase" }}>✦ AI MODIFIED</span>}
                </div>

                <div style={{ fontFamily:C.ff, fontSize:24, color:C.text, lineHeight:1.1, letterSpacing:0.6 }}>
                  {detailTitle}
                </div>

                <div style={{ fontFamily:C.fs, fontSize:13, color:"#aaa", lineHeight:1.55, whiteSpace:"pre-wrap" }}>
                  {selectedCoachingNote || "Execute with controlled effort and clean transitions."}
                </div>

                <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 12px" }}>
                  <div style={{ fontFamily:C.fm, fontSize:9, color:C.cyan, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>
                    WHOOP GATE RULES · {selectedWhoopGate}
                  </div>
                  <div style={{ fontFamily:C.fs, fontSize:12, color:C.muted, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                    {selectedWhoopRule || "Green: Execute as programmed.\nYellow: Reduce 30–40% volume.\nRed: Full rest."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {weeklyAiAdjustments.length > 0 && (
            <div style={{ marginTop:16, background:"#9b59b612", border:"1px solid #9b59b655", borderRadius:16, overflow:"hidden" }}>
              <button onClick={() => setShowAiAdjustments((v) => !v)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:"transparent", border:"none", padding:"12px 14px", cursor:"pointer" }}>
                <span style={{ fontFamily:C.fm, fontSize:10, color:"#9b59b6", letterSpacing:2, textTransform:"uppercase" }}>✦ AI ADJUSTMENTS THIS WEEK</span>
                <span style={{ color:"#9b59b6", fontSize:12 }}>{showAiAdjustments ? "⌄" : "›"}</span>
              </button>
              {showAiAdjustments && (
                <div style={{ padding:"0 14px 12px", display:"flex", flexDirection:"column", gap:0 }}>
                  {weeklyAiAdjustments.map((adj, idx) => (
                    <div key={`${adj.day}_${idx}`} style={{ padding:"10px 0", borderTop: idx === 0 ? "none" : "1px solid #9b59b633" }}>
                      <div style={{ fontFamily:C.fm, fontSize:9, color:"#c6a6ff", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>{adj.day} · {adj.session}</div>
                      <div style={{ fontFamily:C.fs, fontSize:12, color:C.muted, lineHeight:1.5 }}>{adj.summary}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ ...glassCard, marginTop:16, borderRadius:16 }}>
            <div style={specularTop()} />
            <button type="button" onClick={() => setShowRecoveryGates((v) => !v)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:"transparent", border:"none", padding:"12px 14px", cursor:"pointer", position:"relative", zIndex:1 }}>
              <span style={{ fontFamily:C.fm, fontSize:10, color:C.cyan, letterSpacing:3, textTransform:"uppercase" }}>Recovery Gates</span>
              <span style={{ color:C.cyan, fontSize:12 }}>{showRecoveryGates ? "⌄" : "›"}</span>
            </button>
            {showRecoveryGates && (
              <div style={{ padding:"0 14px 12px", display:"flex", flexDirection:"column", gap:8, position:"relative", zIndex:1 }}>
                {[["GREEN",">66%",C.green,"Execute session as written."],["YELLOW","34–66%","#FFD600","Reduce intensity and shorten quality segments."],["RED","<34%",C.red,"Shift to recovery or mobility only."]].map(([gate, range, color, note]) => {
                  const active = whoopLabel(rec) === gate;
                  return (
                    <div key={gate} style={{ background:C.card2, border:`1px solid ${active ? color : C.border}`, borderRadius:10, padding:"10px 12px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <div style={{ fontFamily:C.fm, fontSize:9, color, letterSpacing:2, textTransform:"uppercase" }}>{gate}</div>
                        <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:1 }}>{range}</div>
                      </div>
                      <div style={{ fontFamily:C.fs, fontSize:12, color:C.muted, lineHeight:1.5 }}>{note}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(() => {
            const planComplianceYear = parseInt(String((getLocalToday() || getDeviceLocalTodayYmd() || "").slice(0, 4)), 10) || 2026;
            const complianceTodayIso = getLocalToday() || getDeviceLocalTodayYmd();
            const currentWeekDaysCompliance = (week?.days || []).map((d) => {
              const iso = weekDayLabelToIso(d?.date || d?.date_label, planComplianceYear);
              return { ...d, _iso: iso, dayAbbr: String(d.day || "—").slice(0, 3) };
            });
            let plannedSessions = 0;
            let completedSessions = 0;
            const completedIsoList = [];
            for (const d of currentWeekDaysCompliance) {
              if (!d._iso || !dayIsPlannedTraining(d)) continue;
              plannedSessions += 1;
              if (dayHasCompletionSignal(d._iso, d, garminActivities, unifiedMetrics)) {
                completedSessions += 1;
                completedIsoList.push(d._iso);
              }
            }
            const compliancePctPlan = plannedSessions > 0 ? Math.round((completedSessions / plannedSessions) * 100) : 0;
            const glowTR = { position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle,rgba(210,190,155,0.1) 0%,transparent 70%)", pointerEvents: "none" };
            return (
              <div style={{ ...glassCard, marginTop: 16, borderRadius: 16 }}>
                <div style={specularTop()} />
                <div style={glowTR} />
                <div style={{ padding: "18px 20px", position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ ...lbl, marginBottom: 0 }}>This Week</div>
                    <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: "#C9A875", letterSpacing: "-1px", lineHeight: 1 }}>
                      {compliancePctPlan}
                      <span style={{ fontSize: 12, fontFamily: "'DM Sans',sans-serif", color: "rgba(201,168,117,0.6)" }}>%</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
                    {currentWeekDaysCompliance.map((day, i) => {
                      if (!day._iso) {
                        return (
                          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <div style={{
                              width: "100%",
                              aspectRatio: "1",
                              borderRadius: 10,
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                            }}
                            />
                            <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.15)", letterSpacing: "1px", textTransform: "uppercase" }}>{day.dayAbbr}</div>
                          </div>
                        );
                      }
                      const isPast = day._iso < complianceTodayIso;
                      const isToday = day._iso === complianceTodayIso;
                      const isPlanned = dayIsPlannedTraining(day);
                      const isComplete = isPlanned && completedIsoList.includes(day._iso);
                      const isMissed = isPlanned && isPast && !isComplete;
                      return (
                        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{
                            width: "100%",
                            aspectRatio: "1",
                            borderRadius: 10,
                            background: isComplete ? "rgba(201,168,117,0.12)"
                              : isMissed ? "rgba(255,59,48,0.08)"
                                : isToday ? "rgba(255,255,255,0.06)"
                                  : "rgba(255,255,255,0.03)",
                            border: isComplete ? "1px solid rgba(201,168,117,0.35)"
                              : isMissed ? "1px solid rgba(255,59,48,0.25)"
                                : isToday ? "1px solid rgba(255,255,255,0.15)"
                                  : "1px solid rgba(255,255,255,0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                          }}
                          >
                            {isComplete ? (
                              <span style={{ color: "#C9A875", fontWeight: 600, fontSize: 13 }}>✓</span>
                            ) : isMissed ? (
                              <span style={{ color: "rgba(255,59,48,0.7)", fontSize: 12 }}>✕</span>
                            ) : isToday ? (
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.4)", display: "inline-block" }} />
                            ) : null}
                          </div>
                          <div style={{
                            fontSize: 8,
                            fontWeight: 600,
                            color: isComplete ? "rgba(201,168,117,0.7)"
                              : isMissed ? "rgba(255,59,48,0.5)"
                                : isToday ? "rgba(255,255,255,0.5)"
                                  : "rgba(255,255,255,0.15)",
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                          }}
                          >{day.dayAbbr}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          <div style={{ marginTop:16 }}>
            <div style={{ fontFamily:C.fm, fontSize:10, color:C.cyan, letterSpacing:3, textTransform:"uppercase", marginBottom:8 }}>Weekly Structure</div>
            <div style={{ ...glassCard, borderRadius:16, marginBottom:0 }}>
              <div style={specularTop()} />
              <div style={{ position:"relative", zIndex:1 }}>
                {(week?.days || []).map((d, idx) => {
                  const sessionName = getSessionNameForDay(d, "am");
                  const iconMeta = getSessionIcon(d?.am, d?.am_session_custom);
                  const rowColor = iconMeta?.color || deriveSessionMeta(sessionName, d).color;
                  return (
                    <div key={`${d.day}_${idx}`} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderBottom: idx === (week?.days || []).length - 1 ? "none" : "1px solid #88888833" }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:rowColor, flexShrink:0 }} />
                      <span style={{ fontFamily:C.fm, fontSize:9, color:C.text, letterSpacing:2, textTransform:"uppercase", minWidth:38 }}>{d.day}</span>
                      <span style={{ fontFamily:C.fs, fontSize:11, color:"#ccc", lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", flex:1 }}>{getStructureLabel(d)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginTop:24 }}>
            <button onClick={() => { setLabOpen(true); setLabMessages([]); setCqSelections({}); setLabAnsweredQuestions({}); setLabSessionId(createSessionId()); const wk = week?.label?.split("·")[1]?.trim() || week?.label || ""; const selD = selDay || todayDayName; setLabContext(`${wk} · ${selD}`); setLabTargetDay(selD); }}
              style={{ width:"100%", padding:"14px", background:`${C.cyan}08`, border:`1px solid ${C.cyan}22`, borderRadius:C.radius, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, ...C.glass }}>
              <span style={{ fontSize:16 }}>🧪</span>
              <span style={{ fontFamily:C.ff, fontSize:14, color:C.cyan, letterSpacing:2 }}>RUN A SCENARIO</span>
            </button>
          </div>
        </div>
      )}

      {nav === "supps" && (
        <div style={{ padding:"20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:C.ff, fontSize:28, letterSpacing:2, marginBottom:4 }}>SUPPLEMENTS<span style={{ color:C.red }}>.</span></div>
              <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:3 }}>DAILY PROTOCOL</div>
            </div>
            {supplements.length > 0 && (
              <button onClick={() => {
                const canvas = document.createElement("canvas");
                const W = 800, pad = 40;
                const groups = {};
                supplements.forEach(s => { if (!groups[s.time_group]) groups[s.time_group] = []; groups[s.time_group].push(s); });
                const groupKeys = Object.keys(groups);
                const totalItems = supplements.length;
                const H = 200 + totalItems * 50 + groupKeys.length * 40 + 80;
                canvas.width = W; canvas.height = H;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#0D0E10"; ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = "#C9A875"; ctx.font = "bold 32px 'Arial Black', sans-serif";
                ctx.fillText("MY SUPPLEMENT STACK", pad, 60);
                ctx.fillStyle = "#888"; ctx.font = "12px 'DM Sans', sans-serif";
                ctx.fillText((profile?.name || "ATHLETE").toUpperCase() + " · DAILY PROTOCOL", pad, 85);
                let y = 120;
                const gcols = { MORNING:"#FFD600", AFTERNOON:"#FF3B30", NIGHT:"#0088FF", "DAILY TARGETS":"#888" };
                groupKeys.forEach(g => {
                  ctx.fillStyle = gcols[g] || "#888"; ctx.font = "bold 14px 'DM Sans', sans-serif"; ctx.fillText(g, pad, y); y += 28;
                  groups[g].forEach(s => {
                    ctx.fillStyle = "rgba(255,255,255,0.055)";
                    ctx.beginPath(); ctx.roundRect(pad, y - 16, W - pad * 2, 40, 8); ctx.fill();
                    ctx.fillStyle = "#fff"; ctx.font = "16px 'DM Sans', sans-serif"; ctx.fillText(s.name, pad + 12, y + 6);
                    ctx.fillStyle = "#888"; ctx.font = "12px 'DM Sans', sans-serif"; ctx.fillText(s.dose, W - pad - ctx.measureText(s.dose).width - 12, y + 6);
                    y += 50;
                  });
                  y += 10;
                });
                const optBio = biomarkers.filter(b => b.flag === "OPTIMAL" || b.flag === "GOOD").slice(0, 3);
                if (optBio.length > 0) {
                  y += 10; ctx.fillStyle = "#00D4A0"; ctx.font = "bold 14px 'DM Sans', sans-serif"; ctx.fillText("OPTIMAL BIOMARKERS", pad, y); y += 28;
                  optBio.forEach(b => { ctx.fillStyle = "#00D4A0"; ctx.font = "14px 'DM Sans', sans-serif"; ctx.fillText(`✓ ${b.label}: ${b.value}${b.unit?" "+b.unit:""}`, pad + 12, y); y += 24; });
                }
                y = H - 30; ctx.fillStyle = "#444"; ctx.font = "10px 'DM Sans', sans-serif"; ctx.fillText("△ THE LAB · HYBRID PERFORMANCE", pad, y);
                const link = document.createElement("a");
                link.download = "my-stack.png"; link.href = canvas.toDataURL("image/png"); link.click();
              }}
              style={{ padding:"10px 16px", background:C.card, border:`1px solid ${C.cyan}33`, borderRadius:10, cursor:"pointer", fontFamily:C.ff, fontSize:12, color:C.cyan, letterSpacing:2 }}>
                SHARE MY STACK
              </button>
            )}
          </div>
          {suppsLoading ? (
            <div style={{ fontFamily:C.ff, fontSize:14, color:C.muted, letterSpacing:3, textAlign:"center", padding:40 }}>LOADING...</div>
          ) : supplements.length === 0 ? (
            <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2, textAlign:"center", padding:40 }}>No supplements on file.</div>
          ) : (
            // Group rows by time_group, preserving DB sort_order within each group
            Object.entries(
              supplements.reduce((acc, s) => {
                if (!acc[s.time_group]) acc[s.time_group] = [];
                acc[s.time_group].push(s);
                return acc;
              }, {})
            ).map(([group, items]) => {
              const color = SUPP_GROUP_COLORS[group] || "#aaa";
              return (
                <div key={group} style={{ marginBottom:24 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                    <div style={{ fontFamily:C.fm, fontSize:8, color:C.cyan, letterSpacing:3, textTransform:"uppercase", flexShrink:0 }}>{group}</div>
                    <div style={{ flex:1, height:1, background:C.divider }} />
                  </div>
                  {items.map((item) => (
                    <div key={item.id} style={{ ...glassCard, padding:"14px 16px", marginBottom:8, borderLeft:`3px solid ${color}44` }}>
                      <div style={specularTop()} />
                      <div style={{ position:"relative", zIndex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                          <div style={{ fontFamily:C.ff, fontSize:16, letterSpacing:0.5, color:C.text }}>{item.name}</div>
                          <div style={{ background:`${color}22`, border:`1px solid ${color}44`, borderRadius:20, padding:"3px 10px", fontFamily:C.fm, fontSize:8, color, letterSpacing:1, flexShrink:0, marginLeft:8 }}>{item.dose}</div>
                        </div>
                        <div style={{ fontFamily:C.fs, fontSize:12, color:C.muted, lineHeight:1.6, marginBottom:6 }}>{item.note}</div>
                        <div style={{ fontFamily:C.fm, fontSize:7, color:C.light, letterSpacing:2 }}>TIMING: {item.timing}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      {nav === "perf" && (() => {
        const summary = perfTrends?.summary;
        const atl = summary?.atl != null && Number.isFinite(Number(summary.atl)) ? String(summary.atl) : null;
        const ctl = summary?.ctl != null && Number.isFinite(Number(summary.ctl)) ? String(summary.ctl) : null;
        const tsbRaw = summary?.tsb;
        const tsb = tsbRaw != null && Number.isFinite(Number(tsbRaw)) ? Number(tsbRaw) : null;

        const hrv30Arr = Array.isArray(perfTrends?.hrv30) ? perfTrends.hrv30 : [];
        const validH = hrv30Arr.filter(
          (d) => d?.date && d.date <= (getLocalToday() || "") && d?.hrv != null && Number.isFinite(Number(d.hrv))
        );
        const whoopHrvPerfRaw = whoopData?.recovery?.hrv_rmssd_milli ?? whoopData?.recovery?.hrv;
        const whoopHrvPerf =
          whoopHrvPerfRaw != null && Number.isFinite(Number(whoopHrvPerfRaw)) ? Math.round(Number(whoopHrvPerfRaw)) : null;
        const currentHrv = perfTrends?.current?.hrv != null && Number.isFinite(Number(perfTrends.current.hrv))
          ? Math.round(Number(perfTrends.current.hrv))
          : (validH.length ? Math.round(Number(validH[validH.length - 1].hrv)) : whoopHrvPerf);
        const last7h = validH.slice(-7).map((d) => Number(d.hrv));
        const prev7h = validH.slice(-14, -7).map((d) => Number(d.hrv));
        const hrvTrend = meanFinite(last7h) != null && meanFinite(prev7h) != null
          ? Math.round(meanFinite(last7h) - meanFinite(prev7h))
          : 0;
        const hrvStartLabel = validH.length
          ? new Date(`${validH[0].date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "";
        const hrvEndLabel = validH.length
          ? new Date(`${validH[validH.length - 1].date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "";

        return (
          <div style={{ padding: "20px" }}>
            {perfTrendsLoading && (
              <div style={{ fontFamily: C.fm, fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>LOADING METRICS…</div>
            )}

            <div style={glassCard}>
              <div style={specularTop()} />
              <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle,rgba(210,190,155,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />
              <div style={{ padding: "20px 22px", position: "relative", zIndex: 1 }}>
                <div style={lbl}>Station Bests</div>
                {HYROX_BESTS.map((s, i) => {
                  const barColor = s.pct >= 90 ? "#C9A875" : s.pct >= 75 ? "rgba(201,168,117,0.7)" : "rgba(201,168,117,0.45)";
                  return (
                    <div
                      key={s.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "9px 0",
                        borderBottom: i < HYROX_BESTS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: barColor, flexShrink: 0 }}>{s.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)", letterSpacing: "-0.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>{s.race}</div>
                      </div>
                      <div style={{ width: 56, height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                        <div style={{ height: "100%", width: `${s.pct}%`, background: barColor, borderRadius: 2 }} />
                      </div>
                      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 16, color: "rgba(255,255,255,0.65)", width: 38, textAlign: "right", flexShrink: 0, letterSpacing: "-0.5px" }}>{s.time}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", lineHeight: 1.5, marginTop: 10, marginBottom: 4 }}>
              Bar length shows relative strength across stations. Longer = stronger relative to your overall race time.
            </div>

            <div style={glassCard}>
              <div style={specularTop()} />
              <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle,rgba(210,190,155,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />
              <div style={{ padding: "20px 22px", position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ ...lbl, marginBottom: 0 }}>Personal Records</div>
                  {!stravaConnected && (
                    <a
                      href={session?.user?.id ? `/api/strava/login?uid=${encodeURIComponent(session.user.id)}` : "/api/strava/login"}
                      style={{ fontSize: 9, color: "#C9A875", fontWeight: 600, letterSpacing: "1px", textDecoration: "none", fontFamily: C.fs }}
                    >
                      Connect Strava →
                    </a>
                  )}
                </div>
                {[
                  { label: "400m", key: "400m" },
                  { label: "1 Mile", key: "1 mile" },
                  { label: "2 Mile", key: "2 mile" },
                  { label: "5K", key: "5k" },
                  { label: "10K", key: "10k" },
                  { label: "10 Mile", key: "10 mile" },
                ].map((pr, i, arr) => {
                  const best = stravaBestEfforts?.[pr.key];
                  return (
                    <div
                      key={pr.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "11px 0",
                        borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.65)", fontFamily: C.fs }}>{pr.label}</div>
                        {best?.date ? (
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 1, fontFamily: C.fs }}>
                            {new Date(best.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                          </div>
                        ) : null}
                      </div>
                      <div style={{
                        fontFamily: "'DM Serif Display',serif",
                        fontSize: 22,
                        color: best?.formatted ? "#fff" : "rgba(255,255,255,0.15)",
                        letterSpacing: "-0.5px",
                      }}
                      >
                        {best?.formatted ?? "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={glassCard}>
              <div style={specularTop()} />
              <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle,rgba(210,190,155,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />
              <div style={{ padding: "20px 22px 14px", position: "relative", zIndex: 1 }}>
                <div style={lbl}>Fitness vs Fatigue · 8 Weeks</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 36, color: "#fff", letterSpacing: "-1.5px", lineHeight: 1 }}>{atl || "—"}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>ATL · Fatigue</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 36, color: "rgba(255,255,255,0.45)", letterSpacing: "-1.5px", lineHeight: 1 }}>{ctl || "—"}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>CTL · Fitness</div>
                  </div>
                  {tsb !== null && (
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                      <div style={{ background: `rgba(${tsb >= 0 ? "93,255,160" : "255,59,48"},0.1)`, border: `1px solid rgba(${tsb >= 0 ? "93,255,160" : "255,59,48"},0.2)`, borderRadius: 20, padding: "4px 12px", fontSize: 10, fontWeight: 600, color: tsb >= 0 ? "#5dffa0" : "#ff6b6b" }}>{tsb >= 0 ? "+" : ""}{tsb} TSB</div>
                    </div>
                  )}
                </div>
                <svg width="100%" height="80" viewBox="0 0 320 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="ctlGPerf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(201,168,117,0.3)" /><stop offset="100%" stopColor="rgba(201,168,117,0)" /></linearGradient>
                    <linearGradient id="atlGPerf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(255,255,255,0.1)" /><stop offset="100%" stopColor="rgba(255,255,255,0)" /></linearGradient>
                  </defs>
                  <path d="M0 70 C40 65 80 58 120 52 S200 44 240 40 S290 38 320 36 L320 80 L0 80 Z" fill="url(#ctlGPerf)" />
                  <path d="M0 70 C40 65 80 58 120 52 S200 44 240 40 S290 38 320 36" fill="none" stroke="#C9A875" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M0 74 C40 67 80 54 120 48 S190 34 230 30 S290 27 320 24 L320 80 L0 80 Z" fill="url(#atlGPerf)" />
                  <path d="M0 74 C40 67 80 54 120 48 S190 34 230 30 S290 27 320 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 16, height: 1.5, background: "#C9A875", display: "inline-block" }} /><span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>CTL Fitness</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 16, height: 1.5, background: "rgba(255,255,255,0.3)", display: "inline-block" }} /><span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>ATL Fatigue</span></div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", lineHeight: 1.5, marginTop: 10, marginBottom: 4 }}>
              TSB (Training Stress Balance) = Fitness − Fatigue. Positive = fresh and ready to perform. Negative = accumulated fatigue.
            </div>

            <div style={glassCard}>
              <div style={specularTop()} />
              <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle,rgba(210,190,155,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />
              <div style={{ padding: "20px 22px 14px", position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={lbl}>HRV · 30 Days</div>
                    <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 48, color: "#fff", letterSpacing: "-2px", lineHeight: 1 }}>
                      {currentHrv != null ? currentHrv : "—"}
                      <span style={{ fontSize: 18, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans',sans-serif", marginLeft: 2 }}>ms</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", paddingTop: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: hrvTrend >= 0 ? "#5dffa0" : "#ff6b6b" }}>{hrvTrend >= 0 ? "↑" : "↓"} {Math.abs(hrvTrend)}ms</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>vs last week</div>
                  </div>
                </div>
                <svg width="100%" height="60" viewBox="0 0 320 60" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="hrvGPerf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(201,168,117,0.25)" />
                      <stop offset="100%" stopColor="rgba(201,168,117,0)" />
                    </linearGradient>
                  </defs>
                  <path d="M0 40 C20 38 35 35 50 32 S75 28 90 30 S110 36 130 34 S155 25 175 22 S200 20 220 18 S250 15 270 17 S295 20 320 18 L320 60 L0 60 Z" fill="url(#hrvGPerf)" />
                  <path d="M0 40 C20 38 35 35 50 32 S75 28 90 30 S110 36 130 34 S155 25 175 22 S200 20 220 18 S250 15 270 17 S295 20 320 18" fill="none" stroke="#C9A875" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="320" cy="18" r="3" fill="#C9A875" />
                  <circle cx="320" cy="18" r="6" fill="rgba(201,168,117,0.2)" />
                </svg>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.18)" }}>{hrvStartLabel || "—"}</span>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.18)" }}>{hrvEndLabel || "—"}</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", lineHeight: 1.5, marginTop: 10, marginBottom: 4 }}>
              Rising HRV = absorbing training. Falling HRV = accumulated stress. Use this to confirm your WHOOP gate decisions.
            </div>
          </div>
        );
      })()}

      {nav === "stats" && (() => {
        const sleepH = Number(whoopData?.sleep?.hours || 0);
        const eff = Number(whoopData?.sleep?.efficiency || 0);
        const awakeP = Math.max(0.03, Math.min(0.12, (100 - Math.min(100, Math.max(0, eff))) / 520 + 0.035));
        const remP = 0.22;
        const deepP = 0.17 + Math.min(0.12, eff / 750);
        const lightP = Math.max(0.38, 1 - awakeP - remP - deepP);
        const parts = [awakeP, remP, lightP, deepP];
        const pSum = parts.reduce((a, b) => a + b, 0);
        const [awakePct, remPct, lightPct, deepPct] = parts.map((p) => (p / pSum) * 100);
        const sleepHm =
          sleepH > 0
            ? `${Math.floor(sleepH)}h ${String(Math.round((sleepH % 1) * 60)).padStart(2, "0")}m`
            : "—";
        const dexaStatusColor = (st) => (st === "watch" ? statusDot.watch : st === "low" ? statusDot.low : statusDot.optimal);
        return (
          <div style={{ padding: "20px" }}>
            {!stravaConnected && (
              <div style={{ ...glassCard, marginBottom: 14, borderRadius: 16 }}>
                <div style={specularTop()} />
                <div style={{ padding: "14px 18px", position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: C.fs, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                    Connect Strava to sync run PRs on the Performance tab.
                  </div>
                  <a
                    href={session?.user?.id ? `/api/strava/login?uid=${encodeURIComponent(session.user.id)}` : "/api/strava/login"}
                    style={{
                      flexShrink: 0,
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#C9A875",
                      letterSpacing: "1.5px",
                      textDecoration: "none",
                      fontFamily: C.fm,
                      textTransform: "uppercase",
                      border: "1px solid rgba(201,168,117,0.35)",
                      borderRadius: 20,
                      padding: "8px 14px",
                    }}
                  >
                    Connect Strava
                  </a>
                </div>
              </div>
            )}

            <div style={creamCard}>
              <div style={{ position: "absolute", top: 0, left: "5%", right: "5%", height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.9) 50%,transparent)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 130, background: "radial-gradient(ellipse at top right,rgba(255,255,255,0.38) 0%,transparent 65%)", pointerEvents: "none" }} />
              <div style={{ padding: "20px 22px", position: "relative", zIndex: 1 }}>
                <div style={lblDark}>Blood Panel Flags</div>
                {BLOOD_PANEL.map((row, i) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: i < BLOOD_PANEL.length - 1 ? "1px solid rgba(13,14,16,0.08)" : "none",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: C.fs, fontSize: 12, fontWeight: 600, color: DS.base, letterSpacing: "-0.2px" }}>{row.label}</div>
                      <div style={{ fontFamily: C.fm, fontSize: 9, color: "rgba(13,14,16,0.38)", marginTop: 2 }}>{row.ref}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusDot[row.status] || statusDot.watch, flexShrink: 0 }} />
                        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17, color: "rgba(13,14,16,0.82)", letterSpacing: "-0.3px" }}>{row.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={creamCard}>
              <div style={{ position: "absolute", top: 0, left: "5%", right: "5%", height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.9) 50%,transparent)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 130, background: "radial-gradient(ellipse at top right,rgba(255,255,255,0.38) 0%,transparent 65%)", pointerEvents: "none" }} />
              <div style={{ padding: "20px 22px", position: "relative", zIndex: 1 }}>
                <div style={lblDark}>DEXA Results</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {DEXA.map((row) => (
                    <div key={row.label} style={{ borderRadius: 14, border: "1px solid rgba(13,14,16,0.08)", padding: "12px 12px 14px", background: "rgba(255,255,255,0.35)" }}>
                      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 30, color: DS.base, letterSpacing: "-1px", lineHeight: 1 }}>
                        {row.value}
                        <span style={{ fontSize: 12, fontFamily: C.fs, color: "rgba(13,14,16,0.45)", marginLeft: 2 }}>{row.unit}</span>
                      </div>
                      <div style={{ fontFamily: C.fs, fontSize: 10, fontWeight: 600, color: "rgba(13,14,16,0.55)", marginTop: 6 }}>{row.label}</div>
                      <div style={{ fontFamily: C.fm, fontSize: 8, color: dexaStatusColor(row.status), marginTop: 4, letterSpacing: 0.5 }}>{row.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={glassCard}>
              <div style={specularTop()} />
              <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle,rgba(210,190,155,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />
              <div style={{ padding: "20px 22px", position: "relative", zIndex: 1 }}>
                <div style={lbl}>Hormone Ranges</div>
                {HORMONES.map((h) => {
                  const span = Math.max(1e-6, h.max - h.min);
                  const pct = Math.min(100, Math.max(0, ((h.value - h.min) / span) * 100));
                  return (
                    <div key={h.label} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.72)" }}>{h.label}</span>
                        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 15, color: "rgba(255,255,255,0.65)" }}>{h.value} <span style={{ fontFamily: C.fs, fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{h.unit}</span></span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "linear-gradient(90deg,rgba(255,255,255,0.06),rgba(201,168,117,0.35),rgba(255,255,255,0.06))", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#8a7349,#C9A875)", borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={glassCard}>
              <div style={specularTop()} />
              <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle,rgba(210,190,155,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />
              <div style={{ padding: "20px 22px 16px", position: "relative", zIndex: 1 }}>
                <div style={lbl}>Sleep Architecture</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 44, color: "#fff", letterSpacing: "-2px", lineHeight: 1, marginBottom: 14 }}>{sleepHm}</div>
                <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ width: `${awakePct}%`, background: "rgba(255,255,255,0.85)" }} />
                  <div style={{ width: `${remPct}%`, background: "#C9A875" }} />
                  <div style={{ width: `${lightPct}%`, background: "rgba(201,168,117,0.4)" }} />
                  <div style={{ width: `${deepPct}%`, background: "rgba(201,168,117,0.72)" }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 9, color: "rgba(255,255,255,0.32)" }}>
                  <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "rgba(255,255,255,0.85)", marginRight: 6, verticalAlign: "middle" }} />Awake ~{Math.round(awakePct)}%</span>
                  <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#C9A875", marginRight: 6, verticalAlign: "middle" }} />REM ~{Math.round(remPct)}%</span>
                  <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "rgba(201,168,117,0.4)", marginRight: 6, verticalAlign: "middle" }} />Light ~{Math.round(lightPct)}%</span>
                  <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "rgba(201,168,117,0.72)", marginRight: 6, verticalAlign: "middle" }} />Deep ~{Math.round(deepPct)}%</span>
                </div>
                {whoopData?.sleep?.efficiency != null ? (
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", marginTop: 10, fontFamily: C.fm }}>
                    Sleep score {whoopData.sleep.score ?? "—"}% · efficiency {eff}%
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}

      {/* TEMP DEBUG — TEST WEEK only; remove after Phase 3B week confirmation */}
      {nav === "today" && (
        <button
          type="button"
          onClick={async () => {
            const {
              data: { session: s },
            } = await supabase.auth.getSession();
            const res = await fetch("/api/metrics/range?start=2026-04-13&end=2026-04-18", {
              headers: { Authorization: `Bearer ${s?.access_token}` },
            });
            const data = await res.json();
            alert(JSON.stringify(data, null, 2));
          }}
          style={{
            position: "fixed",
            bottom: 140,
            right: 16,
            background: "rgba(93,255,160,0.12)",
            border: "1px solid rgba(93,255,160,0.3)",
            borderRadius: 20,
            padding: "8px 14px",
            fontSize: 10,
            fontWeight: 600,
            color: "#5dffa0",
            letterSpacing: "1px",
            cursor: "pointer",
            zIndex: 999,
          }}
        >
          TEST WEEK
        </button>
      )}

      <div style={{ position:"fixed", bottom:0, left:0, right:0, maxWidth:480, margin:"0 auto", background:"rgba(255,255,255,0.032)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", borderTop:"1px solid rgba(255,255,255,0.09)", display:"flex", justifyContent:"space-around", padding:"12px 16px 28px", zIndex:100 }}>
        <div style={{ position:"absolute", top:0, left:"5%", right:"5%", height:1, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.2) 40%,rgba(255,255,255,0.2) 60%,transparent)", pointerEvents:"none" }} />
        {[
          { icon: "◎", label: "TODAY", key: "today" },
          { icon: "▦", label: "PLAN", key: "plan" },
          { icon: "▲", label: "PERF", key: "perf" },
          { icon: "◉", label: "STATS", key: "stats" },
          { icon: "◈", label: "SUPPS", key: "supps" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setNav(tab.key)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer", background:"transparent", border:"none", padding:0 }}
          >
            <div style={{ fontSize:17, color:nav===tab.key ? DS.gold : "rgba(255,255,255,0.18)", filter:nav===tab.key ? "drop-shadow(0 0 4px rgba(201,168,117,0.4))":"none" }}>{tab.icon}</div>
            <div style={{ fontSize:8, fontWeight:600, letterSpacing:"1.5px", color:nav===tab.key ? DS.gold : "rgba(255,255,255,0.18)", fontFamily:C.fs, textTransform:"uppercase" }}>{tab.label}</div>
          </button>
        ))}
      </div>

      <AIChat whoopData={whoopData} currentWeek={week} recentActivities={recentActivities} onPlanChange={handlePlanChange} userName={profile?.name} persona={coachPersona} onPersonaChange={handlePersonaChange} proactiveBadge={proactiveBadge} authToken={session?.access_token} expandRequest={coachExpandSignal} />

      <PlanBuilder
        open={planBuilderOpen}
        onClose={() => setPlanBuilderOpen(false)}
        onGenerated={async () => {
          setPlanBuilderOpen(false);
          localStorage.removeItem(PLAN_BUILDER_DISMISS_KEY);
          setPlanBuilderDismissUntil(0);
          setPlanLoading(true);
          await fetchPlan(session?.access_token);
          setNav("plan");
        }}
      />

      {labOpen && (
        <>
          <div onClick={labClose} style={{ position:"fixed", inset:0, zIndex:245, background:"rgba(0,0,0,0.45)" }} />
          <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, height:"40vh", maxHeight:"48vh", zIndex:250, background:C.bg, borderRadius:"20px 20px 0 0", display:"flex", flexDirection:"column", boxShadow:"0 -8px 32px rgba(0,0,0,0.6)", marginTop:16, ...C.glass }}>
            <div style={{ display:"flex", justifyContent:"center", padding:"8px 0 2px" }}>
              <div style={{ width:36, height:4, borderRadius:2, background:C.light }} />
            </div>
            <div style={{ padding:"6px 20px 10px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontFamily:C.ff, fontSize:13, color:C.cyan, letterSpacing:2, fontWeight:700 }}>
                  🧪 SCENARIO MODE{labContext ? ` · ${labContext.toUpperCase()}` : ""}
                </div>
                <button onClick={labClose} style={{ background:C.cardSolid, border:"none", color:C.muted, width:26, height:26, borderRadius:"50%", cursor:"pointer", fontSize:11, flexShrink:0 }}>✕</button>
              </div>
            </div>

            <div style={{ flex:1, overflowY:"auto", padding:"10px 20px", display:"flex", flexDirection:"column", gap:8 }}>
              {labMessages.length === 0 && (
                <div>
                  <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6, textTransform:"uppercase" }}>TRY A SCENARIO</div>
                  {["Skip Sunday's long run, redistribute volume","Traveling 3 days — hotel gym only","Wedding this weekend, adjust week","Add a second threshold session","Start taper — race in 2 weeks"].map((p,i) => (
                    <button key={i} onClick={() => labSend(p)}
                      style={{ display:"block", width:"100%", padding:"8px 12px", marginBottom:5, background:C.card, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", textAlign:"left", fontFamily:C.fs, fontSize:11, color:C.text, lineHeight:1.4 }}>{p}</button>
                  ))}
                </div>
              )}
              {labMessages.map((m, i) => (
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems: m.role==="user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth:"90%", padding:"8px 12px", borderRadius: m.role==="user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: m.role==="user" ? "rgba(255,170,68,0.14)" : C.card, border: m.role==="user" ? `1px solid ${C.cyan}33` : `1px solid ${C.border}` }}>
                    <div style={{ fontFamily:C.fs, fontSize:11, color:C.text, lineHeight:1.5 }}>{renderMarkdown(m.content)}</div>
                  </div>
                  {m.clarifyingQuestions && !m.cqSubmitted && (
                    <div style={{ maxWidth:"95%", marginTop:6, width:"100%" }}>
                      {(() => {
                        const normalized = normalizeClarifyingQuestions(m.clarifyingQuestions);
                        const msgKey = `lab_${i}`;
                        const selectionsById = Object.fromEntries(
                          normalized.map((q) => [q.id, cqSelections[`${msgKey}_${q.id}`] || []])
                        );
                        const { byId, sequence } = getClarifyingFlow(normalized, selectionsById);
                        const answered = labAnsweredQuestions[msgKey] || [];
                        const nextQuestionId = sequence.find((qid) => !answered.includes(qid)) || null;
                        const activeQuestion = nextQuestionId ? byId.get(nextQuestionId) : null;
                        const activeSelection = activeQuestion ? (selectionsById[activeQuestion.id] || []) : [];
                        const allAnswered = sequence.length > 0 && sequence.every((qid) => answered.includes(qid));
                        const questionIdx = activeQuestion ? Math.min(answered.length + 1, sequence.length) : sequence.length;

                        return (
                          <>
                            {sequence.length > 0 && (
                              <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2, marginBottom:6 }}>
                                Question {questionIdx} of {sequence.length}
                              </div>
                            )}

                            {activeQuestion && (
                              <div style={{ background:C.card, borderRadius:10, padding:"10px 12px", marginBottom:6, border:`1px solid ${C.border}` }}>
                                <div style={{ fontFamily:C.fs, fontSize:11, color:C.text, marginBottom:8, lineHeight:1.4 }}>{activeQuestion.question}</div>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                                  {activeQuestion.options.map((opt, oi) => {
                                    const on = activeSelection.includes(opt);
                                    return (
                                      <button key={oi} onClick={() => {
                                        setCqSelections((prev) => {
                                          const key = `${msgKey}_${activeQuestion.id}`;
                                          const cur = prev[key] || [];
                                          let next = [];
                                          if (activeQuestion.type === "single_select") {
                                            next = [opt];
                                          } else {
                                            next = on ? cur.filter((x) => x !== opt) : [...cur, opt];
                                          }
                                          return { ...prev, [key]: next };
                                        });
                                      }} style={{
                                        padding:"5px 10px", borderRadius:16, cursor:"pointer",
                                        background: on ? `${C.cyan}22` : C.cardSolid,
                                        border: `1px solid ${on ? C.cyan : C.border}`,
                                        fontFamily:C.fm, fontSize:9, color: on ? C.cyan : C.muted, letterSpacing:1,
                                      }}>{opt}</button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {activeQuestion && (
                              <button
                                onClick={() => {
                                  if (activeSelection.length === 0) return;
                                  setLabAnsweredQuestions((prev) => {
                                    const cur = prev[msgKey] || [];
                                    if (cur.includes(activeQuestion.id)) return prev;
                                    return { ...prev, [msgKey]: [...cur, activeQuestion.id] };
                                  });
                                }}
                                disabled={activeSelection.length === 0}
                                style={{ width:"100%", padding:"10px", background:activeSelection.length ? C.cyan : C.cardSolid, color:activeSelection.length ? "#000" : C.muted, border:"none", borderRadius:8, cursor:activeSelection.length ? "pointer" : "default", fontFamily:C.ff, fontSize:12, letterSpacing:2, marginTop:4 }}
                              >
                                CONFIRM ANSWER →
                              </button>
                            )}

                            {allAnswered && (
                              <button onClick={() => {
                                const answers = sequence.map((qid) => {
                                  const q = byId.get(qid);
                                  const sel = selectionsById[qid] || [];
                                  return `${q?.question?.replace("?","")}:  ${sel.join(", ") || "Not specified"}`;
                                }).join(". ");
                                setLabMessages(prev => prev.map((mm, mi) => mi === i ? {...mm, cqSubmitted:true} : mm));
                                labSend(answers);
                              }} style={{ width:"100%", padding:"10px", background:C.cyan, color:"#000", border:"none", borderRadius:8, cursor:"pointer", fontFamily:C.ff, fontSize:12, letterSpacing:2, marginTop:4 }}>FINAL CONFIRM →</button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  {m.cqSubmitted && <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:2, marginTop:3 }}>✓ ANSWERS SENT</div>}
                  {m.planChange && !m.planChangeAccepted && (
                    <div style={{ maxWidth:"90%", marginTop:4, background:C.card2, borderRadius:8, padding:"8px 10px", border:`1px solid ${C.cyan}33` }}>
                      <div style={{ fontFamily:C.ff, fontSize:12, color:C.text, marginBottom:4 }}>{m.planChange.description}</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => handleLabAccept(m.planChange)} style={{ flex:1, padding:"6px", background:C.green, color:"#000", border:"none", borderRadius:6, cursor:"pointer", fontFamily:C.ff, fontSize:10, letterSpacing:2 }}>QUEUE</button>
                        <button onClick={() => setLabMessages(prev => prev.map(mm => mm.planChange === m.planChange ? {...mm, planChangeAccepted:"rejected"} : mm))} style={{ flex:1, padding:"6px", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer", fontFamily:C.ff, fontSize:10, letterSpacing:2 }}>SKIP</button>
                      </div>
                    </div>
                  )}
                  {m.planChangeAccepted === true && <div style={{ fontFamily:C.fm, fontSize:7, color:C.green, letterSpacing:2, marginTop:3 }}>✓ QUEUED</div>}
                  {m.planChangeAccepted === "rejected" && <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:2, marginTop:3 }}>✕ SKIPPED</div>}
                </div>
              ))}
              {labLoading && (
                <div style={{ background:C.card, borderRadius:"12px 12px 12px 4px", padding:"8px 12px", border:`1px solid ${C.border}`, alignSelf:"flex-start" }}>
                  <div className="shimmer" style={{ fontFamily:C.fm, fontSize:9, letterSpacing:3 }}>SIMULATING</div>
                </div>
              )}
            </div>

            <div style={{ padding:"8px 20px 14px", display:"flex", gap:8, flexShrink:0 }}>
              <input
                value={labInput}
                onChange={e => setLabInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") labSend(labInput); }}
                placeholder="Describe your scenario..."
                style={{ flex:1, background:C.card, border:`1px solid ${C.cyan}22`, borderRadius:10, padding:"10px 12px", color:C.text, fontFamily:C.fs, fontSize:12, outline:"none" }}
              />
              <button onClick={() => labSend(labInput)} disabled={labLoading || !labInput.trim()} style={{ width:40, height:40, background: labInput.trim() ? C.cyan : C.card, border:"none", borderRadius:10, cursor: labInput.trim() ? "pointer" : "default", color: labInput.trim() ? "#000" : C.muted, fontSize:15, flexShrink:0 }}>↑</button>
            </div>
            {scenarioChanges.length > 0 && (
              <button onClick={() => setShowLabReview(true)}
                style={{ width:"100%", height:44, background:C.cyan, border:"none", borderRadius:"12px 12px 0 0", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, flexShrink:0 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#000" }} />
                <div style={{ fontFamily:C.ff, fontSize:13, color:"#000", letterSpacing:2 }}>{scenarioChanges.length} CHANGE{scenarioChanges.length>1?"S":""} QUEUED → REVIEW & APPLY</div>
              </button>
            )}
          </div>
        </>
      )}

      {showLabReview && (
        <div style={{ position:"fixed", inset:0, zIndex:260, background:"rgba(10,10,10,0.97)", display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>
          <div style={{ padding:"20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
            <div style={{ fontFamily:C.ff, fontSize:20, color:C.cyan, letterSpacing:2 }}>REVIEW CHANGES</div>
            <button onClick={() => setShowLabReview(false)} style={{ background:C.cardSolid, border:"none", color:C.muted, width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:14 }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
            {scenarioChanges.map((c, i) => (
              <div key={i} style={{ background:C.card, borderRadius:C.radius, padding:"14px 16px", marginBottom:10, border:`1px solid ${C.border}`, ...C.glass }}>
                <div style={{ fontFamily:C.fm, fontSize:7, color:C.muted, letterSpacing:3, marginBottom:6 }}>CHANGE {i+1}{c.day ? ` · ${c.day}` : ""}</div>
                <div style={{ display:"flex", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:C.fm, fontSize:6, color:C.muted, letterSpacing:2, marginBottom:4 }}>ORIGINAL</div>
                    <div style={{ fontFamily:C.fs, fontSize:12, color:C.muted, lineHeight:1.5 }}>{c.changes?.am_session || c.changes?.note || "Current session"}</div>
                  </div>
                  <div style={{ width:1, background:C.border }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:C.fm, fontSize:6, color:C.cyan, letterSpacing:2, marginBottom:4 }}>MODIFIED</div>
                    <div style={{ fontFamily:C.fs, fontSize:12, color:C.cyan, lineHeight:1.5 }}>{c.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:"16px 20px 24px", flexShrink:0 }}>
            <button onClick={labApplyAll} style={{ width:"100%", padding:"16px", background:C.green, color:"#000", border:"none", borderRadius:12, cursor:"pointer", fontFamily:C.ff, fontSize:16, letterSpacing:3, marginBottom:10 }}>APPLY TO PLAN</button>
            <button onClick={labDiscard} style={{ width:"100%", padding:"10px", background:"transparent", color:C.muted, border:"none", cursor:"pointer", fontFamily:C.fm, fontSize:9, letterSpacing:2 }}>DISCARD ALL</button>
          </div>
        </div>
      )}

      {labToast && (
        <div onClick={() => { setLabOpen(true); setLabToast(null); }} style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", zIndex:200, background:C.cardSolid, border:`1px solid ${C.cyan}33`, borderRadius:12, padding:"10px 16px", cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.5)", maxWidth:380 }}>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.cyan, letterSpacing:1 }}>{labToast}</div>
        </div>
      )}

    </div>
  );
}
