import { useState } from "react";
import { GlassInput, GlassSelect, PrimaryButton, SecondaryButton, GlassCard } from "./shared/Inputs.jsx";
import RaceSearch from "./shared/RaceSearch.jsx";
import { getHyroxAgeBracket, getStandardAgeGroup } from "./shared/ageBrackets.js";

const CATEGORIES = [
  { id: "hyrox", label: "HYROX", sport: "hyrox" },
  { id: "triathlon", label: "Triathlon / Ironman", sport: "triathlon" },
  { id: "running", label: "Running (marathon, half, 10k, 5k, ultra)", sport: "running" },
  { id: "cycling", label: "Cycling event", sport: "cycling" },
  { id: "ocr", label: "OCR / Mud run", sport: "ocr" },
  { id: "crossfit", label: "CrossFit competition", sport: "crossfit" },
  { id: "powerlifting", label: "Powerlifting meet", sport: "powerlifting" },
  { id: "bodybuilding", label: "Bodybuilding show", sport: "bodybuilding" },
  { id: "other", label: "Other (manual entry)", sport: null },
];

function dobFromProfile(profile) {
  return profile?.date_of_birth || profile?.dob || null;
}

export default function Step4RaceSearch({ profile, supabase, value, onChange, onNext, saving, error }) {
  const v = value || {};
  const [manual, setManual] = useState(false);
  const cat = CATEGORIES.find((c) => c.id === v.event_category) || null;
  const sportFilter = cat?.sport || "";
  const dob = dobFromProfile(profile);
  const raceDate = v.target_race_date || null;

  const set = (patch) => onChange({ ...v, ...patch });

  const canNext = () => {
    if (!v.event_category) return false;
    if (!String(v.target_race_name || "").trim()) return false;
    if (v.event_category === "hyrox") return Boolean(v.hyrox_format && v.sport_division);
    if (v.event_category === "triathlon") return Boolean(v.sport_distance);
    if (v.event_category === "running") return Boolean(v.sport_distance);
    return true;
  };

  const handlePick = (row) => {
    set({
      target_race_name: row.name,
      target_race_date: row.race_date || v.target_race_date || "",
      primary_sport: row.sport || v.event_category,
    });
    setManual(false);
  };

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={labelStyle}>
        Event category *
        <GlassSelect value={v.event_category || ""} onChange={(e) => set({ event_category: e.target.value, primary_sport: e.target.value })}>
          <option value="" style={{ color: "#111" }}>
            Select…
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id} style={{ color: "#111" }}>
              {c.label}
            </option>
          ))}
        </GlassSelect>
      </label>

      {v.event_category && v.event_category !== "other" ? (
        <>
          <div style={sectionLabel}>Find your event</div>
          <RaceSearch
            supabase={supabase}
            sport={sportFilter || undefined}
            placeholder={`Search ${cat?.label || ""} races…`}
            onSelectRace={handlePick}
          />
        </>
      ) : null}

      {v.event_category === "other" || manual ? (
        <>
          <label style={labelStyle}>
            Event name *
            <GlassInput value={v.target_race_name || ""} onChange={(e) => set({ target_race_name: e.target.value })} placeholder="Race name" />
          </label>
          <label style={labelStyle}>
            Event date
            <GlassInput type="date" value={v.target_race_date || ""} onChange={(e) => set({ target_race_date: e.target.value })} />
          </label>
        </>
      ) : (
        <SecondaryButton
          type="button"
          onClick={() => {
            setManual(true);
          }}
          style={{ width: "100%" }}
        >
          Can&apos;t find my race — enter manually
        </SecondaryButton>
      )}

      {v.event_category === "hyrox" ? (
        <>
          {labelCol(
            "Format *",
            <GlassSelect value={v.hyrox_format || ""} onChange={(e) => set({ hyrox_format: e.target.value })}>
              <option value="" style={{ color: "#111" }}>
                Select…
              </option>
              <option value="solo" style={{ color: "#111" }}>
                Solo
              </option>
              <option value="doubles" style={{ color: "#111" }}>
                Doubles
              </option>
              <option value="mixed_doubles" style={{ color: "#111" }}>
                Mixed Doubles
              </option>
              <option value="relay" style={{ color: "#111" }}>
                Relay
              </option>
            </GlassSelect>
          )}
          {labelCol(
            "Division *",
            <GlassSelect value={v.sport_division || ""} onChange={(e) => set({ sport_division: e.target.value })}>
              <option value="" style={{ color: "#111" }}>
                Select…
              </option>
              <option value="open" style={{ color: "#111" }}>
                Open
              </option>
              <option value="pro" style={{ color: "#111" }}>
                Pro
              </option>
            </GlassSelect>
          )}
          <AgeLine dob={dob} raceDate={raceDate} mode="hyrox" />
        </>
      ) : null}

      {v.event_category === "triathlon" ? (
        <>
          {labelCol(
            "Distance *",
            <GlassSelect value={v.sport_distance || ""} onChange={(e) => set({ sport_distance: e.target.value })}>
              <option value="" style={{ color: "#111" }}>
                Select…
              </option>
              <option value="sprint" style={{ color: "#111" }}>
                Sprint
              </option>
              <option value="olympic" style={{ color: "#111" }}>
                Olympic
              </option>
              <option value="70.3" style={{ color: "#111" }}>
                70.3
              </option>
              <option value="ironman" style={{ color: "#111" }}>
                Ironman
              </option>
            </GlassSelect>
          )}
          <AgeLine dob={dob} raceDate={raceDate} mode="standard" />
        </>
      ) : null}

      {v.event_category === "running" ? (
        <>
          {labelCol(
            "Distance *",
            <GlassSelect value={v.sport_distance || ""} onChange={(e) => set({ sport_distance: e.target.value })}>
              <option value="" style={{ color: "#111" }}>
                Select…
              </option>
              <option value="5k" style={{ color: "#111" }}>
                5k
              </option>
              <option value="10k" style={{ color: "#111" }}>
                10k
              </option>
              <option value="half_marathon" style={{ color: "#111" }}>
                Half Marathon
              </option>
              <option value="marathon" style={{ color: "#111" }}>
                Marathon
              </option>
              <option value="ultra" style={{ color: "#111" }}>
                Ultra
              </option>
            </GlassSelect>
          )}
          <AgeLine dob={dob} raceDate={raceDate} mode="standard" />
        </>
      ) : null}

      {error ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div> : null}
      <PrimaryButton onClick={() => canNext() && onNext(v)} disabled={!canNext() || saving}>
        {saving ? "Saving…" : "NEXT"}
      </PrimaryButton>
    </GlassCard>
  );
}

function labelCol(title, children) {
  return (
    <label style={labelStyle}>
      {title}
      {children}
    </label>
  );
}

function AgeLine({ dob, raceDate, mode }) {
  if (!dob) return <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Add date of birth in step 1 for age bracket.</div>;
  const label = mode === "hyrox" ? getHyroxAgeBracket(dob, raceDate) : getStandardAgeGroup(dob, raceDate);
  if (!label) return null;
  return (
    <div style={{ fontSize: 13, color: "rgba(201,168,117,0.9)", padding: "10px 12px", borderRadius: 12, background: "rgba(201,168,117,0.08)", border: "1px solid rgba(201,168,117,0.2)" }}>
      {mode === "hyrox" ? "HYROX bracket: " : "Age group: "}
      <strong>{label}</strong>
    </div>
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

const sectionLabel = {
  fontSize: 11,
  letterSpacing: "0.8px",
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
  marginBottom: 4,
};
