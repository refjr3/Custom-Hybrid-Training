import { useState, useEffect } from "react";

export const InfoPop = ({ title, short, detailed, userContext, size = 14 }) => {
  const [open, setOpen] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) setShowDetailed(false);
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size + 8,
          height: size + 8,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.4)",
          fontSize: Math.round(size * 0.75),
          fontWeight: 600,
          fontStyle: "italic",
          fontFamily: "'DM Serif Display', serif",
          cursor: "pointer",
          marginLeft: 5,
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        i
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            role="presentation"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 500,
              animation: "fadeIn 0.2s ease",
            }}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            role="presentation"
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              top: "10vh",
              background: "linear-gradient(180deg, #16181C 0%, #0D0E10 100%)",
              borderRadius: "28px 28px 0 0",
              zIndex: 501,
              display: "flex",
              flexDirection: "column",
              animation: "slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: 12,
                paddingBottom: 4,
                flexShrink: 0,
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
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 24px 16px",
                flexShrink: 0,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: "4px 0",
                  letterSpacing: "0.2px",
                }}
              >
                ← Back
              </button>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "rgba(201,168,117,0.6)",
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                }}
              >
                What this means
              </div>
              <div style={{ width: 60 }} />
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: "24px 24px 48px",
              }}
            >
              <div
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 28,
                  color: "#fff",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.15,
                  marginBottom: 18,
                }}
              >
                {title}
              </div>

              <div
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.75)",
                  lineHeight: 1.7,
                  marginBottom: 24,
                }}
              >
                {short}
              </div>

              {userContext && (
                <div
                  style={{
                    background: "rgba(201,168,117,0.07)",
                    border: "1px solid rgba(201,168,117,0.2)",
                    borderRadius: 18,
                    padding: "16px 18px",
                    marginBottom: 24,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "rgba(201,168,117,0.7)",
                      letterSpacing: "2.5px",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    For you
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.8)",
                      lineHeight: 1.65,
                    }}
                  >
                    {userContext}
                  </div>
                </div>
              )}

              {detailed && !showDetailed && (
                <button
                  type="button"
                  onClick={() => setShowDetailed(true)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 16,
                    padding: "14px 18px",
                    color: "#C9A875",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    letterSpacing: "0.3px",
                    textAlign: "left",
                    marginBottom: 8,
                  }}
                >
                  Tell me more →
                </button>
              )}

              {detailed && showDetailed && (
                <div
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.6)",
                    lineHeight: 1.75,
                    whiteSpace: "pre-line",
                  }}
                >
                  {detailed}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};
