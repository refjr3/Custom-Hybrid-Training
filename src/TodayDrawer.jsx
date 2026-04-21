import { useState, useEffect } from "react";

function numOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function DrawerMenu({
  profile,
  session,
  setDrawerSection,
  onClose,
  supabase,
  planVariants,
  activeVariantId,
}) {
  const displayName = profile?.full_name || profile?.name || "Athlete";
  const email = session?.user?.email || "";
  const activeMenuVariant =
    (planVariants || []).find((v) => v.id === activeVariantId) ||
    (planVariants || []).find((v) => v.is_active);
  const initials =
    (profile?.full_name || profile?.name || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 3) || "TL";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "56px 24px 24px" }}>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Signed in as
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#fff",
            letterSpacing: "-0.5px",
          }}
        >
          {displayName}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{email}</div>
      </div>

      <div
        style={{
          marginLeft: 24,
          marginBottom: 24,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(201,168,117,0.15)",
          border: "1px solid rgba(201,168,117,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Serif Display',serif",
          fontSize: 20,
          color: "#C9A875",
        }}
      >
        {initials}
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 24px 8px" }} />

      {[
        { icon: "◎", label: "My Profile", section: "profile" },
        {
          icon: "◇",
          label: "Plans",
          section: "plans",
          description: activeMenuVariant?.variant_name || "No active plan",
        },
        { icon: "⬡", label: "Connections", section: "connections" },
        { icon: "◈", label: "The Lab AI", section: "ai" },
        { icon: "◉", label: "Preferences", section: "preferences" },
        { icon: "▦", label: "Settings", section: "settings" },
        { icon: "▲", label: "About", section: "about" },
      ].map((item) => (
        <button
          key={item.section}
          type="button"
          onClick={() => setDrawerSection(item.section)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 24px",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
          }}
        >
          <span style={{ fontSize: 16, color: "rgba(201,168,117,0.6)", width: 20, flexShrink: 0 }}>{item.icon}</span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                letterSpacing: "-0.2px",
              }}
            >
              {item.label}
            </span>
            {item.description ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.35)",
                  marginTop: 2,
                  letterSpacing: "-0.1px",
                  lineHeight: 1.3,
                  textAlign: "left",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.description}
              </span>
            ) : null}
          </span>
          <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.2)", fontSize: 16, flexShrink: 0 }}>›</span>
        </button>
      ))}

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 24px" }} />

      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          onClose();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 24px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
        }}
      >
        <span style={{ fontSize: 15, color: "rgba(255,59,48,0.6)", fontWeight: 500 }}>Sign Out</span>
      </button>

      <div
        style={{
          marginTop: "auto",
          padding: "24px",
          fontSize: 9,
          color: "rgba(255,255,255,0.1)",
          letterSpacing: "2px",
        }}
      >
        THE LAB · v1.0.0
      </div>
    </div>
  );
}

function DrawerProfile({ profile, session, setDrawerSection, supabase, setProfile }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    date_of_birth: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    target_race_date: "",
    hyrox_division: "",
    training_experience: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name || profile.name || "",
      email: session?.user?.email || "",
      date_of_birth: profile.date_of_birth || profile.dob || "",
      gender: profile.gender || profile.sex || "",
      height_cm:
        profile.height_cm != null && profile.height_cm !== ""
          ? String(profile.height_cm)
          : profile.height_in != null
            ? String(Math.round(Number(profile.height_in) * 2.54))
            : "",
      weight_kg:
        profile.weight_kg != null && profile.weight_kg !== ""
          ? String(profile.weight_kg)
          : profile.weight_lbs != null
            ? String(Math.round((Number(profile.weight_lbs) / 2.20462) * 10) / 10)
            : "",
      target_race_date: profile.target_race_date || "",
      hyrox_division: profile.hyrox_division || "",
      training_experience: profile.training_experience || "",
    });
  }, [profile, session?.user?.email]);

  const save = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    const hcm = numOrNull(form.height_cm);
    const wkg = numOrNull(form.weight_kg);
    const payload = {
      name: (form.full_name || "").trim() || profile?.name || "Athlete",
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      height_cm: hcm,
      weight_kg: wkg,
      target_race_date: form.target_race_date || null,
      hyrox_division: form.hyrox_division || null,
      training_experience: form.training_experience || null,
    };
    const { data, error } = await supabase.from("user_profiles").update(payload).eq("user_id", session.user.id).select().single();
    setSaving(false);
    if (error) {
      console.error("[DrawerProfile]", error);
      return;
    }
    if (data) setProfile(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 20px" }}>
        <button
          type="button"
          onClick={() => setDrawerSection("menu")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.4)",
            fontSize: 20,
            padding: "4px",
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" }}>My Profile</div>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { label: "Full Name", key: "full_name", type: "text" },
          { label: "Email", key: "email", type: "email", readOnly: true },
          { label: "Date of Birth", key: "date_of_birth", type: "date" },
          {
            label: "Gender",
            key: "gender",
            type: "select",
            options: ["Male", "Female", "Other", "Prefer not to say"],
          },
          { label: "Height (cm)", key: "height_cm", type: "number" },
          { label: "Weight (kg)", key: "weight_kg", type: "number" },
          { label: "Target race date", key: "target_race_date", type: "date" },
          {
            label: "HYROX Division",
            key: "hyrox_division",
            type: "select",
            options: ["Open", "Pro", "Masters 40+", "Masters 50+", "Doubles Open", "Doubles Pro"],
          },
          {
            label: "Training Experience",
            key: "training_experience",
            type: "select",
            options: ["Beginner (<1yr)", "Intermediate (1-3yr)", "Advanced (3-5yr)", "Elite (5yr+)"],
          },
        ].map((field) => (
          <div key={field.key}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "rgba(255,255,255,0.22)",
                letterSpacing: "2px",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {field.label}
            </div>
            {field.type === "select" ? (
              <select
                value={form[field.key]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                style={inputStyle}
              >
                <option value="">Select...</option>
                {field.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                value={form[field.key]}
                readOnly={field.readOnly}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                style={{
                  ...inputStyle,
                  opacity: field.readOnly ? 0.65 : 1,
                }}
              />
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={save}
          style={{
            marginTop: 8,
            background: saved ? "rgba(93,255,160,0.12)" : "rgba(201,168,117,0.12)",
            border: `1px solid ${saved ? "rgba(93,255,160,0.3)" : "rgba(201,168,117,0.25)"}`,
            borderRadius: 14,
            padding: "13px",
            fontSize: 13,
            fontWeight: 600,
            color: saved ? "#5dffa0" : "#C9A875",
            cursor: "pointer",
            letterSpacing: "0.5px",
          }}
        >
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

function DrawerPlans({ setDrawerSection, planVariants, activeVariantId, onSwitchVariant, onStartNewPlan }) {
  const activeVariant =
    planVariants?.find((v) => v.id === activeVariantId) || planVariants?.find((v) => v.is_active);
  const activeId = activeVariant?.id ?? activeVariantId;
  const otherVariants = (planVariants || []).filter((v) => v.id !== activeId);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 16px" }}>
        <button
          type="button"
          onClick={() => setDrawerSection("menu")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.4)",
            fontSize: 20,
            padding: "4px",
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" }}>Plans</div>
      </div>
      <div style={{ padding: "0 22px 24px" }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(201,168,117,0.6)",
            letterSpacing: "2.5px",
            marginBottom: 16,
          }}
        >
          ACTIVE PLAN
        </div>

        {activeVariant ? (
          <div
            style={{
              background: "rgba(201,168,117,0.08)",
              border: "1px solid rgba(201,168,117,0.25)",
              borderRadius: 16,
              padding: "16px 18px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 18,
                color: "#fff",
                letterSpacing: "-0.3px",
                marginBottom: 6,
              }}
            >
              {activeVariant.variant_name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {activeVariant.block_length_weeks ? `${activeVariant.block_length_weeks} weeks` : "Custom length"}
              {activeVariant.variant_source
                ? ` · ${activeVariant.variant_source === "ai_generated" ? "AI generated" : "Manual"}`
                : ""}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "20px",
              marginBottom: 24,
              textAlign: "center",
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            No plan yet — let's build one
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onClose?.();
            onStartNewPlan?.();
          }}
          style={{
            width: "100%",
            background: "rgba(201,168,117,0.12)",
            border: "1px solid rgba(201,168,117,0.35)",
            borderRadius: 14,
            padding: "14px",
            color: "#C9A875",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.3px",
            marginBottom: 24,
          }}
        >
          Build a new plan
        </button>

        {otherVariants.length > 0 && (
          <>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "2.5px",
                marginBottom: 12,
                marginTop: 8,
              }}
            >
              OTHER PLANS
            </div>
            {otherVariants.map((v) => (
              <div
                key={v.id}
                role="button"
                tabIndex={0}
                onClick={() => onSwitchVariant(v.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSwitchVariant(v.id);
                  }
                }}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  marginBottom: 8,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.8)",
                    fontWeight: 500,
                    marginBottom: 3,
                  }}
                >
                  {v.variant_name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {v.block_length_weeks ? `${v.block_length_weeks} weeks` : "Custom"}
                  {" · Switch to activate"}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function DrawerConnections({
  setDrawerSection,
  whoopConnected,
  garminConnected: _garminConnected,
  stravaConnected,
  session,
  profile,
}) {
  const uid = session?.user?.id;
  const stravaHref = uid ? `/api/strava/login?uid=${encodeURIComponent(uid)}` : "/api/strava/login";
  const whoopNeedsReconnect = Boolean(profile?.connected_sources?.whoop?.needs_reconnect);
  const whoopStatusOk = Boolean(whoopConnected) && !whoopNeedsReconnect;

  const connectCardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: "16px 18px",
  };

  const renderConnectCard = (c) => (
    <div key={c.name} style={connectCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{c.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: c.status ? c.color : "rgba(255,255,255,0.2)",
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: c.status ? c.color : "rgba(255,255,255,0.3)",
              letterSpacing: "1px",
            }}
          >
            {c.status ? "CONNECTED" : "NOT CONNECTED"}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>{c.desc}</div>
      <a
        href={c.connectUrl}
        style={{
          display: "inline-block",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "7px 14px",
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.5)",
          textDecoration: "none",
        }}
      >
        {c.status ? "Manage / reconnect →" : "Connect →"}
      </a>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 24px" }}>
        <button
          type="button"
          onClick={() => setDrawerSection("menu")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.4)",
            fontSize: 20,
            padding: "4px",
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" }}>Connections</div>
      </div>
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {renderConnectCard({
          name: "WHOOP",
          status: whoopStatusOk,
          connectUrl: "/api/auth/login",
          color: "#5dffa0",
          desc: "Recovery, HRV, sleep data",
        })}
        {whoopNeedsReconnect && (
          <a
            href="/api/auth/login"
            style={{
              display: "block",
              background: "rgba(255,107,107,0.08)",
              border: "1px solid rgba(255,107,107,0.2)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 12,
              color: "#FF6B6B",
              marginTop: 8,
              textDecoration: "none",
            }}
          >
            WHOOP session expired — tap to reconnect
          </a>
        )}
        {/* Garmin — coming soon (developer API not accepting new apps) */}
        <div style={{ ...connectCardStyle, opacity: 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Garmin</div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "1px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                padding: "3px 10px",
              }}
            >
              COMING SOON
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            Activities, VO2 Max, structured workouts. Available when Garmin opens their API.
          </div>
        </div>
        {renderConnectCard({
          name: "Strava",
          status: stravaConnected,
          connectUrl: stravaHref,
          color: "#FC4C02",
          desc: "Running PRs, best efforts, segments",
        })}
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", padding: "8px 0", lineHeight: 1.6 }}>
          Your data is never shared or sold. Connections are used only to power your training insights.
        </div>
      </div>
    </div>
  );
}

function DrawerAI({ profile, setDrawerSection, supabase, session, setProfile }) {
  const [tone, setTone] = useState(profile?.ai_tone || "direct");
  const [focus, setFocus] = useState(profile?.ai_focus || "performance");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTone(profile?.ai_tone || "direct");
    setFocus(profile?.ai_focus || "performance");
  }, [profile?.ai_tone, profile?.ai_focus]);

  const saveAi = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ ai_tone: tone, ai_focus: focus })
      .eq("user_id", session.user.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      console.error("[DrawerAI]", error);
      return;
    }
    if (data) setProfile(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 24px" }}>
        <button
          type="button"
          onClick={() => setDrawerSection("menu")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.4)",
            fontSize: 20,
            padding: "4px",
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" }}>The Lab AI</div>
      </div>
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(255,255,255,0.22)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Coach Tone
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { key: "direct", label: "Direct", desc: "No fluff. Just the data and what to do." },
              { key: "coaching", label: "Coaching", desc: "Motivating with context and reasoning." },
              { key: "detailed", label: "Detailed", desc: "Full explanation of every recommendation." },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTone(t.key)}
                style={{
                  textAlign: "left",
                  background: tone === t.key ? "rgba(201,168,117,0.1)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${tone === t.key ? "rgba(201,168,117,0.3)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: tone === t.key ? "#C9A875" : "rgba(255,255,255,0.6)",
                    marginBottom: 3,
                  }}
                >
                  {t.label}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(255,255,255,0.22)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Primary Focus
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Performance", "Recovery", "Longevity", "Race Prep", "Balance"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFocus(f.toLowerCase())}
                style={{
                  background: focus === f.toLowerCase() ? "rgba(201,168,117,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${focus === f.toLowerCase() ? "rgba(201,168,117,0.3)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 20,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: focus === f.toLowerCase() ? "#C9A875" : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(255,255,255,0.22)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Morning Brief
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            {[
              ["Deliver at", "6:30 AM"],
              ["Include HRV", "On"],
              ["Include plan", "On"],
              ["Race focus", "On"],
            ].map(([label, val], i, arr) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#C9A875" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={saveAi}
          style={{
            background: saved ? "rgba(93,255,160,0.1)" : "rgba(201,168,117,0.1)",
            border: `1px solid ${saved ? "rgba(93,255,160,0.25)" : "rgba(201,168,117,0.2)"}`,
            borderRadius: 14,
            padding: "13px",
            fontSize: 13,
            fontWeight: 600,
            color: saved ? "#5dffa0" : "#C9A875",
            cursor: "pointer",
          }}
        >
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save AI Preferences"}
        </button>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

function DrawerPreferences({ setDrawerSection }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 24px" }}>
        <button
          type="button"
          onClick={() => setDrawerSection("menu")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.4)",
            fontSize: 20,
            padding: "4px",
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" }}>Preferences</div>
      </div>
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "rgba(255,255,255,0.22)",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Heart Rate Zones
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {[
            ["Z1 Recovery", "<120 bpm"],
            ["Z2 Aerobic", "120–148 bpm"],
            ["Z3 Tempo", "149–162 bpm"],
            ["Z4 Threshold", "163–175 bpm"],
            ["Z5 Max", "175+ bpm"],
          ].map(([z, r], i, arr) => (
            <div
              key={z}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "11px 14px",
                borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{z}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#C9A875" }}>{r}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "rgba(255,255,255,0.22)",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginTop: 8,
            marginBottom: 4,
          }}
        >
          Units
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {[
            ["Distance", "km / miles"],
            ["Weight", "kg / lbs"],
            ["Temperature", "°F / °C"],
          ].map(([label, opts], i, arr) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{label}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{opts}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "rgba(255,255,255,0.22)",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginTop: 8,
            marginBottom: 4,
          }}
        >
          Notifications
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {[
            ["Morning brief", "6:30 AM"],
            ["Session reminder", "1hr before"],
            ["WHOOP gate alerts", "On"],
            ["Weekly summary", "Sunday PM"],
          ].map(([label, val], i, arr) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#C9A875" }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

function DrawerSettings({ setDrawerSection }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 24px" }}>
        <button
          type="button"
          onClick={() => setDrawerSection("menu")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.4)",
            fontSize: 20,
            padding: "4px",
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" }}>Settings</div>
      </div>
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          {
            label: "Reset Training Plan",
            desc: "Re-seed your plan from scratch (admin / server only)",
            color: "rgba(255,170,68,0.6)",
            action: () => {
              if (!confirm("Reset plan? This is not available in the app yet — use your deployment seed script or ask an admin.")) return;
            },
          },
          {
            label: "Clear Session Logs",
            desc: "Wipe all logged sessions",
            color: "rgba(255,59,48,0.6)",
            action: () => {
              if (!confirm("Clear all logs? This action is not wired yet.")) return;
            },
          },
          {
            label: "Export My Data",
            desc: "Download all your data as JSON",
            color: "rgba(255,255,255,0.4)",
            action: () => {
              window.alert("Export is not wired yet.");
            },
          },
          {
            label: "Delete Account",
            desc: "Permanently delete account and all data",
            color: "rgba(255,59,48,0.5)",
            action: () => {
              if (!confirm("This cannot be undone. Delete account?")) return;
              window.alert("Account deletion must be done from Supabase Auth / support.");
            },
          },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={s.action}
            style={{
              textAlign: "left",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              padding: "14px 16px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: s.color, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{s.desc}</div>
          </button>
        ))}

        <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.12)", lineHeight: 1.6 }}>
          App Version 1.0.0 · HYROX Washington DC Sep 5, 2026
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

function DrawerAbout({ setDrawerSection }) {
  return (
    <div style={{ padding: "52px 24px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <button
          type="button"
          onClick={() => setDrawerSection("menu")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.4)",
            fontSize: 20,
            padding: "4px",
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" }}>About</div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 32, lineHeight: 1, letterSpacing: "-1px", marginBottom: 6 }}>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: "#fff" }}>The </span>
          <em style={{ fontFamily: "'DM Serif Display',serif", fontStyle: "italic", color: "rgba(255,255,255,0.9)" }}>Lab</em>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: "#fff" }}>.</span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          Hybrid Athlete Performance OS
        </div>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 24 }}>
        Built for hybrid athletes who take their training seriously. The Lab connects your biometric data, training plan,
        and AI coaching into one place — so you always know exactly where you are and what to do next.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          ["Version", "1.0.0"],
          ["Build", "Production"],
          ["Target Race", "HYROX DC · Sep 5, 2026"],
          ["Stack", "React · Supabase · Vercel · Claude AI"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{k}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TodayDrawer({
  open,
  onClose,
  section,
  setSection,
  profile,
  setProfile,
  session,
  supabase,
  whoopConnected,
  garminConnected,
  stravaConnected,
  setShowPlanIntake,
  planVariants,
  activeVariantId,
  onSwitchVariant,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const closeAll = () => {
    setSection("menu");
    onClose();
  };

  return (
    <>
      <div
        role="presentation"
        onClick={closeAll}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 200,
        }}
      />
      <div
        className="drawer-panel"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "82%",
          maxWidth: 320,
          background: "linear-gradient(160deg, rgba(30,28,25,0.98) 0%, rgba(18,16,14,0.99) 100%)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15) 50%,transparent)",
            pointerEvents: "none",
          }}
        />

        {section === "menu" && (
          <DrawerMenu
            profile={profile}
            session={session}
            setDrawerSection={setSection}
            onClose={closeAll}
            supabase={supabase}
            planVariants={planVariants}
            activeVariantId={activeVariantId}
          />
        )}
        {section === "profile" && (
          <DrawerProfile
            profile={profile}
            session={session}
            setDrawerSection={setSection}
            supabase={supabase}
            setProfile={setProfile}
          />
        )}
        {section === "plans" && (
          <DrawerPlans
            setDrawerSection={setSection}
            planVariants={planVariants}
            activeVariantId={activeVariantId}
            onSwitchVariant={onSwitchVariant}
            onStartNewPlan={() => {
              onClose?.();
              setShowPlanIntake?.(true);
            }}
          />
        )}
        {section === "connections" && (
          <DrawerConnections
            setDrawerSection={setSection}
            whoopConnected={whoopConnected}
            garminConnected={garminConnected}
            stravaConnected={stravaConnected}
            session={session}
            profile={profile}
          />
        )}
        {section === "ai" && (
          <DrawerAI
            profile={profile}
            setDrawerSection={setSection}
            supabase={supabase}
            session={session}
            setProfile={setProfile}
          />
        )}
        {section === "preferences" && <DrawerPreferences setDrawerSection={setSection} />}
        {section === "settings" && <DrawerSettings setDrawerSection={setSection} />}
        {section === "about" && <DrawerAbout setDrawerSection={setSection} />}
      </div>
    </>
  );
}
