import { useEffect, useState } from "react";
import { colors, spacing, typography } from "../../../design/tokens";

const QUESTIONS = [
  {
    id: "energy",
    label: "Energy",
    options: [
      { value: 1, label: "Very Low" },
      { value: 2, label: "Low" },
      { value: 3, label: "Okay" },
      { value: 4, label: "Good" },
      { value: 5, label: "Great" },
    ],
  },
  {
    id: "legs",
    label: "Legs",
    options: [
      { value: "heavy", label: "Heavy" },
      { value: "normal", label: "Normal" },
      { value: "fresh", label: "Fresh" },
    ],
  },
  {
    id: "motivation",
    label: "Motivation",
    options: [
      { value: "low", label: "Low" },
      { value: "moderate", label: "Moderate" },
      { value: "high", label: "High" },
    ],
  },
  {
    id: "sleep_quality",
    label: "Sleep",
    options: [
      { value: "poor", label: "Poor" },
      { value: "fair", label: "Fair" },
      { value: "good", label: "Good" },
    ],
  },
];

function getTodayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function firstUnansweredQuestion(answers) {
  const idx = QUESTIONS.findIndex((question) => answers?.[question.id] == null);
  return idx === -1 ? QUESTIONS.length - 1 : idx;
}

export const CheckInSheet = ({
  open,
  onClose,
  onSubmit,
  supabase,
  user,
  initialAnswers = null,
}) => {
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!open) return;
    const seed = initialAnswers || {};
    setAnswers(seed);
    setCurrentQ(firstUnansweredQuestion(seed));
    setSaveError("");
  }, [open, initialAnswers]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const currentQuestion = QUESTIONS[currentQ];

  const persistAnswers = async (nextAnswers) => {
    if (!supabase || !user?.id) return;
    setSaving(true);
    setSaveError("");
    const payload = {
      user_id: user.id,
      date: getTodayIso(),
      energy: nextAnswers.energy ?? null,
      legs: nextAnswers.legs ?? null,
      motivation: nextAnswers.motivation ?? null,
      sleep_quality: nextAnswers.sleep_quality ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("manual_checkins")
      .upsert(payload, { onConflict: "user_id,date" })
      .select("*")
      .maybeSingle();

    setSaving(false);
    if (error) {
      console.error("[CheckInSheet] save failed", error);
      setSaveError("Couldn't save check-in. Please try again.");
      return;
    }
    onSubmit?.(data || payload);
    onClose?.();
  };

  const handleSelect = async (questionId, value) => {
    if (saving) return;
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((prev) => prev + 1);
      return;
    }
    await persistAnswers(nextAnswers);
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.68)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 340,
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 341,
          background: "linear-gradient(180deg, #131417 0%, #0D0E10 100%)",
          borderTop: `1px solid ${colors.borderSubtle}`,
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
          padding: "22px 20px 34px",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
        </div>

        <div style={{ fontSize: 10, color: colors.textSecondary, letterSpacing: typography.trackingCaps, fontWeight: typography.weightMedium, marginBottom: 6 }}>
          MORNING CHECK-IN
        </div>
        <div
          style={{
            fontFamily: typography.fontDisplay,
            fontSize: 23,
            color: colors.textPrimary,
            letterSpacing: "-0.4px",
            lineHeight: 1.2,
            marginBottom: 18,
          }}
        >
          Help us personalize today's guidance.
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: colors.textSecondary, letterSpacing: typography.trackingMicro, fontWeight: typography.weightMedium }}>
              {currentQuestion.label}
            </div>
            <div style={{ fontSize: 9, color: colors.textTertiary, letterSpacing: typography.trackingMicro }}>
              {currentQ + 1}/{QUESTIONS.length}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {currentQuestion.options.map((option) => {
              const selected = answers[currentQuestion.id] === option.value;
              return (
                <button
                  key={`${currentQuestion.id}_${option.value}`}
                  type="button"
                  onClick={() => handleSelect(currentQuestion.id, option.value)}
                  disabled={saving}
                  style={{
                    border: `0.5px solid ${selected ? "rgba(201,169,97,0.4)" : colors.borderSubtle}`,
                    background: selected ? colors.accentGoldGlow : "rgba(255,255,255,0.03)",
                    color: selected ? colors.accentGold : colors.textSecondary,
                    borderRadius: 999,
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: typography.weightMedium,
                    letterSpacing: "0.2px",
                    cursor: saving ? "default" : "pointer",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {saveError ? (
          <div style={{ fontSize: 11, color: colors.semanticBad, marginBottom: 10 }}>
            {saveError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            background: "transparent",
            border: `0.5px solid ${colors.borderSubtle}`,
            borderRadius: spacing.cardRadius,
            padding: "12px 14px",
            color: colors.textSecondary,
            fontSize: 11,
            letterSpacing: typography.trackingMicro,
            fontWeight: typography.weightMedium,
            cursor: "pointer",
          }}
        >
          Skip for today
        </button>
      </div>
    </>
  );
};
