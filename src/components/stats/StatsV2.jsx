import { useMemo, useState } from "react";
import { T } from "../lab/tokens.js";

const RANGE_OPTIONS = [
  { key: "8W", label: "8W", days: 56 },
  { key: "12W", label: "12W", days: 84 },
  { key: "ALL", label: "ALL", days: null },
  { key: "TO_RACE", label: "TO RACE", days: 56 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function toIsoYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeIso(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return toIsoYmd(parsed);
}

function parseIso(iso) {
  if (!iso) return null;
  const dt = new Date(`${iso}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function addDaysIso(iso, delta) {
  const dt = parseIso(iso);
  if (!dt) return iso;
  dt.setDate(dt.getDate() + delta);
  return toIsoYmd(dt);
}

function diffDaysIso(startIso, endIso) {
  const a = parseIso(startIso);
  const b = parseIso(endIso);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function maxIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

function minIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function fmtSigned(value) {
  if (!isFiniteNumber(value)) return "—";
  const n = Math.round(Number(value));
  return `${n > 0 ? "+" : ""}${n}`;
}

function dayLetter(iso) {
  const dt = parseIso(iso);
  if (!dt) return "—";
  return dt.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1).toUpperCase();
}

function pointsToPath(points) {
  if (!points || points.length < 2) return null;
  return points.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(" ");
}

function pointsToArea(points, baseY) {
  if (!points || points.length < 2) return null;
  const head = `M ${points[0].x.toFixed(2)} ${baseY.toFixed(2)}`;
  const line = points.map((pt) => `L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(" ");
  const tail = `L ${points[points.length - 1].x.toFixed(2)} ${baseY.toFixed(2)} Z`;
  return `${head} ${line} ${tail}`;
}

function percentile(value, values) {
  if (!isFiniteNumber(value)) return null;
  const sorted = (Array.isArray(values) ? values : [])
    .filter((v) => isFiniteNumber(v))
    .map((v) => Number(v))
    .sort((a, b) => a - b);
  if (!sorted.length) return null;
  let count = 0;
  for (const v of sorted) {
    if (v <= Number(value)) count += 1;
  }
  return clamp(count / sorted.length, 0, 1);
}

function projectionSlope(series, key, startIso, endIso) {
  const valid = (Array.isArray(series) ? series : []).filter(
    (row) => row?.date >= startIso && row?.date <= endIso && isFiniteNumber(row?.[key]),
  );
  if (valid.length < 2) return 0;
  const first = valid[0];
  const last = valid[valid.length - 1];
  const span = Math.max(1, diffDaysIso(first.date, last.date));
  return (Number(last[key]) - Number(first[key])) / span;
}

function trendCopy(delta) {
  if (!isFiniteNumber(delta)) return { pre: "Building", em: "baseline", post: "." };
  if (delta > 1.25) return { pre: "You're", em: "climbing", post: "." };
  if (delta < -1.25) return { pre: "You're", em: "resting", post: "." };
  return { pre: "Holding", em: "steady", post: "." };
}

function phaseTint(phase) {
  const p = String(phase || "").toUpperCase();
  if (p.includes("RACE")) return "rgba(201,168,117,0.18)";
  if (p.includes("TAPER")) return "rgba(120,200,180,0.05)";
  if (p.includes("PEAK")) return "rgba(201,168,117,0.08)";
  if (p.includes("BUILD")) return "rgba(201,168,117,0.04)";
  return "rgba(255,255,255,0.03)";
}

function recoveryTag(score) {
  if (!isFiniteNumber(score)) return "syncing";
  if (Number(score) >= 67) return "primed";
  if (Number(score) >= 34) return "steady";
  return "recovering";
}

export default function StatsV2({
  onOpenMenu,
  syncStatus,
  whoopConnected,
  daysToRace,
  raceCode,
  raceName,
  raceDate,
  fitnessSeries,
  phaseBands,
  todaySessionSummary,
}) {
  const mergedDailyMetrics = fitnessSeries;
  console.log("[StatsV2] mounted", { hasMergedDailyMetrics: !!mergedDailyMetrics?.length });
  const [range, setRange] = useState("8W");
  const todayIso = toIsoYmd(new Date());
  const raceIso = normalizeIso(raceDate);

  const sortedSeries = useMemo(
    () => (Array.isArray(fitnessSeries) ? [...fitnessSeries] : [])
      .filter((row) => row?.date)
      .sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [fitnessSeries],
  );

  const byDate = useMemo(() => {
    const map = new Map();
    for (const row of sortedSeries) map.set(String(row.date), row);
    return map;
  }, [sortedSeries]);

  const ctlRowsAll = useMemo(
    () => sortedSeries.filter((row) => isFiniteNumber(row?.ctl)),
    [sortedSeries],
  );
  const hasCtlData = ctlRowsAll.length > 0;

  const rangeStartIso = useMemo(() => {
    if (!hasCtlData) return todayIso;
    const earliest = ctlRowsAll[0]?.date || todayIso;
    const option = RANGE_OPTIONS.find((opt) => opt.key === range);
    if (!option || option.days == null || range === "ALL") return earliest;
    return maxIso(earliest, addDaysIso(todayIso, -(option.days - 1)));
  }, [ctlRowsAll, hasCtlData, range, todayIso]);

  const chartEndIso = raceIso && raceIso > todayIso ? raceIso : todayIso;
  const chartStartIso = minIso(rangeStartIso, chartEndIso);

  const historyRows = useMemo(
    () => sortedSeries.filter((row) => row.date >= rangeStartIso && row.date <= todayIso),
    [sortedSeries, rangeStartIso, todayIso],
  );

  const pastCtlRows = historyRows.filter((row) => isFiniteNumber(row?.ctl));
  const pastAtlRows = historyRows.filter((row) => isFiniteNumber(row?.atl));
  const latestRow = [...sortedSeries].reverse().find((row) => row.date <= todayIso) || null;
  const latestCtlRow = [...sortedSeries].reverse().find((row) => row.date <= todayIso && isFiniteNumber(row?.ctl)) || null;
  const latestAtlRow = [...sortedSeries].reverse().find((row) => row.date <= todayIso && isFiniteNumber(row?.atl)) || null;
  const latestTsbRow = [...sortedSeries].reverse().find((row) => row.date <= todayIso && isFiniteNumber(row?.tsb)) || null;
  const latestRecRow = [...sortedSeries].reverse().find((row) => row.date <= todayIso && isFiniteNumber(row?.recoveryScore)) || null;

  const slopeWindowStart = addDaysIso(todayIso, -27);
  const ctlSlope = projectionSlope(sortedSeries, "ctl", slopeWindowStart, todayIso);
  const atlSlope = projectionSlope(sortedSeries, "atl", slopeWindowStart, todayIso);
  const projectionHorizonDays = raceIso && raceIso > todayIso ? diffDaysIso(todayIso, raceIso) : 0;

  const projectionRows = useMemo(() => {
    if (!isFiniteNumber(latestCtlRow?.ctl) || projectionHorizonDays <= 0) return [];
    const rows = [];
    const taperStart = Math.max(0, projectionHorizonDays - 21);
    for (let idx = 0; idx <= projectionHorizonDays; idx += 1) {
      const iso = addDaysIso(todayIso, idx);
      let ctl = Number(latestCtlRow.ctl) + ctlSlope * idx;
      let atl = isFiniteNumber(latestAtlRow?.atl) ? Number(latestAtlRow.atl) + atlSlope * idx : null;
      if (idx >= taperStart) {
        const taperProgress = (idx - taperStart) / Math.max(1, projectionHorizonDays - taperStart);
        ctl *= (1 - (0.15 * taperProgress));
        if (isFiniteNumber(atl)) atl *= (1 - (0.25 * taperProgress));
      }
      rows.push({ date: iso, ctl, atl });
    }
    return rows;
  }, [atlSlope, ctlSlope, latestAtlRow?.atl, latestCtlRow?.ctl, projectionHorizonDays, todayIso]);

  const projectedRace = projectionRows[projectionRows.length - 1] || null;
  const projectedRaceTsb = projectedRace && isFiniteNumber(projectedRace?.ctl) && isFiniteNumber(projectedRace?.atl)
    ? Number(projectedRace.ctl) - Number(projectedRace.atl)
    : null;

  const ctlDelta = pastCtlRows.length >= 2 ? Number(pastCtlRows[pastCtlRows.length - 1].ctl) - Number(pastCtlRows[0].ctl) : null;
  const trend = trendCopy(ctlDelta);
  const windowDays = Math.max(1, diffDaysIso(rangeStartIso, todayIso));
  const hasFourWeeks = windowDays >= 28 && pastCtlRows.length >= 8;

  const chartGeometry = {
    w: 360,
    h: 300,
    left: 20,
    right: 14,
    top: 34,
    bottom: 232,
  };
  const plotW = chartGeometry.w - chartGeometry.left - chartGeometry.right;
  const plotH = chartGeometry.bottom - chartGeometry.top;
  const chartSpanDays = Math.max(1, diffDaysIso(chartStartIso, chartEndIso));
  const xForIso = (iso) => {
    const offset = clamp(diffDaysIso(chartStartIso, iso), 0, chartSpanDays);
    return chartGeometry.left + ((offset / chartSpanDays) * plotW);
  };

  const chartVals = [
    ...pastCtlRows.map((row) => Number(row.ctl)),
    ...pastAtlRows.map((row) => Number(row.atl)),
    ...projectionRows.map((row) => Number(row.ctl)),
  ].filter((v) => isFiniteNumber(v));
  const yMinRaw = chartVals.length ? Math.min(...chartVals) : 0;
  const yMaxRaw = chartVals.length ? Math.max(...chartVals) : 100;
  const yPad = Math.max(4, (yMaxRaw - yMinRaw) * 0.16);
  const yMin = yMinRaw - yPad;
  const yMax = yMaxRaw + yPad;
  const yForVal = (val) => {
    const t = (Number(val) - yMin) / Math.max(1e-6, yMax - yMin);
    return chartGeometry.bottom - (t * plotH);
  };

  const ctlPoints = pastCtlRows.map((row) => ({ x: xForIso(row.date), y: yForVal(row.ctl), date: row.date, value: Number(row.ctl) }));
  const atlPoints = pastAtlRows.map((row) => ({ x: xForIso(row.date), y: yForVal(row.atl), date: row.date, value: Number(row.atl) }));
  const projectionPoints = projectionRows.map((row) => ({ x: xForIso(row.date), y: yForVal(row.ctl), date: row.date, value: Number(row.ctl) }));

  const ctlPath = pointsToPath(ctlPoints);
  const atlPath = pointsToPath(atlPoints);
  const projectionPath = pointsToPath(projectionPoints);
  const ctlArea = pointsToArea(ctlPoints, chartGeometry.bottom);

  const peakPoint = ctlPoints.reduce((acc, pt) => (!acc || pt.value > acc.value ? pt : acc), null);
  const dipPoint = ctlPoints.reduce((acc, pt) => (!acc || pt.value < acc.value ? pt : acc), null);
  const todayPoint = ctlPoints[ctlPoints.length - 1] || null;
  const racePoint = projectedRace ? { x: xForIso(projectedRace.date), y: yForVal(projectedRace.ctl), date: projectedRace.date, value: Number(projectedRace.ctl) } : null;

  const annotations = [];
  if (peakPoint) {
    annotations.push({ ...peakPoint, label: "recent peak", dx: -28, dy: -14, color: T.text35 });
  }
  if (dipPoint && (!peakPoint || Math.abs(dipPoint.x - peakPoint.x) > 24)) {
    annotations.push({ ...dipPoint, label: "recent dip", dx: 10, dy: 18, color: T.text35 });
  }
  if (todayPoint) {
    annotations.push({ ...todayPoint, label: "today", dx: 10, dy: -10, color: T.gold });
  }

  const visibleBands = (Array.isArray(phaseBands) ? phaseBands : [])
    .filter((band) => band?.startIso && band?.endIso)
    .map((band) => ({
      ...band,
      start: maxIso(band.startIso, chartStartIso),
      end: minIso(band.endIso, chartEndIso),
    }))
    .filter((band) => band.start <= band.end);

  const rangeLabel = RANGE_OPTIONS.find((opt) => opt.key === range)?.label || "8W";
  const raceCodeLabel = String(raceCode || raceName || "RACE").toUpperCase();
  const rightMeta = `${rangeLabel} LOGGED · ${daysToRace != null ? `+${daysToRace}d TO ${raceCodeLabel}` : "NO RACE DATE"}`;

  const todayCtl = latestCtlRow?.ctl;
  const todayTsb = latestTsbRow?.tsb;
  const todayRec = latestRecRow?.recoveryScore;
  const tsbColor = isFiniteNumber(todayTsb) ? (Number(todayTsb) >= 0 ? T.good : "#FF6A5F") : T.text35;
  const recWord = recoveryTag(todayRec);
  const calloutSummary = todaySessionSummary
    ? `${todaySessionSummary} · ${recWord}`
    : `Session context unavailable · ${recWord}`;

  const bodyWindowStart = addDaysIso(todayIso, -56);
  const bodyRows = sortedSeries.filter((row) => row.date >= bodyWindowStart && row.date <= todayIso);
  const hrvPool = bodyRows.map((row) => row.hrv);
  const sleepPool = bodyRows.map((row) => row.sleepHours);
  const recPool = bodyRows.map((row) => row.recoveryScore);
  const bodyDays = Array.from({ length: 8 }, (_, idx) => addDaysIso(todayIso, idx - 7));

  const projectionSentence = projectedRaceTsb != null && projectionHorizonDays > 0
    ? `If you taper as planned, your form should peak at`
    : null;

  const syncOnline = whoopConnected && syncStatus !== "red";
  const syncDot = syncOnline ? T.good : "#FF3B30";
  const syncText = syncOnline ? "SYNCED" : "OFFLINE";

  return (
    <div style={{ paddingBottom: 22, background: T.bg }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px 12px",
          borderBottom: `0.5px solid ${T.hairline}`,
        }}
      >
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ width: 20, height: 1.5, borderRadius: 1, background: T.text50 }} />
          <span style={{ width: 14, height: 1.5, borderRadius: 1, background: T.text50 }} />
          <span style={{ width: 20, height: 1.5, borderRadius: 1, background: T.text50 }} />
        </button>

        <div style={{ textAlign: "center", fontSize: 26, lineHeight: 1, letterSpacing: "-0.4px" }}>
          <span style={{ fontFamily: T.sans, fontWeight: 600, color: T.text70 }}>The </span>
          <em style={{ fontFamily: T.serif, fontStyle: "italic", fontWeight: 400, color: T.text }}>Lab</em>
          <span style={{ fontFamily: T.sans, fontWeight: 600, color: T.text70 }}>.</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: syncDot }} />
          <span style={{ fontFamily: T.sans, fontSize: 9, letterSpacing: "1.4px", color: T.text35, fontWeight: 500 }}>
            {syncText}
          </span>
        </div>
      </div>

      <div style={{ padding: "26px 22px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: T.sans, fontSize: 9, color: T.gold, letterSpacing: "1.8px", fontWeight: 600 }}>
            YOUR ARC
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 9, color: T.text35, letterSpacing: "1.2px", textAlign: "right" }}>
            {rightMeta}
          </div>
        </div>

        <div style={{ fontFamily: T.serif, fontSize: 46, lineHeight: 1.05, letterSpacing: "-0.8px", color: T.text }}>
          {trend.pre}{" "}
          <em style={{ color: T.gold, fontStyle: "italic" }}>{trend.em}</em>
          {trend.post}
        </div>
      </div>

      <div style={{ padding: "12px 22px 24px" }}>
        <div style={{ fontFamily: T.sans, fontSize: 12, color: T.text50, lineHeight: 1.5 }}>
          {!hasFourWeeks ? (
            "Building your baseline. Check back in a few weeks."
          ) : (
            <>
              Fitness {ctlDelta >= 0 ? "up" : "down"} {Math.abs(Math.round(ctlDelta || 0))} points in{" "}
              {Math.max(1, Math.round(windowDays / 7))} weeks.{" "}
              {projectedRaceTsb != null
                ? `Form projects to ${fmtSigned(projectedRaceTsb)} near race day.`
                : "Projection will appear when enough trend data is available."}
            </>
          )}
        </div>
      </div>

      {hasCtlData ? (
        <div style={{ padding: "0 22px 14px", display: "flex", gap: 6 }}>
          {RANGE_OPTIONS.map((opt) => {
            const active = range === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 999,
                  border: `0.5px solid ${active ? "rgba(201,168,117,0.4)" : T.hairline}`,
                  background: active ? "rgba(201,168,117,0.1)" : "transparent",
                  color: active ? T.gold : T.text50,
                  fontFamily: T.sans,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "1.4px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div style={{ padding: "0 0 0" }}>
        {hasCtlData ? (
          <>
            <svg
              viewBox="0 0 360 300"
              preserveAspectRatio="none"
              style={{ width: "100%", height: 300, display: "block" }}
            >
              <defs>
                <linearGradient id="stats-v2-ctl-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.gold} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={T.gold} stopOpacity="0" />
                </linearGradient>
              </defs>

              {visibleBands.map((band, idx) => {
                const x1 = xForIso(band.start);
                const x2 = xForIso(band.end);
                const width = Math.max(1, x2 - x1);
                const labelX = x1 + width / 2;
                const isRace = String(band.label || "").toUpperCase().includes("RACE");
                return (
                  <g key={`${band.label}_${idx}`}>
                    <rect
                      x={x1}
                      y={chartGeometry.top}
                      width={width}
                      height={plotH}
                      fill={phaseTint(band.label)}
                    />
                    <text
                      x={labelX}
                      y={17}
                      textAnchor="middle"
                      fill={isRace ? T.gold : T.text35}
                      fontFamily={T.sans}
                      fontWeight={isRace ? 700 : 600}
                      fontSize="8"
                      letterSpacing="1.3"
                    >
                      {String(band.label || "PHASE").toUpperCase()}
                    </text>
                  </g>
                );
              })}

              {[0, 0.33, 0.66, 1].map((t, idx) => {
                const y = chartGeometry.top + (plotH * t);
                return (
                  <line
                    key={`grid_${idx}`}
                    x1={chartGeometry.left}
                    y1={y}
                    x2={chartGeometry.w - chartGeometry.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="0.5"
                  />
                );
              })}

              <line
                x1={xForIso(todayIso)}
                y1={chartGeometry.top}
                x2={xForIso(todayIso)}
                y2={chartGeometry.bottom}
                stroke={T.gold}
                strokeOpacity="0.35"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {ctlArea ? <path d={ctlArea} fill="url(#stats-v2-ctl-area)" /> : null}
              {ctlPath ? <path d={ctlPath} fill="none" stroke={T.gold} strokeWidth="1.5" /> : null}
              {atlPath ? (
                <path
                  d={atlPath}
                  fill="none"
                  stroke={T.teal}
                  strokeOpacity="0.55"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
              ) : null}
              {projectionPath ? (
                <path
                  d={projectionPath}
                  fill="none"
                  stroke={T.gold}
                  strokeOpacity="0.55"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              ) : null}

              {annotations.map((a, idx) => (
                <g key={`annot_${idx}`}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={a.x + a.dx}
                    y2={a.y + a.dy}
                    stroke={a.color}
                    strokeOpacity="0.6"
                    strokeWidth="0.75"
                  />
                  <text
                    x={a.x + a.dx + (a.dx < 0 ? -2 : 2)}
                    y={a.y + a.dy}
                    textAnchor={a.dx < 0 ? "end" : "start"}
                    fill={a.color}
                    fontFamily={T.serif}
                    fontStyle="italic"
                    fontSize={a.label === "today" ? 12 : 10}
                  >
                    {a.label}
                  </text>
                </g>
              ))}

              {todayPoint ? (
                <>
                  <circle cx={todayPoint.x} cy={todayPoint.y} r="9" fill={T.gold} fillOpacity="0.18" />
                  <circle cx={todayPoint.x} cy={todayPoint.y} r="4" fill={T.gold} />
                </>
              ) : null}

              {racePoint ? (
                <>
                  <line
                    x1={racePoint.x}
                    y1={chartGeometry.top}
                    x2={racePoint.x}
                    y2={chartGeometry.bottom}
                    stroke={T.gold}
                    strokeOpacity="0.7"
                    strokeWidth="1"
                  />
                  <circle
                    cx={racePoint.x}
                    cy={racePoint.y}
                    r="6.5"
                    fill="none"
                    stroke={T.gold}
                    strokeWidth="1.2"
                  />
                  <circle cx={racePoint.x} cy={racePoint.y} r="2.8" fill={T.gold} />
                  <text
                    x={racePoint.x + 5}
                    y={racePoint.y - 10}
                    fill={T.gold}
                    fontFamily={T.serif}
                    fontStyle="italic"
                    fontSize="11"
                  >
                    {raceCodeLabel}
                  </text>
                </>
              ) : null}

              <text
                x={chartGeometry.left}
                y="258"
                fill={T.text22}
                fontFamily={T.sans}
                fontSize="8"
                letterSpacing="1.1"
              >
                {range === "12W" ? "−12W" : range === "ALL" ? "START" : "−8W"}
              </text>
              <text
                x={chartGeometry.w / 2}
                y="258"
                textAnchor="middle"
                fill={T.gold}
                fontFamily={T.sans}
                fontWeight="600"
                fontSize="8"
                letterSpacing="1.1"
              >
                NOW
              </text>
              <text
                x={chartGeometry.w - chartGeometry.right}
                y="258"
                textAnchor="end"
                fill={T.text22}
                fontFamily={T.sans}
                fontSize="8"
                letterSpacing="1.1"
              >
                {daysToRace != null ? `+${daysToRace}d` : "—"}
              </text>
            </svg>

            <div style={{ padding: "12px 22px 0", display: "flex", gap: 18, flexWrap: "wrap" }}>
              {[
                { label: "Fitness · CTL", color: T.gold, dash: "none" },
                { label: "Fatigue · ATL", color: T.teal, dash: "3 2" },
                { label: "Projection", color: "rgba(201,168,117,0.7)", dash: "3 3" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="14" height="4">
                    <line
                      x1="0"
                      y1="2"
                      x2="14"
                      y2="2"
                      stroke={item.color}
                      strokeWidth="1.4"
                      strokeDasharray={item.dash}
                    />
                  </svg>
                  <span style={{ fontFamily: T.sans, fontSize: 9, color: T.text50, letterSpacing: "0.4px" }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div
            style={{
              margin: "0 22px",
              border: `0.5px solid ${T.cardBorder}`,
              borderRadius: 14,
              background: T.cardBg,
              padding: "22px 16px",
              color: T.text35,
              fontFamily: T.sans,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            No fitness data yet.
          </div>
        )}
      </div>

      {hasCtlData ? (
        <div style={{ padding: "16px 22px 28px" }}>
          <div
            style={{
              borderRadius: 10,
              border: "0.5px solid rgba(201,168,117,0.25)",
              background: "rgba(201,168,117,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "stretch",
              gap: 12,
              padding: "12px 12px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: T.sans, fontSize: 9, color: T.gold, letterSpacing: "1.4px", marginBottom: 6 }}>
                {dayLetter(todayIso)} · TODAY
              </div>
              <div style={{ fontFamily: T.serif, fontStyle: "italic", fontSize: 15, color: T.text70, lineHeight: 1.2 }}>
                {calloutSummary}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              {[
                { label: "CTL", value: isFiniteNumber(todayCtl) ? Math.round(Number(todayCtl)) : "—", color: T.text },
                { label: "TSB", value: fmtSigned(todayTsb), color: tsbColor },
                { label: "REC", value: isFiniteNumber(todayRec) ? Math.round(Number(todayRec)) : "—", color: T.gold },
              ].map((stat) => (
                <div key={stat.label} style={{ minWidth: 34, textAlign: "right" }}>
                  <div style={{ fontFamily: T.sans, fontSize: 8, color: T.text35, letterSpacing: "1.1px" }}>{stat.label}</div>
                  <div style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: stat.color }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ padding: "8px 22px 30px" }}>
        <div style={{ fontFamily: T.sans, fontSize: 10, color: T.text35, letterSpacing: "1.4px", marginBottom: 18 }}>
          BODY · LAST 8 DAYS
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {bodyDays.map((iso) => {
            const row = byDate.get(iso) || null;
            const hrvVal = row?.hrv;
            const sleepVal = row?.sleepHours;
            const recVal = row?.recoveryScore;
            const hrvPct = percentile(hrvVal, hrvPool);
            const sleepPct = percentile(sleepVal, sleepPool);
            const recPctRaw = isFiniteNumber(recVal) ? Number(recVal) / 100 : percentile(recVal, recPool);
            const recPct = recPctRaw != null ? clamp(recPctRaw, 0, 1) : null;
            const isToday = iso === todayIso;
            const recDotColor = recPct == null
              ? T.text22
              : recPct > 0.66
                ? T.good
                : recPct > 0.4
                  ? T.gold
                  : "#FF6A5F";

            return (
              <div
                key={iso}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 6,
                  border: `0.5px solid ${isToday ? "rgba(201,168,117,0.3)" : T.hairline}`,
                  background: isToday ? "rgba(201,168,117,0.1)" : "rgba(255,255,255,0.02)",
                  padding: "7px 4px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 42,
                    borderRadius: 4,
                    border: `0.5px solid ${T.hairline}`,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  {hrvPct != null ? (
                    <div
                      style={{
                        width: "100%",
                        height: `${Math.max(5, Math.round(hrvPct * 100))}%`,
                        background: isToday ? T.gold : T.good,
                      }}
                    />
                  ) : (
                    <span style={{ fontFamily: T.sans, fontSize: 8, color: T.text35 }}>—</span>
                  )}
                </div>

                <div
                  style={{
                    width: 18,
                    height: 4,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  {sleepPct != null ? (
                    <div style={{ width: `${Math.max(10, Math.round(sleepPct * 100))}%`, height: "100%", background: T.teal }} />
                  ) : null}
                </div>

                <span style={{ width: 6, height: 6, borderRadius: "50%", background: recDotColor }} />

                <div style={{ fontFamily: T.sans, fontSize: 9, color: isToday ? T.gold : T.text35 }}>
                  {dayLetter(iso)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "28px 22px 8px", borderTop: `0.5px solid ${T.hairline}` }}>
        <div style={{ fontFamily: T.sans, fontSize: 9, color: T.gold, letterSpacing: "1.7px", marginBottom: 14 }}>
          LOOKING FORWARD
        </div>
        {projectionSentence && projectedRaceTsb != null ? (
          <div style={{ fontFamily: T.serif, fontStyle: "italic", fontSize: 18, color: T.text70, lineHeight: 1.4 }}>
            {projectionSentence}{" "}
            <span style={{ fontFamily: T.sans, fontStyle: "normal", fontWeight: 600, color: T.gold }}>
              {fmtSigned(projectedRaceTsb)} TSB
            </span>{" "}
            on race day.
          </div>
        ) : (
          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.text35, lineHeight: 1.5 }}>
            Projection will appear after more consistent CTL/ATL data is synced.
          </div>
        )}
      </div>
    </div>
  );
}
