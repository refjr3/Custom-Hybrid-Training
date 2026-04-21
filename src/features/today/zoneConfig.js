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

export function getZoneConfig(zoneKey) {
  return ZONES[zoneKey] || ZONES.z2;
}

export function getZoneTarget(profile, zoneKey) {
  const targets = profile?.zone_targets || {};
  return targets[zoneKey] ?? ZONES[zoneKey]?.defaultTarget ?? 240;
}

export function getSelectedZone(profile) {
  return profile?.selected_zone || "z2";
}
