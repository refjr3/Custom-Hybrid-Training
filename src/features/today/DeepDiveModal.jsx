import { useEffect } from "react";

export const DeepDiveModal = ({ open, onClose, title, subtitle, sourceLabel, children }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 300,
          animation: "fadeIn 0.25s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          top: 32,
          background: "linear-gradient(180deg, #131417 0%, #0D0E10 100%)",
          borderRadius: "28px 28px 0 0",
          zIndex: 301,
          overflowY: "auto",
          overflowX: "hidden",
          animation: "slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "10px 0 6px",
            position: "sticky",
            top: 0,
            background: "rgba(19,20,23,0.8)",
            backdropFilter: "blur(20px)",
            zIndex: 10,
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
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "10px 24px 24px",
            position: "sticky",
            top: 20,
            zIndex: 9,
            background: "rgba(19,20,23,0.8)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {subtitle} {sourceLabel && `· via ${sourceLabel}`}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: "#fff",
                letterSpacing: "-0.5px",
                lineHeight: 1,
              }}
            >
              {title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "50%",
              width: 34,
              height: 34,
              color: "rgba(255,255,255,0.5)",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "0 20px 60px" }}>{children}</div>
      </div>
    </>
  );
};
