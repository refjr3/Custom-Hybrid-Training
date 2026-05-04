import { useEffect, useMemo, useState } from "react";
import { PhaseHeaderStrip } from "./components/PhaseHeaderStrip.jsx";
import { DayCard } from "./components/DayCard.jsx";
import SessionDetail from "./SessionDetail.jsx";
import PlanBlockTimeline from "./PlanBlockTimeline.jsx";
import { getPhaseGradient, getPhaseStatusLabel } from "./components/intentConfig.js";

function parseWeekOrder(week, fallbackOrder) {
  const label = String(week?.label || "");
  const fromLabel = Number(label.match(/\d+/)?.[0]);
  if (Number.isFinite(fromLabel) && fromLabel > 0) return fromLabel;
  const fromField = Number(week?.week_order);
  if (Number.isFinite(fromField) && fromField > 0) return fromField;
  return fallbackOrder;
}

function parseDateLabelToIso(label, yearHint = new Date().getFullYear()) {
  if (!label) return null;
  const parsed = new Date(`${String(label).trim()} ${yearHint}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function parseWeekRange(week) {
  const raw = String(week?.dates || "");
  if (!raw.includes("-")) return { startIso: null, endIso: null };
  const [left, right] = raw.split("-").map((part) => part.trim());
  const year = new Date().getFullYear();
  return {
    startIso: parseDateLabelToIso(left, year),
    endIso: parseDateLabelToIso(right, year),
  };
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
  const range = parseWeekRange(week);
  const start = range.startIso ? new Date(`${range.startIso}T12:00:00`) : null;
  return days.map((day, idx) => {
    const dateLabel = String(day?.date_label || day?.date || "").trim();
    const labelIso = parseDateLabelToIso(dateLabel);
    let iso = labelIso;
    if (!iso && start) {
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
      _iso: iso,
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
  const [selectedDay, setSelectedDay] = useState(null);
  const [showBlockTimeline, setShowBlockTimeline] = useState(false);

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
      setSelectedDay(null);
      return;
    }
    const todayIso = new Date().toISOString().slice(0, 10);
    const nextIdx = allWeeks.findIndex((week) => normalizeDays(week).some((d) => d._iso === todayIso));
    setCurrentWeekIdx(nextIdx >= 0 ? nextIdx : 0);
    setSelectedDay(null);
  }, [allWeeks]);

  const totalWeeks = allWeeks.length;
  const currentWeek = allWeeks[currentWeekIdx] || null;
  const days = useMemo(() => normalizeDays(currentWeek), [currentWeek]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentWeekOrder = currentWeek?._weekOrder || currentWeekIdx + 1;
  const phaseCtx = useMemo(() => {
    const phases = Array.isArray(activeVariant?.phases) ? activeVariant.phases : [];
    const currentName = String(currentWeek?._blockLabel || currentWeek?.phase || "").trim();
    const normalizedCurrent = normalizePhaseKey(currentName);
    let match =
      phases.find((p) => normalizePhaseKey(p?.name) === normalizedCurrent) ||
      phases.find((p) => {
        const start = Number(p?.start_week);
        const end = Number(p?.end_week);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
        return currentWeekOrder >= start && currentWeekOrder <= end;
      }) ||
      null;
    if (!match && phases.length > 0) match = phases[0];
    const start = Number(match?.start_week);
    const end = Number(match?.end_week);
    const phaseStart = Number.isFinite(start) && start > 0 ? start : currentWeekOrder;
    const phaseEnd = Number.isFinite(end) && end >= phaseStart ? end : phaseStart;
    const total = Math.max(1, phaseEnd - phaseStart + 1);
    const inPhase = Math.max(1, Math.min(total, currentWeekOrder - phaseStart + 1));
    const percent = Math.max(0, Math.min(100, Math.round((inPhase / total) * 100)));
    return {
      isDeloadWeek: /deload/i.test(String(currentWeek?.subtitle || "")),
      currentWeekInPhase: inPhase,
      phaseTotalWeeks: total,
      phaseProgressPercent: percent,
      phaseStatusLabel: getPhaseStatusLabel(inPhase, total),
      phaseGradient: getPhaseGradient(match?.name || currentName),
    };
  }, [activeVariant?.phases, currentWeek?._blockLabel, currentWeek?.phase, currentWeek?.subtitle, currentWeekOrder]);

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

      {days.map((day) => (
        <DayCard
          key={day.id}
          day={day}
          isToday={day._iso === todayIso}
          isPast={Boolean(day._iso && day._iso < todayIso)}
          onTap={() => setSelectedDay(day)}
        />
      ))}

      {selectedDay ? (
        <SessionDetail
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
          supabase={supabase}
          user={user}
        />
      ) : null}

      {showBlockTimeline ? (
        <PlanBlockTimeline
          blocks={planBlocks}
          currentWeekOrder={currentWeek?._weekOrder || currentWeekIdx + 1}
          onClose={() => setShowBlockTimeline(false)}
          onSelectWeek={(weekOrder) => {
            const idx = allWeeks.findIndex((w) => Number(w._weekOrder) === Number(weekOrder));
            if (idx >= 0) setCurrentWeekIdx(idx);
            setShowBlockTimeline(false);
          }}
        />
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
