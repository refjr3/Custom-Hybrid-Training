import { useEffect, useRef, useState } from "react";
import IntakeShell from "./shared/IntakeShell.jsx";
import Step1Days from "./Step1Days.jsx";
import Step2Unavailable from "./Step2Unavailable.jsx";
import Step3Focus from "./Step3Focus.jsx";
import Step4Race from "./Step4Race.jsx";
import Step5Confirm from "./Step5Confirm.jsx";
import { buildIntakeGenerationContext } from "./shared/synthesizeIntake.js";
import { GenerationLoadingScreen } from "./GenerationLoadingScreen.jsx";
import { PlanPreviewScreen } from "./PlanPreviewScreen.jsx";

const DAY_SET = new Set([3, 4, 5, 6, 7]);
const RACE_STEP = 3;
const CONFIRM_STEP = 4;

function parseDaysPerWeek(profile) {
  const n = Number(profile?.days_per_week);
  if (Number.isFinite(n) && DAY_SET.has(n)) return n;
  const t = parseInt(String(profile?.days_per_week ?? "").trim(), 10);
  if (Number.isFinite(t) && DAY_SET.has(t)) return t;
  return 4;
}

function step2NextDisabled(unavailableDays, daysPerWeek) {
  const daysAvailable = 7 - unavailableDays.length;
  return daysAvailable < daysPerWeek;
}

function needsRaceStep(mainFocus) {
  return mainFocus === "train_for_race";
}

/**
 * Phase 10a — steps 0–4 (confirm stub until 10a.6).
 * @param {{ open: boolean, onClose: () => void, supabase: object, session: object | null, profile: object | null, onProfileUpdated?: () => void, onIntakeComplete?: (payload: { message: string, variantId?: string, activated?: boolean }) => void }} props
 */
export default function PlanIntakeFlow({ open, onClose, supabase, session, profile, onProfileUpdated, onIntakeComplete }) {
  const [step, setStep] = useState(0);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [flexibility, setFlexibility] = useState("flexible");
  const [unavailableDays, setUnavailableDays] = useState([]);
  const [mainFocus, setMainFocus] = useState(null);
  const [intakeRaceName, setIntakeRaceName] = useState("");
  const [intakeRaceDate, setIntakeRaceDate] = useState(null);
  const [userBaselines, setUserBaselines] = useState(null);
  const [saving, setSaving] = useState(false);
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  /** True when user opened race step from confirmation edit, so Next routes back to confirm. */
  const [returnToConfirm, setReturnToConfirm] = useState(false);

  /** False while closed; set true on first paint after open so we only reset local state when the modal opens, not when `profile` updates mid-flow. */
  const intakeWasOpenRef = useRef(false);
  /** intake → generating (POST generate-v2) → preview (activate or defer) */
  const [generationPhase, setGenerationPhase] = useState("intake");
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [generatedVariantId, setGeneratedVariantId] = useState(null);

  useEffect(() => {
    if (!open) {
      intakeWasOpenRef.current = false;
      setGenerationPhase("intake");
      setPendingRequestId(null);
      setGeneratedVariantId(null);
      return;
    }
    if (!intakeWasOpenRef.current) {
      intakeWasOpenRef.current = true;
      setStep(0);
      setUnavailableDays([]);
      setIntakeRaceName(profile?.target_race_name ? String(profile.target_race_name) : "");
      setIntakeRaceDate(profile?.target_race_date ? String(profile.target_race_date).slice(0, 10) : null);
      setUserBaselines(null);
      setDaysPerWeek(parseDaysPerWeek(profile));
      setFlexibility(profile?.schedule_flexibility === "strict" ? "strict" : "flexible");
      if (profile?.target_race_name || profile?.target_race_date) setMainFocus("train_for_race");
      else setMainFocus(null);
      setSaveError("");
      setReturnToConfirm(false);
      setGenerationPhase("intake");
      setPendingRequestId(null);
      setGeneratedVariantId(null);
    }
  }, [open, profile]);

  useEffect(() => {
    if (!open || step !== CONFIRM_STEP || !session?.user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("user_baselines").select("*").eq("user_id", session.user.id).maybeSingle();
      if (!cancelled) setUserBaselines(data || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, step, session?.user?.id, supabase]);

  const raceRequired = needsRaceStep(mainFocus);

  const saveStep1Profile = async () => {
    const uid = session?.user?.id;
    if (!uid) return false;
    setSaving(true);
    setSaveError("");
    const { error } = await supabase
      .from("user_profiles")
      .update({
        days_per_week: String(daysPerWeek),
        schedule_flexibility: flexibility,
      })
      .eq("user_id", uid);
    setSaving(false);
    if (error) {
      setSaveError(error.message || "Could not save");
      return false;
    }
    return true;
  };

  const handleNextFromStep0 = async () => {
    const ok = await saveStep1Profile();
    if (ok) setStep(1);
  };

  const handleBack = () => {
    if (step <= 0) onClose?.();
    else if (step === CONFIRM_STEP && !raceRequired) setStep(2);
    else if (step === RACE_STEP && returnToConfirm) {
      setReturnToConfirm(false);
      setStep(CONFIRM_STEP);
    } else setStep((s) => s - 1);
  };

  const handleReduceDays = () => {
    const daysAvailable = 7 - unavailableDays.length;
    setDaysPerWeek(daysAvailable);
  };

  const handleClearUnavailable = () => {
    setUnavailableDays([]);
  };

  const step2Blocked = step === 1 && step2NextDisabled(unavailableDays, daysPerWeek);
  const step3Blocked = step === 2 && !mainFocus;

  const advanceFromStep2 = () => {
    setReturnToConfirm(false);
    if (raceRequired) setStep(RACE_STEP);
    else setStep(CONFIRM_STEP);
  };

  const jumpToStep = (i) => {
    const t = Math.max(0, Math.min(CONFIRM_STEP, i));
    setReturnToConfirm(step === CONFIRM_STEP && t === RACE_STEP);
    setStep(t);
  };

  const applyRaceUpdate = async (patch) => {
    const nextName = patch?.target_race_name !== undefined ? patch.target_race_name : intakeRaceName;
    const nextDate = patch?.target_race_date !== undefined ? patch.target_race_date : intakeRaceDate;
    if (patch?.target_race_name !== undefined) {
      setIntakeRaceName(nextName ? String(nextName) : "");
    }
    if (patch?.target_race_date !== undefined) {
      setIntakeRaceDate(nextDate || null);
    }
    const uid = session?.user?.id;
    if (!uid) return;
    const { error } = await supabase
      .from("user_profiles")
      .update({
        target_race_name: nextName ? String(nextName).trim() : null,
        target_race_date: nextDate || null,
      })
      .eq("user_id", uid);
    if (error) {
      setSaveError(error.message || "Could not save race");
      return;
    }
    setSaveError("");
    onProfileUpdated?.();
  };

  const handleLooksGood = async () => {
    const uid = session?.user?.id;
    if (!uid || intakeSubmitting) return;
    setIntakeSubmitting(true);
    setSaveError("");
    try {
      const raceForRow =
        intakeRaceDate ||
        (profile?.target_race_date ? String(profile.target_race_date).slice(0, 10) : null);
      const { error: upErr } = await supabase
        .from("user_profiles")
        .update({
          target_race_name: intakeRaceName ? String(intakeRaceName).trim() : null,
          target_race_date: intakeRaceDate || null,
        })
        .eq("user_id", uid);
      if (upErr) throw new Error(upErr.message);
      const generationContext = buildIntakeGenerationContext({
        profile: {
          ...profile,
          target_race_name: intakeRaceName ? String(intakeRaceName).trim() : null,
          target_race_date: raceForRow,
        },
        userBaselines,
        daysPerWeek,
        flexibility,
        unavailableDays,
        mainFocus,
        raceDate: raceForRow,
      });
      const { data: inserted, error: insErr } = await supabase
        .from("plan_generation_requests")
        .insert({
          user_id: uid,
          days_per_week: daysPerWeek,
          schedule_flexibility: flexibility,
          unavailable_days: unavailableDays,
          main_focus: mainFocus,
          race_date: raceForRow,
          generation_context: generationContext,
          status: "intake_complete",
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      if (!inserted?.id) throw new Error("missing_request_id");
      onProfileUpdated?.();
      setPendingRequestId(inserted.id);
      setGenerationPhase("generating");
    } catch (e) {
      setSaveError(e?.message || "Save failed");
    } finally {
      setIntakeSubmitting(false);
    }
  };

  if (!open) return null;

  if (generationPhase === "generating" && pendingRequestId) {
    return (
      <GenerationLoadingScreen
        requestId={pendingRequestId}
        supabase={supabase}
        onComplete={(result) => {
          if (result?.variant_id) {
            setGeneratedVariantId(result.variant_id);
            setGenerationPhase("preview");
          } else {
            setSaveError("Generation finished but no plan id returned.");
            setGenerationPhase("intake");
            setPendingRequestId(null);
          }
        }}
        onError={(err) => {
          console.error("[plan generation]", err);
          setSaveError(typeof err === "string" ? err : "Plan generation failed. Please try again.");
          setGenerationPhase("intake");
          setPendingRequestId(null);
        }}
      />
    );
  }

  if (generationPhase === "preview" && generatedVariantId) {
    return (
      <PlanPreviewScreen
        variantId={generatedVariantId}
        supabase={supabase}
        onActivate={() => {
          onProfileUpdated?.();
          onIntakeComplete?.({
            message: "Plan activated",
            variantId: generatedVariantId,
            activated: true,
          });
          onClose?.();
        }}
        onClose={() => {
          onIntakeComplete?.({
            message: "Plan saved but not activated",
            variantId: generatedVariantId,
            activated: false,
          });
          onClose?.();
        }}
      />
    );
  }

  const shellByStep =
    step === 0
      ? {
          stepIndex: 0,
          title: "How many days per week do you realistically want to train?",
          subtitle: "Be honest — we'd rather hit 4 than miss 6.",
        }
      : step === 1
        ? {
            stepIndex: 1,
            title: "Any days you definitely can't train?",
            subtitle: "Optional. Tap days you want off. You can always skip.",
          }
        : step === 2
          ? {
              stepIndex: 2,
              title: "What's your main focus right now?",
              subtitle: "This shapes how the plan feels.",
            }
          : step === 3
            ? {
                stepIndex: 3,
                title: "When's the race?",
                subtitle: "Optional — tap \"I don't know yet\" if you're still deciding.",
              }
            : {
                stepIndex: 4,
                title: "Here's what I'll work with",
                subtitle: "Tap any line to change it.",
              };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        overflow: "auto",
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <IntakeShell stepTotal={5} onBack={handleBack} {...shellByStep}>
        {step === 0 ? (
          <Step1Days
            daysPerWeek={daysPerWeek}
            setDaysPerWeek={setDaysPerWeek}
            flexibility={flexibility}
            setFlexibility={setFlexibility}
          />
        ) : step === 1 ? (
          <Step2Unavailable
            unavailableDays={unavailableDays}
            setUnavailableDays={setUnavailableDays}
            daysPerWeek={daysPerWeek}
            onReduceDaysToAvailable={handleReduceDays}
            onClearUnavailable={handleClearUnavailable}
          />
        ) : step === 2 ? (
          <Step3Focus
            mainFocus={mainFocus}
            setMainFocus={setMainFocus}
            raceOnProfile={Boolean(profile?.target_race_date)}
          />
        ) : step === 3 ? (
          <Step4Race
            profile={profile}
            supabase={supabase}
            raceName={intakeRaceName}
            raceDate={intakeRaceDate}
            raceCity={profile?.race_city || ""}
            onRaceUpdate={applyRaceUpdate}
          />
        ) : (
          <Step5Confirm
            profile={profile}
            daysPerWeek={daysPerWeek}
            flexibility={flexibility}
            unavailableDays={unavailableDays}
            mainFocus={mainFocus}
            intakeRaceName={intakeRaceName}
            intakeRaceDate={intakeRaceDate}
            onJumpToStep={jumpToStep}
            onLooksGood={handleLooksGood}
            onBackFullEdit={() => setStep(0)}
            submitting={intakeSubmitting}
          />
        )}

        {saveError ? (
          <div
            style={{
              marginTop: 16,
              fontSize: 12,
              color: "#ff8a6c",
              textAlign: "center",
              lineHeight: 1.45,
            }}
          >
            {saveError}
          </div>
        ) : null}

        <div style={{ marginTop: "auto", paddingTop: 28 }}>
          {step === 0 ? (
            <button
              type="button"
              onClick={handleNextFromStep0}
              disabled={saving}
              style={primaryBtn(saving)}
            >
              {saving ? "Saving…" : "Next"}
            </button>
          ) : step === 1 ? (
            <button type="button" onClick={() => setStep(2)} disabled={step2Blocked} style={primaryBtn(step2Blocked)}>
              Next
            </button>
          ) : step === 2 ? (
            <button type="button" onClick={advanceFromStep2} disabled={step3Blocked} style={primaryBtn(step3Blocked)}>
              Next
            </button>
          ) : step === RACE_STEP ? (
            <button
              type="button"
              onClick={() => {
                if (returnToConfirm) {
                  setReturnToConfirm(false);
                  setStep(CONFIRM_STEP);
                  return;
                }
                setStep(CONFIRM_STEP);
              }}
              style={primaryBtn(false)}
            >
              Next
            </button>
          ) : (
            <div style={{ minHeight: 8 }} />
          )}
        </div>
      </IntakeShell>
    </div>
  );
}

function primaryBtn(disabled) {
  return {
    width: "100%",
    padding: "16px 18px",
    borderRadius: 16,
    border: "none",
    background: disabled ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #C9A875 0%, #a88b5c 100%)",
    color: disabled ? "rgba(255,255,255,0.25)" : "#0D0E10",
    fontSize: 15,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif",
  };
}

