import { useState, useEffect } from "react";
import { DeepDiveModal } from "./DeepDiveModal.jsx";
import { TrendDots, StatTile, SectionLabel, InsightCard } from "./DeepDiveCharts.jsx";

export const RecoveryDeepDive = ({ open, onClose, supabase, dataSources }) => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
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
      } catch (e) {
        console.error("[recovery deep dive]", e);
      }
      setLoading(false);
    };
    load();
  }, [open, supabase]);

  const today = metrics[metrics.length - 1];
  const todayScore = today?.readiness_score;
  const todayColor = today?.readiness_color || "gray";

  const colorMap = {
    green: "#5dffa0",
    yellow: "#ffd84d",
    red: "#FF6B6B",
    gray: "rgba(255,255,255,0.2)",
  };

  const recoveryDots = metrics.map((m) => ({
    value: m.readiness_score,
    color: colorMap[m.readiness_color] || colorMap.gray,
  }));

  const hrvDots = metrics.map((m) => ({
    value: m.hrv_rmssd,
    color: "#C9A875",
  }));

  const rhrDots = metrics.map((m) => ({
    value: m.resting_hr,
    color: "#4db8ff",
  }));

  const greenDays = metrics.filter((m) => m.readiness_color === "green").length;
  const yellowDays = metrics.filter((m) => m.readiness_color === "yellow").length;
  const redDays = metrics.filter((m) => m.readiness_color === "red").length;

  const hrvValues = metrics.filter((m) => m.hrv_rmssd).map((m) => m.hrv_rmssd);
  const firstHalf = hrvValues.slice(0, Math.floor(hrvValues.length / 2));
  const lastHalf = hrvValues.slice(Math.floor(hrvValues.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
  const lastAvg = lastHalf.reduce((a, b) => a + b, 0) / (lastHalf.length || 1);
  const hrvTrend = lastAvg > firstAvg + 2 ? "up" : lastAvg < firstAvg - 2 ? "down" : "flat";

  return (
    <DeepDiveModal
      open={open}
      onClose={onClose}
      subtitle="30-Day Trend"
      title="Recovery"
      sourceLabel={dataSources?.primaryRecoverySource}
    >
      <div
        style={{
          textAlign: "center",
          padding: "8px 0 24px",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 72,
            color: colorMap[todayColor],
            lineHeight: 1,
            letterSpacing: "-3px",
            textShadow: `0 0 30px ${colorMap[todayColor]}30`,
          }}
        >
          {todayScore ?? "—"}
        </div>
        <div
          style={{
            fontSize: 11,
            color: colorMap[todayColor],
            opacity: 0.6,
            fontWeight: 500,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          Today · {todayColor}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Loading recovery history...</div>
      ) : null}

      <SectionLabel>30-Day Recovery</SectionLabel>
      <TrendDots data={recoveryDots} heightBand={70} />

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatTile label="Green" value={greenDays} unit="days" accent="#5dffa0" />
        <StatTile label="Yellow" value={yellowDays} unit="days" accent="#ffd84d" />
        <StatTile label="Red" value={redDays} unit="days" accent="#FF6B6B" />
      </div>

      <SectionLabel>HRV · 30 Days</SectionLabel>
      <TrendDots data={hrvDots} heightBand={60} />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatTile
          label="Current"
          value={today?.hrv_rmssd ? Math.round(today.hrv_rmssd) : "—"}
          unit="ms"
          accent="#C9A875"
        />
        <StatTile
          label="30-Day Avg"
          value={hrvValues.length ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) : "—"}
          unit="ms"
        />
        <StatTile
          label="Trend"
          value={hrvTrend === "up" ? "↑" : hrvTrend === "down" ? "↓" : "→"}
          accent={hrvTrend === "up" ? "#5dffa0" : hrvTrend === "down" ? "#FF6B6B" : "rgba(255,255,255,0.5)"}
        />
      </div>

      <SectionLabel>Resting Heart Rate</SectionLabel>
      <TrendDots data={rhrDots} heightBand={60} />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatTile label="Current" value={today?.resting_hr || "—"} unit="bpm" accent="#4db8ff" />
      </div>

      <InsightCard>
        Your highest readiness days tend to follow 7+ hours of sleep and moderate training load. Consistency in sleep timing has a stronger effect than any single night.
      </InsightCard>
    </DeepDiveModal>
  );
};
