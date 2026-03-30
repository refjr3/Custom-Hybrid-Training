import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((c) => {
    const [k, ...v] = c.trim().split("=");
    cookies[k.trim()] = v.join("=").trim();
  });
  return cookies;
}

async function refreshGarminToken(refreshToken) {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) return null;

  const tokenRes = await fetch("https://connectapi.garmin.com/oauth-service/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  if (!tokenRes.ok) return null;
  const tokens = await tokenRes.json().catch(() => ({}));
  if (!tokens?.access_token) return null;
  return tokens;
}

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });
  const userId = user.id;

  const cookies = parseCookies(req.headers.cookie);
  let garminAccess = cookies.garmin_access;
  const garminRefresh = cookies.garmin_refresh;

  const setTokenCookies = (tokens) => {
    const opts = "Path=/; HttpOnly; Secure; SameSite=Lax";
    res.setHeader("Set-Cookie", [
      `garmin_access=${tokens.access_token}; ${opts}; Max-Age=86400`,
      `garmin_refresh=${tokens.refresh_token || garminRefresh || ""}; ${opts}; Max-Age=2592000`,
    ]);
  };

  async function fetchGarminActivities(accessToken) {
    return fetch(
      "https://connectapi.garmin.com/fitness-api/rest/v1/activities?limit=20",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    if (!garminAccess && garminRefresh) {
      const refreshed = await refreshGarminToken(garminRefresh);
      if (refreshed?.access_token) {
        garminAccess = refreshed.access_token;
        setTokenCookies(refreshed);
      }
    }

    if (!garminAccess) {
      return res.status(401).json({ error: "garmin_reconnect_required" });
    }

    let activitiesRes = await fetchGarminActivities(garminAccess);
    if (activitiesRes.status === 401 && garminRefresh) {
      const refreshed = await refreshGarminToken(garminRefresh);
      if (refreshed?.access_token) {
        garminAccess = refreshed.access_token;
        setTokenCookies(refreshed);
        activitiesRes = await fetchGarminActivities(garminAccess);
      }
    }

    if (!activitiesRes.ok) {
      return res.status(401).json({ error: "garmin_reconnect_required" });
    }

    const activitiesData = await activitiesRes.json().catch(() => ({}));
    const activities = activitiesData.activityList || [];

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
      user_id: userId,
    }));

    if (transformed.length > 0) {
      await supabase
        .from("garmin_activities")
        .upsert(transformed, { onConflict: "activity_id" });
    }

    const { data: recent } = await supabase
      .from("garmin_activities")
      .select("*")
      .eq("user_id", userId)
      .order("start_time", { ascending: false })
      .limit(20);

    return res.status(200).json({ activities: recent || [] });
  } catch (err) {
    return res.status(500).json({ error: "Garmin sync failed", details: err.message });
  }
}
