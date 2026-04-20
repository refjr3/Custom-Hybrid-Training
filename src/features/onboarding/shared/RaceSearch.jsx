import { useEffect, useRef, useState } from "react";
import { GlassInput } from "./Inputs.jsx";

/**
 * @param {(race: { name: string; race_date?: string | null; sport?: string; city?: string; country?: string }) => void} [onSelect]
 * @param {(race: object) => void} [onSelectRace] — alias for onSelect
 */
export default function RaceSearch({ supabase, sport, placeholder, onSelect, onSelectRace }) {
  const notify = onSelect || onSelectRace;
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setResults([]);
          return;
        }
        const sp = sport ? `&sport=${encodeURIComponent(sport)}` : "";
        const res = await fetch(`/api/races/search?q=${encodeURIComponent(trimmed)}${sp}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        setResults(Array.isArray(body.results) ? body.results : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, sport, supabase]);

  const pickRace = (race) => {
    if (!notify) return;
    notify({
      target_race_name: race.name,
      target_race_date: race.race_date ?? "",
      primary_sport: race.sport || undefined,
    });
    setQ(race.name || "");
    setResults([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <GlassInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder || "Search races…"} />
      {loading ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Searching…</div> : null}
      {results.length > 0 ? (
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            maxHeight: 220,
            overflowY: "auto",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          {results.map((r) => (
            <button
              key={r.id || `${r.name}-${r.race_date}-${r.city}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickRace(r)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                {[r.city, r.country].filter(Boolean).join(" · ")}
                {r.race_date ? ` · ${r.race_date}` : ""}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
