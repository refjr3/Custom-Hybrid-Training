import { GlassInput, GlassSelect, PrimaryButton, GlassCard } from "./shared/Inputs.jsx";
import { getHyroxAgeBracket, getStandardAgeGroup } from "./shared/ageBrackets.js";

const COMPETING_SPORTS = [
  { id: "hyrox", label: "HYROX" },
  { id: "triathlon", label: "Triathlon" },
  { id: "running_race", label: "Running race (5k / 10k / Half / Marathon / Ultra)" },
  { id: "cycling", label: "Cycling (Road / Gravel / MTB / Gran Fondo)" },
  { id: "ocr", label: "OCR (Spartan, Tough Mudder)" },
  { id: "crossfit", label: "CrossFit competition" },
  { id: "powerlifting", label: "Powerlifting meet" },
  { id: "oly", label: "Olympic Weightlifting" },
  { id: "strongman", label: "Strongman" },
  { id: "bodybuilding", label: "Bodybuilding / Physique" },
];

const PERFORMANCE_TYPES = [
  { id: "hybrid", label: "Hybrid (strength + endurance)" },
  { id: "pure_strength", label: "Pure strength" },
  { id: "pure_endurance", label: "Pure endurance" },
  { id: "crossfit_style", label: "CrossFit style" },
  { id: "general_athleticism", label: "General athleticism" },
  { id: "sport_specific", label: "Sport-specific (for another sport)" },
];

const COMPOSITION_GOALS = [
  { id: "lose_fat_keep_strength", label: "Lose fat, keep strength" },
  { id: "build_muscle", label: "Build muscle" },
  { id: "recomp", label: "Recomp (both at once)" },
];

const RETURN_REASONS = [
  { id: "post_injury", label: "Post-injury" },
  { id: "break", label: "Back from a break" },
  { id: "postpartum", label: "Postpartum" },
  { id: "post_illness", label: "Post-illness" },
];

function emptyCompetingDetail() {
  return {
    primary_sport: "",
    hyrox_format: "",
    sport_division: "",
    sport_distance: "",
    sport_format: "",
    target_race_name: "",
    target_race_date: "",
    bodybuilding_stage_status: "",
  };
}

function labelCol(title, children) {
  return (
    <label style={labelStyle}>
      {title}
      {children}
    </label>
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
  marginBottom: 8,
};

function SportPickGrid({ value, onPick }) {
  return (
    <div>
      <div style={sectionLabel}>Pick one *</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {COMPETING_SPORTS.map((s) => {
          const active = value.primary_sport === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.id)}
              style={{
                textAlign: "left",
                padding: "14px 16px",
                borderRadius: 16,
                border: active ? "1px solid rgba(201,168,117,0.55)" : "1px solid rgba(255,255,255,0.1)",
                background: active ? "rgba(201,168,117,0.1)" : "rgba(255,255,255,0.04)",
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AgeNote({ dateOfBirth, raceDate, mode }) {
  if (!dateOfBirth) return <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Add date of birth in step 1 to see your bracket.</div>;
  const label = mode === "hyrox" ? getHyroxAgeBracket(dateOfBirth, raceDate) : getStandardAgeGroup(dateOfBirth, raceDate);
  if (!label) return null;
  const prefix = mode === "hyrox" ? "You'll race in " : "You'll race in age group ";
  return (
    <div style={{ fontSize: 13, color: "rgba(201,168,117,0.9)", marginTop: 8, padding: "10px 12px", borderRadius: 12, background: "rgba(201,168,117,0.08)", border: "1px solid rgba(201,168,117,0.2)" }}>
      {prefix}
      <strong>{label}</strong>
    </div>
  );
}

function competingValid(v) {
  if (!v.primary_sport) return false;
  const ps = v.primary_sport;
  if (ps === "hyrox") return Boolean(v.hyrox_format && v.sport_division);
  if (ps === "triathlon") return Boolean(v.sport_distance);
  if (ps === "running_race") return Boolean(v.sport_distance);
  if (ps === "cycling") return Boolean(v.sport_format && v.sport_division);
  if (ps === "ocr") return Boolean(v.sport_distance && v.sport_division);
  if (ps === "crossfit") return Boolean(v.sport_division);
  if (ps === "powerlifting") return Boolean(v.sport_format && v.sport_division);
  if (ps === "oly") return Boolean(v.sport_division);
  if (ps === "strongman") return Boolean(v.sport_division);
  if (ps === "bodybuilding") return Boolean(v.sport_format && v.sport_division && v.bodybuilding_stage_status);
  return false;
}

function performanceValid(v) {
  if (!v.performance_type) return false;
  if (v.performance_type === "sport_specific" && !String(v.sport_specific_other || "").trim()) return false;
  return true;
}

function compositionValid(v) {
  return Boolean(v.composition_goal);
}

function returnValid(v) {
  if (!v.return_reason) return false;
  if (v.return_reason === "post_injury" && !String(v.return_details || "").trim()) return false;
  if (v.return_reason === "break" && !v.return_time_off) return false;
  return true;
}

export default function Step3Sport({ primaryFocus, dateOfBirth, value, onChange, onNext, saving, error }) {
  const set = (patch) => onChange({ ...value, ...patch });

  const pickCompetingSport = (id) => {
    onChange({ ...value, ...emptyCompetingDetail(), primary_sport: id });
  };

  const handleNext = () => {
    if (primaryFocus === "competing" && !competingValid(value)) return;
    if (primaryFocus === "performance" && !performanceValid(value)) return;
    if (primaryFocus === "composition" && !compositionValid(value)) return;
    if (primaryFocus === "return" && !returnValid(value)) return;
    onNext(value);
  };

  const canNext =
    primaryFocus === "competing"
      ? competingValid(value)
      : primaryFocus === "performance"
        ? performanceValid(value)
        : primaryFocus === "composition"
          ? compositionValid(value)
          : primaryFocus === "return"
            ? returnValid(value)
            : false;

  const v = value || {};
  const raceDate = v.target_race_date || null;

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {primaryFocus === "competing" ? (
        <>
          <SportPickGrid value={v} onPick={pickCompetingSport} />

          {v.primary_sport === "hyrox" ? (
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
              <AgeNote dateOfBirth={dateOfBirth} raceDate={raceDate} mode="hyrox" />
            </>
          ) : null}

          {v.primary_sport === "triathlon" ? (
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
              <AgeNote dateOfBirth={dateOfBirth} raceDate={raceDate} mode="standard" />
            </>
          ) : null}

          {v.primary_sport === "running_race" ? (
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
              <AgeNote dateOfBirth={dateOfBirth} raceDate={raceDate} mode="standard" />
            </>
          ) : null}

          {v.primary_sport === "cycling" ? (
            <>
              {labelCol(
                "Discipline *",
                <GlassSelect value={v.sport_format || ""} onChange={(e) => set({ sport_format: e.target.value })}>
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  <option value="road" style={{ color: "#111" }}>
                    Road
                  </option>
                  <option value="gravel" style={{ color: "#111" }}>
                    Gravel
                  </option>
                  <option value="mtb" style={{ color: "#111" }}>
                    MTB
                  </option>
                  <option value="gran_fondo" style={{ color: "#111" }}>
                    Gran Fondo
                  </option>
                </GlassSelect>
              )}
              {labelCol(
                "Category *",
                <GlassSelect value={v.sport_division || ""} onChange={(e) => set({ sport_division: e.target.value })}>
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  {[
                    ["cat5", "Cat 5"],
                    ["cat4", "Cat 4"],
                    ["cat3", "Cat 3"],
                    ["cat2", "Cat 2"],
                    ["cat1", "Cat 1"],
                    ["pro", "Pro"],
                    ["na", "N/A"],
                  ].map(([val, lab]) => (
                    <option key={val} value={val} style={{ color: "#111" }}>
                      {lab}
                    </option>
                  ))}
                </GlassSelect>
              )}
            </>
          ) : null}

          {v.primary_sport === "ocr" ? (
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
                  <option value="super" style={{ color: "#111" }}>
                    Super
                  </option>
                  <option value="beast" style={{ color: "#111" }}>
                    Beast
                  </option>
                  <option value="ultra" style={{ color: "#111" }}>
                    Ultra
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
                  <option value="competitive" style={{ color: "#111" }}>
                    Competitive
                  </option>
                  <option value="elite" style={{ color: "#111" }}>
                    Elite
                  </option>
                </GlassSelect>
              )}
            </>
          ) : null}

          {v.primary_sport === "crossfit" ? (
            <>
              {labelCol(
                "Level *",
                <GlassSelect value={v.sport_division || ""} onChange={(e) => set({ sport_division: e.target.value })}>
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  <option value="recreational" style={{ color: "#111" }}>
                    Recreational
                  </option>
                  <option value="local" style={{ color: "#111" }}>
                    Local competitor
                  </option>
                  <option value="quarterfinals" style={{ color: "#111" }}>
                    Quarterfinals
                  </option>
                  <option value="semifinals" style={{ color: "#111" }}>
                    Semifinals
                  </option>
                  <option value="games" style={{ color: "#111" }}>
                    Games
                  </option>
                </GlassSelect>
              )}
            </>
          ) : null}

          {v.primary_sport === "powerlifting" ? (
            <>
              {labelCol(
                "Federation *",
                <GlassSelect value={v.sport_format || ""} onChange={(e) => set({ sport_format: e.target.value })}>
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  <option value="usapl" style={{ color: "#111" }}>
                    USAPL
                  </option>
                  <option value="uspa" style={{ color: "#111" }}>
                    USPA
                  </option>
                  <option value="ipf" style={{ color: "#111" }}>
                    IPF
                  </option>
                  <option value="other" style={{ color: "#111" }}>
                    Other
                  </option>
                </GlassSelect>
              )}
              {labelCol(
                "Raw or equipped *",
                <GlassSelect value={v.sport_division || ""} onChange={(e) => set({ sport_division: e.target.value })}>
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  <option value="raw" style={{ color: "#111" }}>
                    Raw
                  </option>
                  <option value="equipped" style={{ color: "#111" }}>
                    Equipped
                  </option>
                </GlassSelect>
              )}
            </>
          ) : null}

          {v.primary_sport === "oly" ? (
            <>
              {labelCol(
                "Competition level *",
                <GlassSelect value={v.sport_division || ""} onChange={(e) => set({ sport_division: e.target.value })}>
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  <option value="local" style={{ color: "#111" }}>
                    Local
                  </option>
                  <option value="national" style={{ color: "#111" }}>
                    National
                  </option>
                  <option value="international" style={{ color: "#111" }}>
                    International
                  </option>
                </GlassSelect>
              )}
            </>
          ) : null}

          {v.primary_sport === "strongman" ? (
            <>
              {labelCol(
                "Level *",
                <GlassSelect value={v.sport_division || ""} onChange={(e) => set({ sport_division: e.target.value })}>
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  <option value="novice" style={{ color: "#111" }}>
                    Novice
                  </option>
                  <option value="open" style={{ color: "#111" }}>
                    Open
                  </option>
                  <option value="pro" style={{ color: "#111" }}>
                    Pro
                  </option>
                </GlassSelect>
              )}
            </>
          ) : null}

          {v.primary_sport === "bodybuilding" ? (
            <>
              {labelCol(
                "Style *",
                <GlassSelect value={v.sport_format || ""} onChange={(e) => set({ sport_format: e.target.value })}>
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  <option value="natural" style={{ color: "#111" }}>
                    Natural
                  </option>
                  <option value="enhanced" style={{ color: "#111" }}>
                    Enhanced
                  </option>
                </GlassSelect>
              )}
              {labelCol(
                "Division *",
                <GlassSelect value={v.sport_division || ""} onChange={(e) => set({ sport_division: e.target.value })}>
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  <option value="mens_physique" style={{ color: "#111" }}>
                    {"Men's Physique"}
                  </option>
                  <option value="classic" style={{ color: "#111" }}>
                    Classic
                  </option>
                  <option value="bodybuilding" style={{ color: "#111" }}>
                    Bodybuilding
                  </option>
                  <option value="bikini" style={{ color: "#111" }}>
                    Bikini
                  </option>
                  <option value="figure" style={{ color: "#111" }}>
                    Figure
                  </option>
                  <option value="wellness" style={{ color: "#111" }}>
                    Wellness
                  </option>
                </GlassSelect>
              )}
              {labelCol(
                "Stage status *",
                <GlassSelect value={v.bodybuilding_stage_status || ""} onChange={(e) => set({ bodybuilding_stage_status: e.target.value })}>
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  <option value="never" style={{ color: "#111" }}>
                    Never competed
                  </option>
                  <option value="amateur" style={{ color: "#111" }}>
                    Amateur
                  </option>
                  <option value="pro_card" style={{ color: "#111" }}>
                    Pro Card
                  </option>
                </GlassSelect>
              )}
            </>
          ) : null}

          {v.primary_sport ? (
            <>
              <div style={{ ...sectionLabel, marginTop: 8 }}>Target race (optional)</div>
              {labelCol(
                "Race name",
                <GlassInput value={v.target_race_name || ""} onChange={(e) => set({ target_race_name: e.target.value })} placeholder="Optional" />
              )}
              {labelCol(
                "Race date",
                <GlassInput type="date" value={v.target_race_date || ""} onChange={(e) => set({ target_race_date: e.target.value })} />
              )}
            </>
          ) : null}
        </>
      ) : null}

      {primaryFocus === "performance" ? (
        <>
          <div style={sectionLabel}>Pick one *</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PERFORMANCE_TYPES.map((p) => {
              const active = v.performance_type === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set({ performance_type: p.id, sport_specific_other: p.id === "sport_specific" ? v.sport_specific_other : "" })}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 16,
                    border: active ? "1px solid rgba(201,168,117,0.55)" : "1px solid rgba(255,255,255,0.1)",
                    background: active ? "rgba(201,168,117,0.1)" : "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          {v.performance_type === "sport_specific" ? (
            labelCol(
              "Which sport? *",
              <GlassInput value={v.sport_specific_other || ""} onChange={(e) => set({ sport_specific_other: e.target.value })} placeholder="e.g. Soccer" />
            )
          ) : null}
        </>
      ) : null}

      {primaryFocus === "composition" ? (
        <>
          <div style={sectionLabel}>Pick one *</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {COMPOSITION_GOALS.map((p) => {
              const active = v.composition_goal === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set({ composition_goal: p.id })}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 16,
                    border: active ? "1px solid rgba(201,168,117,0.55)" : "1px solid rgba(255,255,255,0.1)",
                    background: active ? "rgba(201,168,117,0.1)" : "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          {labelCol(
            "Current body fat % (optional)",
            <GlassInput
              type="number"
              min={0}
              max={60}
              step={0.1}
              value={v.body_fat_current != null && v.body_fat_current !== "" ? String(v.body_fat_current) : ""}
              onChange={(e) => set({ body_fat_current: e.target.value === "" ? null : Number(e.target.value) })}
            />
          )}
          {labelCol(
            "Goal body fat % (optional)",
            <GlassInput
              type="number"
              min={0}
              max={60}
              step={0.1}
              value={v.body_fat_goal != null && v.body_fat_goal !== "" ? String(v.body_fat_goal) : ""}
              onChange={(e) => set({ body_fat_goal: e.target.value === "" ? null : Number(e.target.value) })}
            />
          )}
        </>
      ) : null}

      {primaryFocus === "return" ? (
        <>
          <div style={sectionLabel}>Pick one *</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {RETURN_REASONS.map((p) => {
              const active = v.return_reason === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    set({
                      return_reason: p.id,
                      return_details: "",
                      return_time_off: "",
                    })
                  }
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 16,
                    border: active ? "1px solid rgba(201,168,117,0.55)" : "1px solid rgba(255,255,255,0.1)",
                    background: active ? "rgba(201,168,117,0.1)" : "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          {v.return_reason === "post_injury" ? (
            labelCol(
              "What happened? *",
              <GlassInput value={v.return_details || ""} onChange={(e) => set({ return_details: e.target.value })} placeholder="Brief description" />
            )
          ) : null}
          {v.return_reason === "break" ? (
            labelCol(
              "How long off? *",
              <GlassSelect value={v.return_time_off || ""} onChange={(e) => set({ return_time_off: e.target.value })}>
                <option value="" style={{ color: "#111" }}>
                  Select…
                </option>
                <option value="1-3mo" style={{ color: "#111" }}>
                  1–3 mo
                </option>
                <option value="3-6mo" style={{ color: "#111" }}>
                  3–6 mo
                </option>
                <option value="6-12mo" style={{ color: "#111" }}>
                  6–12 mo
                </option>
                <option value="1yr_plus" style={{ color: "#111" }}>
                  1 yr+
                </option>
              </GlassSelect>
            )
          ) : null}
          {labelCol(
            "Any movement restrictions to work around?",
            <GlassInput value={v.injuries_limitations || ""} onChange={(e) => set({ injuries_limitations: e.target.value })} placeholder="Optional" />
          )}
        </>
      ) : null}

      {error ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div> : null}

      <PrimaryButton onClick={handleNext} disabled={!canNext || saving}>
        {saving ? "Saving…" : "NEXT"}
      </PrimaryButton>
    </GlassCard>
  );
}
