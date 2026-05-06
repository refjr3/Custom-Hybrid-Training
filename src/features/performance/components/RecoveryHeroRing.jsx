function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function deltaTone(delta) {
  if (!Number.isFinite(delta)) return "rgba(255,255,255,0.38)";
  if (delta > 0) return "rgba(120,200,180,0.95)";
  if (delta < 0) return "#FF8A6C";
  return "rgba(255,255,255,0.5)";
}

export default function RecoveryHeroRing({ recoveryScore, status, deltaVsAvg }) {
  const normalized = Number.isFinite(Number(recoveryScore)) ? clamp(Number(recoveryScore), 0, 100) : 0;
  const circumference = 2 * Math.PI * 86;
  const offset = circumference * (1 - normalized / 100);
  const scoreLabel = Number.isFinite(Number(recoveryScore)) ? `${Math.round(Number(recoveryScore))}%` : "—";
  const delta = Number(deltaVsAvg);
  const deltaLabel = Number.isFinite(delta) ? `${delta > 0 ? "+" : ""}${Math.round(delta)} vs 7d` : "—";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.05) 0%, rgba(13,14,16,0.6) 62%, rgba(13,14,16,1) 100%)",
          border: "0.5px solid rgba(255,255,255,0.08)",
        }}
      >
        <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="recoveryRingGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(120,200,180,0.95)" />
              <stop offset="100%" stopColor="#C9A875" />
            </linearGradient>
          </defs>
          <circle
            cx="110"
            cy="110"
            r="86"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="12"
          />
          <circle
            cx="110"
            cy="110"
            r="86"
            fill="none"
            stroke="url(#recoveryRingGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 110 110)"
          />
        </svg>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: "2.2px",
              color: "rgba(255,255,255,0.45)",
              marginBottom: 6,
            }}
          >
            RECOVERY
          </div>
          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 48,
              color: "#fff",
              letterSpacing: "-1.8px",
              lineHeight: 1,
            }}
          >
            {scoreLabel}
          </div>
          <div
            style={{
              marginTop: 8,
              borderRadius: 999,
              border: "0.5px solid rgba(201,168,117,0.35)",
              background: "rgba(201,168,117,0.1)",
              color: "#C9A875",
              padding: "4px 10px",
              fontSize: 10,
              letterSpacing: "1.4px",
              fontWeight: 600,
            }}
          >
            {String(status || "UNKNOWN").toUpperCase()}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 10,
              letterSpacing: "1px",
              color: deltaTone(delta),
            }}
          >
            {deltaLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
