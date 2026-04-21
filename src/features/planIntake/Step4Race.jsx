export default function Step4Race({ raceDate, setRaceDate }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <input
        type="date"
        value={raceDate || ""}
        onChange={(e) => setRaceDate(e.target.value || null)}
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
        onClick={() => setRaceDate(null)}
        style={{
          alignSelf: "flex-start",
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "transparent",
          color: "rgba(255,255,255,0.55)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {"I don't know yet"}
      </button>
    </div>
  );
}
