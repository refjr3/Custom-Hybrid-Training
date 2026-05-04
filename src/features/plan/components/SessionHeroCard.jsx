import { useState, useEffect, useCallback } from "react";
import { normalizeWorkoutBlocks } from "../lib/normalizeWorkoutBlocks.js";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function SessionHeroCard({
  day,
  sess,
  theme,
  selectedMeta,
  detailTitle,
  selectedWorkout,
  selectedWhoopGate,
  selectedWhoopRule,
  supabase,
  authSession,
  onSaved,
  onMarkComplete,
  onOpenBlockEditor,
  completed,
}) {
  const { C, glassCard, specularTop, DS } = theme;
  const blocksRaw = sess === "am" ? day?.am_session_blocks : day?.pm_session_blocks;
  const blocks = blocksRaw || [];
  const hasBlocks = Array.isArray(blocks) && blocks.length > 0;
  const noteText = (day?.note ?? day?.note2a ?? "").trim();
  const hasNote = noteText.length > 0;

  const [editMode, setEditMode] = useState(false);
  const [editedNote, setEditedNote] = useState(noteText);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setEditedNote((day?.note ?? day?.note2a ?? "").trim());
  }, [day?.id, day?.note, day?.note2a]);

  const displayBlocks = normalizeWorkoutBlocks(blocks, selectedWorkout);

  const persistDay = useCallback(
    async (payload) => {
      if (!supabase || !authSession?.access_token || !day?.id) return;
      const userId = authSession?.user?.id;
      if (!userId) return;
      const { data: vRow } = await supabase
        .from("plan_variants")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      const activeVid = vRow?.id ?? null;
      let q = supabase.from("training_days").update(payload).eq("id", day.id).eq("user_id", userId);
      q = activeVid ? q.or(`variant_id.eq.${activeVid},variant_id.is.null`) : q.is("variant_id", null);
      const { error } = await q;
      if (error) throw error;
    },
    [supabase, authSession, day?.id]
  );

  const saveNoteOnly = async () => {
    setSaving(true);
    setToast(null);
    try {
      await persistDay({
        note: editedNote,
        is_user_modified: true,
      });
      setToast("✓ Saved");
      setEditMode(false);
      if (onSaved) onSaved();
      setTimeout(() => setToast(null), 1600);
    } catch (e) {
      setToast(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const showWhoop = !!(selectedWhoopGate && selectedWhoopRule);
  const slotSessionName = sess === "pm" ? (day?.pm || day?.pm_session) : (day?.am || day?.am_session);
  const showMarkCompleteBtn =
    !!onMarkComplete &&
    !completed &&
    !!day &&
    !!slotSessionName &&
    !String(slotSessionName).toUpperCase().includes("REST");

  return (
    <div style={{ ...glassCard, marginTop: 16, marginBottom: 0, overflow: "hidden" }}>
      <div style={specularTop()} />
      <div style={{ padding: "14px 14px 16px", display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: C.fm,
                fontSize: 8,
                color: selectedMeta.color,
                letterSpacing: 2,
                textTransform: "uppercase",
                background: `${selectedMeta.color}22`,
                border: `1px solid ${selectedMeta.color}55`,
                borderRadius: 4,
                padding: "2px 8px",
              }}
            >
              {selectedMeta.tag}
            </span>
            {day?.ai_modified && (
              <span style={{ fontFamily: C.fm, fontSize: 8, color: "#9b59b6", letterSpacing: 2, textTransform: "uppercase" }}>✦ AI MODIFIED</span>
            )}
            {completed && (
              <span style={{ fontFamily: C.fm, fontSize: 8, color: C.green, letterSpacing: 2, textTransform: "uppercase" }}>COMPLETED</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {hasBlocks && onOpenBlockEditor && (
              <button
                type="button"
                onClick={onOpenBlockEditor}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  color: DS?.gold || "#C9A875",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Edit exercises"
              >
                ✏️
              </button>
            )}
            {!hasBlocks && (
              <button
                type="button"
                onClick={() => {
                  if (editMode) {
                    setEditedNote(noteText);
                    setEditMode(false);
                  } else {
                    setEditedNote(noteText);
                    setEditMode(true);
                  }
                }}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  color: C.cyan,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title={editMode ? "Cancel edit" : "Edit note"}
              >
                ✏️
              </button>
            )}
          </div>
        </div>

        <div style={{ fontFamily: C.ff, fontSize: 24, color: C.text, lineHeight: 1.1, letterSpacing: 0.6 }}>{detailTitle}</div>

        {editMode && !hasBlocks && (
          <div>
            <textarea
              value={editedNote}
              onChange={(e) => setEditedNote(e.target.value)}
              style={{
                width: "100%",
                minHeight: 200,
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(201,168,117,0.25)",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 13,
                color: "#fff",
                fontFamily: "inherit",
                lineHeight: 1.6,
                resize: "vertical",
                whiteSpace: "pre-wrap",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setEditedNote(noteText);
                  setEditMode(false);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: "transparent",
                  color: C.muted,
                  cursor: "pointer",
                  fontFamily: C.ff,
                  fontSize: 11,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveNoteOnly}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: "none",
                  background: C.green,
                  color: "#000",
                  cursor: saving ? "default" : "pointer",
                  fontFamily: C.ff,
                  fontSize: 11,
                }}
              >
                {saving ? "…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {!editMode && (
          <>
            {hasBlocks ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {displayBlocks.map((section, si) => (
                  <div key={si}>
                    <div style={{ fontFamily: C.fm, fontSize: 8, color: C.light, letterSpacing: 3, marginBottom: 8 }}>
                      {section.title}
                      {section.rounds ? ` · ${section.rounds} rounds` : ""}
                    </div>
                    {section.items.map((item, ii) => (
                      <div
                        key={ii}
                        style={{
                          display: "flex",
                          gap: 14,
                          padding: "11px 14px",
                          background: C.card,
                          borderRadius: 12,
                          borderLeft: `3px solid ${selectedMeta.color}`,
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontFamily: C.ff, fontSize: 11, color: C.light, minWidth: 22, marginTop: 1 }}>
                          {String(ii + 1).padStart(2, "0")}
                        </span>
                        <div style={{ fontFamily: C.fs, fontSize: 14, color: C.text, lineHeight: 1.5 }}>
                          <div>{item.name}</div>
                          {item.detail ? <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{item.detail}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : hasNote ? (
              <div
                style={{
                  marginTop: 4,
                  paddingTop: 13,
                  borderTop: "0.5px solid rgba(201,168,117,0.15)",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.85)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  fontFamily: C.fs,
                }}
              >
                {day?.note ?? day?.note2a}
              </div>
            ) : (
              <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.4)", fontStyle: "italic", fontFamily: C.fs }}>
                No detailed plan for this session.
              </div>
            )}

            {day?.ai_modification_note ? (
              <div style={{ fontFamily: C.fs, fontSize: 13, color: "#aaa", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{day.ai_modification_note}</div>
            ) : null}
          </>
        )}

        {showWhoop && (
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontFamily: C.fm, fontSize: 9, color: C.cyan, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
              WHOOP GATE RULES · {selectedWhoopGate}
            </div>
            <div style={{ fontFamily: C.fs, fontSize: 12, color: C.muted, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {selectedWhoopRule || "Green: Execute as programmed.\nYellow: Reduce 30–40% volume.\nRed: Full rest."}
            </div>
          </div>
        )}

        {showMarkCompleteBtn && (
          <button
            type="button"
            onClick={() => onMarkComplete(day)}
            style={{
              marginTop: 4,
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${DS?.gold || "#C9A875"}44`,
              background: "rgba(201,168,117,0.08)",
              color: DS?.gold || "#C9A875",
              fontFamily: C.ff,
              fontSize: 12,
              letterSpacing: 2,
              cursor: "pointer",
            }}
          >
            MARK COMPLETE
          </button>
        )}

        {toast && (
          <div style={{ fontFamily: C.fm, fontSize: 10, color: toast.startsWith("✓") ? C.green : C.red, letterSpacing: 1 }}>{toast}</div>
        )}
      </div>
    </div>
  );
}
