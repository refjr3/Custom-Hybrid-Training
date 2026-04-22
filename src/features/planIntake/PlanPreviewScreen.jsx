import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function summarizeWeeklyPattern(pattern) {
  if (!pattern || typeof pattern !== "object") return null;
  const desc = pattern.description;
  const days = pattern.default_days;
  if (desc && typeof desc === "string") return { description: desc, lines: null };
  if (days && typeof days === "object") {
    const lines = DAY_KEYS.map((k) => {
      const d = days[k];
      if (!d || String(d.session_type || "").toLowerCase() === "rest") return `${k}: Rest`;
      return `${k}: ${d.name || d.session_type || "Session"}`;
    });
    return { description: null, lines };
  }
  return { description: JSON.stringify(pattern).slice(0, 200), lines: null };
}

/**
 * Post-generation review: phases, weekly shape, layered "why this plan?", activate or defer.
 */
export function PlanPreviewScreen({ variantId, supabase, onActivate, onClose }) {
  const [variant, setVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!variantId || !supabase) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      const { data, error } = await supabase.from("plan_variants").select("*").eq("id", variantId).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setLoadError(error?.message || "Could not load plan");
        setVariant(null);
      } else {
        setVariant(data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [variantId, supabase]);

  const handleActivate = async () => {
    if (!variant?.user_id || !variantId || !supabase || activating) return;
    setActivating(true);
    try {
      await supabase.from("plan_variants").update({ is_active: false }).eq("user_id", variant.user_id);
      await supabase.from("plan_variants").update({ is_active: true }).eq("id", variantId);
      onActivate?.();
    } catch (e) {
      console.error("[PlanPreviewScreen] activate", e);
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return createPortal(
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(180deg, #16181C 0%, #0D0E10 100%)",
          zIndex: 13000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.45)",
          fontSize: 14,
        }}
      >
        Loading plan…
      </div>,
      document.body,
    );
  }

  if (loadError || !variant) {
    return createPortal(
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(180deg, #16181C 0%, #0D0E10 100%)",
          zIndex: 13000,
          padding: 40,
          color: "#ff8a6c",
          fontSize: 14,
        }}
      >
        {loadError || "Plan not found."}
        <button type="button" onClick={onClose} style={{ display: "block", marginTop: 24, color: "#C9A875", background: "none", border: "none", cursor: "pointer" }}>
          Close
        </button>
      </div>,
      document.body,
    );
  }

  const reasoning = variant.generation_reasoning || {};
  const phases = Array.isArray(variant.phases) ? variant.phases : [];
  const pattern = variant.weekly_pattern || {};
  const patternSummary = summarizeWeeklyPattern(pattern);

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, #16181C 0%, #0D0E10 100%)",
        zIndex: 13000,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          padding: "56px 24px 48px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(201,168,117,0.6)",
            letterSpacing: "3px",
            marginBottom: 12,
          }}
        >
          YOUR PLAN IS READY
        </div>

        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 32,
            color: "#fff",
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
            marginBottom: 24,
          }}
        >
          {variant.variant_name}
        </div>

        <div
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.65,
            marginBottom: 28,
          }}
        >
          {variant.block_length_weeks} weeks · {phases.length} phases
          {patternSummary?.description ? ` · ${patternSummary.description}` : ""}
        </div>

        {patternSummary?.lines ? (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "16px 18px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "2.5px",
                marginBottom: 10,
              }}
            >
              WEEKLY PATTERN
            </div>
            {patternSummary.lines.map((line, idx) => (
              <div key={`pat-${idx}`} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                {line}
              </div>
            ))}
          </div>
        ) : null}

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: "20px 22px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "2.5px",
              marginBottom: 14,
            }}
          >
            PHASES
          </div>
          {phases.length === 0 ? (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Phase details will appear in your calendar.</div>
          ) : (
            phases.map((p, i) => (
              <div
                key={`phase-${i}`}
                style={{
                  paddingTop: i === 0 ? 0 : 14,
                  paddingBottom: 14,
                  borderBottom: i < phases.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                  Phase {i + 1}: {p.name}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
                  Weeks {p.start_week}–{p.end_week}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>{p.goal}</div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={() => setWhyExpanded(!whyExpanded)}
          style={{
            width: "100%",
            background: "rgba(201,168,117,0.06)",
            border: "1px solid rgba(201,168,117,0.2)",
            borderRadius: 18,
            padding: "16px 20px",
            textAlign: "left",
            cursor: "pointer",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(201,168,117,0.6)",
              letterSpacing: "2.5px",
              marginBottom: 8,
            }}
          >
            WHY THIS PLAN?
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.65 }}>
            {reasoning.summary || "Built from your profile, wearable baselines, and stated focus."}
          </div>
          {whyExpanded && (reasoning.block_length || reasoning.phase_choice || reasoning.session_mix) ? (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(201,168,117,0.15)" }}>
              {reasoning.block_length ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 10 }}>
                  <strong style={{ color: "rgba(255,255,255,0.85)" }}>Why this length:</strong> {reasoning.block_length}
                </div>
              ) : null}
              {reasoning.phase_choice ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 10 }}>
                  <strong style={{ color: "rgba(255,255,255,0.85)" }}>Why these phases:</strong> {reasoning.phase_choice}
                </div>
              ) : null}
              {reasoning.session_mix ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
                  <strong style={{ color: "rgba(255,255,255,0.85)" }}>Why this session mix:</strong> {reasoning.session_mix}
                </div>
              ) : null}
            </div>
          ) : null}
          <div style={{ marginTop: 10, fontSize: 11, color: "#C9A875" }}>{whyExpanded ? "↑ Show less" : "Tap for details"}</div>
        </button>

        <button
          type="button"
          onClick={handleActivate}
          disabled={activating}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, rgba(201,168,117,0.15) 0%, rgba(201,168,117,0.08) 100%)",
            border: "1px solid rgba(201,168,117,0.4)",
            borderRadius: 16,
            padding: "16px",
            color: "#C9A875",
            fontSize: 14,
            fontWeight: 600,
            cursor: activating ? "wait" : "pointer",
            letterSpacing: "0.3px",
            marginBottom: 10,
            opacity: activating ? 0.75 : 1,
          }}
        >
          {activating ? "Activating…" : "Activate this plan"}
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            padding: "14px",
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {"I'll decide later"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
