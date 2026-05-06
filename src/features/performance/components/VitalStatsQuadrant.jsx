function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fmtValue(value, digits = 0) {
  const n = toNumber(value);
  if (n == null) return "—";
  return digits > 0 ? n.toFixed(digits) : String(Math.round(n));
}

function trendLabel(series) {
  const list = (Array.isArray(series) ? series : []).map(toNumber).filter((n) => n != null);
  if (list.length < 2) return "insufficient";
  const first = list[0];
  const last = list[list.length - 1];
  const diff = last - first;
  if (Math.abs(diff) < 0.01) return "stable";
  return diff > 0 ? "up" : "down";
}

function sparklinePath(series, width = 88, height = 26) {
  const vals = (Array.isArray(series) ? series : []).map(toNumber).filter((n) => n != null);
  if (!vals.length) return "";
  if (vals.length === 1) {
    return `M 0 ${height / 2} L ${width} ${height / 2}`;
  }
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(0.0001, max - min);
  return vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * width;
      const y = height - (((v - min) / span) * (height - 4) + 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function StatCell({ icon, label, value, unit, trend, sparkline, accent = "#C9A875" }) {
  const path = sparklinePath(sparkline);
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "0.5px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "12px 12px 10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: accent }}>{icon}</span>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", letterSpacing: "1.1px", textTransform: "uppercase" }}>
          {trend}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 25, color: "#fff", lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.6px" }}>{unit}</span>
      </div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.42)", letterSpacing: "1.1px", marginTop: 3 }}>
        {label}
      </div>
      <div style={{ marginTop: 8, height: 28 }}>
        {path ? (
          <svg viewBox="0 0 88 26" width="100%" height="26" preserveAspectRatio="none">
            <path d={path} fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : (
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>No trend data</div>
        )}
      </div>
    </div>
  );
}

export default function VitalStatsQuadrant({ hrv, rhr, sleep, strain, sparklineData }) {
  const sleepVal = toNumber(sleep);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        marginBottom: 20,
      }}
    >
      <StatCell
        icon="♥"
        label="HRV"
        value={fmtValue(hrv, 0)}
        unit="ms"
        trend={trendLabel(sparklineData?.hrv)}
        sparkline={sparklineData?.hrv}
        accent="#78C8B4"
      />
      <StatCell
        icon="◔"
        label="Resting HR"
        value={fmtValue(rhr, 0)}
        unit="bpm"
        trend={trendLabel(sparklineData?.rhr)}
        sparkline={sparklineData?.rhr}
        accent="#C9A875"
      />
      <StatCell
        icon="☾"
        label="Sleep"
        value={sleepVal == null ? "—" : sleepVal.toFixed(1)}
        unit="hrs"
        trend={trendLabel(sparklineData?.sleep)}
        sparkline={sparklineData?.sleep}
        accent="#9DB3E0"
      />
      <StatCell
        icon="△"
        label="Strain"
        value={fmtValue(strain, 1)}
        unit=""
        trend={trendLabel(sparklineData?.strain)}
        sparkline={sparklineData?.strain}
        accent="#FF8A6C"
      />
    </div>
  );
}
