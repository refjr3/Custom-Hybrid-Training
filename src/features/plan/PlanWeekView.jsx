import { useEffect, useMemo, useRef, useState } from "react";
import { PhaseHeaderStrip } from "./components/PhaseHeaderStrip.jsx";
import { WeekGrid } from "./components/WeekGrid.jsx";
import PlanBlockTimeline from "./PlanBlockTimeline.jsx";
import { getPhaseGradient } from "./components/intentConfig.js";
import { SessionHeroCard } from "./components/SessionHeroCard.jsx";
import {
  computePhaseProgress,
  getCurrentWeek,
  getDayIndex,
  parseWeekDates,
} from "./lib/weekDateUtils.js";

function parseWeekOrder(week, fallbackOrder) {
  const label = String(week?.label || "");
  const fromLabel = Number(label.match(/\d+/)?.[0]);
  if (Number.isFinite(fromLabel) && fromLabel > 0) return fromLabel;
  const fromField = Number(week?.week_order);
  if (Number.isFinite(fromField) && fromField > 0) return fromField;
  return fallbackOrder;
}

function normalizePhaseKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
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
}) {
  const [currentWeekIdx, setCurrentWeekIdx] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [showBlockTimeline, setShowBlockTimeline] = useState(false);
  const [feedbackTargetDayId, setFeedbackTargetDayId] = useState(null);
  const [daysState, setDaysState] = useState([]);
  const discardWarnedRef = useRef(false);

  const activeVariant = useMemo(
    () => (planVariants || []).find((v) => v.id === activeVariantId) || null,
    [planVariants, activeVariantId],
  );

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

  useEffect(() => {
    if (!allWeeks.length) {
      setCurrentWeekIdx(0);
      setSelectedDayIndex(null);
      return;
    }
    const current = getCurrentWeek(allWeeks, new Date());
    const nextIdx = allWeeks.findIndex((w) => w.id === current?.week?.id);
    setCurrentWeekIdx(nextIdx >= 0 ? nextIdx : 0);
    setSelectedDayIndex(null);
  }, [allWeeks]);

  const totalWeeks = allWeeks.length;
  const currentWeek = allWeeks[currentWeekIdx] || null;
  const normalizedDays = useMemo(() => normalizeDays(currentWeek), [currentWeek]);
  const todayDate = useMemo(() => new Date(), [currentWeekIdx, allWeeks.length]);
  const todayIso = todayDate.toISOString().slice(0, 10);
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
  const currentWeekOrder = currentWeek?._weekOrder || currentWeekIdx + 1;
  const phases = Array.isArray(activeVariant?.phases) ? activeVariant.phases : [];
  const phaseCtx = useMemo(() => {
    const base = computePhaseProgress(allWeeks, currentWeekOrder, phases);
    const currentName = String(currentWeek?._blockLabel || currentWeek?.phase || base?.phase?.name || "").trim();
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
      phaseProgressPercent: progress.phaseProgressPercent,
      phaseStatusLabel: progress.phaseStatusLabel || getPhaseStatusLabel(progress.currentWeekInPhase, progress.phaseTotalWeeks),
      phaseGradient: getPhaseGradient(progress.phase?.name || currentName),
    };
  }, [allWeeks, phases, currentWeek?._blockLabel, currentWeek?.phase, currentWeek?.subtitle, currentWeekOrder]);

  const isOnTodayInThisWeek = isCurrentWeek && selectedDayIndex === todayIndex;

  async function handleSaveEdit(editedBlocks) {
    if (!selectedDay?.id || !user?.id) return;
    const { error } = await supabase
      .from("training_days")
      .update({
        am_session_blocks: editedBlocks,
        is_user_modified: true,
      })
      .eq("id", selectedDay.id);
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

  function jumpToToday() {
    if (!todayInfo?.week) return;
    const idx = allWeeks.findIndex((w) => w.id === todayInfo.week.id);
    if (idx >= 0) {
      setCurrentWeekIdx(idx);
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
        currentPhaseName={currentWeek?._blockLabel || currentWeek?.phase || "Training"}
        currentWeekOrder={currentWeekOrder}
        totalWeeks={totalWeeks}
        raceDate={profile?.target_race_date}
        isDeloadWeek={phaseCtx.isDeloadWeek}
        currentWeekInPhase={phaseCtx.currentWeekInPhase}
        phaseTotalWeeks={phaseCtx.phaseTotalWeeks}
        phaseProgressPercent={phaseCtx.phaseProgressPercent}
        phaseStatusLabel={phaseCtx.phaseStatusLabel}
        phaseGradient={phaseCtx.phaseGradient}
        onTapBlockView={() => setShowBlockTimeline(true)}
      />

      {!isOnTodayInThisWeek ? (
        <button
          type="button"
          onClick={jumpToToday}
          style={{
            width: "100%",
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px dashed rgba(201,168,117,0.45)",
            background: "rgba(201,168,117,0.06)",
            color: "#C9A875",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          ⊙ Jump to today
        </button>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentWeekIdx((i) => Math.max(0, i - 1))}
          disabled={currentWeekIdx === 0}
          style={navBtn(currentWeekIdx === 0)}
        >
          ← Prev
        </button>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "1.5px",
            textAlign: "center",
            lineHeight: 1.4,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {currentWeek?.label || `Week ${currentWeekIdx + 1}`} · {currentWeek?.dates || ""}
        </div>
        <button
          type="button"
          onClick={() => setCurrentWeekIdx((i) => Math.min(allWeeks.length - 1, i + 1))}
          disabled={currentWeekIdx >= allWeeks.length - 1}
          style={navBtn(currentWeekIdx >= allWeeks.length - 1)}
        >
          Next →
        </button>
      </div>

      <WeekGrid
        days={daysState}
        selectedDayIndex={selectedDayIndex}
        todayIndex={todayIndex}
        onSelectDay={(idx) => {
          if (!discardWarnedRef.current) {
            discardWarnedRef.current = true;
          }
          setSelectedDayIndex(idx);
        }}
      />

      {selectedDay ? (
        <SessionHeroCard
          day={selectedDay}
          isToday={selectedDayIndex === todayIndex}
          onMarkComplete={() => {
            setFeedbackTargetDayId(selectedDay.id);
          }}
          onSaveEdit={handleSaveEdit}
        />
      ) : null}

      {showBlockTimeline ? (
        <PlanBlockTimeline
          blocks={planBlocks}
          currentWeekOrder={currentWeek?._weekOrder || currentWeekIdx + 1}
          onClose={() => setShowBlockTimeline(false)}
          onSelectWeek={(weekOrder) => {
            const idx = allWeeks.findIndex((w) => Number(w._weekOrder) === Number(weekOrder));
            if (idx >= 0) {
              setCurrentWeekIdx(idx);
              const nextDays = normalizeDays(allWeeks[idx]);
              setDaysState(nextDays);
              const nextToday = getCurrentWeek([allWeeks[idx]], todayDate);
              if (nextToday?.week?.id === allWeeks[idx].id) setSelectedDayIndex(getDayIndex(todayDate));
              else setSelectedDayIndex(nextDays.length ? 0 : null);
            }
            setShowBlockTimeline(false);
          }}
        />
      ) : null}

      {feedbackTargetDayId ? (
        <div style={{ display: "none" }} data-feedback-target-day-id={feedbackTargetDayId} />
      ) : null}
    </div>
  );
}

function navBtn(disabled) {
  return {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.75)",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    minWidth: 74,
    fontFamily: "'DM Sans', sans-serif",
  };
}
