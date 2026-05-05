import { createPortal } from "react-dom";

function flattenWeeks(blocks) {
  const rows = [];
  (blocks || []).forEach((block) => {
    (block?.weeks || []).forEach((week, idx) => {
      const orderFromField = Number(week?.week_order);
      const orderFromLabel = Number(String(week?.label || "").match(/\d+/)?.[0]);
      rows.push({
        id: week?.id || `${block?.id || "block"}_${idx}`,
        weekOrder:
          (Number.isFinite(orderFromField) && orderFromField > 0
            ? orderFromField
            : Number.isFinite(orderFromLabel) && orderFromLabel > 0
              ? orderFromLabel
              : rows.length + 1),
        label: week?.label || `Week ${rows.length + 1}`,
        dates: week?.dates || "",
        phase: week?.phase || block?.label || "Training",
      });
    });
  });
  rows.sort((a, b) => a.weekOrder - b.weekOrder);
  return rows;
}

export default function PlanBlockTimeline({
  blocks,
  currentWeekOrder,
  currentWeekPhase,
  onClose,
  onSelectWeek,
}) {
  const weeks = flattenWeeks(blocks);
  const currentPhaseKey = String(currentWeekPhase || "").trim().toUpperCase();
  return createPortal(
    <>
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          border: "none",
          background: "rgba(0,0,0,0.72)",
          zIndex: 12990,
          cursor: "pointer",
        }}
        aria-label="Close block timeline"
      />
      <div
        style={{
          position: "fixed",
          inset: "6% 4%",
          zIndex: 13000,
          background: "linear-gradient(180deg, #16181C 0%, #0D0E10 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 18,
          padding: "16px 14px 14px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "rgba(201,168,117,0.72)",
              letterSpacing: "2.3px",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Full block timeline
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.72)",
              width: 28,
              height: 28,
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {weeks.map((week) => {
            const active = Number(week.weekOrder) === Number(currentWeekOrder);
            const inCurrentPhase =
              currentPhaseKey && String(week.phase || "").trim().toUpperCase() === currentPhaseKey;
            return (
              <button
                key={week.id}
                type="button"
                onClick={() => onSelectWeek?.(week.weekOrder)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: active ? "rgba(201,168,117,0.15)" : "rgba(255,255,255,0.03)",
                  border: active
                    ? "1px solid rgba(201,168,117,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "2px",
                    color: active ? "#C9A875" : "rgba(255,255,255,0.45)",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {week.label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: inCurrentPhase ? "#C9A875" : "rgba(255,255,255,0.88)",
                    marginBottom: 2,
                    fontWeight: 500,
                  }}
                >
                  {week.phase}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{week.dates}</div>
              </button>
            );
          })}
        </div>
      </div>
    </>,
    document.body,
  );
}
