export const EQUIPMENT_LABELS = {
  barbell: "Barbell",
  squat_rack: "Squat rack",
  rack: "Squat rack",
  pullup_bar: "Pull-up bar",
  pull_up_bar: "Pull-up bar",
  kettlebells: "Kettlebells",
  dumbbells: "Dumbbells",
  rower: "Rower",
  concept2: "Concept2 rower",
  skierg: "SkiErg",
  echo_bike: "Echo bike",
  assault_bike: "Assault bike",
  treadmill: "Treadmill",
  running_outside: "Running outside",
  outdoor_running: "Running outside",
  pool: "Pool",
  sandbag: "Sandbag",
  sled: "Sled",
  wall_ball: "Wall ball",
};

export function prettifyEquipment(key) {
  if (!key) return "";
  if (EQUIPMENT_LABELS[key]) return EQUIPMENT_LABELS[key];
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const FOCUS_LABELS = {
  get_stronger: "Get stronger",
  build_endurance: "Build endurance",
  lose_weight: "Lose weight",
  get_consistent: "Get consistent again",
  train_for_race: "Train for a race",
};

export const EXPERIENCE_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  elite: "Elite",
};

export function prettifyFocus(key) {
  return FOCUS_LABELS[key] || key || "—";
}

export function prettifyExperience(key) {
  if (!key) return "—";
  return EXPERIENCE_LABELS[key] || key;
}

/** Clause after "working …" in the intake synthesis sentence (not the card title). */
export function focusWorkingPhrase(mainFocus, raceDate, profileRaceDate) {
  const effectiveRace = raceDate || profileRaceDate;
  if (mainFocus === "train_for_race") {
    if (effectiveRace) {
      const d = String(effectiveRace).slice(0, 10);
      return `toward your ${new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })} race`;
    }
    return "for a race";
  }
  const map = {
    get_stronger: "to build strength",
    build_endurance: "to build endurance",
    lose_weight: "to sustainably lose weight",
    get_consistent: "to get consistent again",
  };
  return map[mainFocus] || "toward your goals";
}
