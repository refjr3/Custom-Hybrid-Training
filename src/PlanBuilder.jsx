import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const C = {
  bg: "#0A0A0A",
  card: "#141414",
  border: "#2A2A2A",
  text: "#FFFFFF",
  muted: "#888888",
  cyan: "#C9A875",
  ff: "'DM Sans',sans-serif",
  fm: "'DM Sans',sans-serif",
  fs: "'DM Sans',sans-serif",
};

const SPORTS = [
  { id: "hyrox", label: "HYROX" },
  { id: "marathon", label: "MARATHON" },
  { id: "half_marathon", label: "HALF MARATHON" },
  { id: "triathlon", label: "TRIATHLON 70.3" },
  { id: "ironman", label: "IRONMAN 140.6" },
  { id: "strength", label: "STRENGTH" },
  { id: "hybrid", label: "HYBRID" },
];

const RACES = [
  { name: "HYROX Miami", date: "2026-04-04", sport: "hyrox" },
  { name: "HYROX World Championships", date: "2026-06-14", sport: "hyrox" },
  { name: "HYROX Chicago", date: "2026-10-03", sport: "hyrox" },
  { name: "HYROX New York", date: "2026-11-07", sport: "hyrox" },
  { name: "HYROX London", date: "2026-03-21", sport: "hyrox" },
  { name: "HYROX Berlin", date: "2026-04-25", sport: "hyrox" },
  { name: "Boston Marathon", date: "2026-04-20", sport: "marathon" },
  { name: "Chicago Marathon", date: "2026-10-11", sport: "marathon" },
  { name: "NYC Marathon", date: "2026-11-01", sport: "marathon" },
  { name: "London Marathon", date: "2026-04-26", sport: "marathon" },
  { name: "Berlin Marathon", date: "2026-09-27", sport: "marathon" },
  { name: "Tokyo Marathon", date: "2026-03-01", sport: "marathon" },
  { name: "NYC Half Marathon", date: "2026-03-15", sport: "half_marathon" },
  { name: "Philadelphia Half Marathon", date: "2026-11-22", sport: "half_marathon" },
  { name: "Brooklyn Half Marathon", date: "2026-05-16", sport: "half_marathon" },
  { name: "Ironman World Championship", date: "2026-10-10", sport: "ironman" },
  { name: "Ironman 70.3 Miami", date: "2026-10-25", sport: "ironman" },
  { name: "Ironman 70.3 World Championship", date: "2026-09-06", sport: "ironman" },
  { name: "Ironman Lake Placid", date: "2026-07-19", sport: "ironman" },
  { name: "Ironman Florida", date: "2026-11-07", sport: "ironman" },
  { name: "Ironman 70.3 Augusta", date: "2026-09-27", sport: "ironman" },
  { name: "Ironman 70.3 Chattanooga", date: "2026-05-17", sport: "ironman" },
  { name: "Chicago Triathlon", date: "2026-08-23", sport: "triathlon" },
  { name: "USAT Nationals", date: "2026-08-09", sport: "triathlon" },
  { name: "CrossFit Open", date: "2026-02-26", sport: "strength" },
];

const DAYS = [3, 4, 5, 6, 7];
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const chip = (on) => ({
  padding: "9px 12px", borderRadius: 999, cursor: "pointer", fontFamily: C.fm, fontSize: 11, letterSpacing: 1,
  border: `1px solid ${on ? C.cyan : C.border}`, background: on ? `${C.cyan}22` : C.card, color: on ? C.cyan : C.muted,
});

export default function PlanBuilder({ open, onGenerated, onClose }) {
  // Keep hook order fixed on every render.
  const [screen, setScreen] = useState(1);
  const [sports, setSports] = useState([]);
  const [races, setRaces] = useState([]);
  const [activeRaceId, setActiveRaceId] = useState(null);
  const [noRaceYet, setNoRaceYet] = useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [progressStep, setProgressStep] = useState(0);
  const progressSteps = [
    "Analyzing your goals",
    "Structuring your phases",
    "Building your sessions",
    "Finalizing your plan",
  ];

  const toggleSport = (sportId) => {
    setSports((prev) => {
      const next = prev.includes(sportId) ? prev.filter((s) => s !== sportId) : [...prev, sportId];
      const keep = races.filter((r) => next.includes(r.sport));
      next.forEach((s) => { if (!keep.some((r) => r.sport === s)) keep.push({ id: uid(), sport: s, name: "", date: "" }); });
      setRaces(keep);
      return next;
    });
  };
  const addRace = (sportId) => setRaces((prev) => [...prev, { id: uid(), sport: sportId, name: "", date: "" }]);
  const deleteRace = (raceId) => setRaces((prev) => prev.filter((r) => r.id !== raceId));
  const updateRace = (raceId, patch) => setRaces((prev) => prev.map((r) => (r.id === raceId ? { ...r, ...patch } : r)));

  const groupedRaces = useMemo(
    () => sports.map((sportId) => ({ sportId, entries: races.filter((r) => r.sport === sportId) })),
    [sports, races]
  );
  const suggestions = useMemo(() => {
    const row = races.find((r) => r.id === activeRaceId);
    if (!row) return [];
    const q = row.name.trim().toLowerCase();
    return RACES.filter((r) => r.sport === row.sport && (!q || r.name.toLowerCase().includes(q))).slice(0, 8);
  }, [activeRaceId, races]);

  const canNext1 = sports.length > 0;
  const canNext2 = noRaceYet || races.some((r) => r.name.trim().length > 0);
  const canBuild = Number.isInteger(daysPerWeek);

  useEffect(() => {
    if (status !== "loading") return;
    const id = setInterval(() => {
      setProgressStep((prev) => (prev + 1) % progressSteps.length);
    }, 3000);
    return () => clearInterval(id);
  }, [status, progressSteps.length]);

  const generatePlan = async () => {
    if (!canBuild) return;
    setStatus("loading");
    setError("");
    setProgressStep(0);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const payloadRaces = noRaceYet
        ? []
        : races.filter((r) => r.name.trim()).map((r, i) => ({ name: r.name.trim(), date: r.date || null, sport: r.sport, is_primary: i === 0 }));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 50000);
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sports, races: payloadRaces, days_per_week: daysPerWeek, no_race: noRaceYet }),
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        setError(`Generation failed: ${errorData.error || res.status}`);
        setStatus("error");
        return;
      }
      await onGenerated();
    } catch (e) {
      if (e?.name === "AbortError") {
        setError("Plan generation is taking longer than expected. Check back in a moment or tap Retry.");
      } else {
        setError(`Generation failed: ${e?.message || "Unknown error"}`);
      }
      setStatus("error");
    }
  };

  if (!open) return null;

  if (status === "loading" || status === "error") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: C.text, fontSize: 48, letterSpacing: 2 }}>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>The </span>
            <em style={{ fontFamily: "'DM Serif Display',serif", fontStyle: "italic", fontWeight: 400 }}>Lab</em>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>.</span>
          </div>
          <div style={{ fontSize: 36, color: C.cyan, margin: "8px 0 14px", animation: "pbSpin 1s linear infinite" }}>⬡</div>
          <div style={{ fontFamily: C.fm, color: C.text, fontSize: 10, letterSpacing: 2 }}>YOUR COACH IS BUILDING YOUR PROGRAM...</div>
          <div style={{ marginTop: 12, textAlign: "left", display: "inline-flex", flexDirection: "column", gap: 6 }}>
            {progressSteps.map((label, idx) => (
              <div key={label} style={{ fontFamily: C.fs, fontSize: 13, color: status === "loading" && idx === progressStep ? C.cyan : C.muted }}>
                ● {label}
              </div>
            ))}
          </div>
          {status === "error" && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: C.fs, color: "#FF6A6A", fontSize: 13, maxWidth: 360 }}>{error}</div>
              <button onClick={generatePlan} style={{ ...chip(true), marginTop: 12, background: C.cyan, color: "#000", border: "none", fontFamily: C.ff, fontSize: 14 }}>RETRY</button>
            </div>
          )}
          <style>{"@keyframes pbSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: C.bg, color: C.text, overflowY: "auto" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100vh", padding: "20px 20px 96px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 26, letterSpacing: 2 }}>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>The </span>
            <em style={{ fontFamily: "'DM Serif Display',serif", fontStyle: "italic", fontWeight: 400 }}>Lab</em>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>.</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", fontFamily: C.fm, fontSize: 10 }}>✕</button>
        </div>

        {screen === 1 && (
          <div>
            <div style={{ fontFamily: C.ff, fontSize: 30, letterSpacing: 1 }}>WHAT ARE YOU TRAINING FOR?</div>
            <div style={{ fontFamily: C.fs, fontSize: 13, color: C.muted, marginTop: 4 }}>Select all that apply.</div>
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>{SPORTS.map((s) => <button key={s.id} onClick={() => toggleSport(s.id)} style={chip(sports.includes(s.id))}>{s.label}</button>)}</div>
            <div style={{ marginTop: 18 }}><button onClick={() => setScreen(2)} disabled={!canNext1} style={{ ...chip(canNext1), background: canNext1 ? C.cyan : C.card, color: canNext1 ? "#000" : C.muted, border: "none", fontFamily: C.ff, fontSize: 16 }}>NEXT →</button></div>
          </div>
        )}

        {screen === 2 && (
          <div>
            <div style={{ fontFamily: C.ff, fontSize: 30, letterSpacing: 1 }}>YOUR RACES.</div>
            <div style={{ fontFamily: C.fs, fontSize: 13, color: C.muted, marginTop: 4 }}>Add a target event for each sport.</div>
            <div style={{ marginTop: 10 }}><button onClick={() => setNoRaceYet((v) => !v)} style={chip(noRaceYet)}>{noRaceYet ? "✓" : "○"} NO RACE YET — just building fitness</button></div>
            {!noRaceYet && groupedRaces.map(({ sportId, entries }) => {
              const label = SPORTS.find((s) => s.id === sportId)?.label || sportId.toUpperCase();
              return (
                <div key={sportId} style={{ marginTop: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontFamily: C.fm, fontSize: 9, letterSpacing: 2, color: C.cyan, marginBottom: 8 }}>{label}</div>
                  {entries.map((row) => (
                    <div key={row.id} style={{ marginBottom: 8, position: "relative" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 38px", gap: 8 }}>
                        <input value={row.name} onFocus={() => setActiveRaceId(row.id)} onChange={(e) => { updateRace(row.id, { name: e.target.value }); setActiveRaceId(row.id); }} placeholder="Race name search..." style={{ width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: C.fs, fontSize: 13, boxSizing: "border-box" }} />
                        <input type="date" value={row.date || ""} onChange={(e) => updateRace(row.id, { date: e.target.value })} style={{ width: "100%", padding: "10px 8px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: C.fs, fontSize: 12, boxSizing: "border-box", colorScheme: "dark" }} />
                        <button onClick={() => deleteRace(row.id)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer" }}>✕</button>
                      </div>
                      {activeRaceId === row.id && suggestions.length > 0 && (
                        <div style={{ marginTop: 4, border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, maxHeight: 180, overflowY: "auto" }}>
                          {suggestions.map((s, i) => (
                            <button key={`${s.name}_${i}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { updateRace(row.id, { name: s.name, date: s.date }); setActiveRaceId(null); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                              <div style={{ fontFamily: C.ff, color: C.text, fontSize: 12 }}>{s.name}</div>
                              <div style={{ fontFamily: C.fm, color: C.muted, fontSize: 9 }}>{s.date}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addRace(sportId)} style={{ background: "none", border: "none", color: C.cyan, cursor: "pointer", fontFamily: C.fm, fontSize: 10, letterSpacing: 1 }}>+ Add another {label} race</button>
                </div>
              );
            })}
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button onClick={() => setScreen(1)} style={{ ...chip(false), fontFamily: C.ff, fontSize: 14 }}>BACK</button>
              <button onClick={() => setScreen(3)} disabled={!canNext2} style={{ ...chip(canNext2), background: canNext2 ? C.cyan : C.card, color: canNext2 ? "#000" : C.muted, border: "none", fontFamily: C.ff, fontSize: 16 }}>NEXT →</button>
            </div>
          </div>
        )}

        {screen === 3 && (
          <div>
            <div style={{ fontFamily: C.ff, fontSize: 30, letterSpacing: 1 }}>HOW MANY DAYS PER WEEK CAN YOU TRAIN?</div>
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>{DAYS.map((d) => <button key={d} onClick={() => setDaysPerWeek(d)} style={chip(daysPerWeek === d)}>{d}</button>)}</div>
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button onClick={() => setScreen(2)} style={{ ...chip(false), fontFamily: C.ff, fontSize: 14 }}>BACK</button>
              <button onClick={generatePlan} disabled={!canBuild} style={{ ...chip(canBuild), background: canBuild ? C.cyan : C.card, color: canBuild ? "#000" : C.muted, border: "none", fontFamily: C.ff, fontSize: 16 }}>BUILD MY PLAN →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
