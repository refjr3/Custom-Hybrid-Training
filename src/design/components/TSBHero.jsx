import { colors, typography } from "../tokens";
import { Pill } from "./Pill";

function classifyTSB(tsb) {
  if (tsb == null) return { label: "NO DATA", variant: "default" };
  if (tsb > 25) return { label: "TAPERED", variant: "gold" };
  if (tsb >= 5) return { label: "FRESH", variant: "good" };
  if (tsb >= -5) return { label: "NEUTRAL", variant: "default" };
  if (tsb >= -25) return { label: "BUILDING", variant: "warn" };
  return { label: "FATIGUED", variant: "bad" };
}

function statusText(label) {
  if (label === "BUILDING") return "Productive overload. Fatigue is the dose, not the side effect.";
  if (label === "FRESH") return "Recovered. You can absorb more or peak now.";
  if (label === "TAPERED") return "Taper window. Race-ready freshness.";
  if (label === "NEUTRAL") return "Equilibrium. Neither building nor freshening.";
  if (label === "FATIGUED") return "High accumulated load. Risk territory — back off.";
  return "No recent form data yet.";
}

const TSBSparkline = ({ data, blockStartDate, blockEndDate }) => {
  if (!Array.isArray(data) || data.length < 2) return null;

  const width = 350;
  const height = 60;
  const padTop = 8;
  const padBottom = 12;

  const max = Math.max(...data, 5);
  const min = Math.min(...data, -25);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padTop + (1 - (v - min) / range) * (height - padTop - padBottom);
    return `${x},${y}`;
  });

  const zeroY = padTop + (1 - (0 - min) / range) * (height - padTop - padBottom);
  const lastY = Number(points[points.length - 1].split(",")[1] || 0);

  return (
    <svg style={{ width: "100%", height, marginTop: 6 }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="tsbGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colors.accentGold} stopOpacity="0.3" />
          <stop offset="100%" stopColor={colors.accentGold} stopOpacity="0" />
        </linearGradient>
      </defs>

      <line
        x1="0"
        y1={zeroY}
        x2={width}
        y2={zeroY}
        stroke={colors.borderHairline}
        strokeWidth="1"
        strokeDasharray="2,3"
      />

      <polygon points={`0,${height} ${points.join(" ")} ${width},${height}`} fill="url(#tsbGrad)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={colors.accentGold}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={width} cy={lastY} r="4" fill={colors.accentGold} stroke={colors.bgPrimary} strokeWidth="2" />

      <text x="2" y={height - 1} fontSize="8" fill={colors.textTertiary} letterSpacing="0.5">
        {blockStartDate || "—"}
      </text>
      <text x={width - 2} y={height - 1} fontSize="8" fill={colors.textTertiary} letterSpacing="0.5" textAnchor="end">
        {blockEndDate || "—"}
      </text>
    </svg>
  );
};

export const TSBHero = ({ currentTSB, tsbSeries, blockStartDate, blockEndDate }) => {
  const status = classifyTSB(currentTSB);
  const displayValue = currentTSB != null
    ? (currentTSB > 0 ? `+${Math.round(currentTSB)}` : `${Math.round(currentTSB)}`)
    : "—";

  return (
    <div
      style={{
        background: "rgba(201,169,97,0.05)",
        border: "0.5px solid rgba(201,169,97,0.2)",
        borderRadius: 22,
        padding: "24px 24px 22px",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 9, color: colors.accentGold, letterSpacing: "2px", fontWeight: 500 }}>
          FORM · TSB
        </span>
        <Pill variant={status.variant} size="sm">{status.label}</Pill>
      </div>

      <div
        style={{
          fontFamily: typography.fontDisplay,
          fontSize: 64,
          color: colors.textPrimary,
          lineHeight: 1,
          letterSpacing: "-2px",
          marginBottom: 6,
        }}
      >
        {displayValue}
      </div>

      <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 16, lineHeight: 1.4 }}>
        {statusText(status.label)}
      </div>

      {Array.isArray(tsbSeries) && tsbSeries.length > 1 ? (
        <TSBSparkline
          data={tsbSeries}
          blockStartDate={blockStartDate}
          blockEndDate={blockEndDate}
        />
      ) : null}
    </div>
  );
};
