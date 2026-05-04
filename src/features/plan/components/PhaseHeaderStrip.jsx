/** Gold phase progress bar + status label (training_weeks.phase–based). */
export function PhaseHeaderStrip({ phaseProgress }) {
  if (!phaseProgress) return null;
  const { phaseName, phaseProgressPercent, phaseStatusLabel } = phaseProgress;
  const pct = Math.min(100, Math.max(0, phaseProgressPercent));

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 600, color: "rgba(201,168,117,0.85)", letterSpacing: 2 }}>
          {String(phaseName || "").toUpperCase()}
        </span>
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: 1 }}>
          {phaseStatusLabel}
        </span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, rgba(201,168,117,0.35), #C9A875)",
            borderRadius: 3,
            transition: "width 0.25s ease",
          }}
        />
      </div>
    </div>
  );
}
