/**
 * Parse loose seeded workout notes into normalized sections.
 */
export function parseWorkoutNote(note) {
  if (!note) {
    return { why: null, duration: null, targets: null, structure: [], extras: [] };
  }

  const lines = String(note)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const result = { why: null, duration: null, targets: null, structure: [], extras: [] };

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

  return result;
}
