/* global console */
import { useEffect, useState } from "react";
import {
  LineIcon,
  RecoveryDial,
  Sparkline,
  StrainGauge,
} from "../../design/components";
import { buildAthleteStateSnapshot } from "../coaching/lib/snapshotBuilder.js";
import { interpretPhysiologicalStates } from "../coaching/lib/physiologicalInterpreter.js";
import { evaluateTrainingCompatibility } from "../coaching/lib/decisionEngine.js";
import { SynthesisDetailModal } from "./components/SynthesisDetailModal.jsx";
import { mergeRowsByDay } from "./lib/dataMerge.js";
import {
  getRecoveryNarrative,
  getStrainNarrative,
  splitVerdictLabel,
} from "./lib/performanceNarratives.js";

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

function formatMonthDay(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function metricValue(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (digits > 0) return n.toFixed(digits);
  return String(Math.round(n));
}

function trendDirection(series) {
  const values = (Array.isArray(series) ? series : []).map(Number).filter((v) => Number.isFinite(v));
  if (values.length < 2) return "steady";
  const diff = values[values.length - 1] - values[0];
  if (Math.abs(diff) < 0.001) return "steady";
  return diff > 0 ? "up" : "down";
}

function trendCaption(series) {
  const dir = trendDirection(series);
  if (dir === "up") return "trend up";
  if (dir === "down") return "trend down";
  return "steady";
}

function getStrainBand(strain) {
  const n = Number(strain);
  if (!Number.isFinite(n)) return null;
  if (n < 10) return { label: "LIGHT", color: "#4ade80" };
  if (n < 14) return { label: "MODERATE", color: "#fbbf24" };
  if (n < 18) return { label: "HIGH", color: "#fb923c" };
  return { label: "ALL-OUT", color: "#f87171" };
}

function formatRangeDate(dateStr) {
  if (!dateStr) return "";
  const parsed = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function getDateRangeLabel(dailyRows) {
  const rows = Array.isArray(dailyRows) ? dailyRows : [];
  if (!rows.length) return "";
  const start = formatRangeDate(rows[0]?.date);
  const end = formatRangeDate(rows[rows.length - 1]?.date);
  if (!start || !end) return "";
  return `${start} — ${end}`;
}

function getRecoveryDelta14d(currentScore, dailyRows) {
  if (currentScore == null || !Array.isArray(dailyRows) || dailyRows.length === 0) return null;
  const past14 = dailyRows
    .slice(-15, -1)
    .map((day) => day?.recoveryScore)
    .filter((value) => value != null);
  if (past14.length < 3) return null;
  const baseline = past14.reduce((sum, value) => sum + value, 0) / past14.length;
  return Math.round(currentScore - baseline);
}

function EmptyState({ message }) {
  return (
    <div
      style={{
        marginTop: 20,
        borderRadius: 16,
        border: "0.5px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.03)",
        padding: "16px",
        color: "rgba(255,255,255,0.65)",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {message}
    </div>
  );
}

export default function PerformanceViewV2({ user, supabase }) {
  const [perfData, setPerfData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [coachingBundle, setCoachingBundle] = useState(null);
  const [showSynthesisDetail, setShowSynthesisDetail] = useState(false);
  const [dailyRows, setDailyRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase || !user?.id) {
        setPerfData({ empty: true });
        setCoachingBundle(null);
        setDailyRows([]);
        return;
      }
      setLoading(true);

      let nextCoachingBundle = null;
      try {
        const snapshot = await buildAthleteStateSnapshot(supabase, user.id);
        const states = interpretPhysiologicalStates(snapshot);
        const decision = evaluateTrainingCompatibility(states, snapshot);
        nextCoachingBundle = { snapshot, states, decision };
      } catch (coachingErr) {
        console.error("[PerformanceViewV2] coaching bundle error", coachingErr);
      }
      if (!cancelled) setCoachingBundle(nextCoachingBundle);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const cutoffIso = cutoff.toISOString().slice(0, 10);

      const { data: rows, error: recentErr } = await supabase
        .from("unified_metrics")
        .select("date, source, is_primary, recovery_score, readiness_score, hrv, hrv_rmssd, rhr, resting_hr, sleep_total_min, sleep_awake_min, sleep_deep_min, sleep_rem_min, sleep_light_min, strain, ctl, tsb, training_load, created_at, updated_at")
        .eq("user_id", user.id)
        .gte("date", cutoffIso)
        .order("date", { ascending: true });

      if (cancelled) return;
      if (recentErr) {
        console.error("[PerformanceViewV2] load error", recentErr);
        setPerfData({ empty: true });
        setDailyRows([]);
        setLoading(false);
        return;
      }
      if (!Array.isArray(rows) || !rows.length) {
        setPerfData({ empty: true });
        setDailyRows([]);
        setLoading(false);
        return;
      }
      const daily = mergeRowsByDay(rows);
      if (!daily.length) {
        setPerfData({ empty: true });
        setDailyRows([]);
        setLoading(false);
        return;
      }

      const loadCutoff = new Date();
      loadCutoff.setDate(loadCutoff.getDate() - 84);
      const loadCutoffIso = loadCutoff.toISOString().slice(0, 10);

      const { data: loadRows } = await supabase
        .from("unified_metrics")
        .select("date, source, is_primary, ctl, tsb, training_load, sleep_awake_min, created_at, updated_at")
        .eq("user_id", user.id)
        .gte("date", loadCutoffIso)
        .order("date", { ascending: true });

      if (cancelled) return;
      const loadDaily = mergeRowsByDay(loadRows || []);

      const today = daily[daily.length - 1];
      const blockStartDate = loadDaily[0]?.date || daily[0]?.date || null;
      const blockEndDate = loadDaily[loadDaily.length - 1]?.date || today?.date || null;
      const todayRecovery = Number(today?.recoveryScore);
      const deltaVs14d = Number.isFinite(todayRecovery) ? getRecoveryDelta14d(todayRecovery, daily) : null;

      console.log("[P18.2 diagnose] RecoveryDial score (today.recoveryScore):", today?.recoveryScore ?? null);
      console.log("[P18.2 diagnose] Engine decision object:", nextCoachingBundle?.decision || null);
      console.log("[P18.2 diagnose] Engine snapshot object:", nextCoachingBundle?.snapshot || null);
      console.log("[P18.2 diagnose] Engine states object:", nextCoachingBundle?.states || null);
      console.log("[P18.2 diagnose] Date alignment:", {
        dialDate: today?.date || null,
        snapshotAsOfDate: nextCoachingBundle?.snapshot?.asOfDate || null,
      });

      setDailyRows(daily);
      setPerfData({
        empty: false,
        recoveryScore: Number.isFinite(todayRecovery) ? todayRecovery : null,
        deltaVsAvg: deltaVs14d,
        recovery: { deltaVsAvg: deltaVs14d, deltaVs14d },
        hrv: today?.hrv,
        rhr: today?.rhr,
        sleepHours: today?.sleepHours ?? null,
        sleepStages: {
          deepMin: today?.sleepDeepMin ?? null,
          remMin: today?.sleepRemMin ?? null,
          lightMin: today?.sleepLightMin ?? null,
          awakeMin: today?.sleepAwakeMin ?? null,
        },
        strain: today?.strain,
        sparklines: {
          hrv: daily.map((r) => r?.hrv).filter((v) => v != null),
          rhr: daily.map((r) => r?.rhr).filter((v) => v != null),
        },
        tsbSeries: loadDaily.map((r) => r?.tsb).filter((v) => v != null),
        blockStartDate: formatMonthDay(blockStartDate),
        blockEndDate: formatMonthDay(blockEndDate),
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
  const coachingDecision = coachingBundle?.decision || null;
  const today = dailyRows[dailyRows.length - 1] || null;
  const recoveryNarrative = getRecoveryNarrative(today?.recoveryScore ?? data.recoveryScore, dailyRows);
  const hrvSeries = data.sparklines?.hrv || [];
  const rhrSeries = data.sparklines?.rhr || [];
  const hrvTrend = trendDirection(hrvSeries);
  const rhrTrend = trendDirection(rhrSeries);
  const rhrChartColor = rhrTrend === "down" ? "#4ade80" : rhrTrend === "up" ? "#fbbf24" : "#fbbf24";
  const strainBand = getStrainBand(data.strain);
  const strainNarrative = getStrainNarrative(data.strain);
  const verdict = splitVerdictLabel(coachingDecision?.label || "");
  const dateRangeLabel = getDateRangeLabel(dailyRows);

  return (
    <div style={{ background: "#0A0A0A", padding: "0 18px 100px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 0",
          borderBottom: "0.5px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: "0.24em", color: "#D4A953", fontWeight: 700 }}>
          PERFORMANCE
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
          {formatToday()}
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 12, fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.14em" }}>
          LOADING METRICS...
        </div>
      ) : null}

      {coachingDecision ? (
        <div style={{ padding: "28px 0 20px" }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              color: "#D4A953",
              fontWeight: 600,
              marginBottom: 18,
            }}
          >
            {`TODAY'S READ · ${String(coachingDecision?.confidence?.label || "low").toUpperCase()} CONFIDENCE`}
          </div>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 44,
              fontWeight: 500,
              color: "#fff",
              lineHeight: 1.05,
              marginBottom: 16,
            }}
          >
            {verdict.prefix ? <span>{verdict.prefix} </span> : null}
            <span style={{ fontStyle: "italic", color: "#D4A953" }}>{verdict.emphasis}</span>
            <span style={{ color: "#fff" }}>.</span>
          </div>
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.7)",
              marginBottom: 18,
            }}
          >
            {coachingDecision.rationale}
          </div>
          <button
            type="button"
            onClick={() => setShowSynthesisDetail(true)}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "#D4A953",
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {`WHY · ${(coachingDecision.signalsConsidered || []).length} SIGNALS →`}
          </button>
        </div>
      ) : null}

      {!data.empty ? (
        <>
          <div
            style={{
              padding: "22px 0 14px",
              borderTop: "0.5px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.22em",
                fontWeight: 600,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              VITAL STATS
            </div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.22em",
                fontWeight: 600,
                color: "rgba(255,255,255,0.4)",
              }}
            >
              14 DAYS
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, padding: "8px 0 24px", alignItems: "center" }}>
            <div style={{ flex: "0 0 140px", display: "flex", justifyContent: "center" }}>
              <RecoveryDial
                score={today?.recoveryScore ?? data.recoveryScore}
                deltaVsAvg={data?.recovery?.deltaVs14d ?? data?.recovery?.deltaVsAvg ?? data.deltaVsAvg}
                deltaWindowLabel="14d"
                size="compact"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  color: "rgba(255,255,255,0.55)",
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                RECOVERY
              </div>
              <div
                style={{
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 18,
                  lineHeight: 1.35,
                  color: "#fff",
                }}
              >
                {recoveryNarrative || "Building baseline."}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              padding: "16px 0",
              borderTop: "0.5px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ flex: "0 0 40%", maxWidth: "40%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <LineIcon name="heart" size={14} color="rgba(255,255,255,0.55)" />
                <span style={{ fontSize: 11, letterSpacing: "0.18em", color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
                  HRV
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "#fff", lineHeight: 1 }}>
                  {metricValue(today?.hrv ?? data.hrv) ?? "—"}
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>ms</span>
              </div>
            </div>
            <div style={{ flex: "0 0 60%", maxWidth: "60%" }}>
              <Sparkline
                data={hrvSeries}
                color="#4ade80"
                height={36}
                latestValueLabel={metricValue(today?.hrv ?? data.hrv)}
                dateRangeLabel={dateRangeLabel}
              />
              <div style={{ marginTop: 4, fontSize: 11, letterSpacing: "0.04em", color: "rgba(255,255,255,0.45)" }}>
                {trendCaption(hrvSeries)}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              padding: "16px 0",
              borderTop: "0.5px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ flex: "0 0 40%", maxWidth: "40%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <LineIcon name="pulse" size={14} color="rgba(255,255,255,0.55)" />
                <span style={{ fontSize: 11, letterSpacing: "0.18em", color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
                  RHR
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "#fff", lineHeight: 1 }}>
                  {metricValue(today?.rhr ?? data.rhr) ?? "—"}
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>bpm</span>
              </div>
            </div>
            <div style={{ flex: "0 0 60%", maxWidth: "60%" }}>
              <Sparkline
                data={rhrSeries}
                color={rhrChartColor}
                height={36}
                latestValueLabel={metricValue(today?.rhr ?? data.rhr)}
                dateRangeLabel={dateRangeLabel}
              />
              <div style={{ marginTop: 4, fontSize: 11, letterSpacing: "0.04em", color: "rgba(255,255,255,0.45)" }}>
                {trendCaption(rhrSeries)}
              </div>
            </div>
          </div>

          <div style={{ padding: "20px 0 8px", borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.55)",
                  fontWeight: 600,
                }}
              >
                STRAIN
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 24, color: "#fff", lineHeight: 1 }}>
                  {Number.isFinite(Number(data.strain)) ? Number(data.strain).toFixed(1) : "—"}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    fontWeight: 600,
                    color: strainBand?.color || "rgba(255,255,255,0.35)",
                  }}
                >
                  {strainBand?.label || "NO DATA"}
                </span>
              </div>
            </div>
            <div
              style={{
                margin: "4px 0 14px",
                fontSize: 13,
                color: "rgba(255,255,255,0.55)",
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
              }}
            >
              {strainNarrative || "No strain data available."}
            </div>
            <StrainGauge strain={data.strain} headless />
            <div
              style={{
                marginTop: 8,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                letterSpacing: "0.04em",
                color: "rgba(255,255,255,0.35)",
                padding: "0 2px",
              }}
            >
              <span>0</span>
              <span>10</span>
              <span>14</span>
              <span>18</span>
              <span>21</span>
            </div>
          </div>
        </>
      ) : (
        <EmptyState message="Sync WHOOP or your wearable to see performance metrics." />
      )}

      <SynthesisDetailModal
        open={showSynthesisDetail}
        onClose={() => setShowSynthesisDetail(false)}
        decision={coachingBundle?.decision || null}
        states={coachingBundle?.states || null}
        snapshot={coachingBundle?.snapshot || null}
      />
    </div>
  );
}
