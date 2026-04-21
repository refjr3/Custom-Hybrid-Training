function dayShortName(day) {
  const map = {
    mon: "Mondays",
    tue: "Tuesdays",
    wed: "Wednesdays",
    thu: "Thursdays",
    fri: "Fridays",
    sat: "Saturdays",
    sun: "Sundays",
  };
  return map[day] || day;
}

export function synthesizeIntake({ daysPerWeek, flexibility, unavailableDays, mainFocus, raceDate, profile }) {
  const dayLabel = {
    strict: "on the same days each week",
    flexible: "with flexibility week to week",
  }[flexibility] || "with flexibility week to week";

  const effectiveRace = raceDate || profile?.target_race_date || null;

  const focusLabel = {
    get_stronger: "to build strength",
    build_endurance: "to build endurance",
    lose_weight: "to sustainably lose weight",
    get_consistent: "to get consistent again",
    train_for_race: effectiveRace
      ? `toward your ${new Date(`${effectiveRace}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })} race`
      : "for a race",
  }[mainFocus] || "toward your goals";

  const unavailablePart = unavailableDays?.length
    ? `, avoiding ${unavailableDays.map((d) => dayShortName(d)).join(" and ")}`
    : "";

  return `You'll train ${daysPerWeek} days a week ${dayLabel}${unavailablePart}, working ${focusLabel}.`;
}

export function buildIntakeGenerationContext({
  profile,
  userBaselines,
  daysPerWeek,
  flexibility,
  unavailableDays,
  mainFocus,
  raceDate,
}) {
  return {
    snapshot_time: new Date().toISOString(),
    profile: {
      sport: profile?.primary_sport,
      focus: profile?.primary_focus,
      experience: profile?.training_experience,
      weekly_hours: profile?.weekly_training_hours,
      equipment: profile?.equipment_access,
      injuries: profile?.injuries_limitations,
      race: profile?.target_race_name,
      race_date: profile?.target_race_date,
      age: profile?.date_of_birth ?? profile?.dob,
    },
    baselines: userBaselines
      ? {
          recovery: userBaselines.baseline_recovery_score,
          hrv: userBaselines.baseline_hrv_rmssd,
          rhr: userBaselines.baseline_resting_hr,
          sleep_total: userBaselines.baseline_sleep_total_min,
          days_of_data: userBaselines.days_of_data,
        }
      : null,
    intake: { daysPerWeek, flexibility, unavailableDays, mainFocus, raceDate },
  };
}
