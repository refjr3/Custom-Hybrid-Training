import { parseExerciseLine as parseExerciseLineHelper } from "./lib/normalizeWorkoutBlocks.js";

function cleanLine(line) {
  return String(line || "").replace(/\r/g, "").trim();
}

function toUpperWords(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function splitSessionName(sessionName) {
  const raw = String(sessionName || "").trim();
  if (!raw) return { kicker: "", headline: "" };
  const match = raw.match(/^(.+?)\s+[—-]\s+(.+)$/);
  if (!match) return { kicker: raw, headline: "" };
  return {
    kicker: match[1].trim(),
    headline: match[2].trim(),
  };
}

function formatPhase(phase) {
  const upper = toUpperWords(phase);
  if (!upper) return "";
  return upper.endsWith("PHASE") ? upper : `${upper} PHASE`;
}

function formatDurationLabel(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const min = text.match(/(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:min|mins|minute|minutes)\b/i);
  if (min) {
    const left = min[1];
    const right = min[2];
    return right ? `${left}-${right} MIN` : `${left} MIN`;
  }
  const sec = text.match(/(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:sec|second|seconds)\b/i);
  if (sec) {
    const left = sec[1];
    const right = sec[2];
    return right ? `${left}-${right} SEC` : `${left} SEC`;
  }
  return toUpperWords(text);
}

function parseHeader(line) {
  const text = cleanLine(line);
  const match = text.match(/^([A-Z][A-Z0-9+\s/&-]*?)(?:\s*\(([^)]+)\))?:\s*$/);
  if (!match) return null;
  return {
    label: toUpperWords(match[1]),
    duration: formatDurationLabel(match[2] || ""),
  };
}

function parseExerciseLine(line) {
  const source = cleanLine(line);
  if (!source) return null;

  const parsed = parseExerciseLineHelper(source);
  const tokenMatch = source.match(/(\d+)\s*[x×]\s*(\d+|max)(?:\s*(ea|sec|s|min|m))?/i);
  if (!tokenMatch) return null;

  const token = tokenMatch[0];
  const tokenIdx = source.indexOf(token);
  const helperName = cleanLine(parsed?.name || "");
  const name = cleanLine(source.slice(0, tokenIdx)) || helperName;
  if (!name) return null;

  const setCount = tokenMatch[1];
  const repCount = tokenMatch[2];
  const rawQualifier = String(tokenMatch[3] || "").toLowerCase();
  const unitQualifier = rawQualifier === "sec" ? "s" : rawQualifier;

  const after = source.slice(tokenIdx + token.length).trim();
  const extraEa = /^ea\b/i.test(after) ? " ea" : "";

  const sets = `${setCount} × ${repCount}${unitQualifier ? ` ${unitQualifier}` : ""}${extraEa}`.trim();

  const note = after
    .replace(/^ea\b/i, "")
    .replace(/^[\s—–-]+/, "")
    .trim();

  return {
    name,
    sets,
    note: note || null,
  };
}

function inferEffortBlock(label, lines) {
  const body = lines.map(cleanLine).filter(Boolean);
  const joined = body.join(" ");
  const lower = joined.toLowerCase();

  const hrMatch = joined.match(/HR\s*(\d{2,3})\s*[-–]\s*(\d{2,3})(?:\s*bpm)?/i);
  const capMatch = joined.match(/Cap at ([^.!\n]+)/i);
  const rpeMatch = joined.match(
    /(comfortably hard effort|very easy|easy|moderate|hard effort|all[- ]out|conversational pace)/i,
  );

  const knownModalities = [
    { key: "row", label: "Row" },
    { key: "ski", label: "Ski" },
    { key: "echo bike", label: "Echo Bike" },
    { key: "run", label: "Run" },
  ];
  let modalities = knownModalities
    .filter((m) => lower.includes(m.key))
    .map((m) => m.label)
    .filter((value, index, arr) => arr.indexOf(value) === index);
  if (/\bbike\b/i.test(joined) && !/echo bike/i.test(joined)) modalities = [...modalities, "Bike"];

  let primary = body[0] || "Workout effort";
  let introRemainder = "";
  const introSplit = primary.split(/\s+[—-]\s+/);
  if (introSplit.length > 1) {
    primary = introSplit[0].trim();
    introRemainder = introSplit.slice(1).join(" — ").trim();
  }
  if (primary.endsWith(":")) primary = primary.slice(0, -1).trim();

  const coachingParts = [];
  if (introRemainder) coachingParts.push(introRemainder);
  if (body.length > 1) coachingParts.push(...body.slice(1));
  const coachingNote = coachingParts.join(" ").trim() || null;

  return {
    label,
    duration: null,
    type: "effort",
    effort: {
      primary,
      hr: hrMatch ? `${hrMatch[1]} – ${hrMatch[2]} bpm` : null,
      rpe: rpeMatch ? rpeMatch[1] : null,
      cap: capMatch ? capMatch[1].trim() : null,
      modalities,
      coachingNote: coachingNote || null,
    },
    exercises: [],
  };
}

function inferBlock(label, duration, lines) {
  const body = lines.map(cleanLine).filter(Boolean);
  const parsedRows = body.map((line) => ({ line, parsed: parseExerciseLine(line) }));
  const exerciseRows = parsedRows.map((row) => row.parsed).filter(Boolean);
  const residualNotes = parsedRows.filter((row) => !row.parsed).map((row) => row.line);
  const exerciseMajority = body.length > 0 && exerciseRows.length >= Math.ceil(body.length / 2);

  if (exerciseMajority) {
    return {
      label,
      duration,
      type: "exercises",
      effort: null,
      exercises: exerciseRows,
      residualNotes,
    };
  }

  const effortBlock = inferEffortBlock(label, body);
  return {
    ...effortBlock,
    duration,
    residualNotes: [],
  };
}

function splitIntoSections(note) {
  const lines = String(note || "")
    .split("\n")
    .map(cleanLine)
    .filter((line) => line && !/^WEEK TYPE:/i.test(line));

  const sections = [];
  let current = null;

  lines.forEach((line) => {
    const header = parseHeader(line);
    if (header) {
      if (current && current.lines.length > 0) sections.push(current);
      current = { label: header.label, duration: header.duration, lines: [] };
      return;
    }
    if (!current) {
      current = { label: "THE EFFORT", duration: null, lines: [] };
    }
    current.lines.push(line);
  });

  if (current && current.lines.length > 0) sections.push(current);
  return sections;
}

function sumMinutesFromBlocks(blocks) {
  let total = 0;
  blocks.forEach((block) => {
    const d = String(block?.duration || "");
    const m = d.match(/(\d+)(?:\s*-\s*(\d+))?\s*MIN/i);
    if (!m) return;
    const left = Number(m[1] || 0);
    const right = Number(m[2] || 0);
    if (right > 0) {
      total += Math.round((left + right) / 2);
      return;
    }
    total += left;
  });
  return total > 0 ? `${total} MIN` : "";
}

export function parseWorkoutDetail({ sessionName, workout, note, phase }) {
  const { kicker, headline } = splitSessionName(sessionName);
  const sections = splitIntoSections(note || "");

  const parsedBlocks = sections.length > 0
    ? sections.map((section) => inferBlock(section.label, section.duration, section.lines))
    : [
        inferEffortBlock("THE EFFORT", [String(note || "").trim() || "Session detail unavailable."]),
      ];

  const duration = formatDurationLabel(workout?.duration || "") || sumMinutesFromBlocks(parsedBlocks);
  const tag = toUpperWords(workout?.type || "");

  const finisherNote = (() => {
    const residualNotes = parsedBlocks.flatMap((block) => block.residualNotes || []).map(cleanLine).filter(Boolean);
    if (residualNotes.length > 0) return residualNotes[residualNotes.length - 1];
    const allExerciseNotes = parsedBlocks
      .flatMap((block) => block.exercises || [])
      .map((ex) => cleanLine(ex.note))
      .filter(Boolean);
    if (allExerciseNotes.length > 0) return allExerciseNotes[allExerciseNotes.length - 1];
    return workout?.note ? String(workout.note).trim() : null;
  })();

  const blocks = parsedBlocks.map(({ residualNotes, ...block }) => block);

  return {
    kicker: kicker || toUpperWords(workout?.type || "WORKOUT"),
    headline: headline || toUpperWords(workout?.tag || "SESSION"),
    tag,
    duration,
    phase: formatPhase(phase),
    blocks,
    finisherNote,
  };
}
