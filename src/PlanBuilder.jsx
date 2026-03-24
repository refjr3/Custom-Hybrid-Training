import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const C = { bg:"#000", card:"#1a1a1a", card2:"#222", border:"#2a2a2a", text:"#fff", muted:"#888", green:"#00D4A0", cyan:"#00F3FF", red:"#FF3C00", ff:"'Bebas Neue','Arial Black',sans-serif", fm:"'Space Mono',monospace", fs:"'Inter',-apple-system,sans-serif" };
const SPORTS = [{ id:"hyrox", label:"HYROX" },{ id:"marathon", label:"MARATHON" },{ id:"half_ironman", label:"TRIATHLON 70.3" },{ id:"ironman", label:"IRONMAN" },{ id:"strength", label:"STRENGTH" },{ id:"hybrid", label:"HYBRID" }];
const EVENTS = [
  { sport:"hyrox", name:"HYROX World Championship", date:"2026-06-14" }, { sport:"hyrox", name:"HYROX Miami", date:"2026-04-04" }, { sport:"hyrox", name:"HYROX New York City", date:"2026-01-18" }, { sport:"hyrox", name:"HYROX Dallas", date:"2026-02-08" },
  { sport:"hyrox", name:"HYROX Chicago", date:"2026-03-22" }, { sport:"hyrox", name:"HYROX London", date:"2026-05-10" }, { sport:"hyrox", name:"HYROX Los Angeles", date:"2026-06-06" },
  { sport:"marathon", name:"Boston Marathon", date:"2026-04-20" }, { sport:"marathon", name:"Chicago Marathon", date:"2026-10-11" }, { sport:"marathon", name:"NYC Marathon", date:"2026-11-01" }, { sport:"marathon", name:"Berlin Marathon", date:"2026-09-27" }, { sport:"marathon", name:"London Marathon", date:"2026-04-26" },
  { sport:"ironman", name:"Ironman World Championship", date:"2026-10-10" }, { sport:"ironman", name:"IRONMAN Florida", date:"2026-11-07" }, { sport:"ironman", name:"IRONMAN Texas", date:"2026-04-25" }, { sport:"ironman", name:"IRONMAN Lake Placid", date:"2026-07-26" },
  { sport:"half_ironman", name:"Ironman 70.3 Miami", date:"2026-03-15" }, { sport:"half_ironman", name:"IRONMAN 70.3 World Champ", date:"2026-09-19" }, { sport:"half_ironman", name:"IRONMAN 70.3 Oceanside", date:"2026-04-04" }, { sport:"half_ironman", name:"IRONMAN 70.3 Eagleman", date:"2026-06-14" },
];
const DAY_OPTIONS = [3, 4, 5, 6];
const chip = (on) => ({ padding:"9px 12px", borderRadius:999, border:`1px solid ${on ? C.green : C.border}`, background:on ? `${C.green}22` : C.card2, color:on ? C.green : C.muted, cursor:"pointer", fontFamily:C.fm, fontSize:11, letterSpacing:1 });
const weeksUntil = (dateStr) => { if (!dateStr) return 12; const t = new Date(`${dateStr}T00:00:00`).getTime(); if (Number.isNaN(t)) return 12; const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); return Math.max(1, Math.ceil((t - start) / (1000 * 60 * 60 * 24 * 7))); };

export default function PlanBuilder({ open, profile, authToken, userId, onClose, onGenerated, onSaveProfilePatch }) {
  const [sport, setSport] = useState("");
  const [raceMode, setRaceMode] = useState("no");
  const [raceQuery, setRaceQuery] = useState("");
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const firstRace = Array.isArray(profile?.races) ? profile.races.find((r) => r?.date) || profile.races[0] : null;
    const initialSport = profile?.race_goal || firstRace?.sport || "";
    const initialDays = DAY_OPTIONS.includes(profile?.days_per_week) ? profile.days_per_week : 5;
    setSport(initialSport); setRaceMode(firstRace?.name || firstRace?.date ? "yes" : "no");
    setRaceName(firstRace?.name || ""); setRaceDate(firstRace?.date || ""); setRaceQuery(firstRace?.name || "");
    setDaysPerWeek(initialDays); setGenerating(false); setError("");
  }, [open, profile]);

  const showRace = raceMode === "yes";
  const filteredEvents = useMemo(() => {
    if (!showRace || !sport) return [];
    const q = raceQuery.trim().toLowerCase();
    return EVENTS.filter((e) => e.sport === sport && (!q || e.name.toLowerCase().includes(q))).slice(0, 8);
  }, [showRace, sport, raceQuery]);

  if (!open) return null;

  const canBuild = Boolean(sport && daysPerWeek && (!showRace || (raceName.trim() && raceDate)));
  const selectRace = (e) => { setRaceName(e.name); setRaceDate(e.date); setRaceQuery(e.name); };
  const effectiveRaceName = showRace ? raceName.trim() : null;
  const effectiveRaceDate = showRace ? raceDate : null;
  const totalWeeks = effectiveRaceDate ? weeksUntil(effectiveRaceDate) : 12;

  const buildPlan = async () => {
    if (!canBuild || generating) return;
    setGenerating(true); setError("");
    try {
      let token = authToken;
      if (!token && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || "";
      }
      const patch = {
        race_goal: sport,
        races: effectiveRaceName ? [{ sport, name: effectiveRaceName, date: effectiveRaceDate, is_primary: true }] : [],
        days_per_week: daysPerWeek,
      };
      if (typeof onSaveProfilePatch === "function") await onSaveProfilePatch(patch);
      const profilePayload = { ...profile, user_id: userId || profile?.user_id || null, sports: [sport], race_goal: sport, target_race_name: effectiveRaceName, target_race_date: effectiveRaceDate, days_per_week: daysPerWeek };
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ user_id: userId || profile?.user_id || null, sport, race_name: effectiveRaceName, race_date: effectiveRaceDate, days_per_week: daysPerWeek, profile: profilePayload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Plan generation failed");
      if (onGenerated) await onGenerated({ response: data });
    } catch (e) {
      setError(e?.message || "Plan generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1200, background:C.bg, color:C.text, overflowY:"auto" }}>
      <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", padding:"20px 20px 96px", boxSizing:"border-box" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontFamily:C.ff, fontSize:26, letterSpacing:2 }}>BUILD YOUR PLAN</div>
          <button onClick={onClose} style={{ background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 10px", cursor:"pointer", fontFamily:C.fm, fontSize:10 }}>CLOSE</button>
        </div>
        <div style={{ display:"grid", gap:12 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:12 }}>
            <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2, marginBottom:8 }}>1) WHAT ARE YOU TRAINING FOR?</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>{SPORTS.map((s) => <button key={s.id} onClick={() => setSport(s.id)} style={chip(sport === s.id)}>{s.label}</button>)}</div>
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:12 }}>
            <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2, marginBottom:8 }}>2) DO YOU HAVE A RACE?</div>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <button onClick={() => setRaceMode("yes")} style={chip(showRace)}>YES - PICK FROM LIST</button>
              <button onClick={() => setRaceMode("no")} style={chip(!showRace)}>NO - BUILDING FITNESS</button>
            </div>
            {showRace && (
              <div style={{ position:"relative" }}>
                <input value={raceQuery} onChange={(e) => { setRaceQuery(e.target.value); setRaceName(e.target.value); }} placeholder="Search races..." style={{ width:"100%", boxSizing:"border-box", padding:"11px 12px", background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontFamily:C.fs, fontSize:13, outline:"none" }} />
                {filteredEvents.length > 0 && (
                  <div style={{ marginTop:4, border:`1px solid ${C.border}`, borderRadius:8, background:C.card2, maxHeight:210, overflowY:"auto" }}>
                    {filteredEvents.map((e, i) => (
                      <button key={`${e.name}_${i}`} onClick={() => selectRace(e)} style={{ display:"block", width:"100%", padding:"8px 10px", background:"transparent", border:"none", borderBottom:`1px solid ${C.border}`, textAlign:"left", cursor:"pointer" }}>
                        <div style={{ fontFamily:C.ff, fontSize:12, color:C.text, letterSpacing:1 }}>{e.name}</div>
                        <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted }}>{e.date}</div>
                      </button>
                    ))}
                  </div>
                )}
                <input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} style={{ marginTop:8, width:"100%", boxSizing:"border-box", padding:"11px 12px", background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontFamily:C.fs, fontSize:13, outline:"none", colorScheme:"dark" }} />
              </div>
            )}
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:12 }}>
            <div style={{ fontFamily:C.fm, fontSize:9, color:C.muted, letterSpacing:2, marginBottom:8 }}>3) HOW MANY DAYS PER WEEK?</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>{DAY_OPTIONS.map((d) => <button key={d} onClick={() => setDaysPerWeek(d)} style={chip(daysPerWeek === d)}>{d} DAYS</button>)}</div>
          </div>
        </div>
        {error ? <div style={{ marginTop:12, color:C.red, fontFamily:C.fm, fontSize:10, letterSpacing:1 }}>{error}</div> : null}
        <div style={{ position:"fixed", left:"50%", transform:"translateX(-50%)", bottom:16, width:"calc(100% - 40px)", maxWidth:440 }}>
          <button onClick={buildPlan} disabled={!canBuild || generating} style={{ width:"100%", padding:"13px 14px", borderRadius:10, border:"none", background:canBuild && !generating ? C.green : C.card2, color:canBuild && !generating ? "#000" : C.muted, cursor:canBuild && !generating ? "pointer" : "default", fontFamily:C.ff, fontSize:16, letterSpacing:2 }}>
            {generating ? "YOUR COACH IS BUILDING YOUR PROGRAM..." : "BUILD MY PLAN →"}
          </button>
        </div>
      </div>
    </div>
  );
}
