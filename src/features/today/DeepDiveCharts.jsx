export const TrendDots = ({ data, heightBand = 80 }) => {
  if (!data?.length) return null;
  const values = data.map((d) => d.value).filter((v) => v != null);
  if (!values.length) return null;
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  return (
    <div
      style={{
        position: "relative",
        height: heightBand,
        marginTop: 20,
        marginBottom: 8,
      }}
    >
      {[0.25, 0.5, 0.75].map((p) => (
        <div
          key={p}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${p * 100}%`,
            height: 1,
            background: "rgba(255,255,255,0.04)",
          }}
        />
      ))}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
        <polyline
          points={data
            .map((d, i) => {
              if (d.value == null) return null;
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - ((d.value - min) / range) * 100;
              return `${x},${y}`;
            })
            .filter(Boolean)
            .join(" ")}
          fill="none"
          stroke="rgba(201,168,117,0.25)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          preserveAspectRatio="none"
          style={{ transform: "scale(1,1)" }}
        />
      </svg>
      {data.map((d, i) => {
        if (d.value == null) return null;
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.value - min) / range) * 100;
        const color = d.color || "#C9A875";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: color,
              transform: "translate(-50%,-50%)",
              boxShadow: `0 0 8px ${color}40`,
            }}
          />
        );
      })}
    </div>
  );
};

export const WeeklyBars = ({ data, maxValue, unit = "min", accentColor = "#C9A875" }) => {
  const max = maxValue || Math.max(...data.map((d) => d.value || 0), 1);

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        alignItems: "flex-end",
        height: 120,
        marginTop: 16,
        marginBottom: 8,
      }}
    >
      {data.map((d, i) => {
        const pct = ((d.value || 0) / max) * 100;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${pct}%`,
                minHeight: 2,
                background: d.isCurrent ? accentColor : `${accentColor}40`,
                borderRadius: "4px 4px 2px 2px",
                transition: "height 0.4s ease",
                boxShadow: d.isCurrent ? `0 0 12px ${accentColor}60` : "none",
              }}
            />
            <div
              style={{
                fontSize: 8,
                fontWeight: 600,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.5px",
              }}
            >
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const StatTile = ({ label, value, unit, accent, trend }) => (
  <div
    style={{
      flex: 1,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14,
      padding: "14px 16px",
    }}
  >
    <div
      style={{
        fontSize: 8,
        fontWeight: 600,
        color: "rgba(255,255,255,0.22)",
        letterSpacing: "2px",
        textTransform: "uppercase",
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 22,
        fontFamily: "'DM Serif Display', serif",
        color: accent || "#fff",
        lineHeight: 1,
        letterSpacing: "-0.5px",
      }}
    >
      {value}
      {unit && (
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 400,
            marginLeft: 4,
          }}
        >
          {unit}
        </span>
      )}
    </div>
    {trend && (
      <div
        style={{
          fontSize: 10,
          color:
            trend.direction === "up"
              ? "#5dffa0"
              : trend.direction === "down"
                ? "#FF6B6B"
                : "rgba(255,255,255,0.3)",
          marginTop: 4,
          fontWeight: 500,
        }}
      >
        {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.text}
      </div>
    )}
  </div>
);

export const SectionLabel = ({ children }) => (
  <div
    style={{
      fontSize: 9,
      fontWeight: 600,
      color: "rgba(255,255,255,0.3)",
      letterSpacing: "2.5px",
      textTransform: "uppercase",
      marginTop: 28,
      marginBottom: 12,
    }}
  >
    {children}
  </div>
);

export const InsightCard = ({ children }) => (
  <div
    style={{
      background: "rgba(201,168,117,0.06)",
      border: "1px solid rgba(201,168,117,0.15)",
      borderRadius: 16,
      padding: "14px 16px",
      fontSize: 12,
      color: "rgba(255,255,255,0.55)",
      lineHeight: 1.6,
      marginTop: 16,
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
      Insight
    </div>
    {children}
  </div>
);
