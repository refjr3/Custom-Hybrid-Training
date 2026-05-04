export const parseExerciseLine = (line) => {
  const raw = String(line || "").trim();
  if (!raw) return { name: "", detail: "" };
  if (raw.includes(" · ")) {
    const [name, ...rest] = raw.split(" · ");
    return { name: name.trim(), detail: rest.join(" · ").trim() };
  }
  const m = raw.match(/^(.*?)(?:\s{2,}|\s+)(\d+\s*[x×].*|.*\/side.*|.*sec.*|.*min.*|@.*|RPE.*)$/i);
  if (m) return { name: m[1].trim(), detail: m[2].trim() };
  return { name: raw, detail: "" };
};

export function normalizeWorkoutBlocks(sessionBlocks, workout) {
  if (Array.isArray(sessionBlocks) && sessionBlocks.length > 0) {
    return sessionBlocks.map((block, bi) => {
      const exercises = Array.isArray(block?.exercises) ? block.exercises : [];
      const items = exercises.map((ex) => {
        if (typeof ex === "string") return parseExerciseLine(ex);
        const name = ex?.name || ex?.exercise || ex?.title || "Exercise";
        const detailParts = [];
        if (ex?.sets) detailParts.push(`${ex.sets}x`);
        if (ex?.reps) detailParts.push(String(ex.reps));
        if (ex?.distance) detailParts.push(String(ex.distance));
        if (ex?.duration) detailParts.push(String(ex.duration));
        if (ex?.target) detailParts.push(String(ex.target));
        if (ex?.note) detailParts.push(String(ex.note));
        return { name, detail: detailParts.join(" · ") };
      });
      return {
        title: String(block?.type || block?.name || `Block ${bi + 1}`).replace(/_/g, " ").toUpperCase(),
        rounds: Number(block?.rounds) || null,
        items: items.filter((i) => i.name),
      };
    });
  }

  const steps = Array.isArray(workout?.steps) ? workout.steps : [];
  if (steps.length === 0) return [];
  const blocks = [];
  let current = { title: "WORKOUT", rounds: null, items: [] };
  steps.forEach((step) => {
    if (typeof step !== "string") return;
    if (step.startsWith("—")) {
      if (current.items.length > 0) blocks.push(current);
      current = { title: step.replace(/—/g, "").trim().toUpperCase() || "WORKOUT", rounds: null, items: [] };
      return;
    }
    const parsed = parseExerciseLine(step);
    if (parsed.name) current.items.push(parsed);
  });
  if (current.items.length > 0) blocks.push(current);
  return blocks;
}
