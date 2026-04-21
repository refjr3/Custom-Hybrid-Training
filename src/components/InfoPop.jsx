import { useState, useEffect } from "react";

export const InfoPop = ({
  title,
  short,
  detailed,
  userContext,
  icon = "i",
  size = 14,
  color = "rgba(255,255,255,0.3)",
}) => {
  const [open, setOpen] = useState(false);
  const [depth, setDepth] = useState("short");

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setDepth("short");
    }
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
          width: size + 6,
          height: size + 6,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color,
          fontSize: Math.round(size * 0.75),
          fontWeight: 600,
          fontStyle: "italic",
          fontFamily: "'DM Serif Display', serif",
          cursor: "pointer",
          marginLeft: 4,
          padding: 0,
          lineHeight: 1,
        }}
      >
        {icon}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            role="presentation"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              zIndex: 400,
              animation: "fadeIn 0.2s ease",
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: "75vh",
              background: "linear-gradient(180deg, #131417 0%, #0D0E10 100%)",
              borderRadius: "28px 28px 0 0",
              zIndex: 401,
              overflowY: "auto",
              padding: "16px 24px 40px",
              animation: "slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "0 0 14px",
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
                color: "rgba(201,168,117,0.6)",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              What this means
            </div>

            <div
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 22,
                color: "#fff",
                letterSpacing: "-0.3px",
                marginBottom: 16,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.65,
                marginBottom: 16,
              }}
            >
              {short}
            </div>

            {userContext ? (
              <div
                style={{
                  background: "rgba(201,168,117,0.06)",
                  border: "1px solid rgba(201,168,117,0.15)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 600,
                    color: "rgba(201,168,117,0.6)",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  For you
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{userContext}</div>
              </div>
            ) : null}

            {detailed && depth === "short" ? (
              <button
                type="button"
                onClick={() => setDepth("detailed")}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 14,
                  padding: "10px 16px",
                  color: "#C9A875",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  width: "100%",
                  letterSpacing: "0.3px",
                }}
              >
                Tell me more →
              </button>
            ) : null}

            {detailed && depth === "detailed" ? (
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.7,
                  paddingTop: 4,
                  whiteSpace: "pre-line",
                }}
              >
                {detailed}
              </div>
            ) : null}
          </div>
        </>
      )}
    </>
  );
};
