import { useState, useEffect } from "react";
import { DeepDiveModal } from "./DeepDiveModal.jsx";
import { WeeklyBars, StatTile, SectionLabel, InsightCard } from "./DeepDiveCharts.jsx";
import { InfoPop } from "../../components/InfoPop.jsx";
import { metricExplainers } from "../explainers/metrics.js";
import { ZONES, normalizeZoneKey } from "./zoneConfig.js";

function startOfIsoWeek(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function normalizeBaselinesPayload(json) {
  if (!json || typeof json !== "object" || json.error) return null;
  return json;
}

const sectionLabelRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginTop: 28,
  marginBottom: 12,
};
const sectionLabelTextStyle = {
  flex: 1,
  fontSize: 9,
  fontWeight: 600,
  color: "rgba(255,255,255,0.3)",
  letterSpacing: "2.5px",
  textTransform: "uppercase",
};

function sessionZoneMinutes(a, zoneKey) {
  if (zoneKey === "z3") return a?.z3Minutes ?? 0;
  if (zoneKey === "z4_plus") return a?.z4PlusMinutes ?? 0;
  return a?.z2Minutes ?? 0;
}

function dayZoneMinutes(m, zoneKey) {
  if (zoneKey === "z3") return m?.z3_minutes ?? 0;
  if (zoneKey === "z4_plus") return m?.z4_plus_minutes ?? 0;
  return m?.z2_minutes ?? 0;
}

export const ZoneVolumeDeepDive = ({
  open,
  onClose,
  supabase,
  dataSources,
  profile,
  selectedZone,
  zoneConfig,
  zoneTarget,
  onTargetChange,
}) => {
  const [metrics, setMetrics] = useState([]);
  const [baselines, setBaselines] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentWeekMinutes, setCurrentWeekMinutes] = useState(null);
  const [currentWeekActivities, setCurrentWeekActivities] = useState([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(3);
  const [localTarget, setLocalTarget] = useState(zoneTarget);

  useEffect(() => {
    setLocalTarget(zoneTarget);
  }, [zoneTarget, selectedZone]);

  useEffect(() => {
    if (open) setSelectedWeekIndex(3);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers = {
          Authorization: `Bearer ${session?.access_token}`,
          ...(session?.user?.id ? { "x-user-id": session.user.id } : {}),
        };
        const end = new Date().toISOString().slice(0, 10);
        const startD = new Date();
        startD.setDate(startD.getDate() - 27);
        const start = startD.toISOString().slice(0, 10);

        const [metricsRes, baselinesRes, currentWeekRes] = await Promise.all([
          fetch(`/api/metrics/range?start=${start}&end=${end}`, { headers }),
          fetch("/api/metrics/baselines", { headers }),
          fetch("/api/strava/weekly-z2", { headers, credentials: "include" }),
        ]);

        const metricsData = await metricsRes.json();
        const baselinesData = await baselinesRes.json();
        const currentWeekData = await currentWeekRes.json().catch(() => ({}));

        setMetrics(Array.isArray(metricsData) ? metricsData : []);
        setBaselines(normalizeBaselinesPayload(baselinesData));

        const wzm =
          currentWeekData?.weeklyZoneMinutes && typeof currentWeekData.weeklyZoneMinutes === "object"
            ? currentWeekData.weeklyZoneMinutes
            : null;
        let zoneMin;
        if (wzm) {
          zoneMin =
            selectedZone === "z2"
              ? Number(wzm.z2)
              : selectedZone === "z3"
                ? Number(wzm.z3)
                : Number(wzm.z4_plus);
        } else {
          zoneMin = Number(currentWeekData?.weeklyZ2Minutes ?? 0);
        }
        setCurrentWeekMinutes(
          zoneMin != null && Number.isFinite(zoneMin) ? Math.round(zoneMin) : null,
        );
        setCurrentWeekActivities(Array.isArray(currentWeekData?.activities) ? currentWeekData.activities : []);
      } catch (e) {
        console.error("[zone volume deep dive]", e);
        setCurrentWeekMinutes(null);
        setCurrentWeekActivities([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, supabase, selectedZone]);

  const sortedMetrics = [...metrics].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const dayRows = sortedMetrics.filter((m) => dayZoneMinutes(m, selectedZone) > 0);
  const validCount = dayRows.length;
  const zoneSubtitle =
    validCount >= 10 ? "Weekly Progress" : validCount >= 7 ? `Last ${validCount} days` : "Building history…";
  const weeksSectionLabel =
    validCount >= 20 ? "Last 4 Weeks" : validCount >= 7 ? `Last ${validCount} days` : "Building history…";

  const now = new Date();
  const currentWeekStart = startOfIsoWeek(now);
  const weeks = [];

  for (let w = 0; w < 4; w += 1) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - (3 - w) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const fmtShort = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const rangeLabel = `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`;
    const weekMetrics = sortedMetrics.filter((m) => {
      const d = new Date(m.date);
      d.setHours(0, 0, 0, 0);
      return d >= weekStart && d <= weekEnd;
    });
    let totalZ2 = 0;
    let totalZ3 = 0;
    let totalZ4Plus = 0;
    for (const m of weekMetrics) {
      totalZ2 += m.z2_minutes || 0;
      totalZ3 += m.z3_minutes || 0;
      totalZ4Plus += m.z4_plus_minutes || 0;
    }
    const label = w === 3 ? "This wk" : `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    const barValue =
      selectedZone === "z2" ? totalZ2 : selectedZone === "z3" ? totalZ3 : totalZ4Plus;
    weeks.push({
      label,
      value: barValue,
      values: { z2: totalZ2, z3: totalZ3, z4_plus: totalZ4Plus },
      isCurrent: w === 3,
      metrics: weekMetrics,
      rangeLabel,
    });
  }

  if (currentWeekMinutes != null && weeks.length > 0) {
    weeks[weeks.length - 1].value = currentWeekMinutes;
  }

  const currentWeek = weeks[3] || { value: 0, metrics: [], activities: [] };
  const heroValue = currentWeekMinutes ?? currentWeek.value ?? 0;
  const bestWeek = weeks.length ? weeks.reduce((max, wk) => (wk.value > max.value ? wk : max), weeks[0]) : { value: 0 };
  const avgWeek = weeks.length ? weeks.reduce((sum, wk) => sum + wk.value, 0) / weeks.length : 0;
  const baselineWeeklyZone =
    selectedZone === "z2" ? baselines?.baseline_z2_weekly_min : null;

  const dow = now.getDay();
  const dayIdx = dow === 0 ? 7 : dow;

  const selectedWeek = weeks[selectedWeekIndex] || currentWeek;
  const isCurrentWeekSelected = selectedWeekIndex === 3;

  const sessionRowsFromStrava = Array.isArray(currentWeekActivities) ? currentWeekActivities : [];
  const sessionRowsFromMetrics = (currentWeek.metrics || []).filter(
    (m) => dayZoneMinutes(m, selectedZone) > 0,
  );
  const pastWeekDayRows = !isCurrentWeekSelected
    ? [...(selectedWeek.metrics || [])]
        .filter((m) => dayZoneMinutes(m, selectedZone) > 0)
        .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    : [];

  const useStravaSessions = isCurrentWeekSelected && sessionRowsFromStrava.length > 0;
  const useDayRollupRows =
    !useStravaSessions &&
    (isCurrentWeekSelected ? sessionRowsFromMetrics.length > 0 : pastWeekDayRows.length > 0);
  const dayRollupList = isCurrentWeekSelected ? sessionRowsFromMetrics : pastWeekDayRows;

  const sessionsSectionLabel = isCurrentWeekSelected
    ? "This Week's Sessions"
    : selectedWeek.rangeLabel
      ? `Week of ${selectedWeek.rangeLabel}`
      : "Sessions";

  const normalizedZone = normalizeZoneKey(selectedZone);
  const zoneExplainer = metricExplainers[normalizedZone] || metricExplainers.z2;

  const modalTitle = `${zoneConfig.fullLabel} Training`;

  return (
    <DeepDiveModal
      open={open}
      onClose={onClose}
      subtitle={zoneSubtitle}
      title={modalTitle}
      sourceLabel={dataSources?.primaryActivitySource}
    >
      {loading ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
          Loading {zoneConfig.label} data…
        </div>
      ) : null}

      {validCount < 3 && !loading ? (
        <div
          style={{
            marginBottom: 16,
            padding: "16px 14px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.45)",
            textAlign: "center",
          }}
        >
          {zoneConfig.fullLabel} history will build as Strava syncs. Check back in a few days.
        </div>
      ) : null}

      <div
        style={{
          textAlign: "center",
          padding: "8px 0 20px",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 72,
            color: zoneConfig.color,
            lineHeight: 1,
            letterSpacing: "-3px",
          }}
        >
          {heroValue}
        </div>
        <div
          style={{
            fontSize: 11,
            color: zoneConfig.colorDim,
            fontWeight: 500,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          Minutes · Target {zoneTarget}
        </div>
        <div
          style={{
            fontSize: 10,
            color: heroValue >= zoneTarget ? "#5dffa0" : "rgba(255,255,255,0.3)",
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {heroValue >= zoneTarget
            ? `✓ Target hit · +${heroValue - zoneTarget} min`
            : `${zoneTarget - heroValue} min to target`}
        </div>
        {dayIdx <= 2 ? (
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              textAlign: "center",
            }}
          >
            Week just started — no pace pressure yet.
          </div>
        ) : null}
      </div>

      <div style={sectionLabelRowStyle}>
        <div style={sectionLabelTextStyle}>{weeksSectionLabel}</div>
        <InfoPop
          title={zoneExplainer.title}
          short={zoneExplainer.short}
          detailed={zoneExplainer.detailed}
          userContext={zoneExplainer.userContext?.(
            profile,
            Math.round(Number(heroValue)),
            zoneTarget,
          )}
          icon="i"
          size={11}
        />
      </div>
      <WeeklyBars
        data={weeks}
        maxValue={Math.max(
          localTarget,
          baselineWeeklyZone || 0,
          ...weeks.map((wk) => wk.value),
        )}
        targetValue={localTarget}
        baselineValue={baselineWeeklyZone != null ? Math.round(Number(baselineWeeklyZone)) : null}
        accentColor={zoneConfig.color}
        showValues
        onBarClick={(i) => setSelectedWeekIndex(i)}
        selectedIndex={selectedWeekIndex}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatTile label="Avg" value={Math.round(avgWeek)} unit="min" />
        <StatTile label="Best" value={bestWeek.value} unit="min" accent="#5dffa0" />
        <StatTile label="Target" value={localTarget} unit="min" accent={zoneConfig.color} />
      </div>

      <SectionLabel>Weekly Target</SectionLabel>
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16,
          padding: "16px 18px",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Your {zoneConfig.label} target
          </div>
          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 22,
              color: zoneConfig.color,
            }}
          >
            {localTarget}{" "}
            <span
              style={{
                fontSize: 11,
                fontFamily: "'DM Sans', sans-serif",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              min/wk
            </span>
          </div>
        </div>
        <input
          type="range"
          min={selectedZone === "z4_plus" ? 0 : selectedZone === "z3" ? 0 : 60}
          max={selectedZone === "z4_plus" ? 120 : selectedZone === "z3" ? 240 : 600}
          step={15}
          value={localTarget}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (Number.isFinite(v)) setLocalTarget(v);
          }}
          style={{
            width: "100%",
            accentColor: zoneConfig.color,
            cursor: "pointer",
          }}
        />
        <div
          style={{
            textAlign: "center",
            marginTop: 8,
            fontFamily: "'DM Serif Display', serif",
            fontSize: 28,
            color: zoneConfig.color,
            letterSpacing: "-0.5px",
          }}
        >
          {localTarget}
          <span
            style={{
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              color: "rgba(255,255,255,0.4)",
              marginLeft: 6,
            }}
          >
            min / week
          </span>
        </div>
        {localTarget !== zoneTarget && onTargetChange ? (
          <button
            type="button"
            onClick={async () => {
              await onTargetChange(localTarget);
            }}
            style={{
              width: "100%",
              marginTop: 12,
              background: `${zoneConfig.color}1f`,
              border: `1px solid ${zoneConfig.color}59`,
              borderRadius: 16,
              padding: "14px",
              color: zoneConfig.color,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.5px",
            }}
          >
            Save — {localTarget} min/week
          </button>
        ) : null}
        {localTarget === zoneTarget && zoneTarget !== ZONES[selectedZone]?.defaultTarget ? (
          <div
            style={{
              textAlign: "center",
              marginTop: 10,
              fontSize: 11,
              color: "rgba(93,255,160,0.7)",
              fontWeight: 500,
            }}
          >
            ✓ Target saved
          </div>
        ) : null}
      </div>

      <SectionLabel>{sessionsSectionLabel}</SectionLabel>
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {useStravaSessions ? (
          sessionRowsFromStrava.map((a, i, arr) => {
            const zm = sessionZoneMinutes(a, selectedZone);
            return (
              <div
                key={`${a.name}-${a.dateYmd || a.date}-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                    {a.dateHeading ? `${a.dateHeading} · ` : ""}
                    {a.name || "Activity"}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                    {a.type || "Workout"}
                    {typeof a.distance_mi === "number" && a.distance_mi > 0 ? ` · ${a.distance_mi} mi` : ""}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 18,
                    color: zoneConfig.color,
                    flexShrink: 0,
                    textAlign: "right",
                    lineHeight: 1.2,
                  }}
                >
                  {zm}m {zoneConfig.label}
                  {a.total_min != null && Number(a.total_min) > 0 ? (
                    <div
                      style={{
                        fontSize: 9,
                        fontFamily: "'DM Sans', sans-serif",
                        color: "rgba(255,255,255,0.28)",
                        fontWeight: 500,
                        marginTop: 2,
                      }}
                    >
                      {a.total_min} min total
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : !useDayRollupRows ? (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            {isCurrentWeekSelected
              ? `No ${zoneConfig.label} activities logged this week yet`
              : `No ${zoneConfig.label} in this week (from synced totals)`}
          </div>
        ) : (
          dayRollupList.map((m, i, arr) => {
            const d = new Date(`${String(m.date).slice(0, 10)}T12:00:00`);
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const cal = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const dm = dayZoneMinutes(m, selectedZone);
            return (
              <div
                key={m.date}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                    {dayName} {cal} · {dm} min {zoneConfig.label}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                    {m.total_activity_min || 0} min total activity
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <InsightCard>
        {selectedZone === "z2" ? (
          <p>
            Z2 work builds your aerobic base — the foundation for everything. 4+ hours weekly is the sweet spot for
            hybrid athletes.
          </p>
        ) : null}
        {selectedZone === "z3" ? (
          <p>
            Z3 tempo work builds lactate threshold capacity. Less is more here — 60-90 min weekly is plenty for most
            athletes.
          </p>
        ) : null}
        {selectedZone === "z4_plus" ? (
          <p>
            Z4+ work builds VO2max and race-specific fitness. Keep volume low and quality high — 20-40 min weekly is
            the sweet spot.
          </p>
        ) : null}
      </InsightCard>
    </DeepDiveModal>
  );
};
