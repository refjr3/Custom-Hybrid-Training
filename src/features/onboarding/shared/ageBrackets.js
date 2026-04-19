export function getAgeAtDate(dateOfBirth, targetDate) {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const target = targetDate ? new Date(targetDate) : new Date();
  if (Number.isNaN(birth.getTime()) || Number.isNaN(target.getTime())) return null;
  let age = target.getFullYear() - birth.getFullYear();
  const m = target.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && target.getDate() < birth.getDate())) age--;
  return age;
}

export function getHyroxAgeBracket(dateOfBirth, raceDate) {
  const age = getAgeAtDate(dateOfBirth, raceDate);
  if (age === null) return null;
  if (age < 30) return "Open";
  if (age < 35) return "Masters 30-34";
  if (age < 40) return "Masters 35-39";
  if (age < 45) return "Masters 40-44";
  if (age < 50) return "Masters 45-49";
  if (age < 55) return "Masters 50-54";
  if (age < 60) return "Masters 55-59";
  if (age < 65) return "Masters 60-64";
  return "Masters 65+";
}

export function getStandardAgeGroup(dateOfBirth, raceDate) {
  const age = getAgeAtDate(dateOfBirth, raceDate);
  if (age === null) return null;
  if (age < 18) return "Junior";
  if (age < 20) return "18-19";
  const bracketStart = Math.floor(age / 5) * 5;
  return `${bracketStart}-${bracketStart + 4}`;
}
