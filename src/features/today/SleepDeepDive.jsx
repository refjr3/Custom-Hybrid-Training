import { useState, useEffect } from "react";
import { DeepDiveModal } from "./DeepDiveModal.jsx";
import { TrendDots, WeeklyBars, StatTile, SectionLabel, InsightCard } from "./DeepDiveCharts.jsx";

function normalizeBaselinesPayload(json) {
  if (!json || typeof json !== "object" || json.error) return null;
  return json;
}

export const SleepDeepDive = ({ open, onClose, supabase, dataSources }) => {
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
      startD.setDate(startD.getDate() - 29);
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

  const today = metrics[metrics.length - 1];
  const hours = today?.sleep_total_min ? today.sleep_total_min / 60 : null;

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const match = metrics.find((m) => String(m.date || "").slice(0, 10) === iso);
    last7.push({
      label: d.toLocaleDateString("en-US", { weekday: "narrow" }),
      value: match?.sleep_total_min ? match.sleep_total_min / 60 : 0,
      isCurrent: i === 0,
      date: iso,
    });
  }

  const last7Max = Math.max(10, 7, ...last7.map((n) => n.value || 0));

  const scoreDots = metrics.map((m) => ({
    date: m.date,
    value: m.sleep_score,
    color: "#9B8FD1",
  }));

  const sleepValues = metrics.filter((m) => m.sleep_total_min).map((m) => m.sleep_total_min);
  const avgMin = sleepValues.length ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length : 0;
  const avgDeep =
    metrics.filter((m) => m.sleep_deep_min).reduce((sum, m) => sum + m.sleep_deep_min, 0) /
    (metrics.filter((m) => m.sleep_deep_min).length || 1);
  const avgRem =
    metrics.filter((m) => m.sleep_rem_min).reduce((sum, m) => sum + m.sleep_rem_min, 0) /
    (metrics.filter((m) => m.sleep_rem_min).length || 1);

  const totalMin = today?.sleep_total_min || 0;
  const deepPct = totalMin ? ((today?.sleep_deep_min || 0) / totalMin) * 100 : 0;
  const remPct = totalMin ? ((today?.sleep_rem_min || 0) / totalMin) * 100 : 0;
  const lightPct = totalMin ? ((today?.sleep_light_min || 0) / totalMin) * 100 : 0;
  const awakePct = totalMin ? ((today?.sleep_awake_min || 0) / totalMin) * 100 : 0;

  const durationThreshold = (() => {
    if (hours == null) return null;
    if (hours >= 7) return { color: "green", text: "Adequate" };
    if (hours >= 6) return { color: "amber", text: "Short" };
    return { color: "red", text: "Insufficient" };
  })();

  const deepThreshold = (() => {
    if (!today?.sleep_deep_min || baselines?.baseline_sleep_deep_min == null) return null;
    const delta = today.sleep_deep_min - baselines.baseline_sleep_deep_min;
    if (delta < -10) return { color: "amber", text: `${Math.abs(Math.round(delta))}min below baseline` };
    if (delta > 10) return { color: "green", text: `${Math.round(delta)}min above baseline` };
    return { color: "green", text: "Typical" };
  })();

  const awakeThreshold = (() => {
    if (today?.sleep_awake_min == null) return null;
    const base = baselines?.baseline_sleep_awake_min ?? 20;
    if (today.sleep_awake_min > base + 25) return { color: "red", text: "Highly disrupted" };
    if (today.sleep_awake_min > base + 10) return { color: "amber", text: `${Math.round(today.sleep_awake_min - base)}min above baseline` };
    return { color: "green", text: "Normal" };
  })();

  const scoreValues = metrics.map((m) => m.sleep_score).filter((v) => v != null && !Number.isNaN(Number(v)));
  const scoreAvg = scoreValues.length
    ? Math.round(scoreValues.reduce((a, b) => a + Number(b), 0) / scoreValues.length)
    : null;
  const scoreAnnotation =
    scoreAvg != null ? `30-night avg score ${scoreAvg}` : "Wear your ring or strap consistently for a score trend.";

  const last7Annotation =
    hours != null && hours < 7
      ? "Under 7h nights — prioritize earlier bedtimes."
      : "Bars are total time in bed (hours). Line marks 7h target.";

  return (
    <DeepDiveModal
      open={open}
      onClose={onClose}
      subtitle="Last Night"
      title="Sleep"
      sourceLabel={dataSources?.primarySleepSource}
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
            color: "#9B8FD1",
            lineHeight: 1,
            letterSpacing: "-3px",
          }}
        >
          {hours ? Math.floor(hours) : "—"}
          {hours ? <span style={{ fontSize: 32, color: "rgba(155,143,209,0.5)" }}>h</span> : null}
          {hours ? (
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24 }}>{Math.round((hours % 1) * 60)}</span>
          ) : null}
          {hours ? <span style={{ fontSize: 18, color: "rgba(155,143,209,0.5)" }}>m</span> : null}
        </div>
        {today?.sleep_score ? (
          <div
            style={{
              fontSize: 11,
              color: "rgba(155,143,209,0.6)",
              fontWeight: 500,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            Score · {today.sleep_score}
          </div>
        ) : null}
      </div>

      {totalMin > 0 ? (
        <>
          <SectionLabel>Sleep Architecture</SectionLabel>
          <div
            style={{
              display: "flex",
              height: 40,
              borderRadius: 10,
              overflow: "hidden",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ width: `${deepPct}%`, background: "#4a3f8a" }} title="Deep" />
            <div style={{ width: `${remPct}%`, background: "#8b7ed1" }} title="REM" />
            <div style={{ width: `${lightPct}%`, background: "#c8bee8" }} title="Light" />
            <div style={{ width: `${awakePct}%`, background: "rgba(255,255,255,0.15)" }} title="Awake" />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            <div style={{ color: "#4a3f8a" }}>● Deep {Math.round(today.sleep_deep_min)}m</div>
            <div style={{ color: "#8b7ed1" }}>● REM {Math.round(today.sleep_rem_min)}m</div>
            <div style={{ color: "rgba(200,190,232,0.7)" }}>● Light {Math.round(today.sleep_light_min)}m</div>
            <div style={{ color: "rgba(255,255,255,0.3)" }}>● Awake {Math.round(today.sleep_awake_min)}m</div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <StatTile
              label="Duration"
              value={hours != null ? hours.toFixed(1) : "—"}
              unit="hrs"
              accent="#9B8FD1"
              threshold={durationThreshold}
            />
            <StatTile
              label="Deep"
              value={Math.round(today?.sleep_deep_min || 0)}
              unit="min"
              accent="#9B8FD1"
              threshold={deepThreshold}
            />
            <StatTile
              label="Awake"
              value={Math.round(today?.sleep_awake_min || 0)}
              unit="min"
              accent="#9B8FD1"
              threshold={awakeThreshold}
            />
          </div>
        </>
      ) : null}

      <SectionLabel>Last 7 Nights</SectionLabel>
      <WeeklyBars
        data={last7}
        maxValue={last7Max}
        targetValue={7}
        targetLabel="TARGET 7h"
        unit="h"
        accentColor="#9B8FD1"
        showValues
      />
      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          textAlign: "center",
        }}
      >
        {last7Annotation}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatTile label="Avg" value={(avgMin / 60).toFixed(1)} unit="hrs" accent="#9B8FD1" />
        <StatTile label="Avg Deep" value={Math.round(avgDeep)} unit="min" />
        <StatTile label="Avg REM" value={Math.round(avgRem)} unit="min" />
      </div>

      <SectionLabel>Sleep Score · 30 Days</SectionLabel>
      <TrendDots
        data={scoreDots}
        heightBand={70}
        yMin={0}
        yMax={100}
        baseline={baselines?.baseline_sleep_score}
        annotation={scoreAnnotation}
      />

      <InsightCard>
        Sleep consistency matters more than any single night. Athletes who average 7+ hours with regular bed times recover 20% faster between hard sessions.
      </InsightCard>
    </DeepDiveModal>
  );
};
