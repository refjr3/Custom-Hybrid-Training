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

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeMatchedSnippets(source, snippets) {
  let next = String(source || "");
  snippets
    .map(cleanLine)
    .filter(Boolean)
    .forEach((snippet) => {
      const re = new RegExp(escapeRegex(snippet), "gi");
      next = next.replace(re, " ");
    });
  return next;
}

function cleanupCoachingText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s([,.;:!?])/g, "$1")
    .replace(/^[\s@,.;:!?\-–—]+/, "")
    .replace(/\(\s*\)/g, "")
    .replace(/(?:^|\s)[-–—](?:\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findModalityList(source) {
  const lines = String(source || "")
    .split(/[\n.!?]/)
    .map(cleanLine)
    .filter(Boolean);
  const re = /\b(echo bike|row|ski|run|bike)\b/gi;
  const map = {
    "echo bike": "Echo Bike",
    row: "Row",
    ski: "Ski",
    run: "Run",
    bike: "Bike",
  };
  for (const line of lines) {
    const matches = [];
    let m;
    while ((m = re.exec(line)) !== null) {
      matches.push({
        raw: m[0].toLowerCase(),
        index: m.index,
        end: m.index + String(m[0]).length,
      });
    }
    const unique = [];
    matches.forEach((item) => {
      const label = map[item.raw];
      if (label && !unique.includes(label)) unique.push(label);
    });
    const hasListSeparator = /,|\bor\b|\band\b|\//i.test(line);
    if (unique.length >= 2 && hasListSeparator) {
      const first = matches[0];
      const last = matches[matches.length - 1];
      const snippet = line.slice(first.index, last.end);
      return { modalities: unique, snippets: [snippet] };
    }
  }
  return { modalities: [], snippets: [] };
}

function extractDecisionTree(lines) {
  const rows = lines.map(cleanLine).filter(Boolean);
  const snippets = [];
  const decision = { go: null, hold: null, rest: null };
  rows.forEach((line) => {
    const go = line.match(/^(?:[-•]\s*)?(?:🟢|GREEN)\s*[:\-]?\s*(.+)$/i);
    const hold = line.match(/^(?:[-•]\s*)?(?:🟡|YELLOW)\s*[:\-]?\s*(.+)$/i);
    const rest = line.match(/^(?:[-•]\s*)?(?:🔴|RED)\s*[:\-]?\s*(.+)$/i);
    if (go) {
      decision.go = cleanLine(go[1]).replace(/[.]+$/, "");
      snippets.push(line);
    } else if (hold) {
      decision.hold = cleanLine(hold[1]).replace(/[.]+$/, "");
      snippets.push(line);
    } else if (rest) {
      decision.rest = cleanLine(rest[1]).replace(/[.]+$/, "");
      snippets.push(line);
    }
  });
  if (decision.go && decision.hold && decision.rest) {
    return { decisionTree: decision, snippets };
  }
  return { decisionTree: null, snippets: [] };
}

function isDecisionLine(line) {
  return /^(?:[-•]\s*)?(?:🟢|🟡|🔴|GREEN|YELLOW|RED)\b/i.test(cleanLine(line));
}

function inferEffortBlock(label, lines, options = {}) {
  const body = lines.map(cleanLine).filter(Boolean);
  const joined = body.join(" ");

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
  const coachingSource = coachingParts.join("\n").trim();

  const hrMatch = joined.match(/HR\s*(\d{2,3})\s*[-–]\s*(\d{2,3})(?:\s*bpm)?/i);
  const hrSnippet = joined.match(/HR\s*\d{2,3}\s*[-–]\s*\d{2,3}(?:\s*bpm)?\.?/i)?.[0] || null;

  const capMatch = joined.match(/Cap at ([^.!\n]+)/i);
  const capSnippet = joined.match(/Cap at [^.!\n]+\.?/i)?.[0] || null;

  const rpeMatch = joined.match(
    /(comfortably hard effort|very easy|easy|moderate|hard effort|all[- ]out|conversational pace)/i,
  );
  const durationSnippet = joined.match(/\b\d+(?:\s*[-–]\s*\d+)?\s*(?:min|mins|minutes)\b(?:\s+[A-Za-z]+)?/i)?.[0] || null;
  const phaseSnippet = joined.match(/\b(?:base|accumulation|intensification|peak|sharpen|taper|deload|race)\s+phase\b/i)?.[0] || null;

  const { modalities, snippets: modalitySnippets } = findModalityList(coachingSource);
  const { decisionTree, snippets: decisionSnippets } = extractDecisionTree(coachingSource.split("\n"));

  const cleanedCoaching = cleanupCoachingText(
    removeMatchedSnippets(coachingSource, [
      hrSnippet,
      capSnippet,
      rpeMatch?.[0],
      durationSnippet,
      phaseSnippet,
      ...modalitySnippets,
      ...decisionSnippets,
    ]),
  );

  let coachingNote = cleanedCoaching || null;
  if (!coachingNote && decisionTree) {
    const leadLine = body.find((line) => !isDecisionLine(line));
    const fallback = cleanLine(leadLine);
    if (fallback) coachingNote = fallback;
  }

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
      decisionTree,
      coachingNote: coachingNote || null,
    },
    exercises: [],
    syntheticLeading: Boolean(options.syntheticLeading),
  };
}

function inferBlock(label, duration, lines, options = {}) {
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
      syntheticLeading: Boolean(options.syntheticLeading),
    };
  }

  const effortBlock = inferEffortBlock(label, body, options);
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
  const looseLines = [];
  let current = null;

  lines.forEach((line) => {
    const header = parseHeader(line);
    if (header) {
      if (current && current.lines.length > 0) sections.push(current);
      current = { label: header.label, duration: header.duration, lines: [], syntheticLeading: false };
      return;
    }
    if (!current) looseLines.push(line);
    else current.lines.push(line);
  });

  if (current && current.lines.length > 0) sections.push(current);
  return { sections, looseLines, allLines: lines };
}

function extractFinisherNote(allLines, looseLines) {
  const explicit = allLines
    .map((line) => line.match(/\b(?:FINISHER|EXTRA)\s*:\s*(.+)$/i))
    .find(Boolean);
  if (explicit) return cleanLine(explicit[1]) || null;
  const standalone = (looseLines || []).map(cleanLine).find((line) => parseExerciseLine(line));
  return standalone || null;
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
  const { sections, looseLines, allLines } = splitIntoSections(note || "");

  let parsedBlocks = sections.length > 0
    ? sections.map((section) => inferBlock(section.label, section.duration, section.lines, { syntheticLeading: false }))
    : [];
  if (looseLines.length > 0) {
    const leading = inferBlock("THE EFFORT", null, looseLines, { syntheticLeading: true });
    parsedBlocks = [leading, ...parsedBlocks];
  }
  if (parsedBlocks.length === 0) {
    parsedBlocks = [
      inferEffortBlock("THE EFFORT", [String(note || "").trim() || "Session detail unavailable."], { syntheticLeading: true }),
    ];
  }

  const hasExerciseBlock = parsedBlocks.some((block) => block.type === "exercises");
  if (hasExerciseBlock && parsedBlocks[0]?.type === "effort" && parsedBlocks[0]?.syntheticLeading) {
    const effort = parsedBlocks[0]?.effort || {};
    const noStructuredEffortFacts =
      !effort.hr &&
      !effort.rpe &&
      !effort.cap &&
      (!Array.isArray(effort.modalities) || effort.modalities.length === 0) &&
      !effort.decisionTree;
    if (noStructuredEffortFacts) parsedBlocks = parsedBlocks.slice(1);
  }

  const duration = formatDurationLabel(workout?.duration || "") || sumMinutesFromBlocks(parsedBlocks);
  const tag = toUpperWords(workout?.type || "");

  const finisherNote = extractFinisherNote(allLines, looseLines);

  const blocks = parsedBlocks.map(({ residualNotes, syntheticLeading, ...block }) => block);

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
