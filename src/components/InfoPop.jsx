import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const InfoSheet = ({ title, short, detailed, userContext, onClose }) => {
  const [showDetailed, setShowDetailed] = useState(false);

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        onClick={onClose}
        role="presentation"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          background: "linear-gradient(180deg, #16181C 0%, #0D0E10 100%)",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{ height: "env(safe-area-inset-top, 44px)", flexShrink: 0 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px 16px",
            flexShrink: 0,
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: "8px 14px",
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
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
            The Lab · Guide
          </div>
          <div style={{ width: 72 }} />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "32px 24px",
            paddingBottom: "calc(40px + env(safe-area-inset-bottom, 20px))",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(201,168,117,0.5)",
              letterSpacing: "3px",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            What this means
          </div>

          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 34,
              color: "#fff",
              letterSpacing: "-0.8px",
              lineHeight: 1.1,
              marginBottom: 24,
            }}
          >
            {title}
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.06)",
              marginBottom: 24,
            }}
          />

          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.75,
              marginBottom: 28,
            }}
          >
            {short}
          </div>

          {userContext && (
            <div
              style={{
                background: "rgba(201,168,117,0.06)",
                border: "1px solid rgba(201,168,117,0.2)",
                borderRadius: 20,
                padding: "20px 20px",
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "rgba(201,168,117,0.7)",
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                For you right now
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.85)",
                  lineHeight: 1.7,
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
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 18,
                padding: "16px 20px",
                color: "#C9A875",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                letterSpacing: "0.3px",
                textAlign: "left",
              }}
            >
              Tell me more →
            </button>
          )}

          {detailed && showDetailed && (
            <>
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.06)",
                  marginBottom: 24,
                }}
              />
              <div
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.8,
                  whiteSpace: "pre-line",
                }}
              >
                {detailed}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export const InfoPop = ({ title, short, detailed, userContext, size = 14 }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
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
          color: "rgba(255,255,255,0.45)",
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
        <InfoSheet
          title={title}
          short={short}
          detailed={detailed}
          userContext={userContext}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
