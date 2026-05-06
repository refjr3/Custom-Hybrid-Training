import { useEffect, useMemo, useState } from "react";
import { getSessionIntent } from "./intentConfig.js";

function formatExerciseMeta(exercise) {
  const parts = [];
  if (exercise?.sets != null) parts.push(`${exercise.sets} sets`);
  if (exercise?.reps != null) parts.push(`${exercise.reps} reps`);
  if (exercise?.rounds != null) parts.push(`${exercise.rounds} rounds`);
  if (exercise?.weight) parts.push(String(exercise.weight));
  if (exercise?.distance) parts.push(String(exercise.distance));
  if (exercise?.duration_min != null) parts.push(`${exercise.duration_min} min`);
  if (exercise?.effort) parts.push(String(exercise.effort));
  if (exercise?.rest) parts.push(`rest ${exercise.rest}`);
  return parts.join(" · ");
}

function inferEditableFields(exercise) {
  const fields = [];
  if (exercise?.sets != null) fields.push({ key: "sets", label: "SETS" });
  if (exercise?.reps != null) fields.push({ key: "reps", label: "REPS" });
  if (exercise?.rounds != null) fields.push({ key: "rounds", label: "ROUNDS" });
  if (exercise?.weight != null) fields.push({ key: "weight", label: "WEIGHT" });
  if (exercise?.distance != null) fields.push({ key: "distance", label: "DISTANCE" });
  if (exercise?.duration_min != null) fields.push({ key: "duration_min", label: "DURATION" });
  if (exercise?.effort != null || /\d+%/.test(String(exercise?.details || ""))) {
    fields.push({ key: "effort", label: "EFFORT" });
  }
  if (exercise?.rest != null) fields.push({ key: "rest", label: "REST" });
  if (fields.length === 0) fields.push({ key: "details", label: "DETAILS" });
  return fields;
}

function ExerciseRow({ exercise }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "3px 0", gap: 12 }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{exercise?.name || "Exercise"}</span>
      <span
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.42)",
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
        }}
      >
        {exercise?.details || formatExerciseMeta(exercise)}
      </span>
    </div>
  );
}

function ExerciseEditor({ exercise, onChange }) {
  const fields = inferEditableFields(exercise);
  return (
    <div style={{ padding: "8px 0 6px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
        {exercise?.name || "Exercise"}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {fields.map((field) => (
          <div key={field.key} style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 8,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "1.2px",
                fontWeight: 500,
                marginBottom: 2,
              }}
            >
              {field.label}
            </span>
            <input
              type="text"
              value={exercise?.[field.key] ?? field.default ?? ""}
              onChange={(e) => onChange?.({ ...exercise, [field.key]: e.target.value })}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(201,168,117,0.25)",
                borderRadius: 7,
                padding: "4px 8px",
                fontSize: 11,
                color: "#fff",
                fontVariantNumeric: "tabular-nums",
                minWidth: 56,
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SessionHeroCard({
  day,
  isToday,
  onMarkComplete,
  onSaveEdit,
  onSaveNote,
  onResetComplete,
  completionState,
}) {
  const [editMode, setEditMode] = useState(false);
  const [editedBlocks, setEditedBlocks] = useState([]);
  const [editedNote, setEditedNote] = useState("");

  useEffect(() => {
    setEditMode(false);
    setEditedBlocks(Array.isArray(day?.am_session_blocks) ? JSON.parse(JSON.stringify(day.am_session_blocks)) : []);
    setEditedNote(String(day?.note ?? day?.note2a ?? ""));
  }, [day?.id]);

  const intent = useMemo(
    () => getSessionIntent(day?.am_session_type, day?.am_session),
    [day?.am_session_type, day?.am_session],
  );
  const resolvedCompletion = completionState || (day?.am_completed_at ? { complete: true, source: "manual" } : { complete: false });
  const isCompleted = Boolean(resolvedCompletion?.complete);
  const isManualCompleted = Boolean(day?.am_completed_at);
  const rawBlocks = Array.isArray(day?.am_session_blocks) ? day.am_session_blocks : [];
  const hasBlocks = rawBlocks.length > 0;
  const noteFull = String(day?.note ?? day?.note2a ?? "").trim();
  const blocks = editMode ? editedBlocks : rawBlocks;

  const plannedKey = day?.am_session || day?.am;
  const canMarkComplete =
    !!plannedKey && !String(plannedKey).toUpperCase().includes("REST") && !isCompleted;

  const handleSave = async () => {
    if (hasBlocks) {
      await onSaveEdit?.(editedBlocks);
    } else {
      await onSaveNote?.(editedNote);
    }
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditedBlocks(Array.isArray(day?.am_session_blocks) ? JSON.parse(JSON.stringify(day.am_session_blocks)) : []);
    setEditedNote(String(day?.note ?? day?.note2a ?? ""));
    setEditMode(false);
  };

  return (
    <div
      style={{
        background: "rgba(201,168,117,0.07)",
        border: "1px solid rgba(201,168,117,0.35)",
        borderRadius: 18,
        padding: "22px 22px 20px",
        marginTop: 18,
        marginBottom: 28,
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 8,
            letterSpacing: "2px",
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: 10,
            color: intent.color,
            background: intent.bgTint,
          }}
        >
          {String(intent.label || "").toUpperCase()}
          {day?.is_user_modified ? " · ✏️" : ""}
        </span>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", fontWeight: 500, letterSpacing: "2px" }}>
          {String(day?.day_name || day?.day || "").toUpperCase()}
        </span>
        {isToday ? (
          <span style={{ fontSize: 8, color: "#C9A875", fontWeight: 500, letterSpacing: "2px", marginLeft: "auto" }}>
            TODAY
          </span>
        ) : null}
        {!editMode ? (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            style={{
              marginLeft: isToday ? 8 : "auto",
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "1.4px",
              padding: "3px 8px",
              borderRadius: 8,
              color: "rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ✎ EDIT
          </button>
        ) : (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "1.4px",
              padding: "3px 8px",
              borderRadius: 8,
              color: "#C9A875",
              background: "rgba(201,168,117,0.1)",
              border: "0.5px solid rgba(201,168,117,0.3)",
            }}
          >
            ✎ EDITING
          </span>
        )}
      </div>

      <div
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 26,
          color: "#fff",
          letterSpacing: "-0.5px",
          lineHeight: 1.15,
          marginTop: 6,
        }}
      >
        {day?.am_session || "Session"}
      </div>

      {editMode && !hasBlocks ? (
        <textarea
          value={editedNote}
          onChange={(e) => setEditedNote(e.target.value)}
          style={{
            width: "100%",
            minHeight: 200,
            marginTop: 12,
            boxSizing: "border-box",
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
          }}
        />
      ) : hasBlocks ? (
        blocks.map((block, blockIdx) => (
          <div
            key={`${day?.id || "day"}_block_${blockIdx}`}
            style={{
              marginTop: 14,
              paddingTop: 13,
              borderTop: "0.5px solid rgba(201,168,117,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 8,
                color: "rgba(201,168,117,0.6)",
                letterSpacing: "2px",
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              <span>
                {String(block?.type || "").toUpperCase()}
                {block?.note ? ` · ${block.note}` : ""}
              </span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>
                {block?.duration_min ? `${block.duration_min} MIN` : ""}
              </span>
            </div>
            {(block?.exercises || []).map((exercise, exIdx) => {
              if (!editMode) {
                return (
                  <ExerciseRow
                    key={`${day?.id || "day"}_${blockIdx}_${exIdx}`}
                    exercise={exercise}
                  />
                );
              }
              return (
                <ExerciseEditor
                  key={`${day?.id || "day"}_${blockIdx}_${exIdx}`}
                  exercise={exercise}
                  onChange={(updated) => {
                    setEditedBlocks((prev) => {
                      const next = Array.isArray(prev) ? [...prev] : [];
                      next[blockIdx] = { ...(next[blockIdx] || {}), exercises: [...(next[blockIdx]?.exercises || [])] };
                      next[blockIdx].exercises[exIdx] = updated;
                      return next;
                    });
                  }}
                />
              );
            })}
          </div>
        ))
      ) : noteFull ? (
        <div
          style={{
            marginTop: 14,
            paddingTop: 13,
            borderTop: "0.5px solid rgba(201,168,117,0.15)",
            fontSize: 13,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {day?.note ?? day?.note2a}
        </div>
      ) : (
        <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
          No detailed plan for this session.
        </div>
      )}

      {editMode ? (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              flex: 1,
              padding: 11,
              background: "transparent",
              border: "0.5px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              fontSize: 12,
              color: "rgba(255,255,255,0.55)",
              fontWeight: 500,
              letterSpacing: "0.3px",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              flex: 1,
              padding: 11,
              background: "rgba(201,168,117,0.15)",
              border: "0.5px solid rgba(201,168,117,0.4)",
              borderRadius: 12,
              fontSize: 12,
              color: "#C9A875",
              fontWeight: 500,
              letterSpacing: "0.3px",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            SAVE CHANGES
          </button>
        </div>
      ) : canMarkComplete ? (
        <button
          type="button"
          onClick={onMarkComplete}
          style={{
            width: "100%",
            marginTop: 14,
            padding: 11,
            background: "rgba(201,168,117,0.1)",
            border: "1px solid rgba(201,168,117,0.4)",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            color: "#C9A875",
            letterSpacing: "0.3px",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          ✓ Mark complete
        </button>
      ) : isCompleted ? (
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "rgba(120,200,180,0.7)" }}>
            {resolvedCompletion?.auto
              ? `✓ Detected from ${String(resolvedCompletion.source || "activity").toUpperCase()}`
              : "✓ Completed"}
          </div>
          {isManualCompleted ? (
            <button
              type="button"
              onClick={onResetComplete}
              style={{
                border: "0.5px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.72)",
                borderRadius: 8,
                padding: "2px 7px",
                fontSize: 10,
                letterSpacing: "0.2px",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              ↺ Reset
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
