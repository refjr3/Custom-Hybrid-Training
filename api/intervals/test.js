/**
 * Debug Intervals.icu auth + wellness fetch (no DB writes).
 * GET /api/intervals/test
 *
 * Logs full Basic header on the server (Vercel function logs) — remove or
 * protect this route after debugging.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.INTERVALS_API_KEY;
  const athleteId = process.env.INTERVALS_ATHLETE_ID;

  console.log("[intervals/test] athleteId:", athleteId);
  console.log("[intervals/test] apiKey present:", !!apiKey);
  console.log("[intervals/test] apiKey length:", apiKey?.length);

  if (!apiKey || !athleteId) {
    return res.status(503).json({
      error: "intervals_missing_env",
      apiKeyPresent: Boolean(apiKey),
      athleteIdPresent: Boolean(athleteId),
    });
  }

  const auth = Buffer.from(`API_KEY:${apiKey}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  console.log("[intervals/test] auth header:", `Basic ${auth}`);

  const oldest = "2026-04-06";
  const newest = "2026-04-13";
  const url = `https://intervals.icu/api/v1/athlete/${athleteId}/wellness?oldest=${oldest}&newest=${newest}`;

  let intervalsStatus = 0;
  let intervalsBodyText = "";
  try {
    const r = await fetch(url, { headers });
    intervalsStatus = r.status;
    intervalsBodyText = await r.text();
  } catch (e) {
    return res.status(200).json({
      error: "fetch_failed",
      message: e.message,
      url,
      debug: {
        athleteId,
        apiKeyPresent: true,
        apiKeyLength: apiKey.length,
      },
    });
  }

  let intervalsBodyJson = null;
  try {
    intervalsBodyJson = intervalsBodyText ? JSON.parse(intervalsBodyText) : null;
  } catch {
    intervalsBodyJson = null;
  }

  return res.status(200).json({
    intervals_request_url: url,
    intervals_http_status: intervalsStatus,
    intervals_ok: intervalsStatus >= 200 && intervalsStatus < 300,
    intervals_body_raw: intervalsBodyText,
    intervals_body_json: intervalsBodyJson,
    debug: {
      athleteId,
      apiKeyPresent: true,
      apiKeyLength: apiKey.length,
    },
  });
}
