import { useState, useEffect } from "react";
import { DeepDiveModal } from "./DeepDiveModal.jsx";
import { TrendDots, WeeklyBars, StatTile, SectionLabel, InsightCard } from "./DeepDiveCharts.jsx";

export const SleepDeepDive = ({ open, onClose, supabase, dataSources }) => {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const end = new Date().toISOString().slice(0, 10);
      const startD = new Date();
      startD.setDate(startD.getDate() - 29);
      const start = startD.toISOString().slice(0, 10);
      const res = await fetch(`/api/metrics/range?start=${start}&end=${end}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      setMetrics(Array.isArray(data) ? data : []);
    })();
  }, [open, supabase]);

  const today = metrics[metrics.length - 1];
  const hours = today?.sleep_total_min ? today.sleep_total_min / 60 : null;

  const last7 = metrics.slice(-7).map((m) => ({
    label: new Date(m.date).toLocaleDateString("en-US", { weekday: "narrow" }),
    value: m.sleep_total_min ? m.sleep_total_min / 60 : 0,
    isCurrent: false,
  }));
  if (last7.length > 0) last7[last7.length - 1].isCurrent = true;

  const scoreDots = metrics.map((m) => ({
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
          {hours && <span style={{ fontSize: 32, color: "rgba(155,143,209,0.5)" }}>h</span>}
          {hours && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24 }}>{Math.round((hours % 1) * 60)}</span>}
          {hours && <span style={{ fontSize: 18, color: "rgba(155,143,209,0.5)" }}>m</span>}
        </div>
        {today?.sleep_score && (
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
        )}
      </div>

      {totalMin > 0 && (
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
        </>
      )}

      <SectionLabel>Last 7 Nights</SectionLabel>
      <WeeklyBars data={last7} maxValue={10} unit="hrs" accentColor="#9B8FD1" />

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatTile label="Avg" value={(avgMin / 60).toFixed(1)} unit="hrs" accent="#9B8FD1" />
        <StatTile label="Avg Deep" value={Math.round(avgDeep)} unit="min" />
        <StatTile label="Avg REM" value={Math.round(avgRem)} unit="min" />
      </div>

      <SectionLabel>Sleep Score · 30 Days</SectionLabel>
      <TrendDots data={scoreDots} heightBand={60} />

      <InsightCard>
        Sleep consistency matters more than any single night. Athletes who average 7+ hours with regular bed times recover 20% faster between hard sessions.
      </InsightCard>
    </DeepDiveModal>
  );
};
