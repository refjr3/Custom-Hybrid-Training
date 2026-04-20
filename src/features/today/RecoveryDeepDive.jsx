import { useState, useEffect } from "react";
import { DeepDiveModal } from "./DeepDiveModal.jsx";
import { TrendDots, StatTile, SectionLabel, InsightCard } from "./DeepDiveCharts.jsx";
import { evaluateHRV, evaluateRHR, evaluateReadiness } from "../../../api/lib/thresholds.js";

function normalizeBaselinesPayload(json) {
  if (!json || typeof json !== "object" || json.error) return null;
  return json;
}

export const RecoveryDeepDive = ({ open, onClose, supabase, dataSources }) => {
  const [metrics, setMetrics] = useState([]);
  const [baselines, setBaselines] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
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
      } catch (e) {
        console.error("[recovery deep dive]", e);
      }
      setLoading(false);
    };
    load();
  }, [open, supabase]);

  const sortedMetrics = [...metrics].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const chartRows = sortedMetrics.filter((m) => m.readiness_score != null && !Number.isNaN(Number(m.readiness_score)));
  const validCount = chartRows.length;
  const recoverySubtitle =
    validCount >= 10 ? "30-Day Trend" : validCount >= 7 ? `Last ${validCount} days` : "Building history…";
  const recoverySectionLabel =
    validCount >= 20 ? "30-Day Recovery" : validCount >= 7 ? `Last ${validCount} days` : "Building history…";

  const today = sortedMetrics[sortedMetrics.length - 1];
  const todayScore = today?.readiness_score;
  const todayColor = today?.readiness_color || "gray";

  const colorMap = {
    green: "#5dffa0",
    yellow: "#ffd84d",
    red: "#FF6B6B",
    gray: "rgba(255,255,255,0.2)",
  };

  const recoveryDots = chartRows.map((m) => ({
    date: m.date,
    value: m.readiness_score,
    color: colorMap[m.readiness_color] || colorMap.gray,
  }));

  const hrvDots = chartRows.map((m) => ({
    date: m.date,
    value: m.hrv_rmssd,
    color: "#C9A875",
  }));

  const rhrDots = chartRows.map((m) => ({
    date: m.date,
    value: m.resting_hr,
    color: "#4db8ff",
  }));

  const greenDays = sortedMetrics.filter((m) => m.readiness_color === "green").length;
  const yellowDays = sortedMetrics.filter((m) => m.readiness_color === "yellow").length;
  const redDays = sortedMetrics.filter((m) => m.readiness_color === "red").length;

  const hrvValues = chartRows.filter((m) => m.hrv_rmssd).map((m) => m.hrv_rmssd);
  const firstHalf = hrvValues.slice(0, Math.floor(hrvValues.length / 2));
  const lastHalf = hrvValues.slice(Math.floor(hrvValues.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
  const lastAvg = lastHalf.reduce((a, b) => a + b, 0) / (lastHalf.length || 1);
  const hrvTrend = lastAvg > firstAvg + 2 ? "up" : lastAvg < firstAvg - 2 ? "down" : "flat";

  const recoveryAnnotation = (() => {
    const lastFive = chartRows.slice(-5).map((m) => m.readiness_score).filter((v) => v != null && !Number.isNaN(Number(v)));
    const trending =
      lastFive.length >= 3 && Number(lastFive[lastFive.length - 1]) > Number(lastFive[0]) + 10;
    if (trending) return "↑ Trending up last 5 days";
    const greens = sortedMetrics.filter((m) => m.readiness_color === "green").length;
    return `${greens} green days this month`;
  })();

  const hrvAnnotation =
    hrvTrend === "up"
      ? "↑ Trending up vs 30-day baseline"
      : hrvTrend === "down"
        ? "↓ Below baseline — recovery signal"
        : "Steady at baseline";

  const readinessThreshold = evaluateReadiness(todayScore);
  const hrvThreshold = evaluateHRV(today?.hrv_rmssd, baselines?.baseline_hrv_rmssd);
  const rhrThreshold = evaluateRHR(today?.resting_hr, baselines?.baseline_resting_hr);

  return (
    <DeepDiveModal
      open={open}
      onClose={onClose}
      subtitle={recoverySubtitle}
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

      {validCount < 3 && !loading ? (
        <div
          style={{
            marginBottom: 20,
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
          Recovery history will build as WHOOP syncs. Check back in a few days.
        </div>
      ) : null}

      <SectionLabel>{recoverySectionLabel}</SectionLabel>
      {validCount >= 3 ? (
        <TrendDots
          data={recoveryDots}
          heightBand={80}
          unit=""
          yMin={0}
          yMax={100}
          baseline={baselines?.baseline_recovery_score}
          annotation={recoveryAnnotation}
        />
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatTile label="Green" value={greenDays} unit="days" accent="#5dffa0" />
        <StatTile label="Yellow" value={yellowDays} unit="days" accent="#ffd84d" />
        <StatTile label="Red" value={redDays} unit="days" accent="#FF6B6B" />
      </div>

      <SectionLabel>{validCount >= 10 ? "HRV · 30 Days" : validCount >= 7 ? `HRV · last ${validCount} days` : "HRV"}</SectionLabel>
      <TrendDots
        data={hrvDots}
        heightBand={70}
        unit="ms"
        baseline={baselines?.baseline_hrv_rmssd}
        annotation={hrvAnnotation}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatTile
          label="Current"
          value={today?.hrv_rmssd ? Math.round(today.hrv_rmssd) : "—"}
          unit="ms"
          accent="#C9A875"
          threshold={hrvThreshold}
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
          trend={{
            direction: hrvTrend === "up" ? "up" : hrvTrend === "down" ? "down" : "flat",
            text: hrvTrend === "up" ? "Rising" : hrvTrend === "down" ? "Falling" : "Flat",
          }}
        />
      </div>

      <SectionLabel>Resting Heart Rate</SectionLabel>
      <TrendDots
        data={rhrDots}
        heightBand={60}
        unit=" bpm"
        baseline={baselines?.baseline_resting_hr}
        annotation={null}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <StatTile
          label="Current"
          value={today?.resting_hr ?? "—"}
          unit="bpm"
          accent="#4db8ff"
          threshold={rhrThreshold}
        />
        <StatTile
          label="Readiness"
          value={todayScore ?? "—"}
          unit=""
          accent={colorMap[todayColor]}
          threshold={readinessThreshold}
        />
      </div>

      <InsightCard>
        Your highest readiness days tend to follow 7+ hours of sleep and moderate training load. Consistency in sleep timing has a stronger effect than any single night.
      </InsightCard>
    </DeepDiveModal>
  );
};
