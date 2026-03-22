import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  const { attachment } = req.body;
  if (!attachment?.data || !attachment?.media_type) {
    return res.status(400).json({ error: "No attachment provided" });
  }

  const isImage = attachment.media_type.startsWith("image/");
  const isPdf = attachment.media_type === "application/pdf";
  if (!isImage && !isPdf) {
    return res.status(400).json({ error: "Attachment must be an image or PDF" });
  }

  const extractionPrompt = `Extract ALL bloodwork/lab values from this document. For each marker found, return a JSON object.

Return ONLY a JSON array (no markdown fences, no explanation):
[
  {"label": "Testosterone, Total", "value": "850", "unit": "ng/dL", "flag": "NORMAL", "category": "BLOOD"},
  {"label": "Vitamin D, 25-OH", "value": "28", "unit": "ng/mL", "flag": "LOW", "category": "BLOOD"}
]

Rules:
- flag must be exactly one of: HIGH, LOW, NORMAL, OPTIMAL
- category must be exactly one of: BLOOD, DXA, HORMONE, METABOLIC
- Extract EVERY marker visible — do not skip any
- Use the exact marker name as printed on the lab report
- If a reference range is shown, use it to determine the flag
- If no reference range, use clinical norms to flag HIGH/LOW
- value should be the numeric string as printed`;

  try {
    const content = [];
    if (isImage) {
      content.push({ type: "image", source: { type: "base64", media_type: attachment.media_type, data: attachment.data } });
    } else {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: attachment.data } });
    }
    content.push({ type: "text", text: extractionPrompt });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await response.json();
    if (data.error) {
      return res.status(500).json({ error: data.error.message || "Claude API error" });
    }

    const text = data.content?.[0]?.text || "";
    let markers;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      markers = JSON.parse(jsonMatch?.[0] || text);
    } catch (e) {
      return res.status(500).json({ error: "Failed to parse extraction results", raw: text });
    }

    if (!Array.isArray(markers) || markers.length === 0) {
      return res.status(200).json({ markers: [], message: "No markers found in document" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const rows = markers.map(m => ({
      user_id: user.id,
      label: m.label,
      value: m.value,
      unit: m.unit || null,
      flag: m.flag || "NORMAL",
      category: m.category || "BLOOD",
      date_collected: today,
    }));

    const { error: insertErr } = await supabase.from("biomarkers").insert(rows);
    if (insertErr) {
      console.error("[bloodwork] insert error:", insertErr.message);
      return res.status(200).json({ markers, inserted: false, error: insertErr.message });
    }

    return res.status(200).json({ markers, inserted: true, count: rows.length });
  } catch (err) {
    return res.status(500).json({ error: "Extraction failed", details: err.message });
  }
}
