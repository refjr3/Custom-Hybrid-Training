/* global Map, console */
import { useEffect, useState } from "react";
import TrainingLoadCard from "./components/TrainingLoadCard.jsx";
import { SectionLabel, RecoveryDial, MetricCard } from "../../design/components";
import { colors, spacing, typography } from "../../design/tokens";

function avg(arr) {
  const valid = (Array.isArray(arr) ? arr : []).map(Number).filter((v) => Number.isFinite(v));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
}

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function roundOrNull(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (digits <= 0) return Math.round(n);
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function mergeRowsByDay(rows) {
  const byDate = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const date = String(row?.date || "");
    if (!date) continue;

    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        recoveryScore: null,
        hrv: null,
        rhr: null,
        sleepHours: null,
        strain: null,
        ctl: null,
        atl: null,
        tsb: null,
      });
    }
    const merged = byDate.get(date);
    const source = String(row?.source || "").toLowerCase();

    // Load/recovery metrics should come from intervals/is_primary rows.
    if (row?.recovery_score != null && (merged.recoveryScore == null || source === "intervals" || row?.is_primary === true)) {
      merged.recoveryScore = Number(row.recovery_score);
    }
    if (row?.ctl != null && (merged.ctl == null || source === "intervals" || row?.is_primary === true)) {
      merged.ctl = Number(row.ctl);
    }
    if (row?.tsb != null && (merged.tsb == null || source === "intervals" || row?.is_primary === true)) {
      merged.tsb = Number(row.tsb);
    }
    if (row?.training_load != null && (merged.atl == null || source === "intervals" || row?.is_primary === true)) {
      merged.atl = Number(row.training_load);
    }

    // HRV: intervals.hrv preferred, fallback to whoop.hrv_rmssd.
    if (row?.hrv != null && (source === "intervals" || row?.is_primary === true)) {
      merged.hrv = roundOrNull(row.hrv, 0);
    }
    if (merged.hrv == null) {
      if (row?.hrv_rmssd != null && source === "whoop") {
        merged.hrv = roundOrNull(row.hrv_rmssd, 0);
      }
    }

    // RHR: intervals.rhr preferred, fallback to whoop.resting_hr.
    if (row?.rhr != null && (source === "intervals" || row?.is_primary === true)) {
      merged.rhr = roundOrNull(row.rhr, 0);
    }
    if (merged.rhr == null) {
      if (row?.resting_hr != null && source === "whoop") {
        merged.rhr = roundOrNull(row.resting_hr, 0);
      }
    }

    // Sleep comes from WHOOP rows.
    if (row?.sleep_total_min != null && source === "whoop" && merged.sleepHours == null) {
      merged.sleepHours = roundOrNull(Number(row.sleep_total_min) / 60, 1);
    }

    // Strain should stay on WHOOP 0-21 scale only.
    if (source === "whoop" && row?.strain != null) {
      const strain = Number(row.strain);
      if (Number.isFinite(strain) && strain <= 25) {
        merged.strain = roundOrNull(strain, 1);
      }
    }
  }

  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function trendDirection(series) {
  const values = (Array.isArray(series) ? series : []).map(Number).filter((v) => Number.isFinite(v));
  if (values.length < 2) return "flat";
  const diff = values[values.length - 1] - values[0];
  if (Math.abs(diff) < 0.001) return "flat";
  return diff > 0 ? "up" : "down";
}

function trendColor(series, polarity = "neutral") {
  const direction = trendDirection(series);
  if (direction === "flat" || polarity === "neutral") return colors.accentGold;
  if (polarity === "higherIsBetter") {
    return direction === "up" ? colors.semanticGood : colors.semanticBad;
  }
  if (polarity === "lowerIsBetter") {
    return direction === "up" ? colors.semanticBad : colors.semanticGood;
  }
  return colors.accentGold;
}

function trendText(series) {
  const direction = trendDirection(series);
  if (direction === "up") return "trend up";
  if (direction === "down") return "trend down";
  return "trend stable";
}

function metricValue(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (digits > 0) return n.toFixed(digits);
  return String(Math.round(n));
}

function EmptyState({ message }) {
  return (
    <div
      style={{
        marginTop: 20,
        borderRadius: spacing.cardRadius,
        border: `0.5px solid ${colors.borderSubtle}`,
        background: colors.bgCardSubtle,
        padding: `${spacing.cardPadding}px`,
        color: colors.textSecondary,
        fontSize: typography.sizeBody,
        lineHeight: 1.5,
      }}
    >
      {message}
    </div>
  );
}

export default function PerformanceView({ user, supabase }) {
  const [perfData, setPerfData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase || !user?.id) {
        setPerfData({ empty: true });
        return;
      }
      setLoading(true);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const cutoffIso = cutoff.toISOString().slice(0, 10);

      const { data: rows, error: recentErr } = await supabase
        .from("unified_metrics")
        .select("date, source, is_primary, recovery_score, hrv, hrv_rmssd, rhr, resting_hr, sleep_total_min, strain, ctl, tsb, training_load")
        .eq("user_id", user.id)
        .gte("date", cutoffIso)
        .order("date", { ascending: true });

      if (cancelled) return;
      if (recentErr) {
        console.error("[PerformanceView] load error", recentErr);
        setPerfData({ empty: true });
        setLoading(false);
        return;
      }
      if (!Array.isArray(rows) || !rows.length) {
        setPerfData({ empty: true });
        setLoading(false);
        return;
      }
      const daily = mergeRowsByDay(rows);
      if (!daily.length) {
        setPerfData({ empty: true });
        setLoading(false);
        return;
      }

      const loadCutoff = new Date();
      loadCutoff.setDate(loadCutoff.getDate() - 56);
      const loadCutoffIso = loadCutoff.toISOString().slice(0, 10);

      const { data: loadRows } = await supabase
        .from("unified_metrics")
        .select("date, source, is_primary, ctl, training_load")
        .eq("user_id", user.id)
        .gte("date", loadCutoffIso)
        .order("date", { ascending: true });

      if (cancelled) return;
      const loadDaily = mergeRowsByDay(loadRows || []);

      const today = daily[daily.length - 1];
      const sevenDayAvgRows = daily.slice(-7);
      const todayRecovery = Number(today?.recoveryScore);
      const recoveryAvg = avg(sevenDayAvgRows.map((r) => r?.recoveryScore));

      setPerfData({
        empty: false,
        recoveryScore: Number.isFinite(todayRecovery) ? todayRecovery : null,
        deltaVsAvg: Number.isFinite(todayRecovery) && Number.isFinite(recoveryAvg) && sevenDayAvgRows.length > 0
          ? Math.round(todayRecovery - recoveryAvg)
          : null,
        hrv: today?.hrv,
        rhr: today?.rhr,
        sleepHours: today?.sleepHours ?? null,
        strain: today?.strain,
        sparklines: {
          hrv: daily.map((r) => r?.hrv).filter((v) => v != null),
          rhr: daily.map((r) => r?.rhr).filter((v) => v != null),
          sleep: daily.map((r) => r?.sleepHours).filter((v) => v != null),
          strain: daily.map((r) => r?.strain).filter((v) => v != null),
        },
        ctlSeries: loadDaily.map((r) => r?.ctl).filter((v) => v != null),
        atlSeries: loadDaily.map((r) => r?.atl).filter((v) => v != null),
        currentCTL: today?.ctl,
        currentATL: today?.atl,
        currentTSB: today?.tsb,
      });
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id]);

  const data = perfData || { empty: false };
  const hrvSeries = data.sparklines?.hrv || [];
  const rhrSeries = data.sparklines?.rhr || [];
  const sleepSeries = data.sparklines?.sleep || [];
  const strainSeries = data.sparklines?.strain || [];

  return (
    <div style={{ padding: `${spacing.cardPadding + 2}px` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: colors.accentGold, letterSpacing: "3px", fontWeight: typography.weightSemibold }}>
          PERFORMANCE
        </div>
        <div style={{ fontSize: 10, color: colors.textTertiary, letterSpacing: "1.2px" }}>
          {formatToday()}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 10, color: colors.textTertiary, letterSpacing: "1.5px" }}>
          LOADING METRICS...
        </div>
      ) : null}

      {!data.empty ? (
        <>
          <RecoveryDial
            score={data.recoveryScore}
            deltaVsAvg={data.deltaVsAvg}
            size="hero"
          />

          <SectionLabel meta="14 DAYS">VITAL STATS</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: spacing.inlineGapWide,
              marginBottom: spacing.sectionGapTight,
            }}
          >
            <MetricCard
              label="HRV"
              value={metricValue(data.hrv)}
              unit="ms"
              sparklineData={hrvSeries}
              sparklineColor={trendColor(hrvSeries, "higherIsBetter")}
              trendDescriptor={trendText(hrvSeries)}
              icon="heart"
            />
            <MetricCard
              label="RHR"
              value={metricValue(data.rhr)}
              unit="bpm"
              sparklineData={rhrSeries}
              sparklineColor={trendColor(rhrSeries, "lowerIsBetter")}
              trendDescriptor={trendText(rhrSeries)}
              icon="moon"
            />
            <MetricCard
              label="Sleep"
              value={metricValue(data.sleepHours, 1)}
              unit="hrs"
              sparklineData={sleepSeries}
              sparklineColor={trendColor(sleepSeries, "higherIsBetter")}
              trendDescriptor={trendText(sleepSeries)}
              icon="bed"
            />
            <MetricCard
              label="Strain"
              value={metricValue(data.strain, 1)}
              unit=""
              sparklineData={strainSeries}
              sparklineColor={colors.accentGold}
              trendDescriptor={trendText(strainSeries)}
              icon="lightning"
            />
          </div>

          <SectionLabel meta="8 WEEKS">TRAINING LOAD</SectionLabel>
          <TrainingLoadCard
            ctlSeries={data.ctlSeries}
            atlSeries={data.atlSeries}
            currentCTL={data.currentCTL}
            currentATL={data.currentATL}
            currentTSB={data.currentTSB}
          />
        </>
      ) : (
        <EmptyState message="Sync WHOOP or your wearable to see performance metrics." />
      )}
    </div>
  );
}
