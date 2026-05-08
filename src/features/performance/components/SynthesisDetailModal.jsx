import { useEffect } from "react";
import { colors, typography } from "../../../design/tokens";

const statusColor = {
  strong: colors.semanticGood,
  recovered: colors.semanticGood,
  fresh: colors.semanticGood,
  stable: colors.semanticWarn,
  neutral: colors.semanticWarn,
  adequate: colors.semanticWarn,
  building: colors.semanticWarn,
  moderate: colors.semanticWarn,
  strained: colors.semanticBad,
  heavy: colors.semanticBad,
  low: colors.semanticBad,
  flat: colors.semanticBad,
  suppressed: colors.semanticBad,
  insufficient: colors.semanticBad,
  unknown: colors.textTertiary,
};

export const SynthesisDetailModal = ({
  open,
  onClose,
  decision,
  states,
  snapshot,
}) => {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const confidence = decision?.confidence || { label: "low", reason: "No confidence signal available." };
  const signals = decision?.signalsConsidered || [];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 310,
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 311,
          maxWidth: 480,
          margin: "0 auto",
          background: "linear-gradient(180deg, #131417 0%, #0D0E10 100%)",
          borderTop: `1px solid ${colors.borderSubtle}`,
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
          padding: "18px 18px 30px",
          maxHeight: "78vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 9, color: colors.textSecondary, letterSpacing: "2px", fontWeight: typography.weightMedium, marginBottom: 6 }}>
              WHY THIS READ
            </div>
            <div style={{ fontFamily: typography.fontDisplay, fontSize: 24, color: colors.textPrimary, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
              {decision?.label || "No decision yet"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `0.5px solid ${colors.borderSubtle}`,
              background: "rgba(255,255,255,0.05)",
              color: colors.textSecondary,
              cursor: "pointer",
              fontSize: 17,
              lineHeight: "30px",
              textAlign: "center",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            borderRadius: 14,
            border: `0.5px solid ${colors.borderSubtle}`,
            background: "rgba(255,255,255,0.025)",
            padding: "12px 12px",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 9, color: colors.textSecondary, letterSpacing: "1.5px", marginBottom: 4 }}>
            {String(confidence.label || "low").toUpperCase()} CONFIDENCE
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.5 }}>
            {confidence.reason}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {signals.length ? signals.map((signal) => (
            <div
              key={`${signal.name}_${signal.value}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderRadius: 12,
                border: `0.5px solid ${colors.borderSubtle}`,
                background: "rgba(255,255,255,0.02)",
                padding: "10px 12px",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: colors.textSecondary, letterSpacing: "1.2px", marginBottom: 3 }}>
                  {signal.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 1.3 }}>
                  {signal.value}
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "1px",
                  fontWeight: typography.weightMedium,
                  color: statusColor[signal.status] || colors.textTertiary,
                  textTransform: "uppercase",
                }}
              >
                {signal.status}
              </div>
            </div>
          )) : (
            <div style={{ fontSize: 12, color: colors.textSecondary }}>
              No signals available yet.
            </div>
          )}
        </div>

        {snapshot?.tsb != null ? (
          <div style={{ marginTop: 14, fontSize: 11, color: colors.textTertiary }}>
            TSB (power-user detail): {snapshot.tsb > 0 ? "+" : ""}
            {snapshot.tsb}
          </div>
        ) : null}

        <div style={{ marginTop: 10, fontSize: 10, color: colors.textTertiary }}>
          Engine v{decision?.engineVersion || "—"} · Interpreter v{states?.interpreterVersion || "—"}
        </div>
      </div>
    </>
  );
};
