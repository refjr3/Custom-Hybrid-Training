import { useState } from "react";

const PHASES = [
  { id: 0, weeks: [1, 2, 3], label: "Base Rebuild", short: "BASE", color: "#38bdf8", desc: "Re-establish aerobic floor post-Miami. Light HYROX loads, strict Z2 discipline." },
  { id: 1, weeks: [4, 5, 6], label: "Accumulation", short: "ACCUM", color: "#a3e635", desc: "Volume and HYROX loads climb. Track work introduced. Building the engine." },
  { id: 2, weeks: [7, 8, 9], label: "Intensification", short: "INTENS", color: "#fb923c", desc: "Heavier sleds, faster track, harder threshold sessions. Fatigue managed strictly." },
  { id: 3, weeks: [10, 11, 12], label: "Peak & Test", short: "PEAK", color: "#f43f5e", desc: "W10–11 max load. W12 deload + full benchmark. Compare everything to Week 1." },
];

const WHOOP = {
  green: { emoji: "🟢", label: "Green", color: "#4ade80", rule: "Execute as programmed." },
  yellow: { emoji: "🟡", label: "Yellow", color: "#facc15", rule: "Reduce Z2 volume 30–40%. Quality sessions: full send or skip — no half measures." },
  red: { emoji: "🔴", label: "Red", color: "#f87171", rule: "Full rest. No exceptions." },
};

const phaseFor = (w) => (w <= 3 ? 0 : w <= 6 ? 1 : w <= 9 ? 2 : 3);

// Start date: Monday April 13, 2026
const START_DATE = new Date(2026, 3, 13); // month is 0-indexed

const getWeekStartDate = (weekNum) => {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + (weekNum - 1) * 7);
  return d;
};

const getDayDate = (weekNum, dayIndex) => {
  const start = getWeekStartDate(weekNum);
  const d = new Date(start);
  d.setDate(d.getDate() + dayIndex);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getWeekDateRange = (weekNum) => {
  const start = getWeekStartDate(weekNum);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

const HYROX_ROTATION = [
  "Sled push/pull, compromised running, wall ball finisher",
  "Ski + run intervals, compromised running, wall ball finisher",
  "Sled push/pull, sandbag lunges, wall ball finisher",
  "Ski + row engine work, compromised running, wall ball finisher",
  "Sled push/pull, farmers carry, sandbag lunges, wall ball finisher",
  "Full race simulation — all stations in order, log every split",
];

const SAT_EVEN = [
  "Track: speed work at race pace",
  "Track: race pace intervals, longer reps",
  "Track: mixed pyramid at race pace",
  "Track: race pace + speed reserve work",
  "Track: extended race pace reps",
  "Track benchmark — log all splits vs Week 2",
];

const SAT_ODD = [
  "Threshold run at comfortably hard effort",
  "Threshold erg + run combo",
  "Threshold run, extended duration",
  "Threshold erg intervals + run",
  "Threshold run at race pace effort",
  "Threshold benchmark — log time vs Week 1",
];

const buildWeek = (w) => {
  const p = phaseFor(w);
  const isDeload = w === 12;
  const hyrox = HYROX_ROTATION[Math.min(Math.floor((w - 1) / 2), 5)];
  const satSession = w % 2 === 0 ? SAT_EVEN[Math.min(Math.floor((w - 1) / 2), 5)] : SAT_ODD[Math.min(Math.floor((w - 1) / 2), 5)];
  const satLabel = w % 2 === 0 ? "Track" : "Threshold";

  return {
    week: w, phase: p,
    days: [
      {
        day: "MON", icon: "🔥", label: "HYROX",
        color: "#fb923c",
        detail: isDeload ? "HYROX: full race simulation — log all splits" : `HYROX: ${hyrox}`,
        green: "Full session, full load.",
        yellow: "Reduce rounds by one. Keep all stations.",
        red: "Full rest.",
      },
      {
        day: "TUE", icon: "🚣", label: "Z2 Erg + Mobility",
        color: "#38bdf8",
        detail: "Z2 erg to WHOOP strain target — SkiErg / Echo Bike / Row. Dynamic mobility after.",
        green: "Erg to strain target. HR ceiling strict.",
        yellow: "Cut 30–40% short of strain target.",
        red: "Full rest.",
      },
      {
        day: "WED", icon: "💪", label: "Upper + Z2 Erg Cap",
        color: "#a78bfa",
        detail: "Upper body lift. Cap with Z2 erg to strain target — SkiErg / Echo Bike / Row. Legs off the floor.",
        green: "Full lift + Z2 cap to strain.",
        yellow: "Full lift. Skip Z2 cap.",
        red: "Full rest.",
      },
      {
        day: "THU", icon: "🏃", label: "Z2 Run + Mobility",
        color: "#34d399",
        detail: "Z2 run to WHOOP strain target. HR ceiling 133–148bpm strict. Static stretch after.",
        green: "Run to strain target. Walk if HR drifts.",
        yellow: "Cut 30–40% short of strain target. Same HR ceiling.",
        red: "Full rest.",
      },
      {
        day: "FRI", icon: "💪", label: "Upper Body",
        color: "#a78bfa",
        detail: "Upper body lift only. No cardio. Legs arrive Saturday fresh.",
        green: "Full session.",
        yellow: "Reduce volume 20%. Drop accessories.",
        red: "Full rest.",
      },
      {
        day: "SAT", icon: "⚡", label: isDeload ? "Benchmark" : satLabel,
        color: "#f43f5e",
        detail: isDeload ? "Benchmark: track + threshold combo. Log everything vs Week 1." : satSession,
        green: "Full output. 5 days from HYROX — take it.",
        yellow: "Convert to Z2 run. Don't force quality on yellow.",
        red: "Full rest.",
      },
      {
        day: "SUN", icon: "🌿", label: "Long Z2 Run",
        color: "#4ade80",
        detail: "Long Z2 run to WHOOP strain target. HR ceiling 133–148bpm. Walk breaks as needed.",
        green: "Full duration to strain target.",
        yellow: "Cut 30–40% short. Same HR ceiling.",
        red: "Full rest.",
      },
    ],
  };
};

const WEEKS = Array.from({ length: 12 }, (_, i) => buildWeek(i + 1));

export default function HyroxPlan() {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [expandedDay, setExpandedDay] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");
  const [whoopLevel, setWhoopLevel] = useState("green");

  const week = WEEKS[selectedWeek];
  const phase = PHASES[week.phase];

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#d4d4d4", fontFamily: "'Courier New', Courier, monospace" }}>
      {/* Header */}
      <div style={{ background: "#0f0f0f", borderBottom: "1px solid #1c1c1c", padding: "16px 20px 0", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 5, color: "#444", textTransform: "uppercase", marginBottom: 3 }}>Rafael · Post-Miami</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>
              HYROX <span style={{ color: phase.color }}>12W</span> BLUEPRINT
            </div>
          </div>
          <div style={{ background: `${phase.color}15`, border: `1px solid ${phase.color}40`, borderRadius: 4, padding: "4px 10px", fontSize: 9, letterSpacing: 3, color: phase.color, textTransform: "uppercase", fontWeight: 700 }}>
            {phase.short}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {[["plan", "PLAN"], ["gates", "GATES"]].map(([k, l]) => (
            <button key={k} onClick={() => setActiveTab(k)} style={{
              background: activeTab === k ? "#fff" : "transparent",
              color: activeTab === k ? "#000" : "#444",
              border: "none", padding: "7px 14px", fontSize: 9, letterSpacing: 3,
              textTransform: "uppercase", cursor: "pointer",
              fontFamily: "'Courier New', monospace", fontWeight: 900,
              borderRadius: "3px 3px 0 0",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: 720, margin: "0 auto" }}>
        {activeTab === "plan" && (
          <>
            {/* Phase strip */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {PHASES.map((p) => (
                <div key={p.id} onClick={() => { setSelectedWeek(p.weeks[0] - 1); setExpandedDay(null); }} style={{
                  flex: 1, background: week.phase === p.id ? `${p.color}18` : "#111",
                  border: `1px solid ${week.phase === p.id ? p.color + "50" : "#1a1a1a"}`,
                  borderRadius: 4, padding: "6px 8px", cursor: "pointer",
                }}>
                  <div style={{ fontSize: 8, letterSpacing: 2, color: p.color, fontWeight: 700 }}>W{p.weeks[0]}–{p.weeks[p.weeks.length - 1]}</div>
                  <div style={{ fontSize: 9, color: week.phase === p.id ? "#fff" : "#444", marginTop: 2, fontWeight: week.phase === p.id ? 700 : 400 }}>{p.label}</div>
                </div>
              ))}
            </div>

            {/* Week pills */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {WEEKS.map((w, i) => {
                const p = PHASES[w.phase];
                return (
                  <button key={i} onClick={() => { setSelectedWeek(i); setExpandedDay(null); }} style={{
                    background: selectedWeek === i ? p.color : "#111",
                    color: selectedWeek === i ? "#000" : "#555",
                    border: `1px solid ${selectedWeek === i ? p.color : "#1e1e1e"}`,
                    borderRadius: 3, padding: "5px 10px", fontSize: 10, fontWeight: 700,
                    cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: 1,
                    textAlign: "center", lineHeight: 1.4,
                  }}>
                    <div>W{w.week}</div>
                    <div style={{ fontSize: 8, fontWeight: 400, opacity: 0.7 }}>{getWeekStartDate(w.week).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  </button>
                );
              })}
            </div>

            {/* Phase info */}
            <div style={{
              background: `${phase.color}0d`, border: `1px solid ${phase.color}30`,
              borderLeft: `3px solid ${phase.color}`, borderRadius: 5,
              padding: "10px 14px", marginBottom: 12,
            }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: phase.color, textTransform: "uppercase" }}>Phase {week.phase + 1} · Week {week.week} of 12</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 1, marginBottom: 3 }}>{getWeekDateRange(week.week)}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>{phase.desc}</div>
            </div>

            {/* WHOOP selector */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "#444", letterSpacing: 3, textTransform: "uppercase" }}>WHOOP:</span>
              {Object.entries(WHOOP).map(([k, v]) => (
                <button key={k} onClick={() => setWhoopLevel(k)} style={{
                  background: whoopLevel === k ? `${v.color}20` : "transparent",
                  border: `1px solid ${whoopLevel === k ? v.color : "#222"}`,
                  borderRadius: 3, padding: "5px 12px", fontSize: 10,
                  cursor: "pointer", color: whoopLevel === k ? v.color : "#444",
                  fontFamily: "'Courier New', monospace", fontWeight: whoopLevel === k ? 700 : 400,
                }}>{v.emoji} {v.label}</button>
              ))}
            </div>

            {/* Day cards */}
            {week.days.map((d, i) => {
              const isOpen = expandedDay === i;
              const whoopColor = WHOOP[whoopLevel].color;
              return (
                <div key={i} style={{
                  background: "#0e0e0e",
                  border: `1px solid ${isOpen ? d.color + "50" : "#181818"}`,
                  borderLeft: `3px solid ${isOpen ? d.color : d.color + "35"}`,
                  borderRadius: 5, marginBottom: 6, overflow: "hidden",
                }}>
                  <button onClick={() => setExpandedDay(isOpen ? null : i)} style={{
                    width: "100%", background: "transparent", border: "none",
                    padding: "11px 14px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ fontSize: 15 }}>{d.icon}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <span style={{ fontSize: 9, fontWeight: 900, color: d.color, letterSpacing: 3, marginRight: 8 }}>{d.day}</span>
                      <span style={{ fontSize: 12, color: "#bbb" }}>{d.label}</span>
                      <span style={{ fontSize: 9, color: "#444", marginLeft: 8 }}>{getDayDate(week.week, i)}</span>
                    </div>
                    <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 2, letterSpacing: 1, color: whoopColor, background: `${whoopColor}15` }}>
                      {whoopLevel === "red" ? "REST" : whoopLevel === "green" ? "GO" : "MODIFY"}
                    </span>
                    <span style={{ color: "#333", fontSize: 10 }}>{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: "0 14px 14px", borderTop: "1px solid #161616" }}>
                      <div style={{ marginTop: 10, marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: d.color, fontSize: 9, marginTop: 3, flexShrink: 0 }}>▸</span>
                        <span style={{ fontSize: 12, color: "#ccc", lineHeight: 1.6 }}>{d.detail}</span>
                      </div>
                      <div style={{
                        padding: "8px 12px", background: `${whoopColor}0d`,
                        border: `1px solid ${whoopColor}25`, borderRadius: 4,
                        fontSize: 11, color: whoopColor, lineHeight: 1.5,
                      }}>
                        {WHOOP[whoopLevel].emoji} {d[whoopLevel]}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {activeTab === "gates" && (
          <div>
            <div style={{ fontSize: 11, color: "#555", lineHeight: 1.8, marginBottom: 20, borderLeft: "3px solid #222", paddingLeft: 12 }}>
              WHOOP governs volume. Not intensity. These are binary — no negotiating on yellow.
            </div>
            {Object.entries(WHOOP).map(([k, v]) => {
              const details = {
                green: ["All sessions execute as programmed.", "Z2 work runs to strain target.", "HYROX + quality sessions → full load.", "Wednesday Z2 cap → approved."],
                yellow: ["Z2 sessions: cut 30–40% short of strain target.", "HYROX, threshold, track → full send or skip. No in-between.", "Wednesday Z2 cap → skip. Lift only.", "Long run Sunday → cut 30–40%. Same HR ceiling."],
                red: ["Full rest. Zero training.", "Sauna, cold plunge, compression if available.", "Two consecutive reds → audit sleep, nutrition, weekly load.", "No guilt. This is where adaptation happens."],
              };
              return (
                <div key={k} style={{
                  background: `${v.color}08`, border: `1px solid ${v.color}25`,
                  borderLeft: `3px solid ${v.color}`, borderRadius: 5,
                  padding: "14px 16px", marginBottom: 12,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: v.color, marginBottom: 4 }}>{v.emoji} {v.label}</div>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 10, fontStyle: "italic" }}>{v.rule}</div>
                  {details[k].map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                      <span style={{ color: v.color, fontSize: 9, marginTop: 3, flexShrink: 0 }}>▸</span>
                      <span style={{ fontSize: 11, color: "#888", lineHeight: 1.6 }}>{r}</span>
                    </div>
                  ))}
                </div>
              );
            })}

            <div style={{ background: "#0e0e0e", border: "1px solid #1a1a1a", borderRadius: 5, padding: 16, marginTop: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#fff", marginBottom: 12, letterSpacing: 3, textTransform: "uppercase" }}>Hard Rules</div>
              {[
                ["01", "Z2 = 133–148 bpm. Walk if ceiling breaks. No ego."],
                ["02", "Strain = ceiling not floor. Don't stack Z2 to hit a number."],
                ["03", "Wall Balls always last. Always wet hands."],
                ["04", "Mon HYROX → Sat quality is 5 days. That gap is the whole point."],
                ["05", "Yellow quality sessions: full send or skip. No watered-down work."],
                ["06", "Week 12 = benchmark everything. Log vs Week 1."],
                ["07", "Two red days in a row → something is wrong. Audit it."],
              ].map(([n, r]) => (
                <div key={n} style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: "#333", fontWeight: 700, marginTop: 2, flexShrink: 0 }}>{n}</span>
                  <span style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
