import { useState } from "react";

const RPE_BUCKETS = [
  { key: "easy", label: "Easy", sub: "1–3" },
  { key: "moderate", label: "Moderate", sub: "4–6" },
  { key: "hard", label: "Hard", sub: "7–8" },
  { key: "max", label: "Max", sub: "9–10" },
];

export function SessionFeedbackSheet({ slot = "am", onClose, onSave }) {
  const [rpeBucket, setRpeBucket] = useState(null);
  const [rpeNumeric, setRpeNumeric] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const handleSave = async () => {
    setErr(null);
    setSaving(true);
    try {
      await onSave({
        rpe_bucket: rpeBucket,
        rpe_numeric: rpeNumeric === "" ? null : Number(rpeNumeric),
        notes: notes.trim() || null,
      });
    } catch (e) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(8,8,10,0.92)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(22,22,26,0.98)",
          border: "0.5px solid rgba(201,168,117,0.22)",
          borderRadius: 18,
          padding: "18px 18px 22px",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600, color: "#C9A875", letterSpacing: 2 }}>
            SESSION COMPLETE
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 18, padding: 4 }}>
            ✕
          </button>
        </div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.72)", marginBottom: 12, lineHeight: 1.5 }}>
          Quick log — how did {String(slot || "am").toUpperCase()} feel?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 14 }}>
          {RPE_BUCKETS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setRpeBucket(b.key)}
              style={{
                padding: "10px 8px",
                borderRadius: 12,
                border: rpeBucket === b.key ? "1px solid rgba(201,168,117,0.55)" : "1px solid rgba(255,255,255,0.08)",
                background: rpeBucket === b.key ? "rgba(201,168,117,0.12)" : "rgba(255,255,255,0.03)",
                color: "#fff",
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 600 }}>{b.label}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{b.sub}</div>
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5 }}>RPE (1–10)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={rpeNumeric}
            onChange={(e) => setRpeNumeric(e.target.value)}
            style={{
              width: "100%",
              marginTop: 6,
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: "0.5px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#fff",
              fontSize: 14,
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5 }}>NOTES</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              marginTop: 6,
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: "0.5px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#fff",
              fontSize: 13,
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>
        {err && (
          <div style={{ color: "#ff6b6b", fontSize: 12, marginBottom: 10 }}>{err}</div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 12,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "none",
              background: "#C9A875",
              color: "#1a1208",
              cursor: saving ? "default" : "pointer",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {saving ? "Saving…" : "Save & complete"}
          </button>
        </div>
      </div>
    </div>
  );
}
