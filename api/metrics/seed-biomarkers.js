import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TARGET_USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc";
const REQUIRED_SECRET = "triad2026";

const dexa = [
  { category: "body_composition", label: "Total Body Fat %", value: 15.4, unit: "%", flag: "normal", date_collected: "2026-02-20" },
  { category: "body_composition", label: "Fat Mass", value: 32.79, unit: "lb", flag: "normal", date_collected: "2026-02-20" },
  { category: "body_composition", label: "Lean Mass", value: 179.74, unit: "lb", flag: "normal", date_collected: "2026-02-20" },
  { category: "body_composition", label: "Bone Mineral Content", value: 4092.88, unit: "g", flag: "normal", date_collected: "2026-02-20" },
  { category: "body_composition", label: "Total Mass", value: 212.53, unit: "lb", flag: "normal", date_collected: "2026-02-20" },
  { category: "body_composition", label: "ALMI", value: 10.7, unit: "kg/m²", flag: "normal", date_collected: "2026-02-20" },
  { category: "body_composition", label: "Android/Gynoid Ratio", value: 0.88, unit: "", flag: "normal", date_collected: "2026-02-20" },
  { category: "body_composition", label: "Est. VAT Area", value: 66.1, unit: "cm²", flag: "normal", date_collected: "2026-02-20" },
  { category: "body_composition", label: "Est. VAT Volume", value: 344, unit: "cm³", flag: "normal", date_collected: "2026-02-20" },
  { category: "body_composition", label: "Est. VAT Mass", value: 319, unit: "g", flag: "normal", date_collected: "2026-02-20" },
  { category: "body_composition", label: "Bone T-Score", value: 2.2, unit: "SD", flag: "normal", date_collected: "2026-02-20" },
  { category: "body_composition", label: "Bone Z-Score", value: 2.1, unit: "SD", flag: "normal", date_collected: "2026-02-20" },
];

const blood = [
  { category: "hormones", label: "Testosterone Total", value: 883, unit: "ng/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "hormones", label: "Testosterone Free", value: 117.2, unit: "pg/mL", flag: "normal", date_collected: "2026-03-18" },
  { category: "hormones", label: "Testosterone Bioavailable", value: 266.4, unit: "ng/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "hormones", label: "SHBG", value: 37, unit: "nmol/L", flag: "normal", date_collected: "2026-03-18" },
  { category: "hormones", label: "Estradiol", value: 34, unit: "pg/mL", flag: "normal", date_collected: "2026-03-18" },
  { category: "hormones", label: "DHEA-S", value: 164, unit: "mcg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "hormones", label: "Cortisol", value: 12.6, unit: "mcg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "thyroid", label: "TSH", value: 0.85, unit: "mIU/L", flag: "normal", date_collected: "2026-03-18" },
  { category: "thyroid", label: "T4 Total", value: 7.3, unit: "mcg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "thyroid", label: "Free T4 Index", value: 2.4, unit: "", flag: "normal", date_collected: "2026-03-18" },
  { category: "thyroid", label: "T3 Uptake", value: 33, unit: "%", flag: "normal", date_collected: "2026-03-18" },
  { category: "lipids", label: "Total Cholesterol", value: 196, unit: "mg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "lipids", label: "HDL", value: 68, unit: "mg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "lipids", label: "LDL", value: 111, unit: "mg/dL", flag: "high", date_collected: "2026-03-18" },
  { category: "lipids", label: "Triglycerides", value: 80, unit: "mg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "lipids", label: "Non-HDL Cholesterol", value: 128, unit: "mg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "lipids", label: "Chol/HDL Ratio", value: 2.9, unit: "", flag: "normal", date_collected: "2026-03-18" },
  { category: "lipids", label: "ApoB", value: 86, unit: "mg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "inflammation", label: "hs-CRP", value: 0.4, unit: "mg/L", flag: "normal", date_collected: "2026-03-18" },
  { category: "metabolic", label: "Glucose (fasting)", value: 82, unit: "mg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "metabolic", label: "HbA1c", value: 5.3, unit: "%", flag: "normal", date_collected: "2026-03-18" },
  { category: "kidney", label: "Creatinine", value: 1.30, unit: "mg/dL", flag: "high", date_collected: "2026-03-18" },
  { category: "kidney", label: "eGFR", value: 75, unit: "mL/min/1.73m²", flag: "normal", date_collected: "2026-03-18" },
  { category: "kidney", label: "BUN", value: 22, unit: "mg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "metabolic", label: "Calcium", value: 10.4, unit: "mg/dL", flag: "high", date_collected: "2026-03-18" },
  { category: "liver", label: "ALT", value: 35, unit: "U/L", flag: "normal", date_collected: "2026-03-18" },
  { category: "liver", label: "AST", value: 30, unit: "U/L", flag: "normal", date_collected: "2026-03-18" },
  { category: "liver", label: "GGT", value: 35, unit: "U/L", flag: "normal", date_collected: "2026-03-18" },
  { category: "iron", label: "Ferritin", value: 174, unit: "ng/mL", flag: "normal", date_collected: "2026-03-18" },
  { category: "iron", label: "Iron", value: 110, unit: "mcg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "iron", label: "Iron Binding Capacity", value: 367, unit: "mcg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "iron", label: "% Saturation", value: 30, unit: "%", flag: "normal", date_collected: "2026-03-18" },
  { category: "blood_count", label: "Hemoglobin", value: 15.9, unit: "g/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "blood_count", label: "Hematocrit", value: 46.2, unit: "%", flag: "normal", date_collected: "2026-03-18" },
  { category: "blood_count", label: "WBC", value: 5.8, unit: "K/uL", flag: "normal", date_collected: "2026-03-18" },
  { category: "blood_count", label: "Platelets", value: 269, unit: "K/uL", flag: "normal", date_collected: "2026-03-18" },
  { category: "metabolic", label: "Uric Acid", value: 6.0, unit: "mg/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "vitamins", label: "Vitamin D (25-OH)", value: 26, unit: "ng/mL", flag: "low", date_collected: "2026-03-18" },
  { category: "metabolic", label: "Albumin", value: 5.0, unit: "g/dL", flag: "normal", date_collected: "2026-03-18" },
  { category: "hormones", label: "IGF-1 LC/MS", value: 151, unit: "ng/mL", flag: "normal", date_collected: "2026-03-01" },
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (req.query?.secret !== REQUIRED_SECRET) return res.status(403).json({ error: "Forbidden" });

  try {
    const rows = [...dexa, ...blood].map((row) => ({
      user_id: TARGET_USER_ID,
      category: row.category,
      label: row.label,
      value: row.value,
      unit: row.unit ?? null,
      flag: String(row.flag || "normal").toUpperCase(),
      date_collected: row.date_collected,
    }));

    const { data, error } = await supabase
      .from("biomarkers")
      .upsert(rows, { onConflict: "user_id,label,date_collected" })
      .select("id");

    if (error) throw new Error(`Failed seeding biomarkers: ${error.message}`);

    return res.status(200).json({
      success: true,
      user_id: TARGET_USER_ID,
      rows_submitted: rows.length,
      rows_returned: data?.length || 0,
      dexa_rows: dexa.length,
      blood_rows: blood.length,
      total_rows_inserted: rows.length,
    });
  } catch (err) {
    console.error("[metrics/seed-biomarkers] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
