import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ZONES } from "./zoneConfig.js";

export const ZonePicker = ({ currentZone, onSelect }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const zone = ZONES[currentZone] || ZONES.z2;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: "4px 10px 4px 12px",
          color: zone.color,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "1.5px",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {zone.label}
        <span
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.3)",
            marginLeft: 2,
          }}
        >
          ▼
        </span>
      </button>

      {open
        && createPortal(
          <>
            <div
              role="presentation"
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(8px)",
                zIndex: 600,
                animation: "fadeIn 0.2s ease",
              }}
            />
            <div
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(180deg, #16181C 0%, #0D0E10 100%)",
                borderRadius: "28px 28px 0 0",
                zIndex: 601,
                padding: "16px 20px 40px",
                animation: "slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.15)",
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                  marginBottom: 4,
                  textAlign: "center",
                }}
              >
                Track by zone
              </div>
              <div
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 22,
                  color: "#fff",
                  letterSpacing: "-0.3px",
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                Pick your primary zone
              </div>

              {Object.values(ZONES).map((z) => {
                const selected = z.key === currentZone;
                return (
                  <button
                    key={z.key}
                    type="button"
                    onClick={() => {
                      onSelect(z.key);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: selected ? "rgba(201,168,117,0.1)" : "rgba(255,255,255,0.03)",
                      border: selected
                        ? "1px solid rgba(201,168,117,0.35)"
                        : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 16,
                      padding: "14px 18px",
                      marginBottom: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      color: "#fff",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: z.color,
                          letterSpacing: "-0.2px",
                        }}
                      >
                        {z.fullLabel}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.4)",
                          marginTop: 2,
                        }}
                      >
                        {z.description}
                      </div>
                    </div>
                    {selected ? (
                      <div
                        style={{
                          fontSize: 14,
                          color: z.color,
                        }}
                      >
                        ✓
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}
    </>
  );
};
