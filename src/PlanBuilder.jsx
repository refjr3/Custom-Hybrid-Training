import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const C = {
  bg: "#000",
  card: "#1a1a1a",
  card2: "#222",
  border: "#2a2a2a",
  text: "#fff",
  muted: "#888",
  green: "#00D4A0",
  red: "#FF3C00",
  ff: "'Bebas Neue','Arial Black',sans-serif",
  fm: "'Space Mono',monospace",
  fs: "'Inter',-apple-system,sans-serif",
};

const SPORTS = [
  { id: "hyrox", label: "HYROX" },
  { id: "marathon", label: "MARATHON" },
  { id: "half_marathon", label: "HALF MARATHON" },
  { id: "triathlon", label: "TRIATHLON 70.3" },
  { id: "ironman", label: "IRONMAN" },
  { id: "strength", label: "STRENGTH" },
  { id: "hybrid", label: "HYBRID" },
];

const RACES = [
  { name: "HYROX Miami", date: "2026-04-04", sport: "hyrox" },
  { name: "HYROX World Championships", date: "2026-06-14", sport: "hyrox" },
  { name: "HYROX Chicago", date: "2026-10-03", sport: "hyrox" },
  { name: "HYROX New York", date: "2026-11-07", sport: "hyrox" },
  { name: "Boston Marathon", date: "2026-04-20", sport: "marathon" },
  { name: "Chicago Marathon", date: "2026-10-11", sport: "marathon" },
  { name: "NYC Marathon", date: "2026-11-01", sport: "marathon" },
  { name: "London Marathon", date: "2026-04-26", sport: "marathon" },
  { name: "Ironman World Championship", date: "2026-10-10", sport: "ironman" },
  { name: "Ironman 70.3 Miami", date: "2026-10-25", sport: "ironman" },
  { name: "Ironman 70.3 World Championship", date: "2026-09-06", sport: "ironman" },
  { name: "Ironman Lake Placid", date: "2026-07-19", sport: "ironman" },
  { name: "Ironman Florida", date: "2026-11-07", sport: "ironman" },
  { name: "Ironman 70.3 Augusta", date: "2026-09-27", sport: "ironman" },
  { name: "NYC Half Marathon", date: "2026-03-15", sport: "half_marathon" },
  { name: "Philadelphia Half Marathon", date: "2026-11-22", sport: "half_marathon" },
  { name: "Chicago Triathlon", date: "2026-08-23", sport: "triathlon" },
  { name: "USAT Nationals", date: "2026-08-09", sport: "triathlon" },
  { name: "CrossFit Open", date: "2026-02-26", sport: "strength" },
  { name: "Wodapalooza", date: "2026-01-15", sport: "strength" },
];

const DAY_OPTIONS = [3, 4, 5, 6];
const chipStyle = (on) => ({
  padding: "9px 12px",
  borderRadius: 999,
  border: `1px solid ${on ? C.green : C.border}`,
  background: on ? `${C.green}22` : C.card2,
  color: on ? C.green : C.muted,
  cursor: "pointer",
  fontFamily: C.fm,
  fontSize: 11,
  letterSpacing: 1,
});

export default function PlanBuilder({ open, onGenerated, onClose }) {
  const [sports, setSports] = useState([]);
  const [noRaceYet, setNoRaceYet] = useState(false);
  const [raceQuery, setRaceQuery] = useState("");
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredRaces = useMemo(() => {
    const q = raceQuery.trim().toLowerCase();
    return RACES.filter((r) => (!q || r.name.toLowerCase().includes(q))).slice(0, 8);
  }, [raceQuery]);

  if (!open) return null;

  const canBuild = sports.length > 0 && daysPerWeek && (noRaceYet || (raceName.trim() && raceDate));
  const primarySport = sports[0] || null;

  const onSelectRace = (race) => {
    setRaceName(race.name);
    setRaceDate(race.date);
    setRaceQuery(race.name);
  };

  const toggleSport = (sportId) => {
    setSports((prev) => (prev.includes(sportId) ? prev.filter((s) => s !== sportId) : [...prev, sportId]));
  };

  const buildPlan = async () => {
    if (!canBuild || loading) return;
    setLoading(true);
    setError("");
    try {
      let token = "";
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || "";
      }
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sport: primarySport,
          race_name: noRaceYet ? null : raceName.trim(),
          race_date: noRaceYet ? null : raceDate,
          days_per_week: daysPerWeek,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "failed");
      if (onGenerated) await onGenerated();
    } catch (_) {
      setError("Something went wrong — tap to retry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: C.bg, color: C.text, overflowY: "auto" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", padding: "20px 20px 96px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: C.ff, fontSize: 26, letterSpacing: 2 }}>BUILD YOUR PLAN</div>
          <button onClick={onClose} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", fontFamily: C.fm, fontSize: 10 }}>✕</button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
            <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>1) SPORT</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SPORTS.map((s) => <button key={s.id} onClick={() => toggleSport(s.id)} style={chipStyle(sports.includes(s.id))}>{s.label}</button>)}
            </div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
            <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>2) RACE</div>
            <button onClick={() => setNoRaceYet((v) => !v)} style={chipStyle(noRaceYet)}>{noRaceYet ? "✓" : "○"} NO RACE YET</button>
            {!noRaceYet && (
              <div style={{ marginTop: 8 }}>
                <input value={raceQuery} onChange={(e) => { setRaceQuery(e.target.value); setRaceName(e.target.value); }} placeholder="Type race name..." style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: C.fs, fontSize: 13, outline: "none" }} />
                {filteredRaces.length > 0 && (
                  <div style={{ marginTop: 4, border: `1px solid ${C.border}`, borderRadius: 8, background: C.card2, maxHeight: 210, overflowY: "auto" }}>
                    {filteredRaces.map((r, i) => (
                      <button key={`${r.name}_${i}`} onClick={() => onSelectRace(r)} style={{ display: "block", width: "100%", padding: "8px 10px", background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, textAlign: "left", cursor: "pointer" }}>
                        <div style={{ fontFamily: C.ff, fontSize: 12, color: C.text, letterSpacing: 1 }}>{r.name}</div>
                        <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted }}>{r.date}</div>
                      </button>
                    ))}
                  </div>
                )}
                <input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} style={{ marginTop: 8, width: "100%", boxSizing: "border-box", padding: "11px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: C.fs, fontSize: 13, outline: "none", colorScheme: "dark" }} />
              </div>
            )}
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
            <div style={{ fontFamily: C.fm, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>3) DAYS PER WEEK</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DAY_OPTIONS.map((d) => <button key={d} onClick={() => setDaysPerWeek(d)} style={chipStyle(daysPerWeek === d)}>{d} DAYS</button>)}
            </div>
          </div>
        </div>
        {error ? <div style={{ marginTop: 12, color: C.red, fontFamily: C.fm, fontSize: 10, letterSpacing: 1 }}>{error}</div> : null}
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 16, width: "calc(100% - 40px)", maxWidth: 440 }}>
          <button onClick={buildPlan} disabled={!canBuild || loading} style={{ width: "100%", padding: "13px 14px", borderRadius: 10, border: "none", background: canBuild && !loading ? C.green : C.card2, color: canBuild && !loading ? "#000" : C.muted, cursor: canBuild && !loading ? "pointer" : "default", fontFamily: C.ff, fontSize: 16, letterSpacing: 2 }}>
            {loading ? "Your coach is building your program..." : "BUILD MY PLAN →"}
          </button>
        </div>
      </div>
    </div>
  );
}
