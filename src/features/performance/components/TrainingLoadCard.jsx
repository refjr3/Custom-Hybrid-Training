function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildPath(values, width, height, baseline = height - 8) {
  const points = Array.isArray(values) ? values : [];
  if (!points.length) return "";
  const valid = points.map((v) => safeNum(v));
  const max = Math.max(...valid, 1);
  const min = Math.min(...valid, 0);
  const span = Math.max(1, max - min);
  const xStep = points.length > 1 ? (width - 12) / (points.length - 1) : 0;
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
  const ctlValues = Array.isArray(ctlSeries) ? ctlSeries : [];
  const latestCtl = ctlValues.length ? safeNum(ctlValues[ctlValues.length - 1]) : 0;
  const ctlMax = Math.max(...ctlValues.map((v) => safeNum(v)), 1);
  const ctlMin = Math.min(...ctlValues.map((v) => safeNum(v)), 0);
  const ctlSpan = Math.max(1, ctlMax - ctlMin);
  const latestY = (height - 8) - ((latestCtl - ctlMin) / ctlSpan) * (height - 24);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "0.5px solid rgba(255,255,255,0.09)",
        borderRadius: 18,
        padding: "16px 16px 14px",
        marginBottom: 14,
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="perfCtlFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(201,168,117,0.3)" />
            <stop offset="100%" stopColor="rgba(201,168,117,0)" />
          </linearGradient>
          <linearGradient id="perfAtlFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,138,108,0.2)" />
            <stop offset="100%" stopColor="rgba(255,138,108,0)" />
          </linearGradient>
        </defs>
        {ctlPath ? <path d={`${ctlPath} L ${width - 6} ${height} L 6 ${height} Z`} fill="url(#perfCtlFill)" /> : null}
        {atlPath ? <path d={`${atlPath} L ${width - 6} ${height} L 6 ${height} Z`} fill="url(#perfAtlFill)" opacity="0.55" /> : null}
        {ctlPath ? <path d={ctlPath} fill="none" stroke="#C9A875" strokeWidth="2.1" strokeLinecap="round" /> : null}
        {atlPath ? (
          <path
            d={atlPath}
            fill="none"
            stroke="#FF8A6C"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="6 5"
            opacity="0.9"
          />
        ) : null}
        {ctlPath ? <circle cx={width - 6} cy={latestY} r="4.4" fill="#C9A875" /> : null}
      </svg>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
          borderTop: "0.5px solid rgba(255,255,255,0.08)",
          marginTop: 10,
          paddingTop: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.42)", letterSpacing: "1.2px" }}>CTL</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#fff", marginTop: 2 }}>
            {fmt(currentCTL)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.42)", letterSpacing: "1.2px" }}>ATL</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#FF8A6C", marginTop: 2 }}>
            {fmt(currentATL)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.42)", letterSpacing: "1.2px" }}>TSB</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#C9A875", marginTop: 2 }}>
            {Number(currentTSB) > 0 ? "+" : ""}
            {fmt(currentTSB)}
          </div>
        </div>
      </div>
    </div>
  );
}
