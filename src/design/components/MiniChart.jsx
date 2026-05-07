import { colors } from "../tokens";

export const MiniChart = ({ data, color, height = 28, trend = "neutral" }) => {
  if (!Array.isArray(data) || data.length < 2) return null;

  const stroke = color || (
    trend === "good" ? colors.semanticGood
      : trend === "bad" ? colors.semanticBad
        : colors.accentGoldMuted
  );

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;
  const width = 100;
  const chartHeight = height;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = chartHeight - padding - ((v - min) / range) * (chartHeight - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg style={{ width: "100%", height, marginTop: 10 }} viewBox={`0 0 ${width} ${chartHeight}`} preserveAspectRatio="none">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
