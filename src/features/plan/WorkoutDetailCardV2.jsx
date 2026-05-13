function safeUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function EffortStatRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
      <span
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.45)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 15,
          color: "#D4A953",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DecisionRow({ label, text, tint, rail, labelColor }) {
  if (!text) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "11px 14px",
        marginBottom: 6,
        borderRadius: "0 8px 8px 0",
        background: tint,
        borderLeft: `2px solid ${rail}`,
      }}
    >
      <div
        style={{
          width: 42,
          flexShrink: 0,
          fontSize: 10,
          letterSpacing: "0.22em",
          fontWeight: 700,
          color: labelColor,
          textTransform: "uppercase",
          lineHeight: 1.35,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
        {text}
      </div>
    </div>
  );
}

export default function WorkoutDetailCardV2({
  parsed,
  dateLabel,
  onEdit,
  onMarkComplete,
}) {
  const safe = parsed || {};
  const blocks = Array.isArray(safe.blocks) ? safe.blocks : [];

  return (
    <div
      style={{
        background: "rgba(232,220,196,0.05)",
        border: "1px solid rgba(232,220,196,0.22)",
        borderRadius: 18,
        padding: "20px 20px 18px",
        marginTop: 18,
        marginBottom: 28,
        boxShadow: "0 10px 30px rgba(0,0,0,0.26)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "#D4A953",
          fontWeight: 600,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {safeUpper(dateLabel)}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div
          style={{
            background: "rgba(232,220,196,0.08)",
            border: "1px solid rgba(232,220,196,0.18)",
            color: "#E8DCC4",
            borderRadius: 999,
            padding: "5px 11px",
            fontSize: 10,
            letterSpacing: "0.12em",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {safeUpper(safe.tag || "SESSION")}
        </div>
        {typeof onEdit === "function" ? (
          <button
            type="button"
            onClick={onEdit}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.72)",
              borderRadius: 999,
              padding: "5px 11px",
              fontSize: 10,
              letterSpacing: "0.12em",
              fontWeight: 600,
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ✎ Edit
          </button>
        ) : null}
      </div>

      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {safeUpper(safe.kicker)}
      </div>

      <div
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 30,
          lineHeight: 1.1,
          color: "rgba(255,255,255,0.96)",
          marginBottom: 12,
        }}
      >
        {safe.headline || "Session Detail"}
      </div>

      <div style={{ width: 36, height: 1, background: "#D4A953", marginBottom: 11 }} />

      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {[safe.duration, safe.phase].filter(Boolean).map((v) => safeUpper(v)).join(" · ")}
      </div>

      {blocks.map((block, blockIdx) => {
        const effort = block?.effort || {};
        const exercises = Array.isArray(block?.exercises) ? block.exercises : [];
        const modalities = Array.isArray(effort.modalities) ? effort.modalities.filter(Boolean) : [];
        return (
          <div key={`${block?.label || "block"}_${blockIdx}`} style={{ marginTop: blockIdx === 0 ? 6 : 8 }}>
            <div
              style={{
                borderTop: "0.5px solid rgba(255,255,255,0.12)",
                borderBottom: "0.5px solid rgba(255,255,255,0.08)",
                padding: "10px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.24em",
                  fontWeight: 700,
                  color: "#E8DCC4",
                  textTransform: "uppercase",
                }}
              >
                {safeUpper(block?.label)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.45)",
                  textTransform: "uppercase",
                }}
              >
                {safeUpper(block?.duration)}
              </div>
            </div>

            {block?.type === "effort" ? (
              <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: 22,
                    lineHeight: 1.18,
                    color: "rgba(255,255,255,0.95)",
                    fontWeight: 500,
                  }}
                >
                  {effort.primary || "Session effort"}
                </div>
                <EffortStatRow label="HR" value={effort.hr} />
                <EffortStatRow label="RPE" value={effort.rpe} />
                <EffortStatRow label="CAP" value={effort.cap} />
                {modalities.length > 0 ? (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                    {modalities.join(" · ")}
                  </div>
                ) : null}
                {effort.decisionTree ? (
                  <div style={{ marginTop: 2 }}>
                    <div
                      style={{
                        borderTop: "0.5px solid rgba(255,255,255,0.12)",
                        borderBottom: "0.5px solid rgba(255,255,255,0.08)",
                        padding: "10px 0",
                        marginBottom: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.24em",
                          fontWeight: 700,
                          color: "#E8DCC4",
                          textTransform: "uppercase",
                        }}
                      >
                        DAY-OF DECISION
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.16em",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.45)",
                          textTransform: "uppercase",
                        }}
                      >
                        COACH&apos;S CALL
                      </div>
                    </div>
                    <DecisionRow
                      label="GO"
                      text={effort.decisionTree.go}
                      tint="rgba(74,222,128,0.05)"
                      rail="#4ade80"
                      labelColor="#4ade80"
                    />
                    <DecisionRow
                      label="HOLD"
                      text={effort.decisionTree.hold}
                      tint="rgba(251,191,36,0.05)"
                      rail="#fbbf24"
                      labelColor="#fbbf24"
                    />
                    <DecisionRow
                      label="REST"
                      text={effort.decisionTree.rest}
                      tint="rgba(248,113,113,0.05)"
                      rail="#f87171"
                      labelColor="#f87171"
                    />
                  </div>
                ) : null}
                {effort.coachingNote ? (
                  <div
                    style={{
                      background: "rgba(232,220,196,0.04)",
                      borderLeft: "2px solid rgba(232,220,196,0.7)",
                      padding: "11px 14px",
                      color: "rgba(232,220,196,0.85)",
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontStyle: "italic",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {effort.coachingNote}
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ paddingTop: 4 }}>
                {exercises.map((exercise, exIdx) => (
                  <div
                    key={`${exercise?.name || "ex"}_${exIdx}`}
                    style={{
                      padding: "7px 0",
                      borderBottom: exIdx < exercises.length - 1 ? "0.5px solid rgba(255,255,255,0.05)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>
                        {exercise?.name || "Exercise"}
                      </div>
                      <div
                        style={{
                          fontSize: 13.5,
                          color: "#D4A953",
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                          textAlign: "right",
                        }}
                      >
                        {exercise?.sets || ""}
                      </div>
                    </div>
                    {exercise?.note ? (
                      <div style={{ marginTop: 2, fontSize: 11.5, color: "rgba(255,255,255,0.45)" }}>
                        {exercise.note}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {safe.finisherNote ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "rgba(255,255,255,0.52)",
            fontStyle: "italic",
          }}
        >
          {safe.finisherNote}
        </div>
      ) : null}

      {typeof onMarkComplete === "function" ? (
        <button
          type="button"
          onClick={onMarkComplete}
          style={{
            width: "100%",
            marginTop: 14,
            padding: 14,
            background: "rgba(212,169,83,0.08)",
            border: "1px solid rgba(212,169,83,0.35)",
            borderRadius: 14,
            color: "#D4A953",
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          ✓ Mark complete
        </button>
      ) : null}
    </div>
  );
}
