import { useState } from "react";
import { PrimaryButton, GlassCard } from "./shared/Inputs.jsx";
import { Wordmark } from "./shared/OnboardingShell.jsx";

function CheckRow({ label, ok }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.82)" }}>
      <span style={{ color: ok ? "#5dffa0" : "rgba(255,255,255,0.25)", fontSize: 16 }}>{ok ? "✓" : "○"}</span>
      {label}
    </div>
  );
}

export default function StepComplete({ profile, oauthWhoop, oauthStrava, onBuildPlan }) {
  const [building, setBuilding] = useState(false);
  const [err, setErr] = useState("");

  const cw = profile?.connected_wearables || {};
  const whoop = Boolean(cw.whoop || oauthWhoop);
  const strava =
    Boolean(cw.strava) ||
    Boolean(profile?.strava_access_token) ||
    Boolean(cw.strava_access_token) ||
    Boolean(oauthStrava);

  const run = async () => {
    setErr("");
    setBuilding(true);
    try {
      await onBuildPlan();
    } catch (e) {
      setErr(e?.message || "Something went wrong");
      setBuilding(false);
    }
  };

  if (building) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: "#0D0E10",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 55% at 50% -15%, rgba(201,168,117,0.18) 0%, transparent 55%), linear-gradient(180deg, #101115 0%, #0D0E10 45%, #0c0d10 100%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{ marginBottom: 16 }}>
            <Wordmark />
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.55)", letterSpacing: "0.3px" }}>
            Building your plan…
          </div>
        </div>
      </div>
    );
  }

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>You can add more integrations anytime from the menu.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <CheckRow label="WHOOP" ok={whoop} />
        <CheckRow label="Strava" ok={strava} />
      </div>
      {err ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{err}</div> : null}
      <PrimaryButton onClick={run}>Build My Plan →</PrimaryButton>
    </GlassCard>
  );
}
