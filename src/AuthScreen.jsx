import { useState } from "react";

const C = {
  bg: "transparent",
  card: "rgba(255,120,30,0.08)",
  card2: "rgba(255,120,30,0.12)",
  border: "rgba(255,140,50,0.15)",
  text: "rgba(255,220,180,0.95)",
  muted: "rgba(255,140,50,0.35)",
  accent: "#ffaa44",
  red: "#ff6b6b",
  green: "#5dffa0",
  ff: "'Syne',sans-serif",
  fm: "'Space Mono',monospace",
  fs: "'Syne',sans-serif",
  glass: { backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" },
};

export default function AuthScreen({ supabase }) {
  const [mode, setMode]               = useState("signin");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [error, setError]             = useState(null);
  const [loading, setLoading]         = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setConfirmSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange in App.jsx will handle the redirect
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (confirmSent) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:C.bg, padding:24 }}>
        <div style={{ maxWidth:360, width:"100%", textAlign:"center" }}>
          <div style={{ fontFamily:C.ff, fontWeight:800, fontSize:52, color:C.accent, lineHeight:0.95, marginBottom:24 }}>CHECK<br/>YOUR<br/>EMAIL</div>
          <div style={{ fontFamily:C.fs, fontSize:14, color:C.muted, lineHeight:1.7 }}>
            We sent a confirmation link to<br/>
            <span style={{ color:C.text, fontFamily:C.fm, fontSize:12 }}>{email}</span>
          </div>
          <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted, marginTop:16 }}>
            Click the link to activate your account, then come back here to sign in.
          </div>
          <button
            onClick={() => { setConfirmSent(false); setMode("signin"); }}
            style={{ marginTop:32, padding:"14px 32px", background:C.card, border:`1px solid ${C.border}`, borderRadius:22, color:C.muted, fontFamily:C.ff, fontSize:15, fontWeight:700, letterSpacing:3, cursor:"pointer", ...C.glass }}
          >BACK TO SIGN IN</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:C.bg, padding:24 }}>
      <div style={{ maxWidth:360, width:"100%" }}>

        {/* Title */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontFamily:C.ff, fontWeight:800, fontSize:44, color:C.text, letterSpacing:5, lineHeight:0.95 }}>TRIAD</div>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:4, marginTop:12, textTransform:"uppercase" }}>PERFORMANCE DASHBOARD</div>
        </div>

        {/* Mode toggle */}
        <div style={{ display:"flex", background:C.card, borderRadius:22, padding:4, marginBottom:24, border:`1px solid ${C.border}`, ...C.glass }}>
          {[["signin","SIGN IN"],["signup","SIGN UP"]].map(([m, label]) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              style={{
                flex:1, padding:"11px 0", fontFamily:C.ff, fontSize:14, letterSpacing:3,
                background: mode===m ? C.accent : "transparent",
                color: mode===m ? "#1a0f06" : C.muted,
                border:"none", borderRadius:18, cursor:"pointer", transition:"all 0.2s", fontWeight:700,
              }}
            >{label}</button>
          ))}
        </div>

        {/* Inputs */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            style={{ padding:"14px 16px", background:C.card, border:`1px solid ${C.border}`, borderRadius:14, color:C.text, fontFamily:C.fs, fontSize:15, outline:"none", width:"100%", boxSizing:"border-box", ...C.glass }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Password"
            style={{ padding:"14px 16px", background:C.card, border:`1px solid ${C.border}`, borderRadius:14, color:C.text, fontFamily:C.fs, fontSize:15, outline:"none", width:"100%", boxSizing:"border-box", ...C.glass }}
          />

          {error && (
            <div style={{ fontFamily:C.fm, fontSize:9, color:C.red, letterSpacing:1, padding:"10px 12px", background:`${C.red}15`, borderRadius:8, lineHeight:1.5 }}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading || !email || !password}
            style={{
              padding:"16px 0", marginTop:4,
              background: (!loading && email && password) ? C.accent : C.card2,
              color: (!loading && email && password) ? "#1a0f06" : C.muted,
              border:"none", borderRadius:22,
              cursor: (!loading && email && password) ? "pointer" : "default",
              fontFamily:C.ff, fontSize:17, fontWeight:800, letterSpacing:3, transition:"all 0.2s",
            }}
          >
            {loading ? "..." : mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
        </div>

        {mode === "signin" && (
          <div style={{ textAlign:"center", marginTop:20 }}>
            <span style={{ fontFamily:C.fm, fontSize:9, color:C.muted }}>No account? </span>
            <button onClick={() => setMode("signup")} style={{ background:"none", border:"none", fontFamily:C.fm, fontSize:9, color:C.accent, cursor:"pointer", letterSpacing:1 }}>SIGN UP</button>
          </div>
        )}
      </div>
    </div>
  );
}
