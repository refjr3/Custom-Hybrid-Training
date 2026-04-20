import { useState } from "react";
import { PrimaryButton, SecondaryButton, GlassCard } from "./shared/Inputs.jsx";
import { Wordmark } from "./shared/OnboardingShell.jsx";

function Check() {
  return (
    <span style={{ color: "#5dffa0", fontSize: 18, lineHeight: 1 }} aria-hidden>
      ✓
    </span>
  );
}

function CheckRow({ label, ok }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.82)" }}>
      <span style={{ color: ok ? "#5dffa0" : "rgba(255,255,255,0.25)", fontSize: 16 }}>{ok ? "✓" : "○"}</span>
      {label}
    </div>
  );
}

async function persistConnectStep(supabase, userId) {
  await supabase.from("user_profiles").update({ onboarding_step: "connect" }).eq("user_id", userId);
}

export default function Step9Connect({ profile, user, supabase, selectedDevices, oauthWhoop, oauthStrava, onBuildPlan, saving, error }) {
  const uid = user?.id;
  const stravaHref = uid ? `/api/strava/login?uid=${encodeURIComponent(uid)}` : "/api/strava/login";

  const cw = profile?.connected_wearables || {};
  const whoopDone = Boolean(cw.whoop || oauthWhoop);
  const stravaDone =
    Boolean(cw.strava) ||
    Boolean(profile?.strava_access_token) ||
    Boolean(cw.strava_access_token) ||
    Boolean(oauthStrava);

  const wantWhoop = selectedDevices.includes("whoop");
  const wantStrava = selectedDevices.includes("strava");
  const wantGarmin = selectedDevices.includes("garmin");
  const wantApple = selectedDevices.includes("apple_watch");
  const wantOura = selectedDevices.includes("oura");

  const [building, setBuilding] = useState(false);
  const [planErr, setPlanErr] = useState("");

  const startWhoop = async () => {
    await persistConnectStep(supabase, uid);
    window.location.href = "/api/auth/login";
  };

  const startStrava = async () => {
    await persistConnectStep(supabase, uid);
    window.location.href = stravaHref;
  };

  const runBuild = async () => {
    setPlanErr("");
    setBuilding(true);
    try {
      await onBuildPlan();
    } catch (e) {
      setPlanErr(e?.message || "Something went wrong");
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
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {wantWhoop ? (
        <div style={{ ...cardInner, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>WHOOP</div>
            {whoopDone ? <Check /> : null}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Recovery, HRV, sleep, strain</div>
          {!whoopDone ? (
            <SecondaryButton onClick={startWhoop} style={{ width: "100%" }}>
              Connect WHOOP
            </SecondaryButton>
          ) : (
            <div style={{ fontSize: 12, color: "rgba(93,255,160,0.85)" }}>Connected</div>
          )}
        </div>
      ) : null}

      {wantStrava ? (
        <div style={{ ...cardInner, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Strava</div>
            {stravaDone ? <Check /> : null}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Sync runs, rides, and PRs</div>
          {!stravaDone ? (
            <SecondaryButton onClick={startStrava} style={{ width: "100%" }}>
              Connect Strava
            </SecondaryButton>
          ) : (
            <div style={{ fontSize: 12, color: "rgba(93,255,160,0.85)" }}>Connected</div>
          )}
        </div>
      ) : null}

      {(wantGarmin || wantApple || wantOura) && (
        <div style={{ opacity: 0.55, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px" }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>More devices</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>
            Garmin, Apple Watch, and Oura are coming soon — we&apos;ll notify you when available.
          </div>
        </div>
      )}

      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>You can add more integrations anytime from the menu.</div>
      {wantWhoop || wantStrava ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {wantWhoop ? <CheckRow label="WHOOP" ok={whoopDone} /> : null}
          {wantStrava ? <CheckRow label="Strava" ok={stravaDone} /> : null}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>No wearable connections selected — you can still build your plan.</div>
      )}

      {error ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div> : null}
      {planErr ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{planErr}</div> : null}

      <PrimaryButton onClick={runBuild} disabled={saving}>
        Build My Plan →
      </PrimaryButton>
    </GlassCard>
  );
}

const cardInner = { background: "rgba(255,255,255,0.03)" };
