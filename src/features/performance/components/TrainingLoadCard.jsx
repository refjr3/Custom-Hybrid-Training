import { colors, spacing, typography } from "../../../design/tokens";

function safeNum(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildPath(values, width, height, baseline = height - 8) {
  const valid = (Array.isArray(values) ? values : []).map((v) => safeNum(v)).filter((v) => v != null);
  if (valid.length < 2) return "";
  const max = Math.max(...valid, 1);
  const min = Math.min(...valid, 0);
  const span = Math.max(1, max - min);
  const xStep = valid.length > 1 ? (width - 12) / (valid.length - 1) : 0;
  const coords = valid.map((v, i) => {
    const x = 6 + i * xStep;
    const y = baseline - ((v - min) / span) * (height - 24);
    return { x, y };
  });
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  let path = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i += 1) {
    const prev = coords[i - 1];
    const cur = coords[i];
    const cx = (prev.x + cur.x) / 2;
    path += ` Q ${cx} ${prev.y}, ${cur.x} ${cur.y}`;
  }
  return path;
}

function fmt(n) {
  if (!Number.isFinite(Number(n))) return "—";
  return Math.round(Number(n));
}

export default function TrainingLoadCard({
  ctlSeries,
  atlSeries,
  currentCTL,
  currentATL,
  currentTSB,
}) {
  const width = 330;
  const height = 88;
  const ctlPath = buildPath(ctlSeries, width, height);
  const atlPath = buildPath(atlSeries, width, height, height - 4);
  const ctlValues = (Array.isArray(ctlSeries) ? ctlSeries : []).map((v) => safeNum(v)).filter((v) => v != null);
  const latestCtl = ctlValues.length ? ctlValues[ctlValues.length - 1] : 0;
  const ctlMax = Math.max(...ctlValues, 1);
  const ctlMin = Math.min(...ctlValues, 0);
  const ctlSpan = Math.max(1, ctlMax - ctlMin);
  const latestY = (height - 8) - ((latestCtl - ctlMin) / ctlSpan) * (height - 24);

  return (
    <div
      style={{
        background: colors.bgCardSubtle,
        border: `0.5px solid ${colors.borderSubtle}`,
        borderRadius: spacing.cardRadius,
        padding: "16px 16px 14px",
        marginBottom: spacing.componentGap,
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="perfCtlFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.accentGoldGlow} />
            <stop offset="100%" stopColor="rgba(201,169,97,0)" />
          </linearGradient>
          <linearGradient id="perfAtlFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(217,119,87,0.2)" />
            <stop offset="100%" stopColor="rgba(217,119,87,0)" />
          </linearGradient>
        </defs>
        {ctlPath ? <path d={`${ctlPath} L ${width - 6} ${height} L 6 ${height} Z`} fill="url(#perfCtlFill)" /> : null}
        {atlPath ? <path d={`${atlPath} L ${width - 6} ${height} L 6 ${height} Z`} fill="url(#perfAtlFill)" opacity="0.55" /> : null}
        {ctlPath ? <path d={ctlPath} fill="none" stroke={colors.accentGold} strokeWidth="2.1" strokeLinecap="round" /> : null}
        {atlPath ? (
          <path
            d={atlPath}
            fill="none"
            stroke={colors.semanticBad}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="6 5"
            opacity="0.9"
          />
        ) : null}
        {ctlPath ? <circle cx={width - 6} cy={latestY} r="4.4" fill={colors.accentGold} /> : null}
      </svg>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
          borderTop: `0.5px solid ${colors.borderSubtle}`,
          marginTop: 10,
          paddingTop: 10,
        }}
      >
        <div>
          <div style={{ fontSize: typography.sizeMicro, color: colors.textTertiary, letterSpacing: "1.2px" }}>CTL</div>
          <div style={{ fontFamily: typography.fontDisplay, fontSize: 20, color: colors.textPrimary, marginTop: 2 }}>
            {fmt(currentCTL)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: typography.sizeMicro, color: colors.textTertiary, letterSpacing: "1.2px" }}>ATL</div>
          <div style={{ fontFamily: typography.fontDisplay, fontSize: 20, color: colors.semanticBad, marginTop: 2 }}>
            {fmt(currentATL)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: typography.sizeMicro, color: colors.textTertiary, letterSpacing: "1.2px" }}>TSB</div>
          <div style={{ fontFamily: typography.fontDisplay, fontSize: 20, color: colors.accentGold, marginTop: 2 }}>
            {Number(currentTSB) > 0 ? "+" : ""}
            {fmt(currentTSB)}
          </div>
        </div>
      </div>
    </div>
  );
}
