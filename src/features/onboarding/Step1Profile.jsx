import { useState, useEffect } from "react";
import { GlassInput, GlassSelect, PrimaryButton, GlassCard } from "./shared/Inputs.jsx";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
];

function cmFromImperial(ft, inch) {
  const f = Number(ft) || 0;
  const i = Number(inch) || 0;
  const totalIn = f * 12 + i;
  if (totalIn <= 0) return "";
  return String(Math.round(totalIn * 2.54 * 10) / 10);
}

function imperialFromCm(cmStr) {
  const cm = Number(cmStr);
  if (!Number.isFinite(cm) || cm <= 0) return { ft: "", inch: "" };
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return { ft: String(ft), inch: String(inch) };
}

export default function Step1Profile({ value, onChange, onNext, saving, error }) {
  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");

  useEffect(() => {
    if (value.height_cm != null && String(value.height_cm) !== "") {
      const { ft: f, inch: i } = imperialFromCm(String(value.height_cm));
      setFt(f);
      setInch(i);
    }
  }, []);

  const set = (k, v) => onChange({ ...value, [k]: v });

  const handleNext = () => {
    if (!String(value.full_name || "").trim()) return;
    if (!value.dob) return;
    let heightCm = value.height_cm;
    if (heightUnit === "imperial") {
      heightCm = cmFromImperial(ft, inch);
    }
    onChange({ ...value, height_cm: heightCm });
    onNext({ ...value, height_cm: heightCm });
  };

  const canNext =
    String(value.full_name || "").trim().length > 0 &&
    Boolean(value.dob) &&
    Boolean(value.gender) &&
    (heightUnit === "cm" ? Number(value.height_cm) > 0 : Number(ft) > 0 || Number(inch) > 0) &&
    (weightUnit === "kg" ? Number(value.weight_kg) > 0 : Number(value.weight_lbs) > 0);

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={labelStyle}>
        Full name *
        <GlassInput value={value.full_name || ""} onChange={(e) => set("full_name", e.target.value)} placeholder="Your name" />
      </label>
      <label style={labelStyle}>
        Date of birth *
        <GlassInput type="date" value={value.dob || ""} onChange={(e) => set("dob", e.target.value)} />
      </label>
      <label style={labelStyle}>
        Gender *
        <GlassSelect value={value.gender || ""} onChange={(e) => set("gender", e.target.value)} required>
          <option value="" style={{ color: "#111" }}>
            Select…
          </option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value} style={{ color: "#111" }}>
              {g.label}
            </option>
          ))}
        </GlassSelect>
      </label>

      <div style={labelStyle}>
        <span>Height *</span>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <PillToggle leftLabel="cm" rightLabel="ft / in" value={heightUnit} onChange={setHeightUnit} leftValue="cm" rightValue="imperial" />
        </div>
        {heightUnit === "cm" ? (
          <GlassInput type="number" min={1} step={0.1} value={value.height_cm || ""} onChange={(e) => set("height_cm", e.target.value)} placeholder="cm" />
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <GlassInput type="number" min={0} placeholder="ft" value={ft} onChange={(e) => setFt(e.target.value)} />
            <GlassInput type="number" min={0} max={11} placeholder="in" value={inch} onChange={(e) => setInch(e.target.value)} />
          </div>
        )}
      </div>

      <div style={labelStyle}>
        <span>Weight *</span>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <PillToggle leftLabel="kg" rightLabel="lbs" value={weightUnit} onChange={setWeightUnit} leftValue="kg" rightValue="lbs" />
        </div>
        {weightUnit === "kg" ? (
          <GlassInput type="number" min={1} step={0.1} value={value.weight_kg || ""} onChange={(e) => set("weight_kg", e.target.value)} placeholder="kg" />
        ) : (
          <GlassInput type="number" min={1} step={0.1} value={value.weight_lbs || ""} onChange={(e) => set("weight_lbs", e.target.value)} placeholder="lbs" />
        )}
      </div>

      {error ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div> : null}

      <PrimaryButton onClick={handleNext} disabled={!canNext || saving}>
        {saving ? "Saving…" : "NEXT"}
      </PrimaryButton>
    </GlassCard>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 11,
  letterSpacing: "0.8px",
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
};

function PillToggle({ leftLabel, rightLabel, value, onChange, leftValue, rightValue }) {
  return (
    <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
      <button
        type="button"
        onClick={() => onChange(leftValue)}
        style={{
          flex: 1,
          padding: "8px 12px",
          border: "none",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.5px",
          background: value === leftValue ? "rgba(201,168,117,0.2)" : "rgba(255,255,255,0.04)",
          color: value === leftValue ? "#C9A875" : "rgba(255,255,255,0.45)",
        }}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(rightValue)}
        style={{
          flex: 1,
          padding: "8px 12px",
          border: "none",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.5px",
          background: value === rightValue ? "rgba(201,168,117,0.2)" : "rgba(255,255,255,0.04)",
          color: value === rightValue ? "#C9A875" : "rgba(255,255,255,0.45)",
        }}
      >
        {rightLabel}
      </button>
    </div>
  );
}
