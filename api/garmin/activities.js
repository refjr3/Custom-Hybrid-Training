import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const garminToken = req.headers.authorization?.replace("Bearer ", "");
  const userId = req.body?.user_id || req.query?.user_id || null;

  if (!garminToken) {
    return res.status(401).json({ error: "No Garmin token" });
  }

  try {
    // Fetch recent activities from Garmin Connect API
    const activitiesRes = await fetch(
      "https://connectapi.garmin.com/fitness-api/rest/v1/activities?limit=10",
      {
        headers: {
          Authorization: `Bearer ${garminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!activitiesRes.ok) {
      return res.status(401).json({ error: "Garmin token invalid or expired" });
    }

    const activitiesData = await activitiesRes.json();
    const activities = activitiesData.activityList || [];

    // Transform and upsert into Supabase
    const transformed = activities.map((a) => ({
      activity_id: String(a.activityId),
      activity_type: a.activityType?.typeKey || "unknown",
      name: a.activityName || "Activity",
      start_time: a.startTimeLocal || null,
      duration_seconds: Math.round(a.duration || 0),
      distance_meters: a.distance || 0,
      avg_hr: Math.round(a.averageHR || 0),
      max_hr: Math.round(a.maxHR || 0),
      calories: Math.round(a.calories || 0),
      aerobic_effect: a.aerobicTrainingEffect || 0,
      anaerobic_effect: a.anaerobicTrainingEffect || 0,
      raw_data: a,
      ...(userId ? { user_id: userId } : {}),
    }));

    if (transformed.length > 0) {
      await supabase
        .from("garmin_activities")
        .upsert(transformed, { onConflict: "activity_id" });
    }

    // Return recent activities for the app
    const { data: recent } = await supabase
      .from("garmin_activities")
      .select("*")
      .order("start_time", { ascending: false })
      .limit(10);

    return res.status(200).json({ activities: recent || [] });

  } catch (err) {
    return res.status(500).json({ error: "Garmin sync failed", details: err.message });
  }
}
