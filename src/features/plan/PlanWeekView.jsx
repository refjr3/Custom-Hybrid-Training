/* global Map */
import { useCallback, useEffect, useMemo, useState } from "react";
import { PhaseHeaderStrip } from "./components/PhaseHeaderStrip.jsx";
import PlanBlockTimeline from "./PlanBlockTimeline.jsx";
import { SessionHeroCard } from "./components/SessionHeroCard.jsx";
import { SessionFeedbackSheet } from "./components/SessionFeedbackSheet.jsx";
import { WeeklyStructureSnapshot } from "./components/WeeklyStructureSnapshot.jsx";
import { PlanQuadrant } from "./components/PlanQuadrant.jsx";
import { WeekFocusModal } from "./components/WeekFocusModal.jsx";
import { ComplianceDetailModal } from "./components/ComplianceDetailModal.jsx";
import { getCompletionState, matchSessionsToActivities } from "./lib/sessionActivityMatcher.js";
import {
  computePhaseProgress,
  getCurrentWeek,
  getDayIndex,
  parseWeekDates,
} from "./lib/weekDateUtils.js";
import { buildWeekOrderMap, getAdjacentWeekByOrder, getWeekOrderValue } from "./lib/planWeekNavigation.js";
import { colors, typography } from "../../design/tokens";

function parseWeekOrder(week, fallbackOrder) {
  const fromField = Number(week?.week_order);
  if (Number.isFinite(fromField) && fromField > 0) return fromField;
  const label = String(week?.label || "");
  const fromLabel = Number(label.match(/\d+/)?.[0]);
  if (Number.isFinite(fromLabel) && fromLabel > 0) return fromLabel;
  return fallbackOrder;
}

function findWeekIndexById(weeks, weekId) {
  return weeks.findIndex((w) => String(w?.id) === String(weekId));
}

function parseRaceDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
  }
  const text = String(value).trim();
  if (!text) return null;
  const hasDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  const parsed = new Date(hasDateOnly ? `${text}T12:00:00` : text);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0);
}

function getVariantRaceDate(weeks, activeVariant) {
  const fromVariant = [
    activeVariant?.target_race_date,
    activeVariant?.race_date,
    activeVariant?.event_date,
  ]
    .map(parseRaceDateValue)
    .find(Boolean);
  if (fromVariant) return fromVariant;

  const nowYear = new Date().getFullYear();
  const weekRows = Array.isArray(weeks) ? [...weeks] : [];
  weekRows.sort((a, b) => getWeekOrderValue(a) - getWeekOrderValue(b));
  for (const week of weekRows) {
    const weekRange = parseWeekDates(week?.dates, nowYear);
    const yearHint = weekRange?.start?.getFullYear() || nowYear;
    for (const day of week?.days || []) {
      if (!day?.isRaceDay) continue;
      const dateLabel = String(day?.date_label || day?.date || "").trim();
      const candidate = parseRaceDateValue(`${dateLabel} ${yearHint}`);
      if (candidate) return candidate;
    }
  }
  return null;
}

function mapRpeBucketForDb(key) {
  if (!key) return null;
  const map = { easy: "easy", moderate: "solid", hard: "hard", max: "brutal" };
  return map[key] || key;
}

function extractWeekTypeFromNotes(days) {
  for (const d of days || []) {
    const text = String(d?.note ?? d?.note2a ?? "");
    const m = text.match(/WEEK\s*TYPE\s*:\s*([A-Za-z ]+)/i);
    if (m) return String(m[1] || "").trim().toUpperCase();
  }
  return "STANDARD";
}

function normalizeDays(week) {
  const days = Array.isArray(week?.days) ? week.days : [];
  const range = parseWeekDates(week?.dates, new Date().getFullYear());
  const start = range?.start ? new Date(range.start) : null;
  return days.map((day, idx) => {
    const dateLabel = String(day?.date_label || day?.date || "").trim();
    let iso = null;
    if (start) {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      iso = d.toISOString().slice(0, 10);
    }
    return {
      ...day,
      id: day?.id || `${week?.id || "w"}_${idx}`,
      date_label: dateLabel,
      calendar_date: day?.calendar_date || iso || null,
      am_session: day?.am_session ?? day?.am ?? null,
      pm_session: day?.pm_session ?? day?.pm ?? null,
      am_completed_at: day?.am_completed_at || null,
      pm_completed_at: day?.pm_completed_at || null,
      am_session_blocks: Array.isArray(day?.am_session_blocks) ? day.am_session_blocks : [],
      _iso: iso,
      _dayIndex: idx,
      _dateObj: iso ? new Date(`${iso}T12:00:00`) : null,
    };
  });
}

function inferWeekId(week) {
  return week?.week_id || week?.id || null;
}

function dayIsPlanned(day) {
  const slot = day?.am_session || day?.am;
  return Boolean(slot && !String(slot).toUpperCase().includes("REST"));
}

function scoreSession(day) {
  const text = `${day?.am_session_type || ""} ${day?.am_session || ""}`.toLowerCase();
  let score = 1;
  if (/vo2|threshold|tempo|track|interval|quality/.test(text)) score += 4;
  if (/hyrox|brick|simulation|sim/.test(text)) score += 4;
  if (/strength|weight/.test(text)) score += 3;
  if (/long run|long/.test(text)) score += 2;
  return score;
}

function getTopKeySessions(days) {
  return (Array.isArray(days) ? days : [])
    .filter((day) => dayIsPlanned(day))
    .map((day) => ({
      day: String(day?.day_name || day?.day || "").trim().slice(0, 3).toUpperCase(),
      session: day?.am_session || day?.am || "Session",
      score: scoreSession(day),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ day, session }) => ({ day, session }));
}

function deriveWeekFocusText(phaseName, weekType) {
  const phase = String(phaseName || "").toLowerCase();
  const type = String(weekType || "").toUpperCase();
  if (type === "DELOAD") {
    return "Final deload before the next build. Absorb prior load and prioritize recovery quality.";
  }
  if (phase.includes("accumulation")) {
    return "Volume builds this week. Threshold work returns while aerobic durability stays the anchor.";
  }
  if (phase.includes("base")) {
    return "Rebuild consistency and aerobic capacity with controlled quality sessions and smooth execution.";
  }
  if (phase.includes("race")) {
    return "Sharpen race specificity while preserving freshness. Precision and pacing matter most now.";
  }
  return "Stay consistent with the plan. Trust the periodization.";
}

function deriveNextWeekPreview(nextWeek) {
  const phase = String(nextWeek?.phase || nextWeek?._blockLabel || "next phase").trim();
  const weekLabel = String(nextWeek?.label || "").trim();
  const typeHint = extractWeekTypeFromNotes(nextWeek?.days || []);
  const focus = deriveWeekFocusText(phase, typeHint);
  return `${weekLabel ? `${weekLabel}: ` : ""}${focus}`;
}

export default function PlanWeekView({
  user,
  supabase,
  profile,
  planVariants,
  activeVariantId,
  planBlocks,
  planLoading,
  onOpenPlanBuilder,
  onSwitchVariant,
  onPlanRefetch,
  useWorkoutDetailV2 = false,
}) {
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [showBlockTimeline, setShowBlockTimeline] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDay, setFeedbackDay] = useState(null);
  const [daysState, setDaysState] = useState([]);
  const [showWeekFocusModal, setShowWeekFocusModal] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [activityMatches, setActivityMatches] = useState(new Map());

  const allWeeks = useMemo(() => {
    let fallbackOrder = 1;
    const rows = [];
    (planBlocks || []).forEach((block) => {
      (block?.weeks || []).forEach((week) => {
        rows.push({
          ...week,
          _blockId: block?.id,
          _blockLabel: block?.label || week?.phase || "Training",
          _weekOrder: parseWeekOrder(week, fallbackOrder++),
        });
      });
    });
    rows.sort((a, b) => Number(a._weekOrder || 999) - Number(b._weekOrder || 999));
    return rows;
  }, [planBlocks]);
  const sortedWeeksForNav = useMemo(() => {
    const next = [...allWeeks];
    next.sort((a, b) => {
      const diff = getWeekOrderValue(a) - getWeekOrderValue(b);
      if (diff !== 0) return diff;
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
    return next;
  }, [allWeeks]);
  const weekByOrder = useMemo(() => buildWeekOrderMap(sortedWeeksForNav), [sortedWeeksForNav]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log("[PlanWeekView] weeks loaded", {
      count: sortedWeeksForNav.length,
      orders: sortedWeeksForNav.map((w) => getWeekOrderValue(w, null)),
      weekIds: sortedWeeksForNav.map((w) => w.id),
    });
  }, [sortedWeeksForNav]);

  useEffect(() => {
    if (!allWeeks.length) {
      setSelectedWeekId(null);
      setSelectedDayIndex(null);
      return;
    }
    if (selectedWeekId && allWeeks.some((w) => String(w.id) === String(selectedWeekId))) return;
    const current = getCurrentWeek(allWeeks, new Date());
    setSelectedWeekId(current?.week?.id || allWeeks[0]?.id || null);
    setSelectedDayIndex(null);
  }, [allWeeks, selectedWeekId]);

  useEffect(() => {
    let cancelled = false;
    async function runMatch() {
      if (!supabase || !user?.id || !allWeeks.length) {
        setActivityMatches(new Map());
        return;
      }
      const next = await matchSessionsToActivities(supabase, user.id, allWeeks);
      if (!cancelled) setActivityMatches(next);
    }
    runMatch();
    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id, allWeeks]);

  useEffect(() => {
    if (!import.meta.env.DEV || !selectedWeekId) return;
    const ord = getWeekOrderValue(allWeeks[findWeekIndexById(allWeeks, selectedWeekId)], null);
    console.log("[PlanWeekView] selected week_order", { selectedWeekId, weekOrder: ord });
  }, [allWeeks, selectedWeekId]);

  const totalWeeks = allWeeks.length;
  const currentWeekIdx = useMemo(() => {
    if (!allWeeks.length) return -1;
    if (!selectedWeekId) return 0;
    const idx = allWeeks.findIndex((w) => String(w.id) === String(selectedWeekId));
    return idx >= 0 ? idx : 0;
  }, [allWeeks, selectedWeekId]);
  const currentWeek = allWeeks[currentWeekIdx] || null;
  const activeVariant = useMemo(
    () => (planVariants || []).find((v) => String(v?.id) === String(activeVariantId)) || null,
    [planVariants, activeVariantId],
  );
  const normalizedDays = useMemo(() => normalizeDays(currentWeek), [currentWeek]);
  const todayDate = useMemo(() => new Date(), [currentWeekIdx, allWeeks.length]);
  const todayInfo = useMemo(() => getCurrentWeek(allWeeks, todayDate), [allWeeks, todayDate]);
  const isCurrentWeek = currentWeek?.id && todayInfo?.week?.id === currentWeek.id;
  const todayIndex = useMemo(
    () => (isCurrentWeek ? Math.max(0, Math.min(6, getDayIndex(todayDate))) : -1),
    [isCurrentWeek, todayDate],
  );
  const selectedDay =
    selectedDayIndex != null && selectedDayIndex >= 0 && selectedDayIndex < daysState.length
      ? daysState[selectedDayIndex]
      : null;

  useEffect(() => {
    setDaysState(normalizedDays);
  }, [normalizedDays, currentWeek?.id]);

  useEffect(() => {
    if (!daysState.length) {
      setSelectedDayIndex(null);
      return;
    }
    if (todayIndex >= 0) {
      setSelectedDayIndex(todayIndex);
      return;
    }
    setSelectedDayIndex(0);
  }, [daysState, todayIndex, currentWeekIdx, isCurrentWeek]);
  const currentWeekOrder = useMemo(() => {
    const ord = Number(currentWeek?.week_order ?? currentWeek?._weekOrder);
    return Number.isFinite(ord) && ord > 0 ? ord : null;
  }, [currentWeek?.week_order, currentWeek?._weekOrder]);
  const raceDate = useMemo(() => {
    if (profile?.target_race_date) return parseRaceDateValue(profile.target_race_date);
    return getVariantRaceDate(allWeeks, activeVariant);
  }, [profile?.target_race_date, allWeeks, activeVariant]);
  const daysToRace = useMemo(() => {
    if (!raceDate) return null;
    return Math.max(0, Math.round((raceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [raceDate]);
  const raceName = String(
    profile?.target_race_name || activeVariant?.target_race_name || activeVariant?.race_name || "",
  ).trim();
  const weekDateRangeDisplay = useMemo(
    () => String(currentWeek?.dates || "").toUpperCase(),
    [currentWeek?.dates],
  );
  const phaseCtx = useMemo(() => {
    const base = computePhaseProgress(
      allWeeks,
      Number(todayInfo?.week?.week_order ?? todayInfo?.week?._weekOrder ?? null),
      Number(todayInfo?.todayDayIndex ?? 0),
    );
    const currentName = String(currentWeek?.phase || currentWeek?._blockLabel || base?.phaseName || "").trim();
    const progress = base || {
      phase: { name: currentName || "Base" },
      phaseTotalWeeks: 1,
      currentWeekInPhase: 1,
      phaseProgressPercent: 100,
      phaseStatusLabel: "Wk 1 of 1",
    };
    return {
      isDeloadWeek: /deload/i.test(String(currentWeek?.subtitle || "")),
      currentWeekInPhase: progress.currentWeekInPhase,
      phaseTotalWeeks: progress.phaseTotalWeeks,
      phaseProgressPercent: Number(progress.phaseProgressPercent || 0),
      phaseStatusLabel: progress.phaseStatusLabel || `Wk ${progress.currentWeekInPhase} of ${progress.phaseTotalWeeks}`,
    };
  }, [allWeeks, currentWeek, currentWeek?._blockLabel, currentWeek?.phase, currentWeek?.subtitle, todayInfo?.todayDayIndex, todayInfo?.week?._weekOrder, todayInfo?.week?.week_order]);
  const hasPrevWeek = useMemo(() => {
    if (currentWeekOrder == null) return false;
    return weekByOrder.has(Number(currentWeekOrder) - 1);
  }, [currentWeekOrder, weekByOrder]);
  const hasNextWeek = useMemo(() => {
    if (currentWeekOrder == null) return false;
    return weekByOrder.has(Number(currentWeekOrder) + 1);
  }, [currentWeekOrder, weekByOrder]);

  useEffect(() => {
    if (!import.meta.env.DEV || !currentWeek) return;
    console.log("[PlanWeekView] selected week_order", {
      weekOrder: currentWeekOrder,
      weekId: currentWeek.id,
      phase: currentWeek.phase || currentWeek._blockLabel,
    });
  }, [currentWeek, currentWeekOrder]);

  const weeklyStructure = useMemo(() => {
    const days = daysState;
    let weekType = extractWeekTypeFromNotes(days);
    if (weekType === "STANDARD" && /deload/i.test(String(currentWeek?.subtitle || ""))) {
      weekType = "DELOAD";
    }
    let plannedSessions = 0;
    let completedCount = 0;
    for (const d of days) {
      const slot = d?.am_session || d?.am;
      if (slot && !String(slot).toUpperCase().includes("REST")) {
        plannedSessions += 1;
      }
      if (getCompletionState(d, activityMatches).complete) completedCount += 1;
    }
    const pct = plannedSessions ? (completedCount / plannedSessions) * 100 : 0;
    return {
      weekType,
      plannedSessions,
      completedCount,
      compliancePercent: pct,
    };
  }, [daysState, currentWeek?.subtitle, activityMatches]);

  const resolveCompletionState = useCallback(
    (day) => getCompletionState(day, activityMatches),
    [activityMatches],
  );

  const weekFocus = useMemo(
    () => deriveWeekFocusText(currentWeek?.phase || currentWeek?._blockLabel, weeklyStructure.weekType),
    [currentWeek?.phase, currentWeek?._blockLabel, weeklyStructure.weekType],
  );

  const focusKeySessions = useMemo(
    () => getTopKeySessions(daysState),
    [daysState],
  );

  const nextWeekPreview = useMemo(() => {
    if (currentWeekOrder == null) return "Stay consistent with the plan. Trust the periodization.";
    const nextWeek = weekByOrder.get(Number(currentWeekOrder) + 1);
    if (!nextWeek) return "Stay consistent with the plan. Trust the periodization.";
    return deriveNextWeekPreview(nextWeek);
  }, [currentWeekOrder, weekByOrder]);

  const recentComplianceWeeks = useMemo(() => {
    const rows = allWeeks.map((week) => {
      const days = normalizeDays(week);
      let planned = 0;
      let completed = 0;
      for (const day of days) {
        const slot = day?.am_session || day?.am;
        if (slot && !String(slot).toUpperCase().includes("REST")) {
          planned += 1;
          if (getCompletionState(day, activityMatches).complete) completed += 1;
        }
      }
      return {
        weekId: week.id,
        weekOrder: getWeekOrderValue(week, null),
        weekLabel: week?.label || `Week ${getWeekOrderValue(week, "—")}`,
        days,
        planned,
        completed,
      };
    });
    const currentIdx = rows.findIndex((r) => String(r.weekId) === String(currentWeek?.id));
    if (currentIdx < 0) return rows.slice(-4);
    return rows.slice(Math.max(0, currentIdx - 3), currentIdx + 1);
  }, [allWeeks, activityMatches, currentWeek?.id]);

  const isOnTodayInThisWeek = isCurrentWeek && selectedDayIndex === todayIndex;

  function setDisplayedWeek(weekRef, preferredDayIndex = null) {
    const targetWeek =
      allWeeks.find((w) => String(w?.id) === String(weekRef)) ||
      weekByOrder.get(Number(weekRef)) ||
      null;
    if (!targetWeek) return;
    const nextDays = normalizeDays(targetWeek);
    const nextToday = getCurrentWeek([targetWeek], new Date());
    setSelectedWeekId(targetWeek.id);
    setDaysState(nextDays);
    if (Number.isInteger(preferredDayIndex) && nextDays.length) {
      const clamped = Math.max(0, Math.min(nextDays.length - 1, Number(preferredDayIndex)));
      setSelectedDayIndex(clamped);
    } else if (nextToday?.week?.id === targetWeek?.id) {
      setSelectedDayIndex(getDayIndex(new Date()));
    } else {
      setSelectedDayIndex(nextDays.length ? 0 : null);
    }
    if (import.meta.env.DEV) {
      console.log("[PlanWeekView] navigate", {
        selectedWeekId: targetWeek.id,
        weekOrder: getWeekOrderValue(targetWeek, null),
      });
    }
  }

  const handlePrev = () => {
    const sortedWeeks = [...sortedWeeksForNav].sort(
      (a, b) => getWeekOrderValue(a) - getWeekOrderValue(b),
    );
    const currentOrder = currentWeek?.week_order ?? currentWeek?._weekOrder ?? null;
    const prev = getAdjacentWeekByOrder(sortedWeeks, currentOrder, -1);
    if (prev) setSelectedWeekId(prev.id);
  };

  const handleNext = () => {
    const sortedWeeks = [...sortedWeeksForNav].sort(
      (a, b) => getWeekOrderValue(a) - getWeekOrderValue(b),
    );
    const currentOrder = currentWeek?.week_order ?? currentWeek?._weekOrder ?? null;
    const next = getAdjacentWeekByOrder(sortedWeeks, currentOrder, +1);
    if (next) setSelectedWeekId(next.id);
  };

  async function loadWeekDays(targetWeek = currentWeek) {
    const weekId = inferWeekId(targetWeek);
    if (!supabase || !user?.id || !weekId) return;
    const { data, error } = await supabase
      .from("training_days")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_id", weekId)
      .order("day_name", { ascending: true });
    if (error) {
      console.error("[PlanWeekView] loadWeekDays:", error.message);
      return;
    }
    if (Array.isArray(data) && data.length) {
      const nextDays = normalizeDays({ ...targetWeek, days: data });
      setDaysState(nextDays);
      if (selectedDayIndex == null) setSelectedDayIndex(nextDays.length ? 0 : null);
    }
  }

  async function handleSaveEdit(editedBlocks) {
    if (!selectedDay?.id || !user?.id) return;
    const { error } = await supabase
      .from("training_days")
      .update({
        am_session_blocks: editedBlocks,
        is_user_modified: true,
      })
      .eq("id", selectedDay.id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[PlanWeekView] save edit:", error.message);
      return;
    }
    const nextDays = daysState.map((d, i) =>
      i === selectedDayIndex
        ? { ...d, am_session_blocks: editedBlocks, is_user_modified: true }
        : d,
    );
    setDaysState(nextDays);
    setSelectedDayIndex((prev) => (prev == null ? 0 : prev));
  }

  async function handleSaveNote(noteText) {
    if (!selectedDay?.id || !user?.id) return;
    const { error } = await supabase
      .from("training_days")
      .update({
        note: noteText,
        is_user_modified: true,
      })
      .eq("id", selectedDay.id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[PlanWeekView] save note:", error.message);
      return;
    }
    const nextDays = daysState.map((d, i) =>
      i === selectedDayIndex ? { ...d, note: noteText, is_user_modified: true } : d,
    );
    setDaysState(nextDays);
    setSelectedDayIndex((prev) => (prev == null ? 0 : prev));
  }

  async function handleResetCompletion(dayToReset) {
    if (!supabase || !user?.id || !dayToReset?.id) return;
    const shouldReset = typeof window !== "undefined"
      ? window.confirm("Reset this completion and remove submitted feedback?")
      : true;
    if (!shouldReset) return;

    const userId = user.id;
    const { error: feedbackErr } = await supabase
      .from("session_feedback")
      .delete()
      .eq("user_id", userId)
      .eq("training_day_id", dayToReset.id)
      .eq("session_slot", "am");
    if (feedbackErr) {
      console.error("[PlanWeekView] reset feedback:", feedbackErr.message);
      return;
    }

    let resetQ = supabase
      .from("training_days")
      .update({ am_completed_at: null })
      .eq("id", dayToReset.id)
      .eq("user_id", userId);
    if (activeVariantId) resetQ = resetQ.or(`variant_id.eq.${activeVariantId},variant_id.is.null`);
    else resetQ = resetQ.is("variant_id", null);
    const { error: dayErr } = await resetQ;
    if (dayErr) {
      console.error("[PlanWeekView] reset completion:", dayErr.message);
      return;
    }

    await loadWeekDays(currentWeek);
    await onPlanRefetch?.();
  }

  function jumpToToday() {
    if (!todayInfo?.week) return;
    const target = allWeeks.find((w) => String(w.id) === String(todayInfo.week.id));
    if (target) {
      setSelectedWeekId(target.id);
      setSelectedDayIndex(todayInfo.todayDayIndex ?? getDayIndex(new Date()));
    }
  }

  if (planLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "2px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          LOADING PLAN...
        </div>
      </div>
    );
  }

  if (!planBlocks?.length) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "3px",
            marginBottom: 16,
            textTransform: "uppercase",
          }}
        >
          No training plan found
        </div>
        <button
          type="button"
          onClick={onOpenPlanBuilder}
          style={{
            background: "#C9A875",
            color: "#0D0E10",
            border: "none",
            borderRadius: 16,
            padding: "16px 28px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Build my plan
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 100px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "20px 4px 14px",
        }}
      >
        <span
          style={{
            fontSize: typography.sizePageTitle,
            fontWeight: typography.weightSemibold,
            color: colors.accentGold,
            letterSpacing: "3px",
          }}
        >
          PLAN
        </span>
        <span
          style={{
            fontSize: 10,
            color: colors.textTertiary,
            fontWeight: typography.weightMedium,
            letterSpacing: "1.2px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {weekDateRangeDisplay}
        </span>
      </div>

      {(planVariants || []).length > 1 ? (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "10px 12px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "2px" }}>
            ACTIVE PLAN
          </div>
          <select
            value={activeVariantId || ""}
            onChange={(e) => onSwitchVariant?.(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: 13,
              outline: "none",
            }}
          >
            {(planVariants || []).map((v) => (
              <option key={v.id} value={v.id} style={{ background: "#16181C" }}>
                {v.variant_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <PhaseHeaderStrip
        currentPhaseName={String(currentWeek?.phase || currentWeek?._blockLabel || "Training").trim()}
        currentWeekOrder={currentWeekOrder}
        totalWeeks={totalWeeks}
        raceDate={raceDate}
        raceName={raceName || null}
        daysToRace={daysToRace}
        isDeloadWeek={phaseCtx.isDeloadWeek}
        currentWeekInPhase={phaseCtx.currentWeekInPhase}
        phaseTotalWeeks={phaseCtx.phaseTotalWeeks}
        onTapBlockView={() => setShowBlockTimeline(true)}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 0 10px",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={handlePrev}
          disabled={!hasPrevWeek}
          style={navBtn(!hasPrevWeek)}
        >
          ←
        </button>
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "1.4px",
            textAlign: "center",
            lineHeight: 1.4,
            fontVariantNumeric: "tabular-nums",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {currentWeek?.label || (currentWeekOrder ? `WEEK ${currentWeekOrder}` : "")}
        </div>
        <button
          type="button"
          onClick={handleNext}
          disabled={!hasNextWeek}
          style={navBtn(!hasNextWeek)}
        >
          →
        </button>
      </div>

      {!isOnTodayInThisWeek ? (
        <button
          type="button"
          onClick={jumpToToday}
          style={{
            width: "100%",
            padding: 6,
            background: "transparent",
            border: "0.5px dashed rgba(201,168,117,0.25)",
            borderRadius: 8,
            fontSize: 9,
            fontWeight: 500,
            color: "rgba(201,168,117,0.6)",
            letterSpacing: "1.4px",
            marginBottom: 10,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          ⊙ JUMP TO TODAY
        </button>
      ) : null}

      {selectedDay ? (
        <SessionHeroCard
          day={selectedDay}
          isToday={selectedDayIndex === todayIndex}
          weekPhase={String(currentWeek?.phase || currentWeek?._blockLabel || "")}
          useWorkoutDetailV2={useWorkoutDetailV2}
          completionState={resolveCompletionState(selectedDay)}
          onMarkComplete={() => {
            setFeedbackDay(selectedDay);
            setFeedbackOpen(true);
          }}
          onResetComplete={() => handleResetCompletion(selectedDay)}
          onSaveEdit={handleSaveEdit}
          onSaveNote={handleSaveNote}
        />
      ) : null}

      <PlanQuadrant
        weekDays={daysState}
        todayDayIndex={isCurrentWeek ? todayIndex : null}
        phaseProgress={phaseCtx}
        weekFocus={weekFocus}
        weekType={weeklyStructure.weekType}
        completionResolver={resolveCompletionState}
        onTapDay={(idx) => setSelectedDayIndex(idx)}
        onTapPhase={() => setShowBlockTimeline(true)}
        onTapFocus={() => setShowWeekFocusModal(true)}
        onTapCompliance={() => setShowComplianceModal(true)}
      />

      <WeeklyStructureSnapshot
        days={daysState}
        todayDayIndex={isCurrentWeek ? todayIndex : null}
        weekType={weeklyStructure.weekType}
        matches={activityMatches}
        completionResolver={resolveCompletionState}
      />

      {showBlockTimeline ? (
        <PlanBlockTimeline
          blocks={planBlocks}
          currentWeekOrder={currentWeekOrder}
          currentWeekPhase={currentWeek?.phase || currentWeek?._blockLabel || ""}
          currentWeekId={currentWeek?.id}
          onClose={() => setShowBlockTimeline(false)}
          onSelectWeek={(weekId) => {
            setDisplayedWeek(weekId);
            setShowBlockTimeline(false);
          }}
        />
      ) : null}

      {showWeekFocusModal ? (
        <WeekFocusModal
          phaseName={String(currentWeek?.phase || currentWeek?._blockLabel || "Current Phase")}
          weekLabel={currentWeek?.label || `Week ${currentWeekOrder || "—"}`}
          weekType={weeklyStructure.weekType}
          focusText={weekFocus}
          keySessions={focusKeySessions}
          nextWeekPreview={nextWeekPreview}
          onClose={() => setShowWeekFocusModal(false)}
        />
      ) : null}

      {showComplianceModal ? (
        <ComplianceDetailModal
          currentWeekLabel={currentWeek?.label || `Week ${currentWeekOrder || "—"}`}
          currentWeekDays={daysState}
          completionResolver={resolveCompletionState}
          recentWeeks={recentComplianceWeeks}
          onNavigateToDay={(weekId, dayIndex) => {
            setDisplayedWeek(weekId, dayIndex);
            setShowComplianceModal(false);
          }}
          onClose={() => setShowComplianceModal(false)}
        />
      ) : null}

      {feedbackOpen && feedbackDay && user?.id ? (
        <SessionFeedbackSheet
          slot="am"
          onClose={() => {
            setFeedbackOpen(false);
            setFeedbackDay(null);
          }}
          onSave={async (feedback) => {
            const userId = user.id;
            const { error: e1 } = await supabase.from("session_feedback").insert({
              user_id: userId,
              training_day_id: feedbackDay.id,
              session_slot: "am",
              rpe_bucket: mapRpeBucketForDb(feedback.rpe_bucket),
              rpe_numeric: feedback.rpe_numeric,
              notes: feedback.notes,
              completed_at: new Date().toISOString(),
            });
            if (e1) throw e1;
            const completedAt = new Date().toISOString();
            let dayQ = supabase
              .from("training_days")
              .update({ am_completed_at: completedAt })
              .eq("id", feedbackDay.id)
              .eq("user_id", userId);
            if (activeVariantId) dayQ = dayQ.or(`variant_id.eq.${activeVariantId},variant_id.is.null`);
            else dayQ = dayQ.is("variant_id", null);
            const { error: e2 } = await dayQ;
            if (e2) throw e2;
            setFeedbackOpen(false);
            setFeedbackDay(null);
            await loadWeekDays(currentWeek);
            await onPlanRefetch?.();
          }}
        />
      ) : null}
    </div>
  );
}

function navBtn(disabled) {
  return {
    width: 32,
    height: 28,
    background: "transparent",
    border: "0.5px solid rgba(255,255,255,0.12)",
    color: disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.72)",
    borderRadius: 8,
    padding: 0,
    fontSize: 13,
    lineHeight: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif",
  };
}
