import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function PlanBuilder({ user, session, onComplete, onDismiss }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleBuild = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) throw new Error("Not authenticated");
      const token = authSession.access_token;
      const rebuildRes = await fetch("/api/plan/rebuild", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!rebuildRes.ok) throw new Error("Failed to clear existing plan");
      const genRes = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profile: user }),
      });
      const data = await genRes.json().catch(() => ({}));
      if (!genRes.ok) throw new Error(data.error || "Plan generation failed");
      onComplete();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (e) => {
    e?.preventDefault?.();
    onDismiss?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleDismiss}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "pointer" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1a1a1a", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", border: "1px solid #2a2a2a", cursor: "default" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "'Bebas Neue','Arial Black',sans-serif", fontSize: 24, letterSpacing: 2 }}>BUILD YOUR PLAN</div>
          <button type="button" onClick={handleDismiss} style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: 24, lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ fontFamily: "'Inter',-apple-system,sans-serif", fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 24 }}>
          Generate a personalized training plan based on your profile and goals.
        </div>
        {error && (
          <div style={{ background: "rgba(255,60,0,0.15)", border: "1px solid rgba(255,60,0,0.4)", borderRadius: 8, padding: 12, marginBottom: 16, fontFamily: "monospace", fontSize: 12, color: "#FF3C00" }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleBuild}
            disabled={loading}
            style={{ flex: 1, background: loading ? "#333" : "#00F3FF", color: "#000", border: "none", borderRadius: 12, padding: "16px 24px", fontSize: 13, fontWeight: 700, letterSpacing: 2, cursor: loading ? "default" : "pointer" }}
          >
            {loading ? "BUILDING…" : "BUILD MY PLAN"}
          </button>
          <button type="button" onClick={handleDismiss} style={{ padding: "16px 20px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 12, fontSize: 12, cursor: "pointer" }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}
