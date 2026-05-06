import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name } = req.body || {};
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: "Name required (min 2 chars)" });
  }

  try {
    const searchUrl = `https://hyrox.r.mikatiming.com/season-7/?content=search&search=${encodeURIComponent(String(name).trim())}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TheLab/1.0; +https://custom-hybrid-training.vercel.app)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Mika timing unavailable", status: response.status });
    }

    const html = await response.text();
    const athletes = parseAthleteSearchResults(html);
    return res.status(200).json({ athletes, source: "mika", searched: String(name).trim() });
  } catch (err) {
    console.error("[hyrox/search]", err);
    return res.status(500).json({ error: err?.message || "search_failed" });
  }
}

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAthleteSearchResults(html) {
  const athletes = [];
  const seen = new Set();

  const rowPattern = /<tr[^>]*class="[^"]*list-active-class-(?:event|name)[^"]*"[^>]*>(.*?)<\/tr>/gis;
  for (const rowMatch of html.matchAll(rowPattern)) {
    const row = rowMatch[1] || "";
    const idMatch = row.match(/(?:\?|&)idp=([A-Z0-9]+)/i);
    const nameMatch = row.match(/<a[^>]*>(.*?)<\/a>/i);
    if (!idMatch || !nameMatch) continue;

    const id = idMatch[1];
    if (seen.has(id)) continue;
    seen.add(id);

    const tdMatches = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gis)];
    const eventCell = tdMatches.find((m) => /HYROX/i.test(stripTags(m[1])));

    athletes.push({
      id,
      name: stripTags(nameMatch[1]),
      recent_event: eventCell ? stripTags(eventCell[1]) : null,
    });
  }

  return athletes;
}
