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

  useEffect(() => {
    if (!open) return;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token}` };
      const end = new Date().toISOString().slice(0, 10);
      const startD = new Date();
      startD.setDate(startD.getDate() - 27);
      const start = startD.toISOString().slice(0, 10);

      const [metricsRes, baselinesRes] = await Promise.all([
        fetch(`/api/metrics/range?start=${start}&end=${end}`, { headers }),
        fetch("/api/metrics/baselines", { headers }),
      ]);
      const metricsData = await metricsRes.json();
      const baselinesData = await baselinesRes.json();
      setMetrics(Array.isArray(metricsData) ? metricsData : []);
      setBaselines(normalizeBaselinesPayload(baselinesData));
    })();
  }, [open, supabase]);

  const now = new Date();
  const currentWeekStart = startOfIsoWeek(now);
  const weeks = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - (3 - w) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
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
    });
  }

  const currentWeek = weeks[3] || { value: 0, metrics: [] };
  const bestWeek = weeks.length ? weeks.reduce((max, w) => (w.value > max.value ? w : max), weeks[0]) : { value: 0 };
  const avgWeek = weeks.length ? weeks.reduce((sum, w) => sum + w.value, 0) / weeks.length : 0;
  const target = 240;
  const baselineWeeklyZ2 = baselines?.baseline_z2_weekly_min;

  const dow = now.getDay();
  const dayIdx = dow === 0 ? 7 : dow;

  return (
    <DeepDiveModal
      open={open}
      onClose={onClose}
      subtitle="Weekly Progress"
      title="Zone 2 Training"
      sourceLabel={dataSources?.primaryActivitySource}
    >
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
          {currentWeek.value}
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
            color: currentWeek.value >= target ? "#5dffa0" : "rgba(255,255,255,0.3)",
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {currentWeek.value >= target ? `✓ Target hit · +${currentWeek.value - target} min` : `${target - currentWeek.value} min to target`}
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

      <SectionLabel>Last 4 Weeks</SectionLabel>
      <WeeklyBars
        data={weeks}
        maxValue={Math.max(target, baselineWeeklyZ2 || 0, ...weeks.map((w) => w.value))}
        targetValue={240}
        baselineValue={baselineWeeklyZ2 != null ? Math.round(Number(baselineWeeklyZ2)) : null}
        accentColor="#C9A875"
        showValues
      />

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatTile label="Avg" value={Math.round(avgWeek)} unit="min" />
        <StatTile label="Best" value={bestWeek.value} unit="min" accent="#5dffa0" />
        <StatTile label="Target" value={target} unit="min" accent="#C9A875" />
      </div>

      <SectionLabel>{"This Week's Sessions"}</SectionLabel>
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {currentWeek.metrics.filter((m) => m.z2_minutes > 0).length === 0 ? (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            No Z2 activities logged this week yet
          </div>
        ) : (
          currentWeek.metrics
            .filter((m) => m.z2_minutes > 0)
            .map((m, i, arr) => {
              const d = new Date(m.date);
              const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
              return (
                <div
                  key={m.date}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                      {dayName} · {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                      {m.total_activity_min || 0} min total activity
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: 18,
                      color: "#C9A875",
                    }}
                  >
                    {m.z2_minutes}{" "}
                    <span style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.3)" }}>
                      min Z2
                    </span>
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
