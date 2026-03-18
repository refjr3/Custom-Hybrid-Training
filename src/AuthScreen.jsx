import { useState } from "react";

const C = {
  bg:"#000000", card:"#1a1a1a", card2:"#222222",
  border:"#2a2a2a", text:"#ffffff", muted:"#888888",
  red:"#FF3C00", green:"#00D4A0",
  ff:"'Bebas Neue','Arial Black',sans-serif",
  fm:"'Space Mono',monospace",
  fs:"'Inter',-apple-system,sans-serif",
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
          <div style={{ fontFamily:C.ff, fontSize:56, color:C.green, lineHeight:0.9, marginBottom:24 }}>CHECK<br/>YOUR<br/>EMAIL</div>
          <div style={{ fontFamily:C.fs, fontSize:14, color:C.muted, lineHeight:1.7 }}>
            We sent a confirmation link to<br/>
            <span style={{ color:C.text, fontFamily:C.fm, fontSize:12 }}>{email}</span>
          </div>
          <div style={{ fontFamily:C.fs, fontSize:13, color:C.muted, marginTop:16 }}>
            Click the link to activate your account, then come back here to sign in.
          </div>
          <button
            onClick={() => { setConfirmSent(false); setMode("signin"); }}
            style={{ marginTop:32, padding:"14px 32px", background:C.card, border:`1px solid ${C.border}`, borderRadius:12, color:C.muted, fontFamily:C.ff, fontSize:16, letterSpacing:3, cursor:"pointer" }}
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
          <div style={{ fontFamily:C.ff, fontSize:56, color:C.text, letterSpacing:2, lineHeight:0.9 }}>HYBRID<br/>TRAINING</div>
          <div style={{ fontFamily:C.fm, fontSize:8, color:C.muted, letterSpacing:4, marginTop:12 }}>PERFORMANCE DASHBOARD</div>
        </div>

        {/* Mode toggle */}
        <div style={{ display:"flex", background:C.card, borderRadius:12, padding:4, marginBottom:24 }}>
          {[["signin","SIGN IN"],["signup","SIGN UP"]].map(([m, label]) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              style={{
                flex:1, padding:"11px 0", fontFamily:C.ff, fontSize:14, letterSpacing:3,
                background: mode===m ? C.green : "transparent",
                color: mode===m ? "#000" : C.muted,
                border:"none", borderRadius:10, cursor:"pointer", transition:"all 0.2s",
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
            style={{ padding:"14px 16px", background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontFamily:C.fs, fontSize:15, outline:"none", width:"100%", boxSizing:"border-box" }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Password"
            style={{ padding:"14px 16px", background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontFamily:C.fs, fontSize:15, outline:"none", width:"100%", boxSizing:"border-box" }}
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
              background: (!loading && email && password) ? C.green : C.card2,
              color: (!loading && email && password) ? "#000" : C.muted,
              border:"none", borderRadius:12,
              cursor: (!loading && email && password) ? "pointer" : "default",
              fontFamily:C.ff, fontSize:18, letterSpacing:3, transition:"all 0.2s",
            }}
          >
            {loading ? "..." : mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
        </div>

        {mode === "signin" && (
          <div style={{ textAlign:"center", marginTop:20 }}>
            <span style={{ fontFamily:C.fm, fontSize:9, color:C.muted }}>No account? </span>
            <button onClick={() => setMode("signup")} style={{ background:"none", border:"none", fontFamily:C.fm, fontSize:9, color:C.green, cursor:"pointer", letterSpacing:1 }}>SIGN UP</button>
          </div>
        )}
      </div>
    </div>
  );
}
