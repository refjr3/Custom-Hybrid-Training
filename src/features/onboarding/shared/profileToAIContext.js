import { getAgeAtDate } from "./ageBrackets.js";

export function profileToAIContext(profile) {
  const p = profile || {};
  const dob = p.date_of_birth || p.dob || null;
  const age = dob ? getAgeAtDate(dob, new Date()) : null;
  const displayName = p.full_name || p.name || "Athlete";

  let sportContext = "";
  if (p.primary_focus === "competing") {
    sportContext = `Sport: ${p.primary_sport || "unknown"}. `;
    if (p.sport_format) sportContext += `Format: ${p.sport_format}. `;
    if (p.sport_distance) sportContext += `Distance: ${p.sport_distance}. `;
    if (p.sport_division) sportContext += `Division: ${p.sport_division}. `;
    if (p.hyrox_format) sportContext += `HYROX format: ${p.hyrox_format}. `;
    if (p.target_race_name) sportContext += `Target race: ${p.target_race_name} on ${p.target_race_date || "TBD"}. `;
    if (p.bodybuilding_stage_status) sportContext += `Stage: ${p.bodybuilding_stage_status}. `;
  } else if (p.primary_focus === "performance") {
    sportContext = `Performance goal: ${p.performance_type || "unknown"}. `;
    if (p.sport_specific_other) sportContext += `Sport: ${p.sport_specific_other}. `;
  } else if (p.primary_focus === "composition") {
    sportContext = `Composition goal: ${p.composition_goal || "unknown"}. `;
    if (p.body_fat_current != null) sportContext += `Current BF: ${p.body_fat_current}%. `;
    if (p.body_fat_goal != null) sportContext += `Goal BF: ${p.body_fat_goal}%. `;
  } else if (p.primary_focus === "return") {
    sportContext = `Returning from: ${p.return_reason || "unknown"}. `;
    if (p.return_details) sportContext += `Details: ${p.return_details}. `;
    if (p.return_time_off) sportContext += `Time off: ${p.return_time_off}. `;
  }

  const secondary = Array.isArray(p.secondary_goals) ? p.secondary_goals.map(String).join(", ") : "";

  const equipment = Array.isArray(p.equipment_access) ? p.equipment_access.map(String).join(", ") : "";

  return `
Athlete: ${displayName}, age ${age ?? "unknown"}, ${p.gender || "unspecified"}.
Primary focus: ${p.primary_focus || "unspecified"}.
${sportContext}
Secondary goals: ${secondary || "none"}.
Experience: ${p.training_experience || "unspecified"}. Highest level: ${p.highest_competitive_level || "unspecified"}.
Availability: ${p.weekly_training_hours || "unspecified"} hrs/week, ${p.days_per_week || "unspecified"} days/week, ${p.sessions_per_day || "unspecified"} sessions/day.
Environment: ${p.training_environment || "unspecified"}. Equipment: ${equipment || "none"}.
Limitations: ${p.injuries_limitations || "none"}.
  `.trim();
}
