/**
 * Glass form controls for tiered onboarding (Phase 4).
 */

export function GlassInput({
  type = "text",
  value,
  onChange,
  placeholder,
  id,
  name,
  required,
  min,
  max,
  step,
  style = {},
  disabled = false,
}) {
  const base = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "10px 14px",
    color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    outline: "none",
  };
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      style={{ ...base, ...style }}
    />
  );
}

export function GlassSelect({ value, onChange, id, name, required, children, disabled = false, style = {} }) {
  const base = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "10px 14px",
    color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    outline: "none",
    appearance: "none",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
  return (
    <select id={id} name={name} value={value} onChange={onChange} required={required} disabled={disabled} style={{ ...base, ...style }}>
      {children}
    </select>
  );
}

/** Single-select pill (inactive = glass, active = gold ring). */
export function Pill({
  selected,
  onClick,
  children,
  disabled = false,
  style = {},
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "10px 16px",
        borderRadius: 999,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.4px",
        cursor: disabled ? "default" : "pointer",
        border: selected ? "1px solid rgba(201,168,117,0.55)" : "1px solid rgba(255,255,255,0.1)",
        background: selected ? "rgba(201,168,117,0.18)" : "rgba(255,255,255,0.06)",
        color: selected ? "#C9A875" : "rgba(255,255,255,0.7)",
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ type = "button", onClick, disabled, children, style = {} }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "14px 22px",
        borderRadius: 999,
        border: "1px solid rgba(201,168,117,0.35)",
        background: "rgba(201,168,117,0.15)",
        color: "#C9A875",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "1.2px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        width: "100%",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ type = "button", onClick, disabled, children, style = {} }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "12px 18px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
        color: "rgba(255,255,255,0.45)",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.8px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function GlassCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.055)",
        backdropFilter: "blur(28px) saturate(1.4)",
        WebkitBackdropFilter: "blur(28px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 22,
        padding: "22px 20px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
