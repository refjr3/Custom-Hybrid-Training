import { useEffect, useMemo, useState } from "react";
import { fetchWeeklyVolume } from "../lib/weeklyVolumeAggregator.js";

const ACTIVITY_OPTIONS = [
  { value: "workout", label: "Workout" },
  { value: "cardio", label: "Cardio" },
  { value: "running", label: "Running" },
  { value: "swimming", label: "Swimming" },
  { value: "biking", label: "Biking" },
  { value: "strength", label: "Strength" },
];

const DOT_BASE = "rgba(255,255,255,0.5)";
const CORAL = "#FF8A6C";
const GOLD = "#C9A875";

function formatNumber(v) {
  if (!Number.isFinite(v)) return "0";
  if (v >= 100) return String(Math.round(v));
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function metricLabel(metric, activityType) {
  if (activityType === "strength") return "HRS";
  return metric === "distance" ? "KM" : "HRS";
}

function formatDeltaPct(curr, prev) {
  if (!Number.isFinite(prev) || prev <= 0) return "—";
  const pct = ((curr - prev) / prev) * 100;
  const rounded = Math.round(pct);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}% vs last`;
}

function normalizeWeeks(rawWeeks) {
  const rows = Array.isArray(rawWeeks) ? rawWeeks.slice(-10) : [];
  if (rows.length >= 10) return rows;
  const filler = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = rows.length; i < 10; i += 1) {
    filler.push({
      weekStart: new Date(now),
      isCurrent: false,
      isFuture: false,
      timeHours: 0,
      distanceKm: 0,
    });
  }
  return [...filler, ...rows].slice(-10);
}

function buildChartPoints(weeks, metric) {
  const xs = [20, 55, 90, 125, 160, 195, 230, 265, 300, 340];
  const vals = weeks.map((w) => (metric === "distance" ? Number(w.distanceKm || 0) : Number(w.timeHours || 0)));
  const realValues = vals.map((v, idx) => (weeks[idx]?.isFuture ? null : v)).filter((v) => v != null);
  const maxVal = realValues.length ? Math.max(...realValues, 0.1) : 1;
  const minVal = realValues.length ? Math.min(...realValues, 0) : 0;
  const span = Math.max(0.1, maxVal - minVal);
  const yFor = (v) => {
    const norm = (v - minVal) / span;
    return 80 - norm * 62;
  };
  return xs.map((x, i) => ({ x, y: yFor(vals[i] || 0), value: vals[i] || 0, ...weeks[i] }));
}

function smoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const cx = (prev.x + cur.x) / 2;
    d += ` Q ${cx} ${prev.y}, ${cur.x} ${cur.y}`;
  }
  return d;
}

function fillPath(points) {
  if (!points.length) return "";
  const line = smoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x} 90 L ${first.x} 90 Z`;
}

export default function WeeklyVolumeChart({ user, supabase }) {
  const [activityType, setActivityType] = useState("running");
  const [metric, setMetric] = useState("time");
  const [menuOpen, setMenuOpen] = useState(false);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(false);

  const showToggle = activityType !== "strength";
  const effectiveMetric = showToggle ? metric : "time";

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!supabase || !user?.id) {
        setWeeks([]);
        return;
      }
      setLoading(true);
      const rows = await fetchWeeklyVolume(supabase, user.id, activityType, effectiveMetric, 8);
      if (!ignore) setWeeks(rows);
      if (!ignore) setLoading(false);
    }
    run();
    return () => {
      ignore = true;
    };
  }, [supabase, user?.id, activityType, effectiveMetric]);

  const normalized = useMemo(() => normalizeWeeks(weeks), [weeks]);
  const points = useMemo(() => buildChartPoints(normalized, effectiveMetric), [normalized, effectiveMetric]);
  const currentIdx = useMemo(() => {
    const idx = points.findIndex((p) => p.isCurrent);
    return idx >= 0 ? idx : Math.max(0, points.length - 2);
  }, [points]);
  const current = points[currentIdx] || null;
  const prev = points[currentIdx - 1] || null;

  const currentValue = Number(current?.value || 0);
  const prevValue = Number(prev?.value || 0);
  const deltaText = formatDeltaPct(currentValue, prevValue);

  const nonFuture = points.filter((p) => !p.isFuture);
  const avg = nonFuture.length ? nonFuture.reduce((s, p) => s + p.value, 0) / nonFuture.length : 0;
  const max = nonFuture.length ? Math.max(...nonFuture.map((p) => p.value)) : 0;
  const total = nonFuture.reduce((s, p) => s + p.value, 0);

  const linePts = points.filter((p) => !p.isFuture);
  const line = smoothPath(linePts);
  const fill = fillPath(linePts);
  const futureFrom = linePts[linePts.length - 1] || null;
  const futureTo = points[points.length - 1] || null;
  const activeLabel = ACTIVITY_OPTIONS.find((o) => o.value === activityType)?.label || "Running";

  return (
    <div
      style={{
        background: "#0D0E10",
        borderRadius: 22,
        padding: "20px 18px 22px",
        border: "0.5px solid rgba(255,255,255,0.08)",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: "rgba(201,168,117,0.65)", letterSpacing: "2px", fontWeight: 500 }}>
            WEEKLY VOLUME
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              borderRadius: 10,
              color: "rgba(255,255,255,0.82)",
              padding: "7px 10px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {activeLabel} ▾
          </button>
          {menuOpen ? (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "110%",
                zIndex: 20,
                background: "#111215",
                border: "0.5px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                overflow: "hidden",
                minWidth: 130,
              }}
            >
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setActivityType(opt.value);
                    if (opt.value === "strength") setMetric("time");
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: opt.value === activityType ? "rgba(201,168,117,0.12)" : "transparent",
                    border: "none",
                    color: opt.value === activityType ? GOLD : "rgba(255,255,255,0.85)",
                    padding: "8px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        {showToggle ? (
          <div
            style={{
              display: "inline-flex",
              borderRadius: 999,
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            {["time", "distance"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                style={{
                  border: "none",
                  background: effectiveMetric === m ? "rgba(201,168,117,0.2)" : "transparent",
                  color: effectiveMetric === m ? GOLD : "rgba(255,255,255,0.55)",
                  padding: "5px 10px",
                  fontSize: 10,
                  letterSpacing: "1px",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {m === "time" ? "TIME" : "DISTANCE"}
              </button>
            ))}
          </div>
        ) : <div />}
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "1.5px" }}>
          LAST 9 WEEKS
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 8 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 31, color: "#fff", letterSpacing: "-0.6px" }}>
          {formatNumber(currentValue)}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 5, letterSpacing: "1px" }}>
          {metricLabel(effectiveMetric, activityType)}
        </div>
        <div
          style={{
            marginBottom: 6,
            marginLeft: 4,
            padding: "2px 8px",
            borderRadius: 999,
            background: "rgba(255,138,108,0.16)",
            border: "0.5px solid rgba(255,138,108,0.38)",
            fontSize: 10,
            color: CORAL,
            fontWeight: 600,
          }}
        >
          {deltaText}
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 6 }}>
        <svg viewBox="0 0 350 90" width="100%" height="110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CORAL} stopOpacity="0.38" />
              <stop offset="100%" stopColor={CORAL} stopOpacity="0" />
            </linearGradient>
          </defs>
          {fill ? <path d={fill} fill="url(#volumeFill)" /> : null}
          {line ? <path d={line} fill="none" stroke={CORAL} strokeWidth="2.2" /> : null}
          {futureFrom && futureTo ? (
            <line
              x1={futureFrom.x}
              y1={futureFrom.y}
              x2={futureTo.x}
              y2={futureTo.y}
              stroke={CORAL}
              strokeWidth="1.6"
              strokeDasharray="4 4"
              opacity="0.7"
            />
          ) : null}
          {points.map((p, idx) => {
            if (p.isFuture) {
              return (
                <circle
                  key={`dot_${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  fill="rgba(255,138,108,0.12)"
                  stroke={CORAL}
                  strokeWidth="1.2"
                />
              );
            }
            if (p.isCurrent) {
              return <circle key={`dot_${idx}`} cx={p.x} cy={p.y} r="5" fill={GOLD} />;
            }
            const alpha = 0.35 + (Math.min(1, p.value / Math.max(0.0001, max)) * 0.35);
            return <circle key={`dot_${idx}`} cx={p.x} cy={p.y} r="3.2" fill={DOT_BASE} opacity={alpha} />;
          })}
        </svg>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: -4, marginBottom: 10 }}>
        {points.map((p, idx) => (
          <span
            key={`wlabel_${idx}`}
            style={{
              fontSize: 9,
              color: p.isCurrent ? GOLD : p.isFuture ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.45)",
              fontWeight: p.isCurrent ? 700 : 500,
              letterSpacing: "0.6px",
            }}
          >
            W{idx + 1}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
          borderTop: "0.5px solid rgba(255,255,255,0.08)",
          paddingTop: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.42)", letterSpacing: "1.2px" }}>8-WEEK AVG</div>
          <div style={{ fontSize: 12, color: "#fff", marginTop: 2 }}>
            {formatNumber(avg)} {metricLabel(effectiveMetric, activityType)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.42)", letterSpacing: "1.2px" }}>MAX</div>
          <div style={{ fontSize: 12, color: "#fff", marginTop: 2 }}>
            {formatNumber(max)} {metricLabel(effectiveMetric, activityType)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.42)", letterSpacing: "1.2px" }}>TOTAL</div>
          <div style={{ fontSize: 12, color: "#fff", marginTop: 2 }}>
            {formatNumber(total)} {metricLabel(effectiveMetric, activityType)}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
          Updating chart…
        </div>
      ) : null}
    </div>
  );
}
