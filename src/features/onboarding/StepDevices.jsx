import { PrimaryButton, SecondaryButton, GlassCard } from "./shared/Inputs.jsx";

const CONNECTABLE = [
  {
    id: "whoop",
    title: "WHOOP",
    subtitle: "Recovery, HRV, sleep, strain",
  },
  {
    id: "strava",
    title: "Strava",
    subtitle: "Coros / Polar / Suunto / Amazfit / Other watch — connect via Strava",
  },
];

const DEMAND = [
  { id: "garmin", title: "Garmin", subtitle: "Activities & wellness — notify me when available" },
  { id: "apple_watch", title: "Apple Watch", subtitle: "Health sync — notify me when available" },
  { id: "oura", title: "Oura Ring", subtitle: "Sleep & readiness — notify me when available" },
];

function DeviceCard({ item, selected, muted, onToggle }) {
  const border = selected ? "1px solid rgba(201,168,117,0.55)" : "1px solid rgba(255,255,255,0.1)";
  const bg = selected ? "rgba(201,168,117,0.1)" : muted ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.04)";
  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      style={{
        textAlign: "left",
        padding: "16px 18px",
        borderRadius: 18,
        border,
        background: bg,
        cursor: "pointer",
        width: "100%",
        color: "#fff",
        fontFamily: "'DM Sans', sans-serif",
        opacity: muted ? 0.85 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
          <div style={{ fontSize: 11, lineHeight: 1.45, color: "rgba(255,255,255,0.42)" }}>{item.subtitle}</div>
        </div>
        {muted ? (
          <span
            style={{
              flexShrink: 0,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "1px",
              color: "rgba(255,255,255,0.35)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 20,
              padding: "4px 8px",
            }}
          >
            SOON
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function StepDevices({ value, onChange, onNext, saving, error }) {
  const selected = Array.isArray(value.selected) ? value.selected : [];
  const noWearable = Boolean(value.no_wearable);

  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange({ selected: next, no_wearable: false });
  };

  const setNoWearable = () => {
    onChange({ selected: [], no_wearable: true });
  };

  const canNext = noWearable || selected.length > 0;

  return (
    <GlassCard style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CONNECTABLE.map((d) => (
          <DeviceCard key={d.id} item={d} selected={selected.includes(d.id)} muted={false} onToggle={toggle} />
        ))}
      </div>

      <div style={{ fontSize: 11, letterSpacing: "0.8px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: 6 }}>
        Coming soon — tap to signal interest
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {DEMAND.map((d) => (
          <DeviceCard key={d.id} item={d} selected={selected.includes(d.id)} muted onToggle={toggle} />
        ))}
      </div>

      <SecondaryButton onClick={setNoWearable} style={{ width: "100%", marginTop: 4 }}>
        I train without a wearable
      </SecondaryButton>

      {error ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div> : null}

      <PrimaryButton onClick={() => canNext && onNext(value)} disabled={!canNext || saving}>
        {saving ? "Saving…" : "NEXT"}
      </PrimaryButton>
    </GlassCard>
  );
}
