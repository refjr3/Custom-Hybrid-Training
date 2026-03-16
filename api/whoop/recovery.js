async function refreshAccessToken(refreshToken) {
  const clientId = process.env.VITE_WHOOP_CLIENT_ID;
  const clientSecret = process.env.VITE_WHOOP_CLIENT_SECRET;

  const res = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: "offline",
    }),
  });
  return res.json();
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const [key, ...val] = cookie.trim().split("=");
    cookies[key.trim()] = val.join("=").trim();
  });
  return cookies;
}

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  let accessToken = cookies.whoop_access_token;
  const refreshToken = cookies.whoop_refresh_token;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Try to refresh if no access token
  if (!accessToken && refreshToken) {
    const newTokens = await refreshAccessToken(refreshToken);
    if (newTokens.access_token) {
      accessToken = newTokens.access_token;
      const cookieOpts = "Path=/; HttpOnly; Secure; SameSite=Lax";
      res.setHeader("Set-Cookie", [
        `whoop_access_token=${newTokens.access_token}; ${cookieOpts}; Max-Age=3600`,
        `whoop_refresh_token=${newTokens.refresh_token}; ${cookieOpts}; Max-Age=2592000`,
      ]);
    } else {
      return res.status(401).json({ error: "Token refresh failed" });
    }
  }

  try {
    // Fetch recovery, sleep, and cycles in parallel
    const [recoveryRes, sleepRes, cyclesRes] = await Promise.all([
      fetch("https://api.prod.whoop.com/developer/v1/recovery?limit=1", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.prod.whoop.com/developer/v1/sleep?limit=1", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.prod.whoop.com/developer/v1/cycle?limit=1", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    const [recoveryData, sleepData, cyclesData] = await Promise.all([
      recoveryRes.json(),
      sleepRes.json(),
      cyclesRes.json(),
    ]);

    const recovery = recoveryData.records?.[0];
    const sleep = sleepData.records?.[0];
    const cycle = cyclesData.records?.[0];

    const result = {
      recovery: {
        score: Math.round(recovery?.score?.recovery_score ?? 0),
        hrv: Math.round(recovery?.score?.hrv_rmssd_milli ?? 0),
        rhr: Math.round(recovery?.score?.resting_heart_rate ?? 0),
      },
      sleep: {
        score: Math.round(sleep?.score?.sleep_performance_percentage ?? 0),
        hours: sleep?.score?.stage_summary?.total_in_bed_time_milli
          ? Math.round((sleep.score.stage_summary.total_in_bed_time_milli / 3600000) * 10) / 10
          : 0,
        efficiency: Math.round(sleep?.score?.sleep_efficiency_percentage ?? 0),
      },
      strain: {
        score: Math.round((cycle?.score?.strain ?? 0) * 10) / 10,
        avgHr: Math.round(cycle?.score?.average_heart_rate ?? 0),
        maxHr: Math.round(cycle?.score?.max_heart_rate ?? 0),
      },
    };

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch WHOOP data", details: err.message });
  }
}
