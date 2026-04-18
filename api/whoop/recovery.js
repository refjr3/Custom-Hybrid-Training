import { createClient } from "@supabase/supabase-js";
import { getAccessTokenFromRequest } from "../lib/sessionToken.js";
import {
  parseCookies,
  loadWhoopRecordJson,
  formatClientWhoopResponse,
  upsertWhoopUnifiedFromApiJson,
} from "./lib.js";

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  let access = cookies.whoop_access;
  const refresh = cookies.whoop_refresh;

  if (!access && !refresh) {
    return res.status(401).json({ error: "not_authenticated" });
  }

  try {
    const loaded = await loadWhoopRecordJson(access, refresh, res);
    if (loaded.error) {
      return res.status(401).json({
        error: loaded.error,
        reconnect: Boolean(loaded.reconnect),
      });
    }

    const { recData, sleepData, cycleData } = loaded;
    const body = formatClientWhoopResponse(recData, sleepData, cycleData);

    const bearer = getAccessTokenFromRequest(req);
    if (bearer) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      const {
        data: { user },
      } = await supabase.auth.getUser(bearer);
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("time_zone")
          .eq("user_id", user.id)
          .maybeSingle();
        const tz = profile?.time_zone || "America/New_York";
        try {
          await upsertWhoopUnifiedFromApiJson(
            supabase,
            user.id,
            tz,
            recData,
            sleepData,
            cycleData
          );
        } catch (e) {
          console.warn("[whoop/recovery] unified upsert skipped", e?.message || e);
        }
      }
    }

    return res.status(200).json(body);
  } catch (err) {
    console.error("[whoop/recovery]", err);
    return res.status(500).json({ error: "fetch_failed", details: err.message });
  }
}
