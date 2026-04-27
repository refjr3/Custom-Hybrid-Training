import { useState } from "react";
import RaceSearch from "../onboarding/shared/RaceSearch.jsx";

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 600,
        color: "rgba(255,255,255,0.4)",
        letterSpacing: "2px",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function formatRaceDate(date) {
  if (!date) return "Date not set";
  const parsed = new Date(`${String(date).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Date not set";
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function Step4Race({
  profile,
  supabase,
  raceName,
  raceDate,
  onRaceUpdate,
}) {
  const [editingRace, setEditingRace] = useState(false);

  const selectedRace = raceName
    ? {
        name: raceName,
        race_date: raceDate || null,
      }
    : null;

  const applyRacePatch = async (patch) => {
    await onRaceUpdate?.(patch);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <SectionLabel>Your race</SectionLabel>
        {!editingRace ? (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              padding: "18px 20px",
            }}
          >
            <div style={{ fontSize: 14, color: "#fff", fontWeight: 500, marginBottom: 4 }}>
              {raceName || "No race selected"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{formatRaceDate(raceDate)}</div>
            <button
              type="button"
              onClick={() => setEditingRace(true)}
              style={{
                marginTop: 12,
                background: "transparent",
                border: "none",
                color: "#C9A875",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                padding: 0,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Change race →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RaceSearch
              supabase={supabase}
              sport={profile?.primary_sport || undefined}
              placeholder="Search your race…"
              selectedRace={selectedRace}
              onSelect={async (selected) => {
                await applyRacePatch({
                  target_race_name: selected?.target_race_name || null,
                  target_race_date: selected?.target_race_date || null,
                  race_city: selected?.race_city || null,
                });
                setEditingRace(false);
              }}
            />
            <button
              type="button"
              onClick={() => setEditingRace(false)}
              style={{
                alignSelf: "flex-start",
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.45)",
                fontSize: 12,
                cursor: "pointer",
                padding: 0,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>

      <div>
        <SectionLabel>Race date</SectionLabel>
        <input
          type="date"
          value={raceDate || ""}
          onChange={(e) => applyRacePatch({ target_race_date: e.target.value || null })}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            color: "#fff",
            fontSize: 16,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <button
          type="button"
          onClick={() => applyRacePatch({ target_race_date: null })}
          style={{
            marginTop: 8,
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            fontSize: 11,
            cursor: "pointer",
            padding: 0,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          I don't know yet
        </button>
      </div>
    </div>
  );
}
