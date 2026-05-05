function startOfIsoWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const TYPE_FILTERS = {
  workout: null,
  cardio: ["Run", "Ride", "VirtualRide", "Swim", "Walk", "Hike"],
  running: ["Run", "TrailRun", "VirtualRun"],
  swimming: ["Swim"],
  biking: ["Ride", "VirtualRide", "EBikeRide"],
  strength: ["WeightTraining", "Workout", "CrossTraining"],
};

export async function fetchWeeklyVolume(supabase, userId, activityType, metric, weeksBack = 8) {
  if (!supabase || !userId) return [];

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - weeksBack * 7);

  let query = supabase
    .from("unified_metrics")
    .select("date, duration_seconds, distance_meters, source_activity_type")
    .eq("user_id", userId)
    .gte("date", startDate.toISOString().slice(0, 10));

  const filter = TYPE_FILTERS[activityType] ?? TYPE_FILTERS.workout;
  if (Array.isArray(filter) && filter.length > 0) {
    query = query.in("source_activity_type", filter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[fetchWeeklyVolume] error:", error);
    return [];
  }

  const buckets = new Map();
  for (const row of data || []) {
    const weekStart = startOfIsoWeek(new Date(row.date)).toISOString().slice(0, 10);
    if (!buckets.has(weekStart)) buckets.set(weekStart, { time: 0, distance: 0 });
    const bucket = buckets.get(weekStart);
    bucket.time += Number(row.duration_seconds || 0);
    bucket.distance += Number(row.distance_meters || 0);
  }

  const weeks = [];
  const currentWeekStart = startOfIsoWeek(today);
  for (let i = -weeksBack; i <= 0; i += 1) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() + i * 7);
    const key = weekStart.toISOString().slice(0, 10);
    const bucket = buckets.get(key) || { time: 0, distance: 0 };
    weeks.push({
      weekStart,
      isCurrent: i === 0,
      isFuture: false,
      timeHours: bucket.time / 3600,
      distanceKm: bucket.distance / 1000,
      value: metric === "distance" ? bucket.distance / 1000 : bucket.time / 3600,
    });
  }

  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  weeks.push({
    weekStart: nextWeekStart,
    isCurrent: false,
    isFuture: true,
    timeHours: 0,
    distanceKm: 0,
    value: 0,
  });

  return weeks;
}

