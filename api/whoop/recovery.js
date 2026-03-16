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
  const res = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTok,
      client_id: process.env.VITE_WHOOP_CLIENT_ID,
      client_secret: process.env.VITE_WHOOP_CLIENT_SECRET,
      scope: "offline",
    }).toString(),
  });
  return res.json();
}

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  let access = cookies.whoop_access;
  const refresh = cookies.whoop_refresh;

  if (!access && !refresh) return res.status(401).json({ error: "not_authenticated" });

  if (!access && refresh) {
    const newTokens = await refreshToken(refresh);
    if (!newTokens.access_token) return res.status(401).json({ error: "refresh_failed" });
    access = newTokens.access_token;
    const opts = "Path=/; HttpOnly; Secure; SameSite=Lax";
    res.setHeader("Set-Cookie", [
      `whoop_access=${newTokens.access_token}; ${opts}; Max-Age=3600`,
      `whoop_refresh=${newTokens.refresh_token || refresh}; ${opts}; Max-Age=2592000`,
    ]);
  }

  try {
    const headers = { Authorization: `Bearer ${access}` };
    const [recRes, sleepRes, cycleRes] = await Promise.all([
      fetch("https://api.prod.whoop.com/developer/v1/recovery?limit=1", { headers }),
      fetch("https://api.prod.whoop.com/developer/v1/sleep?limit=1", { headers }),
      fetch("https://api.prod.whoop.com/developer/v1/cycle?limit=1", { headers }),
    ]);

    const [recData, sleepData, cycleData] = await Promise.all([
      recRes.json(), sleepRes.json(), cycleRes.json(),
    ]);

    const rec   = recData.records?.[0];
const sleep = sleepData.records?.[0];
const cycle = cycleData.records?.[0];

// Debug — remove after testing
console.log("REC:", JSON.stringify(recData));
console.log("SLEEP:", JSON.stringify(sleepData));
console.log("CYCLE:", JSON.stringify(cycleData));

    res.status(200).json({
      recovery: {
        score: Math.round(rec?.score?.recovery_score ?? 0),
        hrv:   Math.round(rec?.score?.hrv_rmssd_milli ?? 0),
        rhr:   Math.round(rec?.score?.resting_heart_rate ?? 0),
      },
      sleep: {
        score:      Math.round(sleep?.score?.sleep_performance_percentage ?? 0),
        hours:      sleep?.score?.stage_summary?.total_in_bed_time_milli
                      ? Math.round((sleep.score.stage_summary.total_in_bed_time_milli / 3600000) * 10) / 10
                      : 0,
        efficiency: Math.round(sleep?.score?.sleep_efficiency_percentage ?? 0),
      },
      strain: {
        score: Math.round((cycle?.score?.strain ?? 0) * 10) / 10,
        avgHr: Math.round(cycle?.score?.average_heart_rate ?? 0),
        maxHr: Math.round(cycle?.score?.max_heart_rate ?? 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "fetch_failed", details: err.message });
  }
}
