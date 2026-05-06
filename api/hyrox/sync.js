import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { getAccessTokenFromRequest } from "../lib/sessionToken.js";

const MIKA_BASE = "https://hyrox.r.mikatiming.com";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = getAccessTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { athleteId, athleteName, dob } = req.body || {};
  if (!athleteId) return res.status(400).json({ error: "athleteId required" });

  try {
    const profileUrl = `${MIKA_BASE}/season-7/?content=ranking&page=1&event_main_group=hyrox&pid=search&idp=${encodeURIComponent(String(athleteId))}`;

    const profileResp = await fetch(profileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TheLab/1.0)",
        Accept: "text/html",
      },
    });
    if (!profileResp.ok) {
      return res.status(502).json({
        error: "profile_fetch_failed",
        status: profileResp.status,
      });
    }
    const profileHtml = await profileResp.text();
    const raceLinks = parseRaceList(profileHtml);

    const races = [];
    for (const link of raceLinks) {
      try {
        const detailResp = await fetch(link.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; TheLab/1.0)",
            Accept: "text/html",
          },
        });
        if (!detailResp.ok) {
          console.error("[hyrox/sync] race fetch failed", link.url, detailResp.status);
          continue;
        }
        const detailHtml = await detailResp.text();
        const parsed = parseRaceDetail(detailHtml, link);
        if (parsed) races.push(parsed);
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error("[hyrox/sync] race fetch failed", link.url, err?.message || err);
      }
    }

    const rows = races.map((race) => ({ ...race, user_id: user.id }));
    if (rows.length > 0) {
      const { error } = await supabase
        .from("hyrox_races")
        .upsert(rows, { onConflict: "user_id,external_id" });

      if (error) {
        console.error("[hyrox/sync] DB upsert error", error);
        return res.status(500).json({ error: "DB write failed", details: error.message });
      }
    }

    await supabase.from("hyrox_athlete_profiles").upsert({
      user_id: user.id,
      athlete_name: athleteName || `Athlete ${athleteId}`,
      athlete_external_id: String(athleteId),
      date_of_birth: dob || null,
      last_synced_at: new Date().toISOString(),
    });

    return res.json({
      synced: rows.length,
      races: rows,
      links_found: raceLinks.length,
    });
  } catch (err) {
    console.error("[hyrox/sync]", err);
    return res.status(500).json({ error: err?.message || "sync_failed" });
  }
}

function parseRaceList(html) {
  const $ = cheerio.load(String(html || ""));
  const links = [];
  const seen = new Set();

  $("a[href*='event']").each((_, el) => {
    const href = String($(el).attr("href") || "").trim();
    if (!href || !/idp=/i.test(href)) return;
    const url = href.startsWith("http") ? href : `${MIKA_BASE}${href.startsWith("/") ? "" : "/"}${href}`;
    if (seen.has(url)) return;
    seen.add(url);
    links.push({
      url,
      label: normalizeSpace($(el).text()) || null,
    });
  });

  if (links.length > 0) return links;

  const fallbackPattern = /<a\s+href="([^"]*event[^"]*idp=[^"]*)"[^>]*>(.*?)<\/a>/gi;
  for (const m of String(html || "").matchAll(fallbackPattern)) {
    const href = m[1];
    const url = href.startsWith("http") ? href : `${MIKA_BASE}${href.startsWith("/") ? "" : "/"}${href}`;
    if (seen.has(url)) continue;
    seen.add(url);
    links.push({
      url,
      label: normalizeSpace(stripTags(m[2] || "")) || null,
    });
  }

  return links;
}

function parseRaceDetail(html, link) {
  const externalId = extractExternalId(link?.url);
  const eventName = link?.label || extractEventName(html);
  const eventDate = extractEventDate(html);
  if (!externalId && !eventName) return null;

  return {
    external_id: externalId,
    event_name: eventName || "HYROX Race",
    event_date: eventDate || new Date().toISOString().slice(0, 10),
    division: extractDivision(html),
    format: extractFormat(html),
    total_time_seconds: parseTime(extractTotalTime(html)),
    overall_rank: parseInteger(extractOverallRank(html)),
    division_rank: parseInteger(extractDivisionRank(html)),
    age_group_rank: parseInteger(extractAgeGroupRank(html)),

    run_1_seconds: parseTime(extractSplit(html, "Running 1")),
    run_2_seconds: parseTime(extractSplit(html, "Running 2")),
    run_3_seconds: parseTime(extractSplit(html, "Running 3")),
    run_4_seconds: parseTime(extractSplit(html, "Running 4")),
    run_5_seconds: parseTime(extractSplit(html, "Running 5")),
    run_6_seconds: parseTime(extractSplit(html, "Running 6")),
    run_7_seconds: parseTime(extractSplit(html, "Running 7")),
    run_8_seconds: parseTime(extractSplit(html, "Running 8")),

    ski_erg_seconds: parseTime(extractSplit(html, "SkiErg")),
    sled_push_seconds: parseTime(extractSplit(html, "Sled Push")),
    sled_pull_seconds: parseTime(extractSplit(html, "Sled Pull")),
    burpee_broad_jumps_seconds: parseTime(extractSplit(html, "Burpee")),
    rowing_seconds: parseTime(extractSplit(html, "Row")),
    farmers_carry_seconds: parseTime(extractSplit(html, "Farmer")),
    sandbag_lunges_seconds: parseTime(extractSplit(html, "Sandbag")),
    wall_balls_seconds: parseTime(extractSplit(html, "Wall Ball")),

    roxzone_seconds: parseTime(extractRoxzone(html)),
    source_url: link?.url || null,
    raw_html: String(html || "").slice(0, 50000),
  };
}

function parseTime(timeStr) {
  if (!timeStr) return null;
  const clean = String(timeStr).trim();
  const parts = clean.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function parseInteger(value) {
  const n = Number(String(value || "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractExternalId(url) {
  return String(url || "").match(/[?&]idp=([A-Z0-9]+)/i)?.[1] || null;
}

function extractEventName(html) {
  const $ = cheerio.load(String(html || ""));
  const candidates = [
    $("h1").first().text(),
    $("title").first().text(),
    $(".event-name").first().text(),
  ];
  return candidates.map(normalizeSpace).find(Boolean) || null;
}

function extractEventDate(html) {
  const body = stripTags(String(html || ""));
  const m = body.match(/\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/);
  if (!m) return null;
  const iso = coerceDateToIso(m[1]);
  return iso || null;
}

function coerceDateToIso(value) {
  const raw = String(value || "").trim();
  const sep = raw.includes(".") ? "." : raw.includes("/") ? "/" : "-";
  const parts = raw.split(sep).map((p) => p.trim());
  if (parts.length !== 3) return null;
  let [a, b, c] = parts;
  if (c.length === 2) c = `20${c}`;
  const day = Number(a);
  const month = Number(b);
  const year = Number(c);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractDivision(html) {
  return extractLabelValue(html, ["Division", "Age Group", "Category"]);
}

function extractFormat(html) {
  const text = stripTags(String(html || "")).toLowerCase();
  if (text.includes("double")) return "doubles";
  if (text.includes("relay")) return "relay";
  if (text.includes("single")) return "singles";
  return null;
}

function extractTotalTime(html) {
  return extractLabelValue(html, ["Total Time", "Gun Time", "Net Time"]);
}

function extractOverallRank(html) {
  return extractLabelValue(html, ["Overall Rank", "Rank Overall", "Overall"]);
}

function extractDivisionRank(html) {
  return extractLabelValue(html, ["Division Rank", "Rank Division", "Category Rank"]);
}

function extractAgeGroupRank(html) {
  return extractLabelValue(html, ["Age Group Rank", "Age Rank"]);
}

function extractSplit(html, splitName) {
  const $ = cheerio.load(String(html || ""));
  const needle = String(splitName || "").toLowerCase();

  let value = null;
  $("tr").each((_, tr) => {
    if (value) return;
    const cells = $(tr).find("th,td");
    if (cells.length < 2) return;
    const key = normalizeSpace($(cells[0]).text()).toLowerCase();
    if (!key.includes(needle)) return;
    const candidate = normalizeSpace($(cells[cells.length - 1]).text());
    if (candidate && /\d+:\d+/.test(candidate)) value = candidate;
  });
  if (value) return value;

  const text = stripTags(String(html || ""));
  const escaped = splitName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}[^\\d]*(\\d{1,2}:\\d{2}(?::\\d{2})?)`, "i");
  return text.match(re)?.[1] || null;
}

function extractRoxzone(html) {
  return extractLabelValue(html, ["Roxzone", "ROXZONE", "Transition"]);
}

function extractLabelValue(html, labels) {
  const $ = cheerio.load(String(html || ""));
  for (const label of labels || []) {
    const needle = String(label).toLowerCase();
    let found = null;

    $("tr").each((_, tr) => {
      if (found) return;
      const cells = $(tr).find("th,td");
      if (cells.length < 2) return;
      const key = normalizeSpace($(cells[0]).text()).toLowerCase();
      if (!key.includes(needle)) return;
      found = normalizeSpace($(cells[cells.length - 1]).text()) || null;
    });
    if (found) return found;

    const text = stripTags(String(html || ""));
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${escaped}\\s*[:|-]?\\s*([^\\n\\r]+)`, "i");
    const m = text.match(re);
    if (m?.[1]) return normalizeSpace(m[1]);
  }
  return null;
}

function stripTags(html) {
  return String(html || "").replace(/<[^>]+>/g, " ");
}

function normalizeSpace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}
