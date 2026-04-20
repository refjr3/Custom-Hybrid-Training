import { useEffect, useMemo, useRef, useState } from "react";
import { GlassInput } from "./Inputs.jsx";

export default function RaceSearch({ supabase, sport, placeholder, onSelect, selectedRace = null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(selectedRace);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    setSelected(selectedRace || null);
  }, [selectedRace?.name, selectedRace?.race_date, selectedRace?.city]);

  useEffect(() => {
    if (selected) return;
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const sportParam = sport ? `&sport=${encodeURIComponent(sport)}` : "";
        const res = await fetch(`/api/races/search?q=${encodeURIComponent(q)}${sportParam}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
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
  }, [query, sport, selected, supabase]);

  const handleSelect = (race) => {
    setSelected(race);
    setQuery("");
    setResults([]);
    onSelect?.({
      target_race_name: race.name || null,
      target_race_date: race.race_date || null,
      sport_category: race.sport || null,
      race_city: race.city || null,
      primary_sport: race.sport || null,
    });
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    onSelect?.({
      target_race_name: null,
      target_race_date: null,
      race_city: null,
    });
  };

  const selectedDate = useMemo(() => {
    if (!selected?.race_date) return "Date TBD";
    const d = new Date(selected.race_date);
    if (Number.isNaN(d.getTime())) return selected.race_date;
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }, [selected?.race_date]);

  if (selected) {
    return (
      <div
        style={{
          background: "rgba(201,168,117,0.1)",
          border: "1px solid rgba(201,168,117,0.35)",
          borderRadius: 16,
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(201,168,117,0.6)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            ✓ Race Selected
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" }}>{selected.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {selected.city || "City TBD"} · {selectedDate}
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "50%",
            width: 28,
            height: 28,
            color: "rgba(255,255,255,0.4)",
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <GlassInput
        type="text"
        value={query}
        placeholder={placeholder || "Search races..."}
        onChange={(e) => setQuery(e.target.value)}
        style={{ paddingRight: 34 }}
      />

      {loading ? (
        <div
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 10,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          ...
        </div>
      ) : null}

      {results.length > 0 ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "rgba(20,20,22,0.98)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {results.map((race, i) => (
            <button
              key={race.id || `${race.name}-${race.race_date}-${race.city}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(race)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                borderBottom: i < results.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                padding: "12px 16px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{race.name}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                  {race.city || "City TBD"}
                  {race.race_date
                    ? ` · ${new Date(race.race_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                    : " · Date TBD"}
                </div>
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.2)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {race.category || ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
