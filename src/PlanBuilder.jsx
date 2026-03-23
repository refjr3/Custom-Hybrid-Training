import { useEffect, useMemo, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const C = {
  bg: "#000000",
  card: "#1a1a1a",
  card2: "#222222",
  border: "#2a2a2a",
  text: "#ffffff",
  muted: "#888888",
  light: "#555555",
  red: "#FF3C00",
  green: "#00D4A0",
  yellow: "#FFD600",
  cyan: "#00F3FF",
  ff: "'Bebas Neue','Arial Black',sans-serif",
  fm: "'Space Mono',monospace",
  fs: "'Inter',-apple-system,sans-serif",
};

const RACE_DATABASE = [
  { name: "HYROX World Championship", date: "2026-06-14", sport: "hyrox" },
  { name: "HYROX Miami", date: "2026-04-04", sport: "hyrox" },
  { name: "HYROX New York City", date: "2026-01-18", sport: "hyrox" },
  { name: "HYROX Dallas", date: "2026-02-08", sport: "hyrox" },
  { name: "HYROX Chicago", date: "2026-03-22", sport: "hyrox" },
  { name: "HYROX London", date: "2026-05-10", sport: "hyrox" },
  { name: "HYROX Los Angeles", date: "2026-06-06", sport: "hyrox" },
  { name: "Boston Marathon", date: "2026-04-20", sport: "marathon" },
  { name: "Chicago Marathon", date: "2026-10-11", sport: "marathon" },
  { name: "NYC Marathon", date: "2026-11-01", sport: "marathon" },
  { name: "Berlin Marathon", date: "2026-09-27", sport: "marathon" },
  { name: "London Marathon", date: "2026-04-26", sport: "marathon" },
  { name: "Tokyo Marathon", date: "2026-03-01", sport: "marathon" },
  { name: "Marine Corps Marathon", date: "2026-10-25", sport: "marathon" },
  { name: "Ironman World Championship", date: "2026-10-10", sport: "ironman" },
  { name: "IRONMAN World Champ Kona", date: "2026-10-10", sport: "ironman" },
  { name: "IRONMAN Florida", date: "2026-11-07", sport: "ironman" },
  { name: "IRONMAN Texas", date: "2026-04-25", sport: "ironman" },
  { name: "IRONMAN Lake Placid", date: "2026-07-26", sport: "ironman" },
  { name: "Ironman 70.3 Miami", date: "2026-03-15", sport: "half_ironman" },
  { name: "IRONMAN 70.3 World Champ", date: "2026-09-19", sport: "half_ironman" },
  { name: "IRONMAN 70.3 Oceanside", date: "2026-04-04", sport: "half_ironman" },
  { name: "IRONMAN 70.3 Eagleman", date: "2026-06-14", sport: "half_ironman" },
  { name: "IRONMAN 70.3 Mont-Tremblant", date: "2026-06-28", sport: "half_ironman" },
  { name: "Olympic Tri Nationals", date: "2026-08-08", sport: "olympic_tri" },
  { name: "NYC Triathlon", date: "2026-07-19", sport: "olympic_tri" },
  { name: "Chicago Triathlon", date: "2026-08-30", sport: "olympic_tri" },
];

const SPORT_OPTIONS = [
  { id: "hyrox", label: "HYROX" },
  { id: "marathon", label: "MARATHON" },
  { id: "olympic_tri", label: "OLYMPIC TRI" },
  { id: "half_ironman", label: "70.3 HALF IM" },
  { id: "ironman", label: "FULL IRONMAN" },
  { id: "general", label: "GENERAL FITNESS" },
];

const WEEK_CHIPS = [8, 12, 16, 20, 24];
const DAYS_PER_WEEK_OPTIONS = [3, 4, 5, 6, 7];
const SESSION_PREFS = ["AM", "PM", "Both"];
const EQUIPMENT_OPTIONS = [
  "Full Gym",
  "HYROX Equipment",
  "Dumbbells",
  "Bodyweight",
  "Running/Outdoor",
  "Pool",
  "Cycling",
];

const DEFAULT_PHASES = [
  { id: "base", name: "BASE", weeks: 4 },
  { id: "build", name: "BUILD", weeks: 6 },
  { id: "peak", name: "PEAK", weeks: 3 },
  { id: "taper", name: "TAPER", weeks: 2 },
];

const panel = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
};

const input = {
  width: "100%",
  padding: "11px 12px",
  background: C.card2,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  fontFamily: C.fs,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const uid = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffMs = target.getTime() - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const weeksUntil = (dateStr) => {
  const d = daysUntil(dateStr);
  if (d === null) return null;
  return Math.max(1, Math.ceil(d / 7));
};

const normalizePhaseTotals = (phases, totalWeeks) => {
  if (!Array.isArray(phases) || phases.length === 0) return [];
  const minWeeks = phases.length;
  const targetTotal = Math.max(totalWeeks || phases.length, minWeeks);
  const next = phases.map((p) => ({ ...p, weeks: Math.max(1, Number(p.weeks) || 1) }));
  let sum = next.reduce((s, p) => s + p.weeks, 0);

  if (sum > targetTotal) {
    let toRemove = sum - targetTotal;
    let i = next.length - 1;
    while (toRemove > 0 && i >= 0) {
      const canTake = Math.max(0, next[i].weeks - 1);
      const take = Math.min(canTake, toRemove);
      next[i].weeks -= take;
      toRemove -= take;
      i--;
      if (i < 0 && toRemove > 0) i = next.length - 1;
    }
  } else if (sum < targetTotal) {
    let toAdd = targetTotal - sum;
    let i = 0;
    while (toAdd > 0) {
      next[i % next.length].weeks += 1;
      toAdd--;
      i++;
    }
  }
  return next;
};

const aiDistributePhases = (phaseNames, totalWeeks) => {
  const names = phaseNames.length
    ? phaseNames
    : ["BASE", "BUILD", "PEAK", "TAPER"];
  const target = Math.max(totalWeeks || names.length, names.length);
  const weights = [30, 40, 20, 10];
  const rows = names.map((name, i) => ({
    id: uid(),
    name,
    weeks: Math.max(1, Math.round((target * (weights[i] || Math.max(10, Math.floor(100 / names.length)))) / 100)),
  }));
  return normalizePhaseTotals(rows, target);
};

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? C.green : C.border}`,
        background: active ? `${C.green}22` : C.card2,
        color: active ? C.green : C.muted,
        cursor: "pointer",
        fontFamily: C.fm,
        fontSize: 11,
        letterSpacing: 1,
      }}
    >
      {children}
    </button>
  );
}

function RaceLookup({ sport, value, onChange }) {
  const [query, setQuery] = useState(value?.name || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setQuery(value?.name || "");
  }, [value?.name]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = query.toLowerCase();
  const results = RACE_DATABASE.filter(
    (r) =>
      (!sport || sport === "general" || r.sport === sport) &&
      r.name.toLowerCase().includes(q)
  ).slice(0, 8);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onChange({ ...value, name: e.target.value });
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search or type race name…"
        style={{
          ...input,
          colorScheme: "dark",
        }}
      />
      {open && query.length > 0 && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: C.card2,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            marginTop: 2,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange({ ...value, name: r.name, date: r.date });
                setQuery(r.name);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${C.border}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontFamily: C.ff, fontSize: 13, color: C.text, letterSpacing: 1 }}>{r.name}</div>
              <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 1, marginTop: 1 }}>
                {new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlanBuilder({
  open,
  profile,
  authToken,
  userId,
  onClose,
  onGenerated,
  onSaveProfilePatch,
}) {
  const profileSports = useMemo(() => {
    if (Array.isArray(profile?.plan_builder?.sports) && profile.plan_builder.sports.length > 0) {
      return profile.plan_builder.sports;
    }
    if (profile?.race_goal) return [profile.race_goal];
    if (Array.isArray(profile?.races) && profile.races.length > 0) {
      return [...new Set(profile.races.map((r) => r.sport).filter(Boolean))];
    }
    return [];
  }, [profile]);

  const hasGoalInProfile = useMemo(() => {
    return (
      profileSports.length > 0 ||
      (Array.isArray(profile?.races) && profile.races.length > 0)
    );
  }, [profile, profileSports]);

  const [step, setStep] = useState(0);
  const [sports, setSports] = useState([]);
  const [noRaceYet, setNoRaceYet] = useState(false);
  const [races, setRaces] = useState([]);
  const [totalWeeks, setTotalWeeks] = useState(16);
  const [phases, setPhases] = useState(DEFAULT_PHASES);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [sessionPreference, setSessionPreference] = useState("Both");
  const [equipment, setEquipment] = useState(["Running/Outdoor", "Bodyweight"]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const PHASE_INFO = {
    BASE: "Build your aerobic foundation and movement patterns",
    BUILD: "Increase volume and sport-specific intensity",
    PEAK: "Sharpen fitness with race-pace efforts",
    TAPER: "Reduce volume to arrive fresh and fast on race day",
    DELOAD: "Planned recovery week to absorb training stress",
  };

  useEffect(() => {
    if (!open) return;
    const initialSports = profileSports;
    const initialRaces = Array.isArray(profile?.races)
      ? profile.races.map((r, idx) => ({
          id: uid(),
          sport: r.sport || initialSports[0] || "general",
          name: r.name || "",
          date: r.date || "",
          is_primary: typeof r.is_primary === "boolean" ? r.is_primary : idx === 0,
        }))
      : [];
    if (initialRaces.length === 0 && initialSports.length > 0) {
      initialRaces.push({
        id: uid(),
        sport: initialSports[0],
        name: "",
        date: "",
        is_primary: true,
      });
    }
    if (initialRaces.length > 0 && !initialRaces.some((r) => r.is_primary)) {
      initialRaces[0].is_primary = true;
    }
    const firstRaceWithDate = initialRaces.find((r) => r.date);
    const impliedWeeks = firstRaceWithDate ? weeksUntil(firstRaceWithDate.date) : null;

    setStep(0);
    setSports(initialSports);
    setRaces(initialRaces);
    setNoRaceYet(initialRaces.length === 0);
    setTotalWeeks(profile?.plan_builder?.total_weeks || impliedWeeks || 16);
    setPhases(
      Array.isArray(profile?.plan_builder?.phases) && profile.plan_builder.phases.length > 0
        ? normalizePhaseTotals(profile.plan_builder.phases, profile?.plan_builder?.total_weeks || impliedWeeks || 16)
        : normalizePhaseTotals(DEFAULT_PHASES, profile?.plan_builder?.total_weeks || impliedWeeks || 16)
    );
    setDaysPerWeek(profile?.plan_builder?.days_per_week || 5);
    setSessionPreference(profile?.plan_builder?.session_preference || "Both");
    setEquipment(
      Array.isArray(profile?.plan_builder?.equipment) && profile.plan_builder.equipment.length > 0
        ? profile.plan_builder.equipment
        : ["Running/Outdoor", "Bodyweight"]
    );
    setGenerating(false);
    setError(null);
  }, [open, profile, profileSports]);

  const selectedRaces = useMemo(() => {
    if (noRaceYet) return [];
    return races.filter((r) => r?.sport);
  }, [races, noRaceYet]);

  const primaryRace = useMemo(() => {
    const preferred = selectedRaces.find((r) => r.is_primary);
    if (preferred) return preferred;
    const withDate = selectedRaces.filter((r) => r.date);
    if (withDate.length === 0) return null;
    const sorted = [...withDate].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted[0];
  }, [selectedRaces]);

  const raceWeeks = primaryRace?.date ? weeksUntil(primaryRace.date) : null;
  const effectiveWeeks = totalWeeks;

  useEffect(() => {
    if (raceWeeks) setTotalWeeks(raceWeeks);
  }, [raceWeeks]);

  const steps = useMemo(() => {
    return [
      { key: "goal", title: "TRAINING GOAL", optional: hasGoalInProfile },
      { key: "timeline", title: "TIMELINE" },
      { key: "phases", title: "PHASE STRUCTURE" },
      { key: "availability", title: "TRAINING AVAILABILITY" },
      { key: "equipment", title: "EQUIPMENT" },
      { key: "generate", title: "GENERATION" },
    ];
  }, [hasGoalInProfile]);

  const current = steps[step] || steps[0];
  const atLastStep = step === steps.length - 1;

  if (!open) return null;

  const toggleSport = (sportId) => {
    setSports((prev) => {
      const exists = prev.includes(sportId);
      const next = exists ? prev.filter((s) => s !== sportId) : [...prev, sportId];
      return next;
    });
  };

  const updateRace = (raceId, patch) => {
    setRaces((prev) =>
      prev.map((r) => (r.id === raceId ? { ...r, ...patch } : r))
    );
  };

  const setPrimaryRace = (raceId) => {
    setRaces((prev) => prev.map((r) => ({ ...r, is_primary: r.id === raceId })));
  };

  const addRaceCard = () => {
    const defaultSport = sports[0] || profileSports[0] || "general";
    setRaces((prev) => [
      ...prev,
      { id: uid(), sport: defaultSport, name: "", date: "", is_primary: prev.length === 0 },
    ]);
  };

  const deleteRaceCard = (raceId) => {
    setRaces((prev) => {
      const next = prev.filter((r) => r.id !== raceId);
      if (next.length > 0 && !next.some((r) => r.is_primary)) {
        next[0].is_primary = true;
      }
      return next;
    });
  };

  const updatePhaseWeeks = (idx, delta) => {
    setPhases((prev) => {
      const next = prev.map((p, i) => {
        if (i !== idx) return p;
        return { ...p, weeks: Math.max(1, (Number(p.weeks) || 1) + delta) };
      });
      const sum = next.reduce((s, p) => s + (Number(p.weeks) || 0), 0);
      setTotalWeeks(Math.max(1, sum));
      return next;
    });
  };

  const addPhase = () => {
    setPhases((prev) => {
      const next = [...prev, { id: uid(), name: `PHASE ${prev.length + 1}`, weeks: 1 }];
      const sum = next.reduce((s, p) => s + (Number(p.weeks) || 0), 0);
      setTotalWeeks(Math.max(1, sum));
      return next;
    });
  };

  const removePhase = (idx) => {
    setPhases((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      const sum = next.reduce((s, p) => s + (Number(p.weeks) || 0), 0);
      setTotalWeeks(Math.max(1, sum));
      return next;
    });
  };

  const canContinue = () => {
    if (current.key === "goal") {
      return sports.length > 0;
    }
    if (current.key === "timeline") {
      return !!effectiveWeeks;
    }
    if (current.key === "availability") {
      return !!daysPerWeek && !!sessionPreference;
    }
    return true;
  };

  const next = async () => {
    if (atLastStep) return;
    if (current.key === "goal" && typeof onSaveProfilePatch === "function") {
      const racesPayload = noRaceYet ? [] : races.map(({ id, ...rest }) => rest);
      try {
        await onSaveProfilePatch({ races: racesPayload, sports });
      } catch (e) {
        setError(e?.message || "Failed to save races");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const runGeneration = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      let token = authToken;
      if (!token) {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.access_token) {
          setError("Session expired — please refresh the page");
          setGenerating(false);
          return;
        }
        token = authSession.access_token;
      }

      const sportSummary = sports.length > 0 ? sports.join(", ") : (profileSports.join(", ") || "general");
      const phaseSummary = phases.map((p) => `${p.name} ${p.weeks} wks`).join(" -> ");
      const primaryRaceName = primaryRace?.name || profile?.target_race_name || "TBD";
      const primaryRaceDate = primaryRace?.date || profile?.target_race_date || "TBD";
      const lthr = profile?.lthr ?? "";
      const z2Min = profile?.z2_min ?? "";
      const z2Max = profile?.z2_max ?? "";
      const experience = profile?.experience_level || "intermediate";
      const deload = profile?.deload_preference || "every_4th";

      const promptTemplate = `Generate a ${effectiveWeeks}-week training plan for a ${sportSummary} athlete.
Race: ${primaryRaceName} on ${primaryRaceDate} (${effectiveWeeks} weeks away)
Experience: ${experience}
Training days per week: ${daysPerWeek}
Session preference: ${sessionPreference}
Available equipment: ${equipment.join(", ")}
Phase structure: ${phaseSummary}
Deload: ${deload}
LTHR: ${lthr || "auto"} bpm
Z2: ${z2Min || "auto"}-${z2Max || "auto"} bpm

Generate:
- First 4 weeks in full detail with complete workouts
- Remaining weeks as outlines with session types only
- Every session must use only the available equipment listed
- Respect the training days per week — never schedule more sessions than specified
- Output as structured JSON matching the training_days schema`;

      const profilePayload = {
        ...profile,
        user_id: userId || profile?.user_id || null,
        sports: sports.length > 0 ? sports : profileSports,
        race_goal: (sports[0] || profile?.race_goal || "general"),
        races: noRaceYet ? [] : selectedRaces,
        target_race_name: primaryRaceName,
        target_race_date: primaryRaceDate !== "TBD" ? primaryRaceDate : null,
        total_weeks: effectiveWeeks,
        weeks_per_block: Math.max(1, Math.round(effectiveWeeks / Math.max(1, phases.length))),
        phases: phases.length,
        days_per_week: daysPerWeek,
        session_preference: sessionPreference,
        equipment,
        custom_phases: phases,
        generation_prompt_template: promptTemplate,
      };

      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: userId || profile?.user_id || null,
          profile: profilePayload,
          sports: profilePayload.sports,
          target_race_date: profilePayload.target_race_date,
          weeks_per_block: profilePayload.weeks_per_block,
          days_per_week: daysPerWeek,
          session_preference: sessionPreference,
          equipment,
          phases,
          total_weeks: effectiveWeeks,
          prompt_template: promptTemplate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Plan generation failed");

      if (onGenerated) {
        await onGenerated({
          response: data,
          builderInputs: {
            days_per_week: daysPerWeek,
            session_preference: sessionPreference,
            equipment,
            phases,
            total_weeks: effectiveWeeks,
          },
        });
      }
    } catch (e) {
      setError(e?.message || "Plan generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: C.bg, color: C.text, overflowY: "auto" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", padding: "20px 20px 90px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: C.ff, fontSize: 24, letterSpacing: 2 }}>PLAN BUILDER</div>
          <button
            onClick={onClose}
            style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", fontFamily: C.fm, fontSize: 10 }}
          >
            CLOSE
          </button>
        </div>

        <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>
          STEP {step + 1} OF {steps.length} · {current.title}
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {steps.map((s, i) => (
            <div
              key={s.key}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 3,
                background: i <= step ? C.green : C.card2,
              }}
            />
          ))}
        </div>

        {current.key === "goal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={panel}>
              <div style={{ padding: "12px 12px 8px", fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2 }}>SPORTS</div>
              <div style={{ padding: "0 12px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SPORT_OPTIONS.map((s) => (
                  <Chip key={s.id} active={sports.includes(s.id)} onClick={() => toggleSport(s.id)}>
                    {s.label}
                  </Chip>
                ))}
              </div>
              {sports.length === 0 && (
                <div style={{ padding: "0 12px 12px", fontFamily: C.fm, fontSize: 8, color: C.light, letterSpacing: 1 }}>
                  Select at least one sport to continue
                </div>
              )}
            </div>
            {sports.length === 0 && (
              <div style={{ fontFamily: C.fs, fontSize: 12, color: C.muted, letterSpacing: 0.5 }}>
                Select at least one sport to continue
              </div>
            )}

            <button
              onClick={() => setNoRaceYet((v) => !v)}
              style={{
                ...panel,
                padding: "12px",
                textAlign: "left",
                cursor: "pointer",
                color: noRaceYet ? C.yellow : C.muted,
                fontFamily: C.ff,
                fontSize: 14,
                letterSpacing: 1,
              }}
            >
              {noRaceYet ? "✓" : "○"} NO RACE YET
            </button>

            {!noRaceYet && sports.map((sportId) => {
              const race = races.find((r) => r.sport === sportId) || { name: "", date: "" };
              const sportLabel = SPORT_OPTIONS.find((s) => s.id === sportId)?.label || sportId;
              return (
                <div key={sportId} style={{ ...panel, padding: 12 }}>
                  <div style={{ fontFamily: C.fm, fontSize: 8, color: C.cyan, letterSpacing: 2, marginBottom: 8 }}>{sportLabel}</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <RaceLookup
                      sport={sportId}
                      value={race}
                      onChange={(updated) => updateRace(sportId, updated)}
                    />
                    <input
                      type="date"
                      value={race.date || ""}
                      onChange={(e) => updateRace(sportId, { date: e.target.value })}
                      style={{ ...input, colorScheme: "dark" }}
                    />
                  </div>
                </div>
              );
            })}

            {!noRaceYet && (
              <button
                onClick={addRaceCard}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px dashed ${C.cyan}55`,
                  background: "transparent",
                  color: C.cyan,
                  cursor: "pointer",
                  fontFamily: C.fm,
                  fontSize: 10,
                  letterSpacing: 2,
                }}
              >
                + ADD RACE
              </button>
            )}
          </div>
        )}

        {current.key === "timeline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {raceWeeks ? (
              <div style={{ ...panel, padding: 14 }}>
                <div style={{ fontFamily: C.ff, fontSize: 24, color: C.green, letterSpacing: 1 }}>{raceWeeks} WEEKS</div>
                <div style={{ fontFamily: C.fs, fontSize: 13, color: C.muted, marginTop: 6 }}>
                  {raceWeeks} weeks until {primaryRace?.name || "your race"}.
                </div>
                <div style={{ fontFamily: C.fm, fontSize: 8, color: C.light, letterSpacing: 1, marginTop: 8 }}>
                  You can fine-tune total weeks in the next step.
                </div>
              </div>
            ) : (
              <div style={{ ...panel, padding: 14 }}>
                <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>SELECT PLAN LENGTH</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {WEEK_CHIPS.map((w) => (
                    <Chip key={w} active={totalWeeks === w} onClick={() => setTotalWeeks(w)}>
                      {w} WEEKS
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {current.key === "phases" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2 }}>
                  TOTAL WEEKS
                </span>
                <button
                  onClick={() => {
                    const nextTotal = Math.max(1, effectiveWeeks - 1);
                    setTotalWeeks(nextTotal);
                    setPhases((prev) => normalizePhaseTotals(prev, nextTotal));
                  }}
                  style={{ width: 24, height: 24, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card2, color: C.muted, cursor: "pointer" }}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={effectiveWeeks}
                  onChange={(e) => {
                    const nextTotal = Math.max(1, Number(e.target.value) || 1);
                    setTotalWeeks(nextTotal);
                    setPhases((prev) => normalizePhaseTotals(prev, nextTotal));
                  }}
                  style={{ width: 68, ...input, padding: "6px 8px", textAlign: "center", fontFamily: C.ff, fontSize: 14 }}
                />
                <button
                  onClick={() => {
                    const nextTotal = effectiveWeeks + 1;
                    setTotalWeeks(nextTotal);
                    setPhases((prev) => normalizePhaseTotals(prev, nextTotal));
                  }}
                  style={{ width: 24, height: 24, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card2, color: C.muted, cursor: "pointer" }}
                >
                  +
                </button>
              </div>
              <button
                onClick={() => setPhases(aiDistributePhases(["BASE", "BUILD", "PEAK", "TAPER"], effectiveWeeks))}
                style={{ background: "transparent", border: `1px solid ${C.cyan}55`, color: C.cyan, borderRadius: 999, padding: "6px 10px", cursor: "pointer", fontFamily: C.fm, fontSize: 10 }}
              >
                LET AI DECIDE
              </button>
            </div>

            {phases.map((p, idx) => (
              <div key={p.id} style={{ ...panel, padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      value={p.name}
                      onChange={(e) => {
                        const nextName = e.target.value.toUpperCase();
                        setPhases((prev) => prev.map((row, i) => (i === idx ? { ...row, name: nextName } : row)));
                      }}
                      style={{ ...input, flex: 1, padding: "8px 10px", fontFamily: C.fm, fontSize: 11, letterSpacing: 1 }}
                    />
                    <span
                      title={PHASE_INFO[p.name?.toUpperCase()] || "Custom phase"}
                      style={{ fontFamily: C.fm, fontSize: 12, color: C.light, cursor: "help" }}
                    >
                      ⓘ
                    </span>
                  </div>
                  <button
                    onClick={() => updatePhaseWeeks(idx, -1)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card2, color: C.muted, cursor: "pointer" }}
                  >
                    −
                  </button>
                  <div style={{ minWidth: 56, textAlign: "center", fontFamily: C.ff, fontSize: 16, color: C.text }}>
                    {p.weeks}w
                  </div>
                  <button
                    onClick={() => updatePhaseWeeks(idx, 1)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card2, color: C.muted, cursor: "pointer" }}
                  >
                    +
                  </button>
                  <button
                    onClick={() => removePhase(idx)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.red}44`, background: "transparent", color: C.red, cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={addPhase}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: `1px dashed ${C.cyan}55`,
                background: "transparent",
                color: C.cyan,
                cursor: "pointer",
                fontFamily: C.fm,
                fontSize: 10,
                letterSpacing: 2,
              }}
            >
              + ADD PHASE
            </button>
          </div>
        )}

        {current.key === "availability" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ ...panel, padding: 12 }}>
              <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>DAYS PER WEEK</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DAYS_PER_WEEK_OPTIONS.map((d) => (
                  <Chip key={d} active={daysPerWeek === d} onClick={() => setDaysPerWeek(d)}>
                    {d} DAYS
                  </Chip>
                ))}
              </div>
            </div>
            <div style={{ ...panel, padding: 12 }}>
              <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>SESSION PREFERENCE</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SESSION_PREFS.map((pref) => (
                  <Chip key={pref} active={sessionPreference === pref} onClick={() => setSessionPreference(pref)}>
                    {pref}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {current.key === "equipment" && (
          <div style={{ ...panel, padding: 12 }}>
            <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>AVAILABLE EQUIPMENT</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {EQUIPMENT_OPTIONS.map((item) => (
                <Chip
                  key={item}
                  active={equipment.includes(item)}
                  onClick={() =>
                    setEquipment((prev) =>
                      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
                    )
                  }
                >
                  {item}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {current.key === "generate" && (
          <div style={{ ...panel, padding: 16 }}>
            {!generating ? (
              <>
                <div style={{ fontFamily: C.ff, fontSize: 28, letterSpacing: 1, marginBottom: 6 }}>
                  READY TO BUILD
                </div>
                <div style={{ fontFamily: C.fs, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                  Your coach will generate a {effectiveWeeks}-week plan using your selected days, equipment, and phase structure.
                </div>
                {error && (
                  <div style={{ marginTop: 12, fontFamily: C.fm, fontSize: 9, color: C.red, letterSpacing: 1 }}>
                    {error}
                  </div>
                )}
                <button
                  onClick={runGeneration}
                  style={{
                    width: "100%",
                    marginTop: 14,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "none",
                    background: C.green,
                    color: "#000",
                    cursor: "pointer",
                    fontFamily: C.ff,
                    fontSize: 15,
                    letterSpacing: 2,
                  }}
                >
                  BUILD MY PLAN
                </button>
              </>
            ) : (
              <div style={{ minHeight: 160, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontFamily: C.ff, fontSize: 30, color: C.green, letterSpacing: 1, marginBottom: 10 }}>
                  BUILDING...
                </div>
                <div style={{ fontFamily: C.fs, fontSize: 13, color: C.muted }}>
                  Your coach is building your program...
                </div>
              </div>
            )}
          </div>
        )}

        {!generating && (
          <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 16, width: "calc(100% - 40px)", maxWidth: 440, display: "flex", gap: 8 }}>
            {step > 0 && (
              <button
                onClick={back}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  color: C.muted,
                  cursor: "pointer",
                  fontFamily: C.ff,
                  fontSize: 14,
                  letterSpacing: 2,
                }}
              >
                BACK
              </button>
            )}
            {!atLastStep && (
              <button
                onClick={next}
                disabled={!canContinue()}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: canContinue() ? C.green : C.card2,
                  color: canContinue() ? "#000" : C.muted,
                  cursor: canContinue() ? "pointer" : "default",
                  fontFamily: C.ff,
                  fontSize: 14,
                  letterSpacing: 2,
                }}
              >
                NEXT
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
