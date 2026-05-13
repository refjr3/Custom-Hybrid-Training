function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatLatestLabel(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  return n.toFixed(1);
}

export const Sparkline = ({
  data,
  color = "#D4A953",
  height = 36,
  dateRangeLabel = "",
  latestValueLabel,
}) => {
  const values = (Array.isArray(data) ? data : [])
    .map(toFiniteNumber)
    .filter((value) => value != null);

  if (values.length < 2) {
    return dateRangeLabel ? (
      <div>
        <div style={{ height }} />
        <div
          style={{
            marginTop: 4,
            fontSize: 9,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          {dateRangeLabel}
        </div>
      </div>
    ) : null;
  }

  const width = 120;
  const leftPad = 4;
  const rightPad = 28;
  const topPad = 4;
  const bottomPad = 4;
  const plotWidth = width - leftPad - rightPad;
  const plotHeight = Math.max(6, height - topPad - bottomPad);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.0001, max - min);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const xFor = (index) => leftPad + (index / (values.length - 1)) * plotWidth;
  const yFor = (value) => topPad + (1 - (value - min) / span) * plotHeight;

  const points = values.map((value, index) => ({
    x: xFor(index),
    y: yFor(value),
    value,
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const meanY = yFor(mean);
  const lastPoint = points[points.length - 1];
  const endLabel = latestValueLabel || formatLatestLabel(lastPoint.value);

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line
          x1={leftPad}
          y1={meanY}
          x2={leftPad + plotWidth}
          y2={meanY}
          stroke={color}
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.25"
        />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle
            key={`spark_pt_${index}`}
            cx={point.x}
            cy={point.y}
            r="2"
            fill={color}
            opacity="0.7"
          />
        ))}
        <text
          x={Math.min(width - 2, lastPoint.x + 6)}
          y={lastPoint.y + 3}
          fill={color}
          fontSize="10"
          fontWeight="600"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {endLabel}
        </text>
      </svg>
      <div
        style={{
          marginTop: 4,
          fontSize: 9,
          letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.35)",
        }}
      >
        {dateRangeLabel}
      </div>
    </div>
  );
};
