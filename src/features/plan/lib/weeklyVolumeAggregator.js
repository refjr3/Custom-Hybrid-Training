function startOfIsoWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const SOURCE_PRIORITY = {
  strava: 3,
  garmin: 2,
  intervals: 1,
};

const ACTIVITY_TYPE_MAP = {
  workout: null,
  cardio: [
    "cardio",
    "mixedcardio",
    "mixed_cardio",
    "rowing",
    "indoorrowing",
    "indoor_rowing",
    "elliptical",
    "stairstepper",
    "stair_stepper",
  ],
  hiit: ["hiit", "crossfit", "cross_fit"],
  running: ["run", "virtualrun", "trailrun", "trail_run", "treadmillrun"],
  swimming: ["swim", "lapswimming", "openwaterswimming", "swimming"],
  biking: ["ride", "virtualride", "ebikeride", "cycling", "gravelride", "mountainbike", "mountainbiking"],
  walking: ["walk", "walking"],
  hiking: ["hike", "hiking"],
  strength: [
    "weighttraining",
    "weight_training",
    "strengthtraining",
    "strength_training",
    "workout",
    "crosstraining",
    "cross_training",
  ],
};

function isoDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function normalizeType(type) {
  return String(type || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function normalizeCategoryToken(type) {
  return String(type || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function sourceRank(source) {
  const key = String(source || "").toLowerCase();
  return SOURCE_PRIORITY[key] || 0;
}

function matchesCategory(activityType, category) {
  if (!activityType) return false;
  const normalized = normalizeCategoryToken(activityType);
  if (!normalized) return false;
  if (category === "workout") return true;
  const allowedTypes = ACTIVITY_TYPE_MAP[category] || [];
  return allowedTypes.some((t) => normalizeCategoryToken(t) === normalized);
}

function buildWeekTimeline(weeksBack) {
  const currentWeekStart = startOfIsoWeek(new Date());
  const weeks = [];
  const bucketMap = new Map();

  for (let i = -weeksBack; i <= 0; i += 1) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() + i * 7);
    const key = isoDate(weekStart);
    const row = {
      weekStart,
      isCurrent: i === 0,
      isFuture: false,
      timeSeconds: 0,
      distanceMeters: 0,
    };
    weeks.push(row);
    bucketMap.set(key, row);
  }

  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  weeks.push({
    weekStart: nextWeekStart,
    isCurrent: false,
    isFuture: true,
    timeSeconds: 0,
    distanceMeters: 0,
  });

  return { weeks, bucketMap };
}

function dedupeActivities(rows) {
  const bySession = new Map();

  for (const row of rows || []) {
    const stamp = row.start_time || row.date;
    if (!stamp) continue;

    const dayKey = String(stamp).slice(0, 10);
    const typeKey = normalizeType(row.activity_type);
    const duration = Math.round(Number(row.duration_seconds || 0));
    const distance = Math.round(Number(row.distance_meters || 0));
    const key = [dayKey, typeKey, duration, distance].join("|");

    const existing = bySession.get(key);
    if (!existing || sourceRank(row.source) > sourceRank(existing.source)) {
      bySession.set(key, row);
    }
  }

  return Array.from(bySession.values());
}

function applyRowsToBuckets(bucketMap, rows) {
  for (const row of rows || []) {
    const stamp = row.start_time || row.date;
    if (!stamp) continue;
    const key = isoDate(startOfIsoWeek(new Date(stamp)));
    const bucket = bucketMap.get(key);
    if (!bucket) continue;
    bucket.timeSeconds += Number(row.duration_seconds || 0);
    bucket.distanceMeters += Number(row.distance_meters || 0);
  }
}

export async function fetchWeeklyVolume(supabase, userId, activityType, metric, weeksBack = 8) {
  if (!supabase || !userId) return [];

  const { weeks, bucketMap } = buildWeekTimeline(weeksBack);
  const rangeStart = isoDate(weeks[0]?.weekStart || new Date());
  const rangeStartTs = `${rangeStart}T00:00:00.000Z`;

  const { data: stampedRows, error: stampedError } = await supabase
    .from("garmin_activities")
    .select("activity_id, activity_type, start_time, date, duration_seconds, distance_meters, source")
    .eq("user_id", userId)
    .gte("start_time", rangeStartTs)
    .order("start_time", { ascending: true })
    .limit(3000);

  const { data: dateOnlyRows, error: dateOnlyError } = await supabase
    .from("garmin_activities")
    .select("activity_id, activity_type, start_time, date, duration_seconds, distance_meters, source")
    .eq("user_id", userId)
    .is("start_time", null)
    .gte("date", rangeStart)
    .order("date", { ascending: true })
    .limit(1500);

  if (stampedError || dateOnlyError) {
    console.error("[fetchWeeklyVolume] error:", stampedError || dateOnlyError);
    return weeks.map((week) => ({
      weekStart: week.weekStart,
      isCurrent: week.isCurrent,
      isFuture: week.isFuture,
      timeHours: 0,
      distanceKm: 0,
      value: 0,
    }));
  }

  const allRows = [...(stampedRows || []), ...(dateOnlyRows || [])];
  const validActivities = allRows.filter((a) => Number(a?.duration_seconds || 0) > 0);
  const filtered = dedupeActivities(validActivities).filter((row) => matchesCategory(row.activity_type, activityType));
  applyRowsToBuckets(bucketMap, filtered);

  if (activityType === "workout" && filtered.length === 0) {
    const { data: fallbackRows, error: fallbackError } = await supabase
      .from("unified_metrics")
      .select("date, total_activity_min")
      .eq("user_id", userId)
      .gte("date", rangeStart);

    if (!fallbackError) {
      for (const row of fallbackRows || []) {
        if (!row?.date) continue;
        const key = isoDate(startOfIsoWeek(new Date(row.date)));
        const bucket = bucketMap.get(key);
        if (!bucket) continue;
        bucket.timeSeconds += Number(row.total_activity_min || 0) * 60;
      }
    }
  }

  return weeks.map((week) => {
    const timeHours = Number(week.timeSeconds || 0) / 3600;
    const distanceKm = Number(week.distanceMeters || 0) / 1000;
    return {
      weekStart: week.weekStart,
      isCurrent: week.isCurrent,
      isFuture: week.isFuture,
      timeHours,
      distanceKm,
      value: metric === "distance" ? distanceKm : timeHours,
    };
  });
}
