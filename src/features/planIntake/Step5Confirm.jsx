import { synthesizeIntake } from "./shared/synthesizeIntake.js";

const FOCUS_LABEL = {
  get_stronger: "Get stronger",
  build_endurance: "Build endurance",
  lose_weight: "Lose weight",
  get_consistent: "Just get consistent",
  train_for_race: "Train for a race",
};

function formatEquipment(profile) {
  const eq = profile?.equipment_access;
  if (Array.isArray(eq) && eq.length) return eq.join(", ");
  if (eq && typeof eq === "object" && !Array.isArray(eq)) {
    const keys = Object.keys(eq).filter((k) => eq[k]);
    return keys.length ? keys.join(", ") : "—";
  }
  if (typeof eq === "string" && eq.trim()) return eq.trim();
  return "—";
}

export default function Step5Confirm({
  profile,
  daysPerWeek,
  flexibility,
  unavailableDays,
  mainFocus,
  intakeRaceDate,
  raceStepShown,
  onJumpToStep,
  onLooksGood,
  onBackFullEdit,
  submitting,
}) {
  const effectiveRace = intakeRaceDate || profile?.target_race_date || null;
  const summary = synthesizeIntake({
    daysPerWeek,
    flexibility,
    unavailableDays,
    mainFocus,
    raceDate: effectiveRace,
    profile,
  });

  const row = (label, value, stepIndex) => (
    <button
      key={label}
      type="button"
      onClick={() => onJumpToStep(stepIndex)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "12px 0",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "none",
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.28)", letterSpacing: "1.2px" }}>{label}</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.88)", marginTop: 4 }}>{value}</div>
    </button>
  );

  const hours = profile?.weekly_training_hours;
  const timeLabel =
    hours != null && String(hours).trim() !== ""
      ? `~${String(hours).trim()} hrs/week`
      : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontSize: 16,
          lineHeight: 1.55,
          color: "rgba(255,255,255,0.88)",
          padding: "4px 2px 12px",
        }}
      >
        {summary}
      </div>

      <div
        style={{
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          marginTop: 8,
        }}
      >
        {row("Focus", FOCUS_LABEL[mainFocus] || "—", 2)}
        {mainFocus === "train_for_race"
          ? row(
              "Race",
              effectiveRace
                ? new Date(`${String(effectiveRace).slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Not set yet",
              raceStepShown ? 3 : 2,
            )
          : null}
        {row("Equipment", formatEquipment(profile), 0)}
        {row("Time", timeLabel, 0)}
        {row("Experience", profile?.training_experience || "—", 0)}
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          onClick={onLooksGood}
          disabled={submitting || !mainFocus}
          style={{
            width: "100%",
            padding: "16px 18px",
            borderRadius: 16,
            border: "none",
            background: submitting || !mainFocus ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #C9A875 0%, #a88b5c 100%)",
            color: submitting || !mainFocus ? "rgba(255,255,255,0.3)" : "#0D0E10",
            fontSize: 15,
            fontWeight: 700,
            cursor: submitting || !mainFocus ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {submitting ? "Saving…" : "Looks good — build my plan"}
        </button>
        <button
          type="button"
          onClick={onBackFullEdit}
          style={{
            width: "100%",
            padding: "14px 18px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "transparent",
            color: "rgba(255,255,255,0.55)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Go back and edit
        </button>
      </div>
    </div>
  );
}
