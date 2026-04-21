import { useCallback, useEffect, useState } from "react";
import IntakeShell from "./shared/IntakeShell.jsx";
import Step1Days from "./Step1Days.jsx";

const DAY_SET = new Set([3, 4, 5, 6, 7]);

function parseDaysPerWeek(profile) {
  const n = Number(profile?.days_per_week);
  if (Number.isFinite(n) && DAY_SET.has(n)) return n;
  const t = parseInt(String(profile?.days_per_week ?? "").trim(), 10);
  if (Number.isFinite(t) && DAY_SET.has(t)) return t;
  return 4;
}

/**
 * Phase 10a orchestrator — step 1 only for now (days + flexibility).
 * @param {{ open: boolean, onClose: () => void, supabase: object, session: object | null, profile: object | null, onProfileUpdated?: () => void }} props
 */
export default function PlanIntakeFlow({ open, onClose, supabase, session, profile, onProfileUpdated }) {
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [flexibility, setFlexibility] = useState("flexible");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const syncFromProfile = useCallback(() => {
    setDaysPerWeek(parseDaysPerWeek(profile));
    setFlexibility(profile?.schedule_flexibility === "strict" ? "strict" : "flexible");
  }, [profile]);

  useEffect(() => {
    if (open) {
      syncFromProfile();
      setSaveError("");
    }
  }, [open, syncFromProfile]);

  const handleSave = async () => {
    const uid = session?.user?.id;
    if (!uid) return;
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
      return;
    }
    onProfileUpdated?.();
    onClose?.();
  };

  if (!open) return null;

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
      <IntakeShell
        stepIndex={0}
        stepTotal={5}
        title="How many days per week do you realistically want to train?"
        subtitle="Be honest — we'd rather hit 4 than miss 6."
        onBack={() => onClose?.()}
      >
        <Step1Days
          daysPerWeek={daysPerWeek}
          setDaysPerWeek={setDaysPerWeek}
          flexibility={flexibility}
          setFlexibility={setFlexibility}
        />

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
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              padding: "16px 18px",
              borderRadius: 16,
              border: "none",
              background: "linear-gradient(135deg, #C9A875 0%, #a88b5c 100%)",
              color: "#0D0E10",
              fontSize: 15,
              fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {saving ? "Saving…" : "Save & continue"}
          </button>
          <p
            style={{
              margin: "14px 0 0",
              textAlign: "center",
              fontSize: 11,
              color: "rgba(255,255,255,0.28)",
              lineHeight: 1.4,
            }}
          >
            More intake steps ship in the next update.
          </p>
        </div>
      </IntakeShell>
    </div>
  );
}
