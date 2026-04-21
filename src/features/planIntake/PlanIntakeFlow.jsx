import { useCallback, useEffect, useState } from "react";
import IntakeShell from "./shared/IntakeShell.jsx";
import Step1Days from "./Step1Days.jsx";
import Step2Unavailable from "./Step2Unavailable.jsx";
import Step3Focus from "./Step3Focus.jsx";

const DAY_SET = new Set([3, 4, 5, 6, 7]);

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

function needsRaceStep(profile, mainFocus) {
  return mainFocus === "train_for_race" && !profile?.target_race_date;
}

/**
 * Phase 10a — steps 0–4 (race + confirm stubs until 10a.5 / 10a.6).
 * @param {{ open: boolean, onClose: () => void, supabase: object, session: object | null, profile: object | null, onProfileUpdated?: () => void }} props
 */
export default function PlanIntakeFlow({ open, onClose, supabase, session, profile, onProfileUpdated }) {
  const [step, setStep] = useState(0);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [flexibility, setFlexibility] = useState("flexible");
  const [unavailableDays, setUnavailableDays] = useState([]);
  const [mainFocus, setMainFocus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const syncFromProfile = useCallback(() => {
    setDaysPerWeek(parseDaysPerWeek(profile));
    setFlexibility(profile?.schedule_flexibility === "strict" ? "strict" : "flexible");
    if (profile?.target_race_date) setMainFocus("train_for_race");
    else setMainFocus(null);
  }, [profile]);

  useEffect(() => {
    if (open) {
      setStep(0);
      setUnavailableDays([]);
      syncFromProfile();
      setSaveError("");
    }
  }, [open, syncFromProfile]);

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
    onProfileUpdated?.();
    return true;
  };

  const handleNextFromStep0 = async () => {
    const ok = await saveStep1Profile();
    if (ok) setStep(1);
  };

  const handleBack = () => {
    if (step <= 0) onClose?.();
    else setStep((s) => s - 1);
  };

  const handleReduceDays = () => {
    const daysAvailable = 7 - unavailableDays.length;
    setDaysPerWeek(daysAvailable);
  };

  const handleClearUnavailable = () => {
    setUnavailableDays([]);
  };

  const raceRequired = needsRaceStep(profile, mainFocus);
  const step2Blocked = step === 1 && step2NextDisabled(unavailableDays, daysPerWeek);
  const step3Blocked = step === 2 && !mainFocus;

  const advanceFromStep2 = () => {
    if (raceRequired) setStep(3);
    else setStep(4);
  };

  if (!open) return null;

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
                subtitle: "Race date step ships in 10a.5 — use Back to edit focus.",
              }
            : {
                stepIndex: 4,
                title: "Here's what I'll work with",
                subtitle: "Confirmation step ships in 10a.6.",
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
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.55 }}>
            Race date picker arrives in 10a.5.
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.55 }}>
            Synthesized confirmation arrives in 10a.6.
          </p>
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
          ) : step === 3 ? (
            <button type="button" onClick={() => setStep(4)} style={primaryBtn(false)}>
              Next
            </button>
          ) : (
            <button type="button" onClick={() => onClose?.()} style={secondaryBtn}>
              Close for now
            </button>
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

const secondaryBtn = {
  width: "100%",
  padding: "16px 18px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.85)",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};
