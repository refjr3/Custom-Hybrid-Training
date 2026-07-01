import type { SupabaseClient } from "@supabase/supabase-js";
import { addCalendarDaysToIsoYmd, getTodayIsoYmd } from "./recovery.js";
import { loadPlanModules } from "./planModules.js";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

const DAY_ORDER: Record<string, number> = {
  MON: 0,
  TUE: 1,
  WED: 2,
  THU: 3,
  FRI: 4,
  SAT: 5,
  SUN: 6,
};

const MONTH_TO_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export type WorkoutSession = {
  date: string;
  sessionName: string;
  type: string | null;
  duration: string | null;
  completed: boolean;
  plannedVsActual?: string;
};

type TrainingDayRow = {
  id: string;
  week_id: string;
  day_name: string;
  date_label: string | null;
  am_session: string | null;
  pm_session: string | null;
  am_session_type?: string | null;
  am_session_custom?: string | null;
  pm_session_custom?: string | null;
  am_completed_at?: string | null;
};

type TrainingWeekRow = {
  week_id: string;
  dates: string | null;
  days?: TrainingDayRow[];
};

type WeekDateUtils = {
  parseWeekDates: (
    datesStr: string | null,
    yearHint: number
  ) => { start: Date; end: Date } | null;
};

let weekDateUtilsPromise: Promise<WeekDateUtils> | null = null;

async function loadWeekDateUtils(): Promise<WeekDateUtils> {
  if (!weekDateUtilsPromise) {
    const href = pathToFileURL(
      join(REPO_ROOT, "src/features/plan/lib/weekDateUtils.js")
    ).href;
    weekDateUtilsPromise = import(href) as Promise<WeekDateUtils>;
  }
  return weekDateUtilsPromise;
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

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateLabelToIso(dateLabel: string | null, yearHint: number): string | null {
  if (!dateLabel) return null;
  const match = dateLabel.trim().match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (!match) return null;
  const monthIdx = MONTH_TO_INDEX[match[1].toLowerCase()];
  if (monthIdx === undefined) return null;
  const parsed = new Date(Date.UTC(yearHint, monthIdx, Number(match[2]), 12, 0, 0));
  if (!Number.isFinite(parsed.getTime())) return null;
  return formatYmd(parsed);
}

function resolveDayIndex(day: TrainingDayRow, fallbackIndex: number): number {
  const key = String(day.day_name || "").trim().toUpperCase().slice(0, 3);
  const mapped = DAY_ORDER[key];
  return Number.isInteger(mapped) ? mapped : fallbackIndex;
}

async function resolveCalendarDate(
  week: TrainingWeekRow,
  day: TrainingDayRow,
  dayIndex: number
): Promise<string | null> {
  // Match the app's resolver (src/features/plan/PlanWeekView.jsx `normalizeDays`):
  // training_days has NO calendar_date column, and date_label is display-only. The
  // authoritative date is the week's start (parsed from training_weeks.dates) plus the
  // day's DAY_ORDER offset (MON=0 … SUN=6), formatted via toISOString like the app.
  const yearHint = new Date().getFullYear();
  const { parseWeekDates } = await loadWeekDateUtils();
  const weekRange = parseWeekDates(week.dates, yearHint);
  if (weekRange?.start) {
    const d = new Date(weekRange.start);
    d.setDate(d.getDate() + resolveDayIndex(day, dayIndex));
    return d.toISOString().slice(0, 10);
  }

  // Fallback only when the week range can't be parsed: derive from the display label.
  const fromLabel = dateLabelToIso(day.date_label, yearHint);
  if (fromLabel) return fromLabel;

  return null;
}

function sessionName(day: TrainingDayRow): string {
  if (day.am_session_custom) {
    return String(day.am_session_custom).split("\n")[0].trim();
  }
  if (day.pm_session_custom) {
    return String(day.pm_session_custom).split("\n")[0].trim();
  }
  if (day.am_session) return day.am_session;
  if (day.pm_session) return day.pm_session;
  return "Rest";
}

function sessionType(day: TrainingDayRow): string | null {
  if (day.am_session_type) return day.am_session_type;
  const name = sessionName(day);
  if (!name || /^rest$/i.test(name)) return "rest";
  const lower = name.toLowerCase();
  if (lower.includes("threshold") || lower.includes("track")) return "threshold";
  if (lower.includes("z2") || lower.includes("easy")) return "z2";
  if (lower.includes("hyrox")) return "hyrox";
  if (lower.includes("lift") || lower.includes("strength")) return "strength";
  return "general";
}

function formatDuration(seconds: number | null | undefined): string | null {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return null;
  const minutes = Math.round(total / 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function plannedVsActual(
  day: TrainingDayRow,
  completion: { complete: boolean; source?: string },
  match: Record<string, unknown> | undefined
): string | undefined {
  const planned = sessionName(day);
  if (!planned || /^rest$/i.test(planned)) return undefined;
  if (!completion.complete) return `Planned: ${planned}`;

  const actualType = match?.activity_type ? String(match.activity_type) : null;
  const actualDuration = formatDuration(
    match?.duration_seconds as number | undefined
  );

  if (actualType && actualDuration) {
    return `Planned: ${planned} → Completed: ${actualType} (${actualDuration})`;
  }
  if (completion.source === "manual") {
    return `Planned: ${planned} → Marked complete`;
  }
  return `Planned: ${planned} → Completed`;
}

export async function getWorkouts(
  supabase: SupabaseClient,
  userId: string,
  days: number
): Promise<WorkoutSession[]> {
  const { start, end } = getDateRange(days);
  const plan = await loadPlanModules();
  const activeVariantId = await plan.getActiveVariantId(supabase, userId);

  const weeksQuery = plan.applyTrainingVariantFilter(
    supabase
      .from("training_weeks")
      .select("week_id, dates")
      .eq("user_id", userId)
      .order("week_order", { ascending: true }),
    activeVariantId
  );

  const { data: weeks, error: weeksErr } = (await weeksQuery) as {
    data: TrainingWeekRow[] | null;
    error: { message: string } | null;
  };
  if (weeksErr) {
    throw new Error(`Failed to fetch training weeks: ${weeksErr.message}`);
  }

  const weekIds = (weeks || []).map((w: TrainingWeekRow) => w.week_id).filter(Boolean);
  if (!weekIds.length) return [];

  const daysQuery = plan.applyTrainingVariantFilter(
    supabase
      .from("training_days")
      .select(
        "id, week_id, day_name, date_label, am_session, pm_session, am_session_custom, pm_session_custom, am_completed_at"
      )
      .eq("user_id", userId)
      .in("week_id", weekIds),
    activeVariantId
  );

  const daysResult = (await daysQuery) as {
    data: TrainingDayRow[] | null;
    error: { message: string } | null;
  };
  const { data: dayRows, error: daysErr } = daysResult;
  if (daysErr) {
    throw new Error(`Failed to fetch training days: ${daysErr.message}`);
  }

  const daysByWeek = new Map<string, TrainingDayRow[]>();
  for (const day of dayRows || []) {
    const row = day as TrainingDayRow;
    if (!daysByWeek.has(row.week_id)) daysByWeek.set(row.week_id, []);
    daysByWeek.get(row.week_id)!.push(row);
  }

  const weeksWithDays: TrainingWeekRow[] = (weeks || []).map((week: TrainingWeekRow) => ({
    ...week,
    days: daysByWeek.get(week.week_id) || [],
  }));

  const matches = await plan.matchSessionsToActivities(
    supabase,
    userId,
    weeksWithDays
  );

  const sessions: WorkoutSession[] = [];
  for (const week of weeksWithDays) {
    const weekDays = week.days || [];
    for (let dayIndex = 0; dayIndex < weekDays.length; dayIndex++) {
      const day = weekDays[dayIndex];
      const resolvedDate = await resolveCalendarDate(week, day, dayIndex);
      if (!resolvedDate || resolvedDate < start || resolvedDate > end) continue;

      const name = sessionName(day);
      const completion = plan.getCompletionState(day, matches);
      const match = matches.get(day.id);

      const entry: WorkoutSession = {
        date: resolvedDate,
        sessionName: name,
        type: sessionType(day),
        duration: formatDuration(match?.duration_seconds as number | undefined),
        completed: completion.complete,
      };

      const comparison = plannedVsActual(day, completion, match);
      if (comparison) entry.plannedVsActual = comparison;

      sessions.push(entry);
    }
  }

  return sessions.sort((a, b) => a.date.localeCompare(b.date));
}
