export function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((c) => {
    const [k, ...v] = c.trim().split("=");
    cookies[k.trim()] = v.join("=").trim();
  });
  return cookies;
}

export async function refreshWhoopTokens(refreshTok) {
  const res = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTok,
      client_id: process.env.VITE_WHOOP_CLIENT_ID,
      client_secret: process.env.VITE_WHOOP_CLIENT_SECRET,
      scope: "offline read:recovery read:sleep read:cycles read:profile",
    }).toString(),
  });
  return res.json();
}

export function setWhoopCookieHeader(res, access, refresh) {
  const opts = "Path=/; HttpOnly; Secure; SameSite=Lax";
  res.setHeader("Set-Cookie", [
    `whoop_access=${access}; ${opts}; Max-Age=3600`,
    `whoop_refresh=${refresh}; ${opts}; Max-Age=2592000`,
  ]);
}

export async function fetchWhoopV2(token) {
  const headers = { Authorization: `Bearer ${token}` };
  const [recRes, sleepRes, cycleRes] = await Promise.all([
    fetch("https://api.prod.whoop.com/developer/v2/recovery?limit=1", { headers }),
    fetch("https://api.prod.whoop.com/developer/v2/activity/sleep?limit=1", { headers }),
    fetch("https://api.prod.whoop.com/developer/v2/cycle?limit=1", { headers }),
  ]);
  return { recRes, sleepRes, cycleRes };
}

const WHOOP_RECOVERY_URL = "https://api.prod.whoop.com/developer/v2/recovery";
const WHOOP_SLEEP_URL = "https://api.prod.whoop.com/developer/v2/activity/sleep";

async function fetchWhoopPaginatedJson(accessToken, baseUrl, startIso, endIso) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const out = [];
  let nextToken = null;
  let guard = 0;
  while (guard < 40) {
    guard += 1;
    const url = new URL(baseUrl);
    url.searchParams.set("limit", "25");
    if (startIso) url.searchParams.set("start", startIso);
    if (endIso) url.searchParams.set("end", endIso);
    if (nextToken) url.searchParams.set("nextToken", nextToken);
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      console.warn("[whoop/lib] paginated fetch failed", baseUrl, res.status);
      break;
    }
    const j = await res.json().catch(() => ({}));
    const recs = Array.isArray(j.records) ? j.records : [];
    out.push(...recs);
    nextToken = j.next_token || j.nextToken || null;
    if (!nextToken || recs.length === 0) break;
  }
  return out;
}

export async function fetchWhoopRecoveryHistory(accessToken, startIso, endIso) {
  return fetchWhoopPaginatedJson(accessToken, WHOOP_RECOVERY_URL, startIso, endIso);
}

export async function fetchWhoopSleepHistory(accessToken, startIso, endIso) {
  return fetchWhoopPaginatedJson(accessToken, WHOOP_SLEEP_URL, startIso, endIso);
}

/** One unified_metrics row from a single WHOOP recovery (+ optional sleep) record. */
export function buildWhoopUnifiedRowFromRecoverySleep(userId, timeZone, rec, sleep) {
  if (!rec || typeof rec !== "object") return null;
  if (rec.score_state && rec.score_state !== "SCORED") return null;
  const score = rec.score || {};
  const recoveryScore = Number(score.recovery_score ?? rec.recovery_score ?? NaN);
  if (!Number.isFinite(recoveryScore)) return null;

  const readiness = Math.round(recoveryScore);
  const readinessColor = score.user_calibrating
    ? "gray"
    : readiness >= 67
      ? "green"
      : readiness >= 34
        ? "yellow"
        : "red";

  const hrvMilli =
    score.hrv_rmssd_milli ??
    score.hrv?.rmssd_milli ??
    rec.hrv_rmssd_milli ??
    rec.hrv?.rmssd_milli;
  const rhrRaw = score.resting_heart_rate ?? rec.resting_heart_rate ?? score.rhr;

  const stage = sleep?.score?.stage_summary || {};
  const inBedMilli =
    stage.total_in_bed_time_milli ??
    sleep?.score?.stage_summary?.total_in_bed_time_milli ??
    sleep?.total_in_bed_time_milli;
  const deepMilli =
    stage.total_slow_wave_sleep_time_milli ??
    sleep?.score?.stage_summary?.total_slow_wave_sleep_time_milli ??
    sleep?.slow_wave_sleep_time_milli;
  const remMilli = stage.total_rem_sleep_time_milli ?? sleep?.score?.stage_summary?.total_rem_sleep_time_milli;
  const lightMilli = stage.total_light_sleep_time_milli ?? sleep?.score?.stage_summary?.total_light_sleep_time_milli;
  const awakeMilli = stage.total_awake_time_milli ?? sleep?.score?.stage_summary?.total_awake_time_milli;

  const sleepPerf = sleep?.score?.sleep_performance_percentage;

  const anchorIso = rec.created_at || sleep?.end || sleep?.start || new Date().toISOString();
  const date = isoYmdInTimeZone(anchorIso, timeZone) || String(anchorIso).slice(0, 10);

  return {
    user_id: userId,
    date,
    source: "whoop",
    readiness_score: readiness,
    readiness_color: readinessColor,
    hrv_rmssd: hrvMilli != null && Number.isFinite(Number(hrvMilli)) ? Number(hrvMilli) : null,
    resting_hr:
      rhrRaw != null && Number.isFinite(Number(rhrRaw)) ? Math.round(Number(rhrRaw)) : null,
    sleep_total_min: roundMinFromMilli(inBedMilli),
    sleep_score:
      sleepPerf != null && Number.isFinite(Number(sleepPerf)) ? Math.round(Number(sleepPerf)) : null,
    sleep_deep_min: roundMinFromMilli(deepMilli),
    sleep_rem_min: roundMinFromMilli(remMilli),
    sleep_light_min: roundMinFromMilli(lightMilli),
    sleep_awake_min: roundMinFromMilli(awakeMilli),
    raw_payload: { recovery: rec, sleep: sleep || null, cycle: null },
    updated_at: new Date().toISOString(),
  };
}

export async function countWhoopUnifiedRowsSince(supabase, userId, sinceYmd) {
  const { count, error } = await supabase
    .from("unified_metrics")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source", "whoop")
    .gte("date", sinceYmd);
  if (error) {
    console.warn("[whoop/lib] count whoop rows", error.message);
    return 0;
  }
  return typeof count === "number" ? count : 0;
}

export async function patchWhoopBackfilledAt(supabase, userId) {
  const { data: prof } = await supabase
    .from("user_profiles")
    .select("connected_sources")
    .eq("user_id", userId)
    .maybeSingle();
  const cs =
    typeof prof?.connected_sources === "object" && prof?.connected_sources
      ? prof.connected_sources
      : {};
  const whoop = {
    ...(typeof cs.whoop === "object" && cs.whoop ? cs.whoop : {}),
    backfilled_at: new Date().toISOString(),
  };
  await supabase.from("user_profiles").update({ connected_sources: { ...cs, whoop } }).eq("user_id", userId);
}

/**
 * Backfill up to ~30 days of WHOOP recovery+sleep into unified_metrics (once per user).
 * @returns {{ upserted: number, skipped: boolean }}
 */
export async function backfillWhoopUnifiedHistory(supabase, userId, timeZone, accessToken) {
  const endIso = new Date().toISOString();
  const historyStart = new Date();
  historyStart.setDate(historyStart.getDate() - 30);
  const startIso = historyStart.toISOString();

  const [recoveries, sleeps] = await Promise.all([
    fetchWhoopRecoveryHistory(accessToken, startIso, endIso),
    fetchWhoopSleepHistory(accessToken, startIso, endIso),
  ]);

  const sleepById = new Map();
  for (const s of sleeps) {
    if (s?.id) sleepById.set(String(s.id), s);
  }

  let upserted = 0;
  for (const rec of recoveries) {
    const sid = rec.sleep_id != null ? String(rec.sleep_id) : "";
    const sleep = sid ? sleepById.get(sid) : null;
    const payload = buildWhoopUnifiedRowFromRecoverySleep(userId, timeZone, rec, sleep);
    if (!payload) continue;

    const { data: existing } = await supabase
      .from("unified_metrics")
      .select("*")
      .eq("user_id", userId)
      .eq("date", payload.date)
      .eq("source", "whoop")
      .maybeSingle();

    const merged = mergeUnifiedRow(existing, payload);
    const { error: upErr } = await supabase
      .from("unified_metrics")
      .upsert(merged, { onConflict: "user_id,date,source" });
    if (!upErr) upserted += 1;
    else console.error("[whoop/lib] backfill upsert", payload.date, upErr);
  }

  return { upserted, skipped: false };
}

/** Calendar YYYY-MM-DD in the user’s IANA time zone for an ISO timestamp. */
export function isoYmdInTimeZone(isoInput, timeZone = "America/New_York") {
  if (!isoInput) return null;
  const d = new Date(isoInput);
  if (Number.isNaN(d.getTime())) return null;
  const tz =
    typeof timeZone === "string" && timeZone.trim() ? timeZone.trim() : "America/New_York";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (!y || !m || !day) return null;
    return `${y}-${m}-${day}`;
  } catch {
    return String(isoInput).slice(0, 10);
  }
}

export function formatClientWhoopResponse(recData, sleepData, cycleData) {
  const rec = recData?.records?.[0];
  const sleep = sleepData?.records?.[0];
  const cycle = cycleData?.records?.[0];
  const inBedMilli = sleep?.score?.stage_summary?.total_in_bed_time_milli;
  const score = rec?.score || {};
  const hrvMilli =
    score.hrv_rmssd_milli ??
    score.hrv?.rmssd_milli ??
    rec?.hrv_rmssd_milli ??
    rec?.hrv?.rmssd_milli;
  const rhrRaw = score.resting_heart_rate ?? rec?.resting_heart_rate ?? score.rhr;

  if (process.env.WHOOP_DEBUG_RECOVERY === "1") {
    try {
      console.log("[WHOOP recovery raw]", JSON.stringify(recData?.records?.[0] ?? null, null, 2));
    } catch (_) {
      /* ignore */
    }
  }

  const hrvRounded =
    hrvMilli != null && Number.isFinite(Number(hrvMilli)) ? Math.round(Number(hrvMilli)) : null;
  const rhrRounded =
    rhrRaw != null && Number.isFinite(Number(rhrRaw)) ? Math.round(Number(rhrRaw)) : null;

  return {
    recovery: {
      score: Math.round(score.recovery_score ?? rec?.recovery_score ?? 0),
      hrv: hrvRounded,
      hrv_rmssd_milli: hrvRounded,
      rhr: rhrRounded ?? 0,
      resting_heart_rate: rhrRounded,
    },
    sleep: {
      score: Math.round(sleep?.score?.sleep_performance_percentage ?? 0),
      hours:
        inBedMilli != null && Number.isFinite(Number(inBedMilli))
          ? Math.round((Number(inBedMilli) / 3600000) * 10) / 10
          : 0,
      total_in_bed_time_milli:
        inBedMilli != null && Number.isFinite(Number(inBedMilli)) ? Number(inBedMilli) : null,
      efficiency: Math.round(sleep?.score?.sleep_efficiency_percentage ?? 0),
      stage_summary: sleep?.score?.stage_summary ?? null,
    },
    strain: {
      score: Math.round((cycle?.score?.strain ?? 0) * 10) / 10,
      avgHr: Math.round(cycle?.score?.average_heart_rate ?? 0),
      maxHr: Math.round(cycle?.score?.max_heart_rate ?? 0),
    },
  };
}

function numOrNull(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function roundMinFromMilli(milli) {
  const n = numOrNull(milli);
  return n == null ? null : Math.round(n / 60000);
}

/** Build unified_metrics row from WHOOP v2 API JSON (first record each). */
export function buildUnifiedWhoopPayload(userId, timeZone, recData, sleepData, cycleData) {
  const rec = recData?.records?.[0];
  if (!rec) return null;

  const sleep = sleepData?.records?.[0] || null;
  const cycle = cycleData?.records?.[0] || null;
  const score = rec.score || {};

  const recoveryScore = Number(score.recovery_score ?? rec.recovery_score ?? 0);
  const readiness = Math.round(recoveryScore);
  const readinessColor =
    readiness >= 67 ? "green" : readiness >= 34 ? "yellow" : "red";

  const hrvMilli =
    score.hrv_rmssd_milli ??
    score.hrv?.rmssd_milli ??
    rec.hrv_rmssd_milli ??
    rec.hrv?.rmssd_milli;
  const rhrRaw = score.resting_heart_rate ?? rec.resting_heart_rate ?? score.rhr;

  const stage = sleep?.score?.stage_summary || {};
  const inBedMilli =
    stage.total_in_bed_time_milli ??
    sleep?.score?.stage_summary?.total_in_bed_time_milli ??
    sleep?.total_in_bed_time_milli;
  const deepMilli =
    stage.total_slow_wave_sleep_time_milli ?? sleep?.slow_wave_sleep_time_milli;
  const remMilli = stage.total_rem_sleep_time_milli ?? sleep?.rem_sleep_time_milli;
  const lightMilli = stage.total_light_sleep_time_milli ?? sleep?.light_sleep_time_milli;
  const awakeMilli = stage.total_awake_time_milli ?? sleep?.awake_time_milli;

  const sleepPerf = sleep?.score?.sleep_performance_percentage;
  const strainRaw = cycle?.score?.strain ?? cycle?.strain;

  const anchorIso = rec.created_at || cycle?.created_at || sleep?.end || new Date().toISOString();
  const date = isoYmdInTimeZone(anchorIso, timeZone) || String(anchorIso).slice(0, 10);

  return {
    user_id: userId,
    date,
    source: "whoop",
    readiness_score: readiness,
    readiness_color: readinessColor,
    hrv_rmssd: hrvMilli != null && Number.isFinite(Number(hrvMilli)) ? Number(hrvMilli) : null,
    resting_hr:
      rhrRaw != null && Number.isFinite(Number(rhrRaw)) ? Math.round(Number(rhrRaw)) : null,
    sleep_total_min: roundMinFromMilli(inBedMilli),
    sleep_score:
      sleepPerf != null && Number.isFinite(Number(sleepPerf))
        ? Math.round(Number(sleepPerf))
        : null,
    sleep_deep_min: roundMinFromMilli(deepMilli),
    sleep_rem_min: roundMinFromMilli(remMilli),
    sleep_light_min: roundMinFromMilli(lightMilli),
    sleep_awake_min: roundMinFromMilli(awakeMilli),
    strain: strainRaw != null && Number.isFinite(Number(strainRaw)) ? Number(strainRaw) : null,
    raw_payload: { recovery: rec, sleep, cycle },
    updated_at: new Date().toISOString(),
  };
}

function mergeUnifiedRow(existing, payload) {
  const e = existing && typeof existing === "object" ? existing : {};
  return {
    ...e,
    ...payload,
    user_id: payload.user_id,
    date: payload.date,
    source: "whoop",
    raw_payload: payload.raw_payload ?? e.raw_payload,
    updated_at: payload.updated_at,
  };
}

export async function patchWhoopLastSync(supabase, userId) {
  const { data: prof } = await supabase
    .from("user_profiles")
    .select("connected_sources")
    .eq("user_id", userId)
    .maybeSingle();
  const cs =
    typeof prof?.connected_sources === "object" && prof?.connected_sources
      ? prof.connected_sources
      : {};
  const whoop = {
    ...(typeof cs.whoop === "object" && cs.whoop ? cs.whoop : {}),
    connected: true,
    last_sync: new Date().toISOString(),
  };
  await supabase
    .from("user_profiles")
    .update({ connected_sources: { ...cs, whoop } })
    .eq("user_id", userId);
}

/**
 * Fetch WHOOP JSON with refresh + optional Set-Cookie on `res`.
 * @returns {{ recData: any, sleepData: any, cycleData: any, access: string, refresh: string } | { error: string, reconnect?: boolean }}
 */
export async function loadWhoopRecordJson(accessIn, refreshIn, res) {
  let access = accessIn;
  let refresh = refreshIn;

  if (!access && refresh) {
    const newTokens = await refreshWhoopTokens(refresh);
    if (!newTokens.access_token) {
      return { error: "whoop_reconnect_required" };
    }
    access = newTokens.access_token;
    refresh = newTokens.refresh_token || newTokens.refreshToken || refresh;
    if (res) setWhoopCookieHeader(res, access, refresh);
  }

  if (!access) {
    return { error: "not_authenticated" };
  }

  let { recRes, sleepRes, cycleRes } = await fetchWhoopV2(access);

  if (recRes.status === 401 || sleepRes.status === 401 || cycleRes.status === 401) {
    if (!refresh) {
      return { error: "whoop_reconnect_required", reconnect: true };
    }
    const newTokens = await refreshWhoopTokens(refresh);
    if (!newTokens.access_token) {
      return { error: "whoop_reconnect_required", reconnect: true };
    }
    access = newTokens.access_token;
    refresh = newTokens.refresh_token || newTokens.refreshToken || refresh;
    if (!refresh) {
      return { error: "whoop_reconnect_required" };
    }
    if (res) setWhoopCookieHeader(res, access, refresh);
    ({ recRes, sleepRes, cycleRes } = await fetchWhoopV2(access));
  }

  if (recRes.status === 401 || sleepRes.status === 401 || cycleRes.status === 401) {
    return { error: "whoop_reconnect_required", reconnect: true };
  }

  const [recData, sleepData, cycleData] = await Promise.all([
    recRes.json(),
    sleepRes.json(),
    cycleRes.json(),
  ]);

  return { recData, sleepData, cycleData, access, refresh };
}

/**
 * Upsert whoop row into unified_metrics and refresh connected_sources.whoop.last_sync.
 * @returns formatted client payload (same shape as /api/whoop/recovery) or null if no recovery record.
 */
export async function upsertWhoopUnifiedFromApiJson(
  supabase,
  userId,
  timeZone,
  recData,
  sleepData,
  cycleData
) {
  const payload = buildUnifiedWhoopPayload(userId, timeZone, recData, sleepData, cycleData);
  if (!payload) {
    return null;
  }

  const { data: existing } = await supabase
    .from("unified_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("date", payload.date)
    .eq("source", "whoop")
    .maybeSingle();

  const merged = mergeUnifiedRow(existing, payload);
  const { error: upErr } = await supabase
    .from("unified_metrics")
    .upsert(merged, { onConflict: "user_id,date,source" });

  if (upErr) {
    console.error("[whoop/lib] unified_metrics upsert", upErr);
    throw upErr;
  }

  await patchWhoopLastSync(supabase, userId);
  return formatClientWhoopResponse(recData, sleepData, cycleData);
}

export function whoopThrottleMs() {
  return 30 * 60 * 1000;
}

export function shouldThrottleWhoopSync(lastSyncIso) {
  if (!lastSyncIso || typeof lastSyncIso !== "string") return false;
  const t = new Date(lastSyncIso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < whoopThrottleMs();
}
