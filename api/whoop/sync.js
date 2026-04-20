import { createClient } from "@supabase/supabase-js";
import { getAccessTokenFromRequest } from "../lib/sessionToken.js";
import { addCalendarDaysToIsoYmd, getCalendarYmdInTimeZone } from "../../lib/getLocalToday.js";
import {
  parseCookies,
  loadWhoopRecordJson,
  upsertWhoopUnifiedFromApiJson,
  formatClientWhoopResponse,
  shouldThrottleWhoopSync,
  countWhoopUnifiedRowsSince,
  patchWhoopBackfilledAt,
  backfillWhoopUnifiedHistory,
} from "./lib.js";

/**
 * GET /api/whoop/sync
 * WHOOP → unified_metrics upsert + connected_sources.whoop.last_sync.
 * Throttled to 30 min between live WHOOP API calls (served from unified_metrics.raw_payload when possible).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = getAccessTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: "no_auth" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(token);
  if (userErr) {
    console.error("[whoop/sync] getUser:", userErr.message);
  }
  if (!user) return res.status(401).json({ error: "invalid_session" });

  const cookies = parseCookies(req.headers.cookie || "");
  const access = cookies.whoop_access;
  const refresh = cookies.whoop_refresh;

  if (!access && !refresh) {
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

    if (shouldThrottleWhoopSync(lastSync)) {
      const todayYmd = getCalendarYmdInTimeZone(tz);
      const { data: row } = await supabase
        .from("unified_metrics")
        .select("raw_payload")
        .eq("user_id", user.id)
        .eq("source", "whoop")
        .eq("date", todayYmd)
        .maybeSingle();

      const raw = row?.raw_payload;
      if (raw?.recovery) {
        const client = formatClientWhoopResponse(
          { records: [raw.recovery] },
          { records: raw.sleep ? [raw.sleep] : [] },
          { records: raw.cycle ? [raw.cycle] : [] }
        );
        return res.status(200).json({ ...client, throttled: true });
      }
      return res
        .status(200)
        .json({ throttled: true, recovery: null, sleep: null, strain: null });
    }

    const loaded = await loadWhoopRecordJson(access, refresh, res);
    if (loaded.error) {
      return res.status(401).json({
        error: loaded.error,
        reconnect: Boolean(loaded.reconnect),
      });
    }

    const todayYmd = getCalendarYmdInTimeZone(tz);
    const thirtyDaysAgoYmd = addCalendarDaysToIsoYmd(todayYmd, -30) || todayYmd;
    const whoopBackfilled = Boolean(profile?.connected_sources?.whoop?.backfilled_at);
    const whoopRowCount = await countWhoopUnifiedRowsSince(supabase, user.id, thirtyDaysAgoYmd);
    const needsWhoopBackfill = !whoopBackfilled && whoopRowCount < 25;

    if (needsWhoopBackfill) {
      try {
        await backfillWhoopUnifiedHistory(supabase, user.id, tz, loaded.access);
        await patchWhoopBackfilledAt(supabase, user.id);
      } catch (bfErr) {
        console.error("[whoop/sync] history backfill:", bfErr?.message || bfErr);
      }
    } else if (!whoopBackfilled && whoopRowCount >= 25) {
      await patchWhoopBackfilledAt(supabase, user.id);
    }

    const { recData, sleepData, cycleData } = loaded;
    const rec0 = recData?.records?.[0];
    if (!rec0) {
      return res.status(502).json({ error: "whoop_no_recovery" });
    }

    const client = await upsertWhoopUnifiedFromApiJson(
      supabase,
      user.id,
      tz,
      recData,
      sleepData,
      cycleData
    );

    if (!client) {
      return res.status(502).json({ error: "whoop_no_recovery" });
    }

    return res.status(200).json({ ...client, throttled: false });
  } catch (err) {
    console.error("[whoop/sync]", err?.message || err, err?.stack);
    return res.status(500).json({ error: "fetch_failed", details: err?.message || "error" });
  }
}
