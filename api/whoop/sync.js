import { createClient } from "@supabase/supabase-js";
import { getAccessTokenFromRequest } from "../lib/sessionToken.js";
import { getCalendarYmdInTimeZone } from "../../lib/getLocalToday.js";
import {
  parseCookies,
  loadWhoopRecordJson,
  upsertWhoopUnifiedFromApiJson,
  formatClientWhoopResponse,
  shouldThrottleWhoopSync,
} from "./lib.js";

/**
 * GET /api/whoop/sync
 * WHOOP → unified_metrics upsert + connected_sources.whoop.last_sync.
 * Throttled to 30 min between live WHOOP API calls (served from unified_metrics.raw_payload when possible).
 */
export default async function handler(req, res) {
  console.log("[whoop/sync] START", { method: req.method });

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = getAccessTokenFromRequest(req);
  console.log("[whoop/sync] has token:", Boolean(token));
  if (!token) return res.status(401).json({ error: "no_auth" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(token);
  console.log("[whoop/sync] user:", user?.id, "getUser err:", userErr?.message);
  if (!user) return res.status(401).json({ error: "invalid_session" });

  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const access = cookies.whoop_access;
  const refresh = cookies.whoop_refresh;
  console.log("[whoop/sync] cookie header length:", cookieHeader.length);
  console.log("[whoop/sync] parsed whoop_access:", Boolean(access), "whoop_refresh:", Boolean(refresh));
  console.log("[whoop/sync] req.cookies whoop_access (may be empty on Vercel):", Boolean(req.cookies?.whoop_access));

  if (!access && !refresh) {
    console.log("[whoop/sync] NO WHOOP COOKIES — 401 not_authenticated");
    return res.status(401).json({ error: "not_authenticated" });
  }

  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("time_zone, connected_sources")
      .eq("user_id", user.id)
      .maybeSingle();

    const tz = profile?.time_zone || "America/New_York";
    const lastSync = profile?.connected_sources?.whoop?.last_sync;
    const throttled = shouldThrottleWhoopSync(lastSync);
    console.log("[whoop/sync] tz:", tz, "last_sync:", lastSync, "shouldThrottle:", throttled);

    if (throttled) {
      const todayYmd = getCalendarYmdInTimeZone(tz);
      console.log("[whoop/sync] THROTTLED branch, todayYmd:", todayYmd);
      const { data: row } = await supabase
        .from("unified_metrics")
        .select("raw_payload, date")
        .eq("user_id", user.id)
        .eq("source", "whoop")
        .eq("date", todayYmd)
        .maybeSingle();

      const raw = row?.raw_payload;
      console.log("[whoop/sync] throttle cache row:", Boolean(row), "raw.recovery:", Boolean(raw?.recovery));
      if (raw?.recovery) {
        const client = formatClientWhoopResponse(
          { records: [raw.recovery] },
          { records: raw.sleep ? [raw.sleep] : [] },
          { records: raw.cycle ? [raw.cycle] : [] }
        );
        console.log("[whoop/sync] THROTTLED DONE (served from unified_metrics)");
        return res.status(200).json({ ...client, throttled: true });
      }
      console.log("[whoop/sync] THROTTLED but no cache row — empty JSON");
      return res
        .status(200)
        .json({ throttled: true, recovery: null, sleep: null, strain: null });
    }

    console.log("[whoop/sync] calling loadWhoopRecordJson…");
    const loaded = await loadWhoopRecordJson(access, refresh, res);
    if (loaded.error) {
      console.log("[whoop/sync] loadWhoopRecordJson error:", loaded.error, "reconnect:", loaded.reconnect);
      return res.status(401).json({
        error: loaded.error,
        reconnect: Boolean(loaded.reconnect),
      });
    }

    const { recData, sleepData, cycleData } = loaded;
    const rec0 = recData?.records?.[0];
    const score = rec0?.score || {};
    console.log("[whoop/sync] WHOOP API JSON:", {
      hasRecoveryRecord: Boolean(rec0),
      recoveryScore: score.recovery_score ?? rec0?.recovery_score,
      sleepRecords: sleepData?.records?.length ?? 0,
      cycleRecords: cycleData?.records?.length ?? 0,
    });

    if (!rec0) {
      console.log("[whoop/sync] NO RECOVERY RECORD in recData.records — aborting upsert");
      return res.status(502).json({ error: "whoop_no_recovery" });
    }

    console.log("[whoop/sync] calling upsertWhoopUnifiedFromApiJson…");
    const client = await upsertWhoopUnifiedFromApiJson(
      supabase,
      user.id,
      tz,
      recData,
      sleepData,
      cycleData
    );

    if (!client) {
      console.log("[whoop/sync] upsertWhoopUnifiedFromApiJson returned null");
      return res.status(502).json({ error: "whoop_no_recovery" });
    }

    console.log("[whoop/sync] DONE (live fetch + upsert)");
    return res.status(200).json({ ...client, throttled: false });
  } catch (err) {
    console.error("[whoop/sync] FATAL:", err?.message, err?.stack);
    return res.status(500).json({ error: "fetch_failed", details: err?.message || "error" });
  }
}
