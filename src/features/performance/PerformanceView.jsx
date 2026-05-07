/* global Map, console */
import { useEffect, useState } from "react";
import RecoveryHeroRing from "./components/RecoveryHeroRing.jsx";
import VitalStatsQuadrant from "./components/VitalStatsQuadrant.jsx";
import TrainingLoadCard from "./components/TrainingLoadCard.jsx";

function classifyRecovery(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "NO DATA";
  if (n >= 67) return "PRIMED";
  if (n >= 34) return "STEADY";
  return "COMPROMISED";
}

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

function SectionHeader({ label, meta }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: "rgba(201,168,117,0.72)", letterSpacing: "2px", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.42)", letterSpacing: "1.4px" }}>{meta}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div
      style={{
        marginTop: 20,
        borderRadius: 18,
        border: "0.5px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.02)",
        padding: "20px 18px",
        color: "rgba(255,255,255,0.62)",
        fontSize: 13,
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
        recoveryStatus: classifyRecovery(todayRecovery),
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

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "rgba(201,168,117,0.78)", letterSpacing: "3px", fontWeight: 600 }}>
          PERFORMANCE
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.42)", letterSpacing: "1.2px" }}>
          {formatToday()}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "1.5px" }}>
          LOADING METRICS...
        </div>
      ) : null}

      {!data.empty ? (
        <>
          <RecoveryHeroRing
            recoveryScore={data.recoveryScore}
            status={data.recoveryStatus}
            deltaVsAvg={data.deltaVsAvg}
          />

          <VitalStatsQuadrant
            hrv={data.hrv}
            rhr={data.rhr}
            sleep={data.sleepHours}
            strain={data.strain}
            sparklineData={{
              hrv: data.sparklines?.hrv,
              rhr: data.sparklines?.rhr,
              sleep: data.sparklines?.sleep,
              strain: data.sparklines?.strain,
            }}
          />

          <SectionHeader label="TRAINING LOAD" meta="8 WEEKS" />
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
