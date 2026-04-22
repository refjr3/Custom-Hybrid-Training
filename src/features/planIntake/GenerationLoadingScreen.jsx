import { useEffect, useRef, useState } from "react";

/** Backend `stage` values on `plan_generation_requests` while `generate-v2` runs (order matters for progress). */
const STAGE_ORDER = [
  "intake_complete",
  "generating_skeleton",
  "generating_weeks",
  "generating_week1",
  "complete",
];

const STAGE_LABELS = {
  intake_complete: "Starting your plan",
  generating: "Building your plan…",
  generating_skeleton: "Reading your profile and wearable data",
  generating_weeks: "Structuring your weeks",
  generating_week1: "Detailing your first week",
  complete: "Plan ready",
  failed: "Something went wrong",
};

function progressFromStage(stage, status) {
  if (status === "failed") return 0;
  if (status === "complete" || stage === "complete") return 100;
  const idx = STAGE_ORDER.indexOf(stage || "");
  if (idx >= 0) return Math.min(92, 10 + idx * 20);
  if (status === "generating") return 18;
  return 10;
}

/**
 * Full-screen progress while `POST /api/plan/generate-v2` runs (often 60–180s).
 * Polls Supabase every 2s for `stage` / `status` so the UI advances while the HTTP request is in flight.
 */
export function GenerationLoadingScreen({ requestId, supabase, onComplete, onError }) {
  const [displayStage, setDisplayStage] = useState("generating_skeleton");
  const [progress, setProgress] = useState(12);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!requestId || !supabase) return undefined;

    let cancelled = false;
    const erroredRef = { current: false };
    const abortCtrl = new AbortController();

    const failOnce = (msg) => {
      if (erroredRef.current || cancelled) return;
      erroredRef.current = true;
      abortCtrl.abort();
      onErrorRef.current?.(msg);
    };

    const pollId = setInterval(async () => {
      if (cancelled || erroredRef.current) return;
      const { data, error } = await supabase
        .from("plan_generation_requests")
        .select("stage, status, error")
        .eq("id", requestId)
        .maybeSingle();
      if (cancelled || erroredRef.current || error || !data) return;

      const stage = data.stage || "";
      const status = data.status || "";
      if (stage) setDisplayStage(stage);
      setProgress(progressFromStage(stage, status));

      if (status === "failed") {
        clearInterval(pollId);
        failOnce(data.error || "generation_failed");
      }
    }, 2000);

    const run = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          failOnce("no_session");
          return;
        }

        const res = await fetch("/api/plan/generate-v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ requestId }),
          signal: abortCtrl.signal,
        });

        const text = await res.text();
        let body;
        try {
          body = JSON.parse(text);
        } catch {
          body = { error: text || "invalid_response" };
        }

        if (cancelled || erroredRef.current) return;

        if (!res.ok) {
          failOnce(typeof body.error === "string" ? body.error : `HTTP ${res.status}`);
          return;
        }

        setDisplayStage("complete");
        setProgress(100);
        setTimeout(() => {
          if (!cancelled && !erroredRef.current) onCompleteRef.current?.(body);
        }, 450);
      } catch (e) {
        if (e?.name === "AbortError" || cancelled || erroredRef.current) return;
        failOnce(e?.message || "network_error");
      } finally {
        clearInterval(pollId);
      }
    };

    run();

    return () => {
      cancelled = true;
      clearInterval(pollId);
      abortCtrl.abort();
    };
  }, [requestId, supabase]);

  const label = STAGE_LABELS[displayStage] || STAGE_LABELS.generating;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, #16181C 0%, #0D0E10 100%)",
        zIndex: 13000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 42,
          color: "#fff",
          letterSpacing: "-1px",
          marginBottom: 8,
        }}
      >
        The
        <span style={{ fontStyle: "italic", fontFamily: "'DM Serif Display', serif" }}>Lab</span>.
      </div>

      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(201,168,117,0.6)",
          letterSpacing: "3px",
          marginBottom: 60,
        }}
      >
        BUILDING YOUR PLAN
      </div>

      <div
        style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.7)",
          marginBottom: 12,
          textAlign: "center",
          minHeight: 44,
          maxWidth: 320,
          lineHeight: 1.45,
        }}
      >
        {label}…
      </div>

      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.35)",
          marginBottom: 32,
          textAlign: "center",
          maxWidth: 300,
          lineHeight: 1.55,
        }}
      >
        Long blocks can take up to about three minutes. This screen updates as each stage finishes.
      </div>

      <div
        style={{
          width: "80%",
          maxWidth: 260,
          height: 3,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, transparent, #C9A875, transparent)",
            transition: "width 0.8s ease",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 28,
          fontSize: 10,
          color: "rgba(255,255,255,0.22)",
          letterSpacing: "0.5px",
        }}
      >
        {displayStage.replace(/_/g, " ")}
      </div>
    </div>
  );
}
