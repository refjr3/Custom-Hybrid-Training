import { PrimaryButton, SecondaryButton, GlassCard } from "./shared/Inputs.jsx";

function Check() {
  return (
    <span style={{ color: "#5dffa0", fontSize: 18, lineHeight: 1 }} aria-hidden>
      ✓
    </span>
  );
}

async function persistConnectStep(supabase, userId) {
  await supabase.from("user_profiles").update({ onboarding_step: "connect" }).eq("user_id", userId);
}

export default function StepConnect({ profile, user, supabase, selectedDevices, onContinue, saving, error }) {
  const uid = user?.id;
  const stravaHref = uid ? `/api/strava/login?uid=${encodeURIComponent(uid)}` : "/api/strava/login";

  const cw = profile?.connected_wearables || {};
  const whoopDone = Boolean(cw.whoop);
  const stravaDone =
    Boolean(cw.strava) ||
    Boolean(profile?.strava_access_token) ||
    Boolean(cw.strava_access_token);

  const wantWhoop = selectedDevices.includes("whoop");
  const wantStrava = selectedDevices.includes("strava");
  const wantGarmin = selectedDevices.includes("garmin");
  const wantApple = selectedDevices.includes("apple_watch");
  const wantOura = selectedDevices.includes("oura");

  const startWhoop = async () => {
    await persistConnectStep(supabase, uid);
    window.location.href = "/api/auth/login";
  };

  const startStrava = async () => {
    await persistConnectStep(supabase, uid);
    window.location.href = stravaHref;
  };

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

      {error ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div> : null}

      <PrimaryButton onClick={onContinue} disabled={saving}>
        {saving ? "Saving…" : "CONTINUE"}
      </PrimaryButton>
    </GlassCard>
  );
}

const cardInner = { background: "rgba(255,255,255,0.03)" };
