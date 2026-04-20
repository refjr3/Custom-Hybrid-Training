import { useState, useEffect, useCallback, useMemo } from "react";
import OnboardingShell, { STEP_KEYS, stepIndexFromProfile, onboardingStepKeyFromIndex } from "./shared/OnboardingShell.jsx";
import Step1Profile from "./Step1Profile.jsx";
import Step2TrainingStyle, { trainingStyleToProfile } from "./Step2TrainingStyle.jsx";
import Step3RaceDecision from "./Step3RaceDecision.jsx";
import Step4RaceSearch from "./Step4RaceSearch.jsx";
import Step5Secondary from "./Step5Secondary.jsx";
import Step6Capacity from "./Step6Capacity.jsx";
import Step7Environment from "./Step7Environment.jsx";
import Step8Devices from "./Step8Devices.jsx";
import Step9Connect from "./Step9Connect.jsx";

const STEP_META = {
  profile: { title: "Basic profile", subtitle: "Name, birth date, and metrics — we keep this private." },
  training_style: { title: "How do you train right now?", subtitle: "We'll build on what you already do." },
  race_decision: { title: "Training for an event?", subtitle: null },
  race_search: { title: "What's the event?", subtitle: null },
  secondary: { title: "Anything else?", subtitle: "Optional secondary goals." },
  capacity: { title: "Your training capacity", subtitle: "Volume and experience shape the plan." },
  environment: { title: "Where you train", subtitle: "Equipment and environment matter for session design." },
  devices: { title: "What do you train with?", subtitle: "Pick everything you have. More data = smarter coaching." },
  connect: { title: "Connect & complete", subtitle: "Optional integrations, then build your plan." },
};

function hoursKeyFromNumeric(h) {
  const n = Number(h);
  if (!Number.isFinite(n)) return "";
  if (n <= 4.5) return "3-5";
  if (n <= 9) return "5-8";
  if (n <= 13) return "8-12";
  return "12+";
}

function weeksKeyFromProfile(profile) {
  const w = profile?.weekly_training_hours;
  const t = String(w ?? "");
  if (["3-5", "5-8", "8-12", "12+"].includes(t)) return t;
  return hoursKeyFromNumeric(w);
}

function lbsToKg(lb) {
  const n = Number(lb);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n / 2.20462) * 10) / 10;
}

function readTrainingEventIntent(profile) {
  const raw = profile?.sport_specific_other;
  if (raw && String(raw).trim().startsWith("{")) {
    try {
      const o = JSON.parse(raw);
      if (o.training_event_intent === "yes") return "yes";
      if (o.training_event_intent === "no") return "no";
    } catch {
      /* ignore */
    }
  }
  if (profile?.target_race_name || profile?.target_race_date) return "yes";
  if (profile?.primary_focus === "competing") return "yes";
  return "";
}

function mergeSportSpecificIntent(existing, intent) {
  let base = {};
  const raw = existing;
  if (raw && String(raw).trim().startsWith("{")) {
    try {
      const o = JSON.parse(raw);
      if (o && typeof o === "object") base = o;
    } catch {
      /* keep base */
    }
  }
  return JSON.stringify({ ...base, training_event_intent: intent });
}

function inferTrainingStyleId(p) {
  if (p?.primary_focus === "composition" && p?.performance_type === "bodybuilding_physique") return "bodybuilding";
  if (p?.primary_focus === "return") return "returning";
  if (p?.primary_focus === "performance") {
    const m = { hybrid: "hybrid", pure_strength: "strength", pure_endurance: "endurance", crossfit_style: "crossfit", beginner: "beginner" };
    return m[p?.performance_type] || "hybrid";
  }
  return "";
}

function divisionFromProfile(p) {
  if (p?.sport_division) return p.sport_division;
  const hd = String(p?.hyrox_division || "").toLowerCase();
  if (hd === "open") return "open";
  if (hd === "pro") return "pro";
  return "";
}

function hyroxDivisionLabelFromStep(sd) {
  if (sd === "open") return "Open";
  if (sd === "pro") return "Pro";
  return null;
}

function sportsJsonForPlan(raceForm, trainingStyleId) {
  const cat = raceForm?.event_category;
  if (cat === "hyrox") return ["hyrox"];
  if (cat === "triathlon") return ["triathlon"];
  if (cat === "running") {
    const d = raceForm?.sport_distance;
    if (d === "marathon" || d === "ultra") return ["marathon"];
    if (d === "half_marathon") return ["half_marathon"];
    if (d === "10k") return ["half_marathon"];
    return ["hybrid"];
  }
  if (cat === "cycling") return ["hybrid"];
  if (cat === "ocr") return ["hybrid"];
  if (cat === "crossfit") return ["strength"];
  if (cat === "powerlifting") return ["strength"];
  if (cat === "bodybuilding") return ["strength"];
  if (cat === "other") return ["hybrid"];
  const style = trainingStyleId || "";
  if (style === "endurance") return ["hybrid"];
  if (style === "strength") return ["strength"];
  if (style === "bodybuilding") return ["strength"];
  return ["hybrid"];
}

function daysPerWeekFromHoursKey(key) {
  if (key === "3-5") return 4;
  if (key === "5-8") return 5;
  if (key === "8-12") return 6;
  if (key === "12+") return 7;
  return 5;
}

const EVENT_CATEGORY_IDS = new Set(["hyrox", "triathlon", "running", "cycling", "ocr", "crossfit", "powerlifting", "bodybuilding", "other"]);

export default function OnboardingFlow({ profile, supabase, user, onComplete, onProfileRefresh }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [skipRaceSearch, setSkipRaceSearch] = useState(() => readTrainingEventIntent(profile) === "no");

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

  const serverStep = (profile?.onboarding_step || "profile").toLowerCase();
  const [uiStep, setUiStep] = useState(() => (STEP_KEYS.includes(serverStep) ? serverStep : onboardingStepKeyFromIndex(stepIndexFromProfile(serverStep))));

  const [profileForm, setProfileForm] = useState(() => ({
    full_name: profile?.name || profile?.full_name || "",
    dob: profile?.date_of_birth || profile?.dob || "",
    gender: profile?.gender || profile?.sex || "",
    height_cm: profile?.height_cm != null ? String(profile.height_cm) : "",
    weight_kg: profile?.weight_kg != null ? String(profile.weight_kg) : "",
    weight_lbs: profile?.weight_lbs != null ? String(profile.weight_lbs) : "",
  }));

  const [styleForm, setStyleForm] = useState(() => ({
    training_style_id: inferTrainingStyleId(profile),
  }));

  const [raceDecisionForm, setRaceDecisionForm] = useState(() => ({
    event_training_intent: readTrainingEventIntent(profile) || "",
  }));

  const [raceForm, setRaceForm] = useState(() => ({
    event_category: profile?.primary_sport && EVENT_CATEGORY_IDS.has(String(profile.primary_sport).toLowerCase()) ? String(profile.primary_sport).toLowerCase() : "",
    target_race_name: profile?.target_race_name || "",
    target_race_date: profile?.target_race_date || "",
    hyrox_format: profile?.hyrox_format || "",
    sport_division: divisionFromProfile(profile),
    sport_distance: profile?.sport_distance || "",
    primary_sport: profile?.primary_sport || "",
  }));

  const [secondaryForm, setSecondaryForm] = useState(() => ({
    secondary_goals: Array.isArray(profile?.secondary_goals) ? profile.secondary_goals : [],
  }));

  const [capacityForm, setCapacityForm] = useState(() => ({
    training_experience: profile?.training_experience || "",
    highest_competitive_level: profile?.highest_competitive_level || "",
    weekly_hours_key: weeksKeyFromProfile(profile),
    sessions_per_day: profile?.sessions_per_day != null ? String(profile.sessions_per_day) : "",
    days_per_week: profile?.days_per_week != null ? String(profile.days_per_week) : "",
  }));

  const [environmentForm, setEnvironmentForm] = useState(() => ({
    training_environment: profile?.training_environment || "",
    equipment_access: Array.isArray(profile?.equipment_access) ? profile.equipment_access : [],
    injuries_limitations: profile?.injuries_limitations || "",
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
      const weight_lbs = nextForm.weight_lbs != null && String(nextForm.weight_lbs).trim() !== "" ? Number(nextForm.weight_lbs) : null;
      if (weight_kg == null && weight_lbs != null) weight_kg = lbsToKg(weight_lbs);

      await persist({
        name: String(nextForm.full_name || "").trim(),
        date_of_birth: nextForm.dob || null,
        gender: nextForm.gender || null,
        height_cm: nextForm.height_cm !== "" && nextForm.height_cm != null ? Number(nextForm.height_cm) : null,
        weight_kg,
        onboarding_step: "training_style",
      });
      setProfileForm(nextForm);
      setUiStep("training_style");
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveTrainingStyle = async (nextForm) => {
    setSaving(true);
    setError("");
    try {
      const tid = nextForm.training_style_id;
      const mapped = trainingStyleToProfile(tid);
      await persist({
        ...mapped,
        onboarding_step: "race_decision",
      });
      setStyleForm(nextForm);
      setUiStep("race_decision");
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveRaceDecision = async (nextForm) => {
    setSaving(true);
    setError("");
    try {
      const intent = nextForm.event_training_intent;
      const meta = mergeSportSpecificIntent(profile?.sport_specific_other, intent);
      if (intent === "no") {
        setSkipRaceSearch(true);
        const mapped = trainingStyleToProfile(styleForm.training_style_id);
        await persist({
          sport_specific_other: meta,
          primary_focus: mapped.primary_focus,
          performance_type: mapped.performance_type,
          target_race_name: null,
          target_race_date: null,
          hyrox_format: null,
          sport_division: null,
          sport_distance: null,
          hyrox_division: null,
          primary_sport: null,
          sports: sportsJsonForPlan({}, styleForm.training_style_id),
          onboarding_step: "secondary",
        });
        setRaceDecisionForm(nextForm);
        setUiStep("secondary");
      } else {
        setSkipRaceSearch(false);
        await persist({
          sport_specific_other: meta,
          onboarding_step: "race_search",
        });
        setRaceDecisionForm(nextForm);
        setUiStep("race_search");
      }
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveRaceSearch = async (nextForm) => {
    setSaving(true);
    setError("");
    try {
      const sd = nextForm.sport_division || null;
      const hyLabel = nextForm.event_category === "hyrox" ? hyroxDivisionLabelFromStep(sd) : null;
      const sportsArr = sportsJsonForPlan(nextForm, styleForm.training_style_id);
      await persist({
        primary_focus: "competing",
        primary_sport: nextForm.event_category || nextForm.primary_sport || null,
        target_race_name: nextForm.target_race_name || null,
        target_race_date: nextForm.target_race_date || null,
        hyrox_format: nextForm.hyrox_format || null,
        sport_division: sd,
        hyrox_division: hyLabel,
        sport_distance: nextForm.sport_distance || null,
        sports: sportsArr,
        onboarding_step: "secondary",
      });
      setRaceForm(nextForm);
      setUiStep("secondary");
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveSecondary = async (nextForm) => {
    setSaving(true);
    setError("");
    try {
      await persist({
        secondary_goals: Array.isArray(nextForm.secondary_goals) ? nextForm.secondary_goals : [],
        onboarding_step: "capacity",
      });
      setSecondaryForm(nextForm);
      setUiStep("capacity");
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveCapacity = async (nextForm) => {
    setSaving(true);
    setError("");
    try {
      await persist({
        training_experience: nextForm.training_experience || null,
        highest_competitive_level: nextForm.highest_competitive_level || null,
        weekly_training_hours: nextForm.weekly_hours_key || null,
        sessions_per_day: nextForm.sessions_per_day || null,
        days_per_week: nextForm.days_per_week || null,
        onboarding_step: "environment",
      });
      setCapacityForm(nextForm);
      setUiStep("environment");
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveEnvironment = async (nextForm) => {
    setSaving(true);
    setError("");
    try {
      await persist({
        training_environment: nextForm.training_environment || null,
        equipment_access: Array.isArray(nextForm.equipment_access) ? nextForm.equipment_access : [],
        injuries_limitations: nextForm.injuries_limitations || null,
        onboarding_step: "devices",
      });
      setEnvironmentForm(nextForm);
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
      await persist({
        onboarding_devices: payload,
        onboarding_step: "connect",
      });
      setDevicesForm(nextDevices);
      setUiStep("connect");
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

    const noRace = skipRaceSearch || raceDecisionForm.event_training_intent === "no";
    const sports = sportsJsonForPlan(skipRaceSearch ? {} : raceForm, styleForm.training_style_id);
    const races =
      noRace || !String(raceForm.target_race_name || "").trim()
        ? []
        : [
            {
              name: raceForm.target_race_name.trim(),
              date: raceForm.target_race_date || null,
              sport: sports[0] || "hyrox",
              is_primary: true,
            },
          ];

    const dKey = capacityForm.weekly_hours_key || weeksKeyFromProfile(profile);
    const daysPerWeek = capacityForm.days_per_week ? Number(capacityForm.days_per_week) : daysPerWeekFromHoursKey(dKey);

    if (!hasPlan) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const gen = await fetch("/api/plan/generate", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sports,
          races,
          days_per_week: daysPerWeek,
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
      onboarding_step: "connect",
    });

    await onComplete();
  };

  const stepIdx = stepIndexFromProfile(uiStep);
  const meta = STEP_META[uiStep] || STEP_META.profile;

  const connectableSelected = (devicesForm.selected || []).filter((id) => id === "whoop" || id === "strava");

  const goBack = () => {
    if (stepIdx <= 0) return;
    let target = stepIdx - 1;
    if (uiStep === "secondary" && skipRaceSearch) target = STEP_KEYS.indexOf("race_decision");
    if (uiStep === "race_search") target = STEP_KEYS.indexOf("race_decision");
    const prevKey = onboardingStepKeyFromIndex(Math.max(0, target));
    setUiStep(prevKey);
  };

  return (
    <OnboardingShell stepIndex={stepIdx} stepTotal={9} title={meta.title} subtitle={meta.subtitle} onBack={stepIdx > 0 ? goBack : null}>
      {uiStep === "profile" ? (
        <Step1Profile value={profileForm} onChange={setProfileForm} onNext={saveProfile} saving={saving} error={error} />
      ) : null}
      {uiStep === "training_style" ? (
        <Step2TrainingStyle value={styleForm} onChange={setStyleForm} onNext={saveTrainingStyle} saving={saving} error={error} />
      ) : null}
      {uiStep === "race_decision" ? (
        <Step3RaceDecision value={raceDecisionForm} onChange={setRaceDecisionForm} onNext={saveRaceDecision} saving={saving} error={error} />
      ) : null}
      {uiStep === "race_search" ? (
        <Step4RaceSearch
          profile={{
            ...profile,
            date_of_birth: profileForm.dob || profile?.date_of_birth,
            dob: profileForm.dob || profile?.dob,
          }}
          supabase={supabase}
          value={raceForm}
          onChange={setRaceForm}
          onNext={saveRaceSearch}
          saving={saving}
          error={error}
        />
      ) : null}
      {uiStep === "secondary" ? (
        <Step5Secondary value={secondaryForm} onChange={setSecondaryForm} onNext={saveSecondary} saving={saving} error={error} />
      ) : null}
      {uiStep === "capacity" ? (
        <Step6Capacity value={capacityForm} onChange={setCapacityForm} onNext={saveCapacity} saving={saving} error={error} />
      ) : null}
      {uiStep === "environment" ? (
        <Step7Environment value={environmentForm} onChange={setEnvironmentForm} onNext={saveEnvironment} saving={saving} error={error} />
      ) : null}
      {uiStep === "devices" ? (
        <Step8Devices value={devicesForm} onChange={setDevicesForm} onNext={saveDevices} saving={saving} error={error} />
      ) : null}
      {uiStep === "connect" ? (
        <Step9Connect
          profile={profile}
          user={user}
          supabase={supabase}
          selectedDevices={devicesForm.no_wearable ? [] : connectableSelected}
          oauthWhoop={oauthWhoop}
          oauthStrava={oauthStrava}
          onBuildPlan={handleBuildPlan}
          saving={saving}
          error={error}
        />
      ) : null}
    </OnboardingShell>
  );
}
