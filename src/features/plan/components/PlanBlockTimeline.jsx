/**
 * Full-plan week rows; highlights the calendar-current week by stable id
 * (not phase — that would highlight every week in the same phase).
 */
export function PlanBlockTimeline({ open, onClose, planBlocks, currentWeekId, onSelectWeek }) {
  if (!open) return null;

  const rows = [];
  for (const block of planBlocks || []) {
    for (const week of block.weeks || []) {
      rows.push({ block, week });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 350,
        background: "rgba(6,6,8,0.94)",
        padding: "16px 14px 28px",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600, color: "#C9A875", letterSpacing: 2 }}>
            BLOCK TIMELINE
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 20 }}>
            ✕
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map(({ block, week }) => {
            const isCurrent = week.id === currentWeekId;
            return (
              <button
                key={`${block.id}_${week.id}`}
                type="button"
                onClick={() => {
                  if (onSelectWeek) onSelectWeek(block.id, week.id);
                  onClose();
                }}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: isCurrent ? "1px solid rgba(201,168,117,0.55)" : "1px solid rgba(255,255,255,0.08)",
                  background: isCurrent ? "rgba(201,168,117,0.1)" : "rgba(255,255,255,0.03)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, marginBottom: 4 }}>
                  {String(block.label || "").toUpperCase()}
                  {week.week_order != null ? ` · WK ${week.week_order}` : ""}
                </div>
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{week.label || "Week"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{week.phase || ""} · {week.dates || ""}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
