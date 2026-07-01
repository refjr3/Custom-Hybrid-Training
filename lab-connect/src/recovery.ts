import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_PRIORITIES = {
  readiness: ["whoop", "oura", "garmin_body_battery", "apple_health", "manual"],
  hrv: ["whoop", "oura", "garmin", "apple_health"],
  resting_hr: ["whoop", "oura", "garmin", "apple_health"],
} as const;

const METRIC_FIELDS = {
  readiness: ["readiness_score", "readiness_color"],
  hrv: ["hrv_rmssd"],
  resting_hr: ["resting_hr"],
} as const;

type MetricKey = keyof typeof DEFAULT_PRIORITIES;
type UnifiedRow = Record<string, unknown>;

export type RecoveryDay = {
  date: string;
  readiness_score?: number;
  readiness_color?: string;
  hrv_rmssd?: number;
  resting_hr?: number;
  sources_used: Partial<Record<MetricKey, string>>;
};

function normalizeDateKey(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function addCalendarDaysToIsoYmd(isoYmd: string, deltaDays: number): string | null {
  const [y, m, d] = isoYmd.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const u = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  u.setUTCDate(u.getUTCDate() + deltaDays);
  const Y = u.getUTCFullYear();
  const M = String(u.getUTCMonth() + 1).padStart(2, "0");
  const D = String(u.getUTCDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

export function getTodayIsoYmd(): string {
  const now = new Date();
  const Y = now.getUTCFullYear();
  const M = String(now.getUTCMonth() + 1).padStart(2, "0");
  const D = String(now.getUTCDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

function resolveDay(
  date: string,
  sourceMap: Map<string, UnifiedRow>,
  prefs: Record<string, string>
): RecoveryDay {
  const row: RecoveryDay = { date, sources_used: {} };

  for (const metric of Object.keys(DEFAULT_PRIORITIES) as MetricKey[]) {
    const priorities = DEFAULT_PRIORITIES[metric];
    const userPref = prefs[metric];
    const order = userPref
      ? [userPref, ...priorities.filter((p) => p !== userPref)]
      : [...priorities];

    for (const source of order) {
      const srcRow = sourceMap.get(source);
      if (!srcRow) continue;

      const fields = METRIC_FIELDS[metric];
      const hasData = fields.some(
        (f) => srcRow[f] !== null && srcRow[f] !== undefined
      );
      if (!hasData) continue;

      for (const f of fields) {
        const value = srcRow[f];
        if (value !== null && value !== undefined) {
          (row as Record<string, unknown>)[f] = value;
        }
      }
      row.sources_used[metric] = source;
      break;
    }
  }

  return row;
}

function getDateRange(days: number): { start: string; end: string } {
  const end = getTodayIsoYmd();
  let start = end;
  for (let i = 0; i < days - 1; i++) {
    const prev = addCalendarDaysToIsoYmd(start, -1);
    if (!prev) break;
    start = prev;
  }
  return { start, end };
}

export async function getRecentRecovery(
  supabase: SupabaseClient,
  userId: string,
  days: number
): Promise<RecoveryDay[]> {
  const { start, end } = getDateRange(days);

  const { data: rows, error } = await supabase
    .from("unified_metrics")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch metrics: ${error.message}`);
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("source_preferences")
    .eq("user_id", userId)
    .maybeSingle();

  const prefs = (profile?.source_preferences as Record<string, string>) || {};

  const byDate = new Map<string, Map<string, UnifiedRow>>();
  for (const r of rows || []) {
    const dk = normalizeDateKey(r.date);
    if (!dk) continue;
    if (!byDate.has(dk)) byDate.set(dk, new Map());
    byDate.get(dk)!.set(String(r.source), r as UnifiedRow);
  }

  const results: RecoveryDay[] = [];
  let d = start;
  while (d && d <= end) {
    const sourceMap = byDate.get(d) || new Map();
    results.push(resolveDay(d, sourceMap, prefs));
    const next = addCalendarDaysToIsoYmd(d, 1);
    if (!next || next === d) break;
    d = next;
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

export function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables"
    );
  }

  return createClient(url, key);
}

export function getConfiguredUserId(): string {
  const userId = process.env.LAB_CONNECT_USER_ID;
  if (!userId) {
    throw new Error("Missing LAB_CONNECT_USER_ID environment variable");
  }
  return userId;
}
