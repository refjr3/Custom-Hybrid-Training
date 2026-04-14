function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((c) => {
    const [k, ...v] = c.trim().split("=");
    cookies[k.trim()] = v.join("=").trim();
  });
  return cookies;
}

async function refreshToken(refreshTok) {
  console.log("[whoop] refreshing token, refresh_token length:", refreshTok?.length);
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
  const data = await res.json();
  console.log("[whoop] refresh result:", data.access_token ? "got new token" : "FAILED", data.error || "");
  return data;
}

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  let access = cookies.whoop_access;
  const refresh = cookies.whoop_refresh;

  console.log("[whoop] access cookie:", access ? `present (${access.length} chars)` : "MISSING", "| refresh cookie:", refresh ? `present (${refresh.length} chars)` : "MISSING");

  if (!access && !refresh) return res.status(401).json({ error: "not_authenticated" });

  if (!access && refresh) {
    const newTokens = await refreshToken(refresh);
    if (!newTokens.access_token) return res.status(401).json({ error: "whoop_reconnect_required" });
    access = newTokens.access_token;
    const opts = "Path=/; HttpOnly; Secure; SameSite=Lax";
    const refreshedToken = newTokens.refresh_token || newTokens.refreshToken || refresh;
    res.setHeader("Set-Cookie", [
      `whoop_access=${newTokens.access_token}; ${opts}; Max-Age=3600`,
      `whoop_refresh=${refreshedToken}; ${opts}; Max-Age=2592000`,
    ]);
  }

  async function fetchWhoop(token) {
    const headers = { Authorization: `Bearer ${token}` };
    const [recRes, sleepRes, cycleRes] = await Promise.all([
      fetch("https://api.prod.whoop.com/developer/v2/recovery?limit=1", { headers }),
      fetch("https://api.prod.whoop.com/developer/v2/activity/sleep?limit=1", { headers }),
      fetch("https://api.prod.whoop.com/developer/v2/cycle?limit=1", { headers }),
    ]);
    return { recRes, sleepRes, cycleRes };
  }

  function formatResponse(recData, sleepData, cycleData) {
    const rec   = recData.records?.[0];
    const sleep = sleepData.records?.[0];
    const cycle = cycleData.records?.[0];
    const inBedMilli = sleep?.score?.stage_summary?.total_in_bed_time_milli;
    const hrvMilli = rec?.score?.hrv_rmssd_milli;
    const rhrRaw = rec?.score?.resting_heart_rate;
    return {
      recovery: {
        score: Math.round(rec?.score?.recovery_score ?? 0),
        hrv: hrvMilli != null && Number.isFinite(Number(hrvMilli)) ? Math.round(Number(hrvMilli)) : 0,
        hrv_rmssd_milli: hrvMilli != null && Number.isFinite(Number(hrvMilli)) ? Math.round(Number(hrvMilli)) : null,
        rhr: rhrRaw != null && Number.isFinite(Number(rhrRaw)) ? Math.round(Number(rhrRaw)) : 0,
        resting_heart_rate: rhrRaw != null && Number.isFinite(Number(rhrRaw)) ? Math.round(Number(rhrRaw)) : null,
      },
      sleep: {
        score: Math.round(sleep?.score?.sleep_performance_percentage ?? 0),
        hours:
          inBedMilli != null && Number.isFinite(Number(inBedMilli))
            ? Math.round((Number(inBedMilli) / 3600000) * 10) / 10
            : 0,
        total_in_bed_time_milli: inBedMilli != null && Number.isFinite(Number(inBedMilli)) ? Number(inBedMilli) : null,
        efficiency: Math.round(sleep?.score?.sleep_efficiency_percentage ?? 0),
      },
      strain: {
        score: Math.round((cycle?.score?.strain ?? 0) * 10) / 10,
        avgHr: Math.round(cycle?.score?.average_heart_rate ?? 0),
        maxHr: Math.round(cycle?.score?.max_heart_rate ?? 0),
      },
    };
  }

  try {
    let { recRes, sleepRes, cycleRes } = await fetchWhoop(access);

    console.log("[whoop] API status — recovery:", recRes.status, "sleep:", sleepRes.status, "cycle:", cycleRes.status);

    // Auto-refresh on 401 — token expired but refresh cookie still valid
    if ((recRes.status === 401 || sleepRes.status === 401 || cycleRes.status === 401) && refresh) {
      const newTokens = await refreshToken(refresh);
      if (newTokens.access_token) {
        access = newTokens.access_token;
        const opts = "Path=/; HttpOnly; Secure; SameSite=Lax";
        const refreshedToken = newTokens.refresh_token || newTokens.refreshToken || refresh;
        if (!refreshedToken) {
          return res.status(401).json({ error: "whoop_reconnect_required" });
        }
        res.setHeader("Set-Cookie", [
          `whoop_access=${newTokens.access_token}; ${opts}; Max-Age=3600`,
          `whoop_refresh=${refreshedToken}; ${opts}; Max-Age=2592000`,
        ]);
        ({ recRes, sleepRes, cycleRes } = await fetchWhoop(access));
      } else {
        return res.status(401).json({ error: "whoop_reconnect_required" });
      }
    }

    if (recRes.status === 401 || sleepRes.status === 401 || cycleRes.status === 401) {
      console.log("[whoop] still 401 after refresh attempt — token fully expired");
      return res.status(401).json({ error: "whoop_reconnect_required", reconnect: true });
    }

    const [recData, sleepData, cycleData] = await Promise.all([
      recRes.json(), sleepRes.json(), cycleRes.json(),
    ]);

    return res.status(200).json(formatResponse(recData, sleepData, cycleData));
  } catch (err) {
    return res.status(500).json({ error: "fetch_failed", details: err.message });
  }
}
