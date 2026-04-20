export const ConnectPrompt = ({ icon, title, description, onConnect }) => (
  <div
    style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px dashed rgba(255,255,255,0.1)",
      borderRadius: 22,
      padding: "20px 22px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      marginBottom: 12,
      cursor: onConnect ? "pointer" : "default",
    }}
    onClick={onConnect}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,0.45)",
          marginBottom: 3,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.22)",
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </div>
    {onConnect && (
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#C9A875",
          background: "rgba(201,168,117,0.1)",
          border: "1px solid rgba(201,168,117,0.2)",
          borderRadius: 20,
          padding: "5px 12px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Connect →
      </div>
    )}
  </div>
);
