import { synthesizeIntake } from "./shared/synthesizeIntake.js";
import { prettifyEquipment, prettifyExperience, prettifyFocus } from "./shared/labels.js";

function equipmentKeys(profile) {
  const eq = profile?.equipment_access;
  if (Array.isArray(eq)) return eq.filter(Boolean);
  if (eq && typeof eq === "object" && !Array.isArray(eq)) return Object.keys(eq).filter((k) => eq[k]);
  return [];
}

function ContextRow({ label, value, sublabel, onEdit, noBorder }) {
  const pad = noBorder ? "8px 0" : "14px 0";
  const content = (
    <>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          {value}
        </div>
        {sublabel ? (
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              marginTop: 3,
            }}
          >
            {sublabel}
          </div>
        ) : null}
      </div>
      {onEdit ? (
        <div
          style={{
            fontSize: 11,
            color: "rgba(201,168,117,0.6)",
            fontWeight: 500,
            flexShrink: 0,
            padding: "4px 0",
          }}
        >
          Edit →
        </div>
      ) : null}
    </>
  );

  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: pad,
    gap: 12,
    width: "100%",
    textAlign: "left",
    border: "none",
    background: "none",
    cursor: onEdit ? "pointer" : "default",
    fontFamily: "'DM Sans', sans-serif",
    color: "inherit",
  };

  if (onEdit) {
    return (
      <button type="button" onClick={onEdit} style={rowStyle}>
        {content}
      </button>
    );
  }
  return <div style={rowStyle}>{content}</div>;
}

export default function Step5Confirm({
  profile,
  daysPerWeek,
  flexibility,
  unavailableDays,
  mainFocus,
  intakeRaceDate,
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

  const eqKeys = equipmentKeys(profile);
  const hours = profile?.weekly_training_hours;
  const timeDisplay =
    hours != null && String(hours).trim() !== "" ? `${String(hours).trim()} hrs per week` : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "0 2px" }}>
      <div
        style={{
          fontSize: 17,
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.65,
          marginBottom: 28,
          padding: "0 2px",
        }}
      >
        {summary}
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 18,
          padding: "20px 22px",
          marginBottom: 24,
        }}
      >
        <ContextRow label="Focus" value={prettifyFocus(mainFocus)} onEdit={() => onJumpToStep(2)} />

        {mainFocus === "train_for_race" ? (
          <ContextRow
            label="Race"
            value={
              effectiveRace
                ? new Date(`${String(effectiveRace).slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "No date set"
            }
            sublabel={profile?.target_race_name}
            onEdit={() => onJumpToStep(3)}
          />
        ) : null}

        <div
          style={{
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            marginTop: 16,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Equipment
          </div>
          {eqKeys.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {eqKeys.map((key) => (
                <span
                  key={key}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 16,
                    padding: "5px 11px",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.7)",
                    fontWeight: 500,
                  }}
                >
                  {prettifyEquipment(key)}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>—</div>
          )}
        </div>

        <div
          style={{
            paddingTop: 16,
            marginTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <ContextRow label="Time" value={timeDisplay} onEdit={() => onJumpToStep(0)} />
        </div>

        <div
          style={{
            paddingTop: 16,
            marginTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <ContextRow
            label="Experience"
            value={prettifyExperience(profile?.training_experience)}
            onEdit={() => onJumpToStep(0)}
            noBorder
          />
        </div>
      </div>

      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
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
