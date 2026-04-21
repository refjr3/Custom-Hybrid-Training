export const ZONES = {
  z2: {
    key: "z2",
    label: "Z2",
    fullLabel: "Zone 2",
    description: "Aerobic base",
    metricField: "z2_minutes",
    defaultTarget: 240,
    color: "#C9A875",
    colorDim: "rgba(201,168,117,0.4)",
  },
  z3: {
    key: "z3",
    label: "Z3",
    fullLabel: "Zone 3",
    description: "Tempo",
    metricField: "z3_minutes",
    defaultTarget: 60,
    color: "#E8A855",
    colorDim: "rgba(232,168,85,0.4)",
  },
  z4_plus: {
    key: "z4_plus",
    label: "Z4+",
    fullLabel: "Zone 4+",
    description: "Threshold & above",
    metricField: "z4_plus_minutes",
    defaultTarget: 30,
    color: "#FF8A6C",
    colorDim: "rgba(255,138,108,0.4)",
  },
};

/** Canonical keys: z2 | z3 | z4_plus (matches weeklyZoneMinutes / API). */
export function normalizeZoneKey(raw) {
  const s = String(raw ?? "z2")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (s === "z2") return "z2";
  if (s === "z3") return "z3";
  if (s === "z4_plus" || s === "z4+" || s === "z4plus") return "z4_plus";
  return "z2";
}

export function getZoneConfig(zoneKey) {
  const k = normalizeZoneKey(zoneKey);
  return ZONES[k] || ZONES.z2;
}

export function getZoneTarget(profile, zoneKey) {
  const targets = profile?.zone_targets || {};
  return targets[zoneKey] ?? ZONES[zoneKey]?.defaultTarget ?? 240;
}

export function getSelectedZone(profile) {
  return profile?.selected_zone || "z2";
}
