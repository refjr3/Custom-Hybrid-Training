import { useState, useEffect, useCallback, useMemo } from "react";
import OnboardingShell, { stepIndexFromProfile, onboardingStepKeyFromIndex } from "./shared/OnboardingShell.jsx";
import StepProfile from "./StepProfile.jsx";
import StepGoals from "./StepGoals.jsx";
import StepDevices from "./StepDevices.jsx";
import StepConnect from "./StepConnect.jsx";
import StepComplete from "./StepComplete.jsx";

const STEP_META = [
  { key: "profile", title: "Tell us about you", subtitle: "This helps us build training that fits." },
  { key: "goals", title: "What are you training for?", subtitle: null },
  { key: "devices", title: "What do you train with?", subtitle: "Pick everything you have. More data = smarter coaching." },
  { key: "connect", title: "Connect your devices", subtitle: "You can always add more later in settings." },
  { key: "complete", title: "You're all set", subtitle: "Your coach is ready." },
];

function hoursKeyFromProfile(h) {
  const n = Number(h);
  if (!Number.isFinite(n)) return "";
  if (n <= 4.5) return "3-5";
  if (n <= 9) return "5-8";
  if (n <= 13) return "8-12";
  return "12+";
}

function sportsToDb(arr) {
  if (!Array.isArray(arr)) return [];
  const map = {
    HYROX: "hyrox",
    TRIATHLON: "triathlon",
    RUNNING: "running",
    CYCLING: "cycling",
    STRENGTH: "strength",
    HYBRID: "hybrid",
  };
  return arr.map((s) => map[s] || String(s).toLowerCase()).filter(Boolean);
}

function sportsFromDb(arr) {
  if (!Array.isArray(arr)) return [];
  const map = {
    hyrox: "HYROX",
    triathlon: "TRIATHLON",
    running: "RUNNING",
    cycling: "CYCLING",
    strength: "STRENGTH",
    hybrid: "HYBRID",
  };
  return arr.map((s) => map[String(s).toLowerCase()] || String(s).toUpperCase()).filter(Boolean);
}

function daysPerWeekFromHoursKey(key) {
  if (key === "3-5") return 4;
  if (key === "5-8") return 5;
  if (key === "8-12") return 6;
  if (key === "12+") return 7;
  return 5;
}

function lbsToKg(lb) {
  const n = Number(lb);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n / 2.20462) * 10) / 10;
}

function kgToLbs(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 2.20462 * 10) / 10;
}

export default function OnboardingFlow({ profile, supabase, user, onComplete, onProfileRefresh }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const initialDevices = useMemo(() => {
    const raw = profile?.onboarding_devices;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return {
        selected: Array.isArray(raw.selected) ? raw.selected : [],
        no_wearable: Boolean(raw.no_wearable),
      };
    }
    return { selected: [], no_wearable: false };
  }, [profile?.onboarding_devices]);

  const [uiStep, setUiStep] = useState(() => {
    const raw = (profile?.onboarding_step || "profile").toLowerCase();
    const allowed = ["profile", "goals", "devices", "connect", "complete"];
    if (!allowed.includes(raw)) return "profile";
    return raw;
  });

  const [profileForm, setProfileForm] = useState(() => ({
    full_name: profile?.name || profile?.full_name || "",
    dob: profile?.dob || profile?.date_of_birth || "",
    gender: profile?.gender || profile?.sex || "",
    height_cm: profile?.height_cm != null ? String(profile.height_cm) : "",
    weight_kg: profile?.weight_kg != null ? String(profile.weight_kg) : "",
    weight_lbs: profile?.weight_lbs != null ? String(profile.weight_lbs) : "",
    hyrox_division: profile?.hyrox_division || "",
    training_experience: profile?.training_experience || profile?.experience_level || "",
  }));

  const [goalsForm, setGoalsForm] = useState(() => ({
    sports: sportsFromDb(profile?.sports),
    target_race_name: profile?.target_race_name || "",
    target_race_date: profile?.target_race_date || "",
    no_race: !profile?.target_race_date && !profile?.target_race_name,
    weekly_hours_key: hoursKeyFromProfile(profile?.weekly_training_hours),
    weekly_training_hours: profile?.weekly_training_hours ?? null,
  }));

  const [devicesForm, setDevicesForm] = useState(initialDevices);
  const [oauthWhoop, setOauthWhoop] = useState(false);
  const [oauthStrava, setOauthStrava] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const whoop = params.get("whoop_connected") === "true" || params.get("connected") === "true";
    const strava = params.get("strava") === "connected";
    if (!whoop && !strava) return;
    if (whoop) setOauthWhoop(true);
    if (strava) setOauthStrava(true);
    window.history.replaceState({}, "", window.location.pathname || "/");
    (async () => {
      if (onProfileRefresh) await onProfileRefresh();
    })();
  }, [onProfileRefresh]);

  const persist = useCallback(
    async (partial) => {
      const { error: e } = await supabase.from("user_profiles").update(partial).eq("user_id", user.id);
      if (e) throw new Error(e.message);
      if (onProfileRefresh) await onProfileRefresh();
    },
    [supabase, user?.id, onProfileRefresh]
  );

  const saveProfile = async (nextForm) => {
    setSaving(true);
    setError("");
    try {
      let weight_kg = nextForm.weight_kg != null && String(nextForm.weight_kg).trim() !== "" ? Number(nextForm.weight_kg) : null;
      let weight_lbs = nextForm.weight_lbs != null && String(nextForm.weight_lbs).trim() !== "" ? Number(nextForm.weight_lbs) : null;
      if (weight_kg == null && weight_lbs != null) weight_kg = lbsToKg(weight_lbs);
      if (weight_lbs == null && weight_kg != null) weight_lbs = kgToLbs(weight_kg);

      await persist({
        name: String(nextForm.full_name || "").trim(),
        dob: nextForm.dob || null,
        date_of_birth: nextForm.dob || null,
        gender: nextForm.gender || null,
        sex: nextForm.gender || null,
        height_cm: nextForm.height_cm !== "" && nextForm.height_cm != null ? Number(nextForm.height_cm) : null,
        weight_kg,
        weight_lbs,
        hyrox_division: nextForm.hyrox_division || null,
        training_experience: nextForm.training_experience || null,
        experience_level: nextForm.training_experience || null,
        onboarding_step: "goals",
      });
      setProfileForm(nextForm);
      setUiStep("goals");
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveGoals = async (nextForm) => {
    setSaving(true);
    setError("");
    try {
      await persist({
        sports: sportsToDb(nextForm.sports),
        target_race_name: nextForm.no_race ? null : nextForm.target_race_name || null,
        target_race_date: nextForm.no_race ? null : nextForm.target_race_date || null,
        weekly_training_hours: nextForm.weekly_training_hours,
        onboarding_step: "devices",
      });
      setGoalsForm(nextForm);
      setUiStep("devices");
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveDevices = async (nextDevices) => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        selected: nextDevices.selected || [],
        no_wearable: Boolean(nextDevices.no_wearable),
        interested: (nextDevices.selected || []).filter((id) => ["garmin", "apple_watch", "oura"].includes(id)),
      };
      const skipConnect = Boolean(nextDevices.no_wearable);
      await persist({
        onboarding_devices: payload,
        onboarding_step: skipConnect ? "complete" : "connect",
      });
      setDevicesForm(nextDevices);
      setUiStep(skipConnect ? "complete" : "connect");
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const continueConnect = async () => {
    setSaving(true);
    setError("");
    try {
      await persist({ onboarding_step: "complete" });
      setUiStep("complete");
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleBuildPlan = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    const token = s?.access_token;
    if (!token) throw new Error("Not signed in");

    let hasPlan = true;
    try {
      const res = await fetch("/api/plan/days", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) hasPlan = false;
    } catch {
      hasPlan = false;
    }

    if (!hasPlan) {
      const sports = sportsToDb(goalsForm.sports);
      const noRace = Boolean(goalsForm.no_race);
      const races =
        noRace || !goalsForm.target_race_name?.trim()
          ? []
          : [
              {
                name: goalsForm.target_race_name.trim(),
                date: goalsForm.target_race_date || null,
                sport: sports[0] || "hyrox",
                is_primary: true,
              },
            ];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const gen = await fetch("/api/plan/generate", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sports,
          races,
          days_per_week: daysPerWeekFromHoursKey(goalsForm.weekly_hours_key),
          no_race: noRace,
        }),
      });
      clearTimeout(timeout);
      if (!gen.ok) {
        const errBody = await gen.json().catch(() => ({}));
        throw new Error(errBody.error || "Plan generation failed");
      }
    }

    await persist({
      onboarding_completed: true,
      onboarding_step: "complete",
    });

    await onComplete();
  };

  const stepIdx = stepIndexFromProfile(uiStep);
  const meta = STEP_META[stepIdx] || STEP_META[0];

  const connectableSelected = (devicesForm.selected || []).filter((id) => id === "whoop" || id === "strava");

  return (
    <OnboardingShell
      stepIndex={stepIdx}
      stepTotal={5}
      title={meta.title}
      subtitle={meta.subtitle}
      onBack={
        stepIdx > 0
          ? () => {
              const prev = onboardingStepKeyFromIndex(stepIdx - 1);
              setUiStep(prev);
            }
          : null
      }
    >
      {uiStep === "profile" ? (
        <StepProfile value={profileForm} onChange={setProfileForm} onNext={saveProfile} saving={saving} error={error} />
      ) : null}
      {uiStep === "goals" ? (
        <StepGoals value={goalsForm} onChange={setGoalsForm} onNext={saveGoals} saving={saving} error={error} />
      ) : null}
      {uiStep === "devices" ? (
        <StepDevices value={devicesForm} onChange={setDevicesForm} onNext={saveDevices} saving={saving} error={error} />
      ) : null}
      {uiStep === "connect" ? (
        <StepConnect
          profile={profile}
          user={user}
          supabase={supabase}
          selectedDevices={connectableSelected}
          onContinue={continueConnect}
          saving={saving}
          error={error}
          oauthWhoop={oauthWhoop}
          oauthStrava={oauthStrava}
        />
      ) : null}
      {uiStep === "complete" ? (
        <StepComplete profile={profile} oauthWhoop={oauthWhoop} oauthStrava={oauthStrava} onBuildPlan={handleBuildPlan} />
      ) : null}
    </OnboardingShell>
  );
}
