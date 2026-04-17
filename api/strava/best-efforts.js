import { createClient } from "@supabase/supabase-js";
import { ensureStravaTokensForRequest } from "./stravaClient.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STRAVA_ACTIVITIES = "https://www.strava.com/api/v3/athlete/activities";
const STRAVA_ACTIVITY = (id) => `https://www.strava.com/api/v3/activities/${id}`;

function formatPrTime(seconds) {
  const s = Math.round(Number(seconds) || 0);
  if (s <= 0) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rs = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(rs).padStart(2, "0")}`;
  return `${m}:${String(rs).padStart(2, "0")}`;
}

/** Map Strava best-effort name → key used by the Performance PR card */
function stravaEffortNameToKey(name) {
  const n = String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (n === "400m") return "400m";
  if (n === "1/2 mile" || n === "1200m") return "1/2 mile";
  if (n === "1k" || n === "1km" || n === "1000m") return "1k";
  if (n === "1 mile" || n === "1mi" || n === "1609m") return "1 mile";
  if (n === "2 mile" || n === "2mi" || n === "3218m" || n === "3219m") return "2 mile";
  if (n === "5k" || n === "5 km" || n === "5000m") return "5k";
  if (n === "10k" || n === "10 km" || n === "10000m") return "10k";
  if (n === "10 mile" || n === "10mi" || n === "16100m") return "10 mile";
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData?.user) return res.status(401).json({ error: "Invalid token" });
  const appUserId = authData.user.id;
  const headerUid = typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : "";
  if (headerUid && headerUid !== appUserId) {
    console.warn("[strava/best-efforts] x-user-id header does not match JWT user", { headerUid, appUserId });
  }

  let profile = null;
  const primaryProfileRes = await supabase
    .from("user_profiles")
    .select("connected_wearables,strava_access_token,strava_refresh_token,strava_token_expires_at")
    .eq("user_id", appUserId)
    .single();
  profile = primaryProfileRes.data || null;

  if (primaryProfileRes.error && /strava_(access|refresh)_token|strava_token_expires_at/i.test(primaryProfileRes.error.message || "")) {
    const fallbackRes = await supabase.from("user_profiles").select("connected_wearables").eq("user_id", appUserId).single();
    profile = fallbackRes.data || null;
  }

  const wearables = profile?.connected_wearables || {};
  const accessProbe = profile?.strava_access_token || wearables.strava_access_token || null;
  const refreshProbe = profile?.strava_refresh_token || wearables.strava_refresh_token || null;
  if (!accessProbe && !refreshProbe) {
    return res.status(200).json({ error: "strava_not_connected" });
  }

  const stravaSession = await ensureStravaTokensForRequest({ supabase, appUserId, profile, res, req });
  if (!stravaSession) {
    return res.status(200).json({ error: "strava_reconnect_required" });
  }

  try {
    const listRes = await stravaSession.stravaFetch(`${STRAVA_ACTIVITIES}?per_page=200`);
    if (!listRes) {
      return res.status(200).json({ error: "strava_list_failed", bestEfforts: {} });
    }
    const activities = await listRes.json().catch(() => []);
    const runIds = (Array.isArray(activities) ? activities : [])
      .filter((a) => a?.type === "Run" && a?.id)
      .slice(0, 24)
      .map((a) => a.id);

    const bestEfforts = {};
    const chunk = 4;
    for (let i = 0; i < runIds.length; i += chunk) {
      const slice = runIds.slice(i, i + chunk);
      const details = await Promise.all(
        slice.map(async (id) => {
          const r = await stravaSession.stravaFetch(STRAVA_ACTIVITY(id));
          if (!r) return null;
          return r.json().catch(() => null);
        })
      );
      for (const act of details) {
        if (!act?.best_efforts || !Array.isArray(act.best_efforts)) continue;
        for (const effort of act.best_efforts) {
          const key = stravaEffortNameToKey(effort.name);
          if (!key) continue;
          const t = Number(effort.elapsed_time);
          if (!Number.isFinite(t) || t <= 0) continue;
          const prev = bestEfforts[key];
          if (!prev || t < prev.time) {
            bestEfforts[key] = {
              time: t,
              formatted: formatPrTime(t),
              date: effort.start_date || act.start_date || null,
              activityName: act.name || "",
            };
          }
        }
      }
    }

    return res.status(200).json({ bestEfforts });
  } catch (err) {
    console.error("[strava best-efforts]", err.message);
    return res.status(200).json({ error: "fetch_failed", bestEfforts: {} });
  }
}
