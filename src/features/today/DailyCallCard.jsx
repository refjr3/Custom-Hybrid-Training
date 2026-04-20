import { useState, useEffect } from "react";

const colorPalette = {
  green: {
    bg: "linear-gradient(135deg, rgba(93,255,160,0.08) 0%, rgba(93,255,160,0.03) 100%)",
    border: "rgba(93,255,160,0.25)",
    accent: "#5dffa0",
    label: "GO",
  },
  amber: {
    bg: "linear-gradient(135deg, rgba(255,216,77,0.08) 0%, rgba(255,216,77,0.03) 100%)",
    border: "rgba(255,216,77,0.25)",
    accent: "#ffd84d",
    label: "CAUTION",
  },
  red: {
    bg: "linear-gradient(135deg, rgba(255,107,107,0.08) 0%, rgba(255,107,107,0.03) 100%)",
    border: "rgba(255,107,107,0.25)",
    accent: "#FF6B6B",
    label: "PULL BACK",
  },
};

export const DailyCallCard = ({ supabase, cornerLabel = "Today's Call" }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch("/api/synthesis/daily", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        const json = await res.json();
        if (json?.headline) setData(json);
      } catch (e) {
        console.error("[daily call]", e);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 22,
          padding: "24px",
          marginBottom: 12,
          minHeight: 120,
        }}
      >
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "2px" }}>SYNTHESIZING...</div>
      </div>
    );
  }

  if (!data) return null;

  const palette = colorPalette[data.color] || colorPalette.green;

  return (
    <div
      style={{
        position: "relative",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 22,
        padding: "22px 24px",
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${palette.accent}, transparent)`,
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: palette.accent,
            letterSpacing: "3px",
          }}
        >
          {palette.label}
        </div>
        <div
          style={{
            fontSize: 8,
            fontWeight: 600,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          {cornerLabel}
        </div>
      </div>

      <div
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 26,
          color: "#fff",
          letterSpacing: "-0.5px",
          lineHeight: 1.1,
          marginBottom: 10,
        }}
      >
        {data.headline}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.55)",
          lineHeight: 1.55,
          marginBottom: 14,
        }}
      >
        {data.summary}
      </div>

      {data.action && (
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: palette.accent, fontWeight: 600 }}>→ </span>
          {data.action}
        </div>
      )}

      {data.flags && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 14,
          }}
        >
          {Object.entries(data.flags)
            .filter(([, f]) => f && (f.color === "amber" || f.color === "red"))
            .map(([key, flag]) => {
              const flagColors = {
                amber: { bg: "rgba(255,216,77,0.1)", border: "rgba(255,216,77,0.25)", text: "#ffd84d" },
                red: { bg: "rgba(255,107,107,0.1)", border: "rgba(255,107,107,0.25)", text: "#FF6B6B" },
              };
              const c = flagColors[flag.color];
              return (
                <div
                  key={key}
                  style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 20,
                    padding: "4px 10px",
                    fontSize: 10,
                    fontWeight: 500,
                    color: c.text,
                    letterSpacing: "0.2px",
                  }}
                >
                  {key.replace(/_/g, " ")}: {flag.text}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
