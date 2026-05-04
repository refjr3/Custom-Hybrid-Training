import { createPortal } from "react-dom";
import { useState } from "react";

const OVERLAY_STYLE = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.72)",
  border: "none",
  cursor: "pointer",
  zIndex: 12990,
};

const SHEET_STYLE = {
  position: "fixed",
  left: "50%",
  bottom: 0,
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: 480,
  maxHeight: "78vh",
  background: "linear-gradient(180deg, #16181C 0%, #0D0E10 100%)",
  borderTop: "1px solid rgba(255,255,255,0.12)",
  borderLeft: "1px solid rgba(255,255,255,0.06)",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "18px 18px 0 0",
  padding: "14px 16px 16px",
  overflowY: "auto",
  zIndex: 13000,
  fontFamily: "'DM Sans', sans-serif",
};

const RPE_OPTIONS = [
  { bucket: "easy", numeric: 3, label: "Easy" },
  { bucket: "moderate", numeric: 5, label: "Moderate" },
  { bucket: "hard", numeric: 7, label: "Hard" },
  { bucket: "max", numeric: 9, label: "Max" },
];

export default function SessionFeedbackSheet({
  open = false,
  onClose,
  onSave,
}) {
  const [selected, setSelected] = useState(RPE_OPTIONS[1]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  return createPortal(
    <>
      <button type="button" aria-label="Close feedback" onClick={onClose} style={OVERLAY_STYLE} />
      <div style={SHEET_STYLE}>
        <div
          style={{
            width: 42,
            height: 4,
            borderRadius: 999,
            background: "rgba(255,255,255,0.22)",
            margin: "0 auto 12px",
          }}
        />
        <div style={{ fontSize: 10, letterSpacing: "2px", color: "rgba(201,168,117,0.72)", marginBottom: 10 }}>
          SESSION FEEDBACK
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", marginBottom: 10 }}>
          How hard did this session feel?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
          {RPE_OPTIONS.map((opt) => {
            const active = selected.bucket === opt.bucket;
            return (
              <button
                key={opt.bucket}
                type="button"
                onClick={() => setSelected(opt)}
                style={{
                  background: active ? "rgba(201,168,117,0.16)" : "rgba(255,255,255,0.04)",
                  border: active ? "1px solid rgba(201,168,117,0.45)" : "1px solid rgba(255,255,255,0.12)",
                  color: active ? "#C9A875" : "rgba(255,255,255,0.75)",
                  borderRadius: 10,
                  padding: "9px 6px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes from this session..."
          style={{
            width: "100%",
            minHeight: 108,
            resize: "vertical",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            color: "#fff",
            outline: "none",
            marginBottom: 12,
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              background: "transparent",
              color: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 10,
              padding: 11,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              try {
                setSaving(true);
                await onSave?.({
                  rpe_bucket: selected.bucket,
                  rpe_numeric: selected.numeric,
                  notes,
                });
              } finally {
                setSaving(false);
              }
            }}
            style={{
              flex: 1,
              background: "rgba(201,168,117,0.16)",
              color: "#C9A875",
              border: "1px solid rgba(201,168,117,0.45)",
              borderRadius: 10,
              padding: 11,
              fontSize: 12,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : "Save & Complete"}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
