import { EQUIPMENT_OPTIONS } from "../onboarding/shared/equipmentOptions.js";
import { prettifyEquipment } from "./shared/labels.js";

function normalizeEquipment(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return [];
}

export default function Step6Equipment({ currentEquipment, onChange, onClose }) {
  const selected = normalizeEquipment(currentEquipment);
  const toggleEquipment = (key) => {
    const next = selected.includes(key)
      ? selected.filter((item) => item !== key)
      : [...selected, key];
    onChange?.(next);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12100,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "rgba(18,18,20,0.96)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18,
          padding: "18px 18px 16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.42)",
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            Equipment you have access to
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.45)",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Done
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EQUIPMENT_OPTIONS.map((opt) => {
            const isSelected = selected.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleEquipment(opt.key)}
                style={{
                  background: isSelected ? "rgba(201,168,117,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isSelected ? "rgba(201,168,117,0.4)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 16,
                  padding: "8px 14px",
                  fontSize: 12,
                  color: isSelected ? "#C9A875" : "rgba(255,255,255,0.7)",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {prettifyEquipment(opt.key)}
                {isSelected ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
