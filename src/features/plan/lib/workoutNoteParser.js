/**
 * Parse loose seeded workout notes into normalized sections.
 */
export function parseWorkoutNote(note) {
  const empty = {
    why: null,
    duration: null,
    targets: null,
    structure: [],
    extras: [],
    hrTarget: null,
    durationInfo: null,
    cadence: null,
    prose: null,
    contextNote: null,
    weekType: null,
  };
  if (!note) {
    return empty;
  }

  const raw = String(note);
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const result = { ...empty };

  for (const line of lines) {
    if (/^DELOAD WEEK/i.test(line)) continue;
    if (/^WEEK TYPE:/i.test(line)) continue;

    if (/HR\s*\d+|RPE\s*\d|Z[1-5]/i.test(line)) {
      result.targets = result.targets ? `${result.targets} · ${line}` : line;
      continue;
    }

    if (!result.duration) {
      const durMatch = line.match(/(\d+)\s*(min|mins|minutes|hour|hours|hr|hrs)\b/i);
      if (durMatch) {
        const rawValue = Number(durMatch[1]);
        const unit = String(durMatch[2]).toLowerCase();
        if (Number.isFinite(rawValue) && rawValue > 0) {
          if (unit.startsWith("hr") || unit.startsWith("hour")) {
            result.duration = `${rawValue} ${rawValue === 1 ? "hour" : "hours"}`;
          } else {
            result.duration = `${rawValue} ${rawValue === 1 ? "minute" : "minutes"}`;
          }
        }
      }
    }

    if (!result.why && line.length < 120 && !/^\d/.test(line) && !/^[A-Z\s]{4,}:/.test(line)) {
      result.why = line;
      continue;
    }

    if (
      /\d+\s*[x×]\s*\d+|\d+\s*sets?|\d+\s*reps?|\bwarm[- ]?up\b|\bcool[- ]?down\b/i.test(line)
      || /^[A-Z][A-Z\s]+\(.*\)/.test(line)
    ) {
      result.structure.push(line);
      continue;
    }

    result.extras.push(line);
  }

  const hrMatch = raw.match(/(?:HR\s*(?:target:\s*)?)?(?:(Z[1-5])\s*[—\-:]?\s*)?(\d{2,3})\s*[–\-]\s*(\d{2,3})\s*bpm/i);
  if (hrMatch) {
    result.hrTarget = {
      zone: hrMatch[1] || null,
      range: `${hrMatch[2]}–${hrMatch[3]} bpm`,
      raw: hrMatch[0],
    };
  }

  const durMatch = raw.match(/(\d+)(?:\s*[–\-]\s*(\d+))?\s*(min|minute|minutes|hour|hours|hr|hrs)/i);
  if (durMatch) {
    const start = durMatch[1];
    const end = durMatch[2];
    const unit = String(durMatch[3] || "").toLowerCase().startsWith("min") ? "min" : "hr";
    result.durationInfo = {
      display: end ? `${start}–${end} ${unit}` : `${start} ${unit}`,
      raw: durMatch[0],
    };
    if (!result.duration) {
      result.duration = result.durationInfo.display;
    }
  }

  const cadMatch = raw.match(/(?:Cadence:?\s*)?(\d{2,3})(?:\s*[–\-]\s*(\d{2,3}))?\s*spm/i);
  if (cadMatch) {
    result.cadence = {
      display: cadMatch[2] ? `${cadMatch[1]}–${cadMatch[2]} spm` : `${cadMatch[1]} spm`,
      raw: cadMatch[0],
    };
  }

  const weekTypeMatch = raw.match(/WEEK\s*TYPE:\s*(\w+)/i);
  if (weekTypeMatch) {
    result.weekType = String(weekTypeMatch[1] || "").toUpperCase();
  }

  const deloadMatch = raw.match(/DELOAD[^.]*\.\s*(?:[^.]+\.\s*)?/i);
  if (deloadMatch) {
    result.contextNote = deloadMatch[0].trim();
  }

  let prose = raw;
  for (const ext of [hrMatch?.[0], durMatch?.[0], cadMatch?.[0], weekTypeMatch?.[0], deloadMatch?.[0]]) {
    if (ext) prose = prose.replace(ext, " ");
  }
  prose = prose
    .replace(/\s+/g, " ")
    .replace(/^[\s\-—·.,:;]+|[\s\-—·.,:;]+$/g, "")
    .trim();
  result.prose = prose || null;

  return result;
}
