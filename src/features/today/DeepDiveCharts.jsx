import { useState } from "react";

export const TrendDots = ({
  data,
  heightBand = 80,
  baseline = null,
  unit = "",
  annotation = null,
  yMin = null,
  yMax = null,
}) => {
  const [tappedIndex, setTappedIndex] = useState(null);

  if (!data?.length) {
    return (
      <div
        style={{
          height: heightBand + 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.2)",
          fontSize: 11,
        }}
      >
        No data
      </div>
    );
  }

  const values = data.map((d) => d.value).filter((v) => v != null && !Number.isNaN(Number(v)));
  if (!values.length) return null;

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const min = yMin !== null ? yMin : Math.floor(dataMin * 0.9);
  const max = yMax !== null ? yMax : Math.ceil(dataMax * 1.1);
  const range = max - min || 1;

  const baselineY = baseline != null ? 100 - ((baseline - min) / range) * 100 : null;

  const xLabels = [];
  if (data[0]?.date) {
    const firstDate = new Date(data[0].date);
    const midDate = new Date(data[Math.floor(data.length / 2)]?.date);
    const lastDate = new Date(data[data.length - 1]?.date);
    xLabels.push(
      { pos: 0, text: firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) },
      { pos: 50, text: midDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) },
      { pos: 100, text: lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) },
    );
  }

  const tappedDot = tappedIndex != null ? data[tappedIndex] : null;
  const xDenom = Math.max(data.length - 1, 1);

  const segments = [];
  let currentSegment = [];
  data.forEach((d, i) => {
    const ok = d.value != null && !Number.isNaN(Number(d.value));
    if (ok) {
      const x = (i / xDenom) * 100;
      const y = 100 - ((Number(d.value) - min) / range) * 100;
      currentSegment.push(`${x},${y}`);
    } else {
      if (currentSegment.length > 1) segments.push(currentSegment.join(" "));
      currentSegment = [];
    }
  });
  if (currentSegment.length > 1) segments.push(currentSegment.join(" "));

  const gapSegments = [];
  let gapStart = null;
  let gapCount = 0;
  data.forEach((d, i) => {
    const invalid = d.value == null || Number.isNaN(Number(d.value));
    if (invalid) {
      if (gapStart === null) gapStart = i;
      gapCount += 1;
    } else {
      if (gapCount >= 3 && gapStart != null && gapStart > 0) {
        const startX = ((gapStart - 1) / xDenom) * 100;
        const endX = (i / xDenom) * 100;
        gapSegments.push({ startX, endX });
      }
      gapStart = null;
      gapCount = 0;
    }
  });
  if (gapCount >= 3 && gapStart != null && gapStart > 0) {
    const startX = ((gapStart - 1) / xDenom) * 100;
    const endX = 100;
    gapSegments.push({ startX, endX });
  }

  return (
    <div style={{ position: "relative", marginTop: 20 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          fontSize: 9,
          fontWeight: 500,
          color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.5px",
        }}
      >
        {max}
        {unit}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: heightBand - 12,
          fontSize: 9,
          fontWeight: 500,
          color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.5px",
        }}
      >
        {min}
        {unit}
      </div>

      <div
        style={{
          position: "relative",
          marginLeft: 34,
          height: heightBand,
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

        {baselineY != null && (
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${baselineY}%`,
                height: 1,
                borderTop: "1px dashed rgba(201,168,117,0.35)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 4,
                top: `calc(${baselineY}% - 10px)`,
                fontSize: 8,
                fontWeight: 600,
                color: "rgba(201,168,117,0.55)",
                letterSpacing: "1px",
                background: "rgba(13,14,16,0.9)",
                padding: "2px 6px",
                borderRadius: 3,
                zIndex: 5,
                pointerEvents: "none",
              }}
            >
              BASE
            </div>
          </>
        )}

        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {segments.map((pts, segI) => (
            <polyline
              key={segI}
              points={pts}
              fill="none"
              stroke="rgba(201,168,117,0.35)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              preserveAspectRatio="none"
            />
          ))}
        </svg>

        {gapSegments.map((g, gi) => (
          <div
            key={`gap-${gi}`}
            style={{
              position: "absolute",
              left: `${g.startX}%`,
              width: `${Math.max(g.endX - g.startX, 0.5)}%`,
              bottom: -4,
              height: 2,
              background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0 3px, transparent 3px 6px)",
              pointerEvents: "none",
            }}
          />
        ))}

        {data.map((d, i) => {
          if (d.value == null || Number.isNaN(Number(d.value))) return null;
          const x = (i / xDenom) * 100;
          const y = 100 - ((Number(d.value) - min) / range) * 100;
          const color = d.color || "#C9A875";
          const isTapped = tappedIndex === i;

          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTappedIndex(isTapped ? null : i);
              }}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                width: isTapped ? 14 : 10,
                height: isTapped ? 14 : 10,
                marginLeft: isTapped ? -7 : -5,
                marginTop: isTapped ? -7 : -5,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 ${isTapped ? 14 : 8}px ${color}50`,
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.15s ease",
                zIndex: isTapped ? 3 : 2,
              }}
            />
          );
        })}

        {tappedDot && tappedIndex != null ? (
          <div
            style={{
              position: "absolute",
              left: `${(tappedIndex / xDenom) * 100}%`,
              bottom: "calc(100% + 4px)",
              transform: "translateX(-50%)",
              background: "rgba(20,20,22,0.98)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 11,
              color: "#fff",
              whiteSpace: "nowrap",
              zIndex: 10,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontWeight: 600 }}>
              {Math.round(Number(tappedDot.value))}
              {unit}
            </div>
            {tappedDot.date ? (
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                {new Date(tappedDot.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {xLabels.length > 0 ? (
        <div
          style={{
            position: "relative",
            marginLeft: 34,
            marginTop: 8,
            height: 14,
          }}
        >
          {xLabels.map((l, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${l.pos}%`,
                transform:
                  l.pos === 0 ? "translateX(0)" : l.pos === 100 ? "translateX(-100%)" : "translateX(-50%)",
                fontSize: 9,
                fontWeight: 500,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.3px",
              }}
            >
              {l.text}
            </div>
          ))}
        </div>
      ) : null}

      {annotation ? (
        <div
          style={{
            marginTop: 14,
            marginLeft: 34,
            fontSize: 11,
            color: "rgba(201,168,117,0.7)",
            fontWeight: 500,
            letterSpacing: "0.2px",
          }}
        >
          {annotation}
        </div>
      ) : null}
    </div>
  );
};

export const WeeklyBars = ({
  data,
  maxValue,
  unit = "min",
  accentColor = "#C9A875",
  targetValue = null,
  targetLabel = null,
  baselineValue = null,
  showValues = true,
  onBarClick = null,
  selectedIndex = null,
}) => {
  const max = maxValue || Math.max(...data.map((d) => d.value || 0), targetValue || 0, baselineValue || 0, 1);
  const targetY = targetValue != null ? 100 - (targetValue / max) * 100 : null;
  const baselineY = baselineValue != null ? 100 - (baselineValue / max) * 100 : null;

  return (
    <div style={{ position: "relative", marginTop: 16 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          fontSize: 9,
          fontWeight: 500,
          color: "rgba(255,255,255,0.25)",
        }}
      >
        {unit === "h" ? Number(max).toFixed(1) : Math.round(max)}
        {unit}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "flex-end",
          height: 140,
          marginLeft: 34,
          position: "relative",
        }}
      >
        {baselineY != null ? (
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${baselineY}%`,
                height: 1,
                borderTop: "1px dashed rgba(100,180,255,0.45)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: `calc(${baselineY}% - 8px)`,
                fontSize: 8,
                fontWeight: 600,
                color: "rgba(100,180,255,0.75)",
                letterSpacing: "1px",
                background: "rgba(13,14,16,0.7)",
                padding: "1px 5px",
                borderRadius: 3,
              }}
            >
              AVG {Math.round(baselineValue)}
            </div>
          </>
        ) : null}

        {targetY != null ? (
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${targetY}%`,
                height: 1,
                borderTop: "1px dashed rgba(201,168,117,0.5)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <div
              style={{
                position: "absolute",
                right: -4,
                top: `calc(${targetY}% - 8px)`,
                fontSize: 8,
                fontWeight: 600,
                color: "rgba(201,168,117,0.7)",
                letterSpacing: "1px",
                background: "rgba(13,14,16,0.7)",
                padding: "1px 5px",
                borderRadius: 3,
              }}
            >
              {targetLabel || `TARGET ${targetValue}`}
            </div>
          </>
        ) : null}

        {data.map((d, i) => {
          const pct = ((d.value || 0) / max) * 100;
          const isHit = targetValue != null && d.value >= targetValue;
          const isSelected =
            typeof onBarClick === "function" && selectedIndex != null ? i === selectedIndex : Boolean(d.isCurrent);
          const colStyles = {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            height: "100%",
            justifyContent: "flex-end",
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: typeof onBarClick === "function" ? "pointer" : "default",
            font: "inherit",
            color: "inherit",
            minWidth: 0,
          };
          const inner = (
            <>
              {showValues && d.value > 0 ? (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isSelected ? accentColor : "rgba(255,255,255,0.45)",
                    fontFamily: "'DM Serif Display', serif",
                  }}
                >
                  {unit === "h" ? Number(d.value).toFixed(1) : Math.round(d.value)}
                </div>
              ) : null}
              <div
                style={{
                  width: "100%",
                  height: `${pct}%`,
                  minHeight: d.value > 0 ? 3 : 0,
                  background: isSelected ? accentColor : `${accentColor}40`,
                  borderRadius: "4px 4px 2px 2px",
                  transition: "height 0.4s ease, background 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: isSelected ? `0 0 12px ${accentColor}60` : "none",
                  border: isHit && !isSelected ? `1px solid ${accentColor}80` : "none",
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: isSelected ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                  letterSpacing: "0.5px",
                  textAlign: "center",
                }}
              >
                {d.label}
              </div>
            </>
          );
          if (typeof onBarClick === "function") {
            return (
              <button key={i} type="button" onClick={() => onBarClick(i)} style={colStyles}>
                {inner}
              </button>
            );
          }
          return (
            <div key={i} style={colStyles}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const StatTile = ({ label, value, unit, accent, trend, threshold }) => {
  const thresholdColors = {
    green: "#5dffa0",
    amber: "#ffd84d",
    red: "#FF6B6B",
  };
  const color = threshold?.color ? thresholdColors[threshold.color] : accent || "#fff";
  const borderTint = threshold?.color ? `${thresholdColors[threshold.color]}30` : "rgba(255,255,255,0.07)";

  return (
    <div
      style={{
        flex: 1,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${borderTint}`,
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
          color,
          lineHeight: 1,
          letterSpacing: "-0.5px",
        }}
      >
        {value}
        {unit ? (
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
        ) : null}
      </div>
      {threshold?.text ? (
        <div
          style={{
            fontSize: 9,
            color,
            opacity: 0.8,
            marginTop: 4,
            fontWeight: 500,
            letterSpacing: "0.3px",
          }}
        >
          {threshold.text}
        </div>
      ) : null}
      {trend && !threshold ? (
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
      ) : null}
    </div>
  );
};

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
