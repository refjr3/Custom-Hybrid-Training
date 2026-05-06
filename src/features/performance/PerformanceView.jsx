import { useEffect, useMemo, useState } from "react";
import RecoveryHeroRing from "./components/RecoveryHeroRing.jsx";
import VitalStatsQuadrant from "./components/VitalStatsQuadrant.jsx";
import TrainingLoadCard from "./components/TrainingLoadCard.jsx";

function classifyRecovery(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "STEADY";
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

      const { data: recent, error: recentErr } = await supabase
        .from("unified_metrics")
        .select("date, recovery_score, hrv, rhr, sleep_total_min, strain, ctl, tsb, training_load")
        .eq("user_id", user.id)
        .gte("date", cutoffIso)
        .order("date", { ascending: true });

      if (cancelled) return;
      if (recentErr || !Array.isArray(recent) || !recent.length) {
        setPerfData({ empty: true });
        setLoading(false);
        return;
      }

      const loadCutoff = new Date();
      loadCutoff.setDate(loadCutoff.getDate() - 56);
      const loadCutoffIso = loadCutoff.toISOString().slice(0, 10);

      const { data: loadHistory } = await supabase
        .from("unified_metrics")
        .select("date, ctl, training_load")
        .eq("user_id", user.id)
        .gte("date", loadCutoffIso)
        .order("date", { ascending: true });

      if (cancelled) return;

      const today = recent[recent.length - 1];
      const sevenDayAvgRows = recent.slice(-7);
      const todayRecovery = Number(today?.recovery_score);

      setPerfData({
        empty: false,
        recoveryScore: Number.isFinite(todayRecovery) ? todayRecovery : null,
        recoveryStatus: classifyRecovery(todayRecovery),
        deltaVsAvg: Number.isFinite(todayRecovery)
          ? todayRecovery - avg(sevenDayAvgRows.map((r) => r?.recovery_score))
          : 0,
        hrv: today?.hrv,
        rhr: today?.rhr,
        sleepHours: Number.isFinite(Number(today?.sleep_total_min))
          ? Number(today.sleep_total_min) / 60
          : null,
        strain: today?.strain,
        sparklines: {
          hrv: recent.map((r) => r?.hrv),
          rhr: recent.map((r) => r?.rhr),
          sleep: recent.map((r) => (Number.isFinite(Number(r?.sleep_total_min)) ? Number(r.sleep_total_min) / 60 : null)),
          strain: recent.map((r) => r?.strain),
        },
        ctlSeries: (loadHistory || []).map((r) => r?.ctl),
        atlSeries: (loadHistory || []).map((r) => r?.training_load),
        currentCTL: today?.ctl,
        currentATL: today?.training_load,
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
