import { useState, useEffect } from "react";
import { DeepDiveModal } from "./DeepDiveModal.jsx";
import { WeeklyBars, StatTile, SectionLabel, InsightCard } from "./DeepDiveCharts.jsx";

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

export const Z2DeepDive = ({ open, onClose, supabase, dataSources }) => {
  const [metrics, setMetrics] = useState([]);
  const [baselines, setBaselines] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentWeekMinutes, setCurrentWeekMinutes] = useState(null);
  const [currentWeekActivities, setCurrentWeekActivities] = useState([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(3);

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
        setCurrentWeekMinutes(
          currentWeekData?.weeklyZ2Minutes != null && Number.isFinite(Number(currentWeekData.weeklyZ2Minutes))
            ? Math.round(Number(currentWeekData.weeklyZ2Minutes))
            : null
        );
        setCurrentWeekActivities(Array.isArray(currentWeekData?.activities) ? currentWeekData.activities : []);
      } catch (e) {
        console.error("[z2 deep dive]", e);
        setCurrentWeekMinutes(null);
        setCurrentWeekActivities([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, supabase]);

  const sortedMetrics = [...metrics].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const z2DayRows = sortedMetrics.filter((m) => m.z2_minutes != null && Number(m.z2_minutes) > 0);
  const validCount = z2DayRows.length;
  const z2Subtitle =
    validCount >= 10 ? "Weekly Progress" : validCount >= 7 ? `Last ${validCount} days` : "Building history…";
  const z2WeeksSectionLabel =
    validCount >= 20 ? "Last 4 Weeks" : validCount >= 7 ? `Last ${validCount} days` : "Building history…";

  const now = new Date();
  const currentWeekStart = startOfIsoWeek(now);
  const weeks = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - (3 - w) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const fmtShort = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const rangeLabel = `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`;
    const weekMetrics = metrics.filter((m) => {
      const d = new Date(m.date);
      d.setHours(0, 0, 0, 0);
      return d >= weekStart && d <= weekEnd;
    });
    const total = weekMetrics.reduce((sum, m) => sum + (m.z2_minutes || 0), 0);
    const label = w === 3 ? "This wk" : `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    weeks.push({
      label,
      value: total,
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
  const bestWeek = weeks.length ? weeks.reduce((max, w) => (w.value > max.value ? w : max), weeks[0]) : { value: 0 };
  const avgWeek = weeks.length ? weeks.reduce((sum, w) => sum + w.value, 0) / weeks.length : 0;
  const target = 240;
  const baselineWeeklyZ2 = baselines?.baseline_z2_weekly_min;

  const dow = now.getDay();
  const dayIdx = dow === 0 ? 7 : dow;

  const selectedWeek = weeks[selectedWeekIndex] || currentWeek;
  const isCurrentWeekSelected = selectedWeekIndex === 3;

  const sessionRowsFromStrava = Array.isArray(currentWeekActivities) ? currentWeekActivities : [];
  const sessionRowsFromMetrics = (currentWeek.metrics || []).filter((m) => (m.z2_minutes || 0) > 0);
  const pastWeekDayRows = !isCurrentWeekSelected
    ? [...(selectedWeek.metrics || [])]
        .filter((m) => (m.z2_minutes || 0) > 0)
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

  return (
    <DeepDiveModal
      open={open}
      onClose={onClose}
      subtitle={z2Subtitle}
      title="Zone 2 Training"
      sourceLabel={dataSources?.primaryActivitySource}
    >
      {loading ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>Loading Z2 data…</div>
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
          Z2 history will build as Strava syncs. Check back in a few days.
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
            color: "#C9A875",
            lineHeight: 1,
            letterSpacing: "-3px",
          }}
        >
          {heroValue}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(201,168,117,0.5)",
            fontWeight: 500,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          Minutes · Target {target}
        </div>
        <div
          style={{
            fontSize: 10,
            color: heroValue >= target ? "#5dffa0" : "rgba(255,255,255,0.3)",
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {heroValue >= target ? `✓ Target hit · +${heroValue - target} min` : `${target - heroValue} min to target`}
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

      <SectionLabel>{z2WeeksSectionLabel}</SectionLabel>
      <WeeklyBars
        data={weeks}
        maxValue={Math.max(target, baselineWeeklyZ2 || 0, ...weeks.map((w) => w.value))}
        targetValue={240}
        baselineValue={baselineWeeklyZ2 != null ? Math.round(Number(baselineWeeklyZ2)) : null}
        accentColor="#C9A875"
        showValues
        onBarClick={(i) => setSelectedWeekIndex(i)}
        selectedIndex={selectedWeekIndex}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatTile label="Avg" value={Math.round(avgWeek)} unit="min" />
        <StatTile label="Best" value={bestWeek.value} unit="min" accent="#5dffa0" />
        <StatTile label="Target" value={target} unit="min" accent="#C9A875" />
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
          sessionRowsFromStrava.map((a, i, arr) => (
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
                  color: "#C9A875",
                  flexShrink: 0,
                  textAlign: "right",
                  lineHeight: 1.2,
                }}
              >
                {a.z2Minutes ?? 0}m Z2
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
          ))
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
              ? "No Z2 activities logged this week yet"
              : "No Z2 in this week (from synced totals)"}
          </div>
        ) : (
          dayRollupList.map((m, i, arr) => {
            const d = new Date(`${String(m.date).slice(0, 10)}T12:00:00`);
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const cal = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
                    {dayName} {cal} · {m.z2_minutes} min Z2
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
        Z2 work builds your aerobic base — the foundation that lets you recover between hard efforts. 4+ hours per week is the sweet spot for most hybrid athletes.
      </InsightCard>
    </DeepDiveModal>
  );
};
