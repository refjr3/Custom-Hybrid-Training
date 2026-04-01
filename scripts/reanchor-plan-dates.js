#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const TARGET_USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc";
const START_DATE_UTC = new Date("2026-04-13T00:00:00.000Z");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: Missing SUPABASE_URL and/or SUPABASE key env vars.");
  console.error("Set one of SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, or SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DAY_ORDER = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };

const fmtDateLabel = (d) =>
  d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

const weekRangeForOrder = (weekOrder) => {
  const start = new Date(START_DATE_UTC);
  start.setUTCDate(start.getUTCDate() + (weekOrder - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${fmtDateLabel(start)} – ${fmtDateLabel(end)}`;
};

const dayLabelFor = (weekOrder, dayName) => {
  const dayOffset = DAY_ORDER[dayName];
  if (!Number.isFinite(dayOffset)) {
    throw new Error(`Unknown day_name "${dayName}"`);
  }
  const d = new Date(START_DATE_UTC);
  d.setUTCDate(d.getUTCDate() + (weekOrder - 1) * 7 + dayOffset);
  return fmtDateLabel(d);
};

async function main() {
  const { data: weeks, error: weeksErr } = await supabase
    .from("training_weeks")
    .select("week_id,week_order")
    .eq("user_id", TARGET_USER_ID)
    .order("week_order", { ascending: true });

  if (weeksErr) throw new Error(`Failed reading weeks: ${weeksErr.message}`);
  if (!weeks?.length) throw new Error("No training_weeks found for target user.");

  const weekOrderByWeekId = new Map();
  for (const week of weeks) {
    weekOrderByWeekId.set(week.week_id, week.week_order);
    const { error: updateWeekErr } = await supabase
      .from("training_weeks")
      .update({ dates: weekRangeForOrder(week.week_order) })
      .eq("user_id", TARGET_USER_ID)
      .eq("week_id", week.week_id);
    if (updateWeekErr) {
      throw new Error(`Failed updating week ${week.week_id}: ${updateWeekErr.message}`);
    }
  }

  const { data: days, error: daysErr } = await supabase
    .from("training_days")
    .select("id,week_id,day_name")
    .eq("user_id", TARGET_USER_ID);

  if (daysErr) throw new Error(`Failed reading training_days: ${daysErr.message}`);
  if (!days?.length) throw new Error("No training_days found for target user.");

  for (const day of days) {
    const weekOrder = weekOrderByWeekId.get(day.week_id);
    if (!weekOrder) {
      throw new Error(`Missing week_order for day row week_id="${day.week_id}"`);
    }
    const nextLabel = dayLabelFor(weekOrder, day.day_name);
    const { error: updateDayErr } = await supabase
      .from("training_days")
      .update({ date_label: nextLabel })
      .eq("id", day.id)
      .eq("user_id", TARGET_USER_ID);
    if (updateDayErr) {
      throw new Error(`Failed updating day ${day.id}: ${updateDayErr.message}`);
    }
  }

  const { data: verifyDays, error: verifyErr } = await supabase
    .from("training_days")
    .select("week_id,day_name,date_label")
    .eq("user_id", TARGET_USER_ID);

  if (verifyErr) throw new Error(`Failed verifying rows: ${verifyErr.message}`);

  const sorted = (verifyDays || []).sort((a, b) => {
    const wa = weekOrderByWeekId.get(a.week_id) ?? 999;
    const wb = weekOrderByWeekId.get(b.week_id) ?? 999;
    if (wa !== wb) return wa - wb;
    return (DAY_ORDER[a.day_name] ?? 99) - (DAY_ORDER[b.day_name] ?? 99);
  });

  console.log("Updated plan dates for user:", TARGET_USER_ID);
  console.log("First 5 rows:");
  for (const row of sorted.slice(0, 5)) {
    console.log(`${row.week_id} | ${row.day_name} | ${row.date_label}`);
  }

  const { data: weekOne, error: weekOneErr } = await supabase
    .from("training_weeks")
    .select("label,dates,week_order")
    .eq("user_id", TARGET_USER_ID)
    .eq("week_order", 1)
    .single();
  if (weekOneErr) throw new Error(`Failed reading week 1: ${weekOneErr.message}`);
  console.log("Week 1:", weekOne.label, "|", weekOne.dates);
}

main().catch((err) => {
  console.error("Re-anchor failed:", err.message);
  process.exit(1);
});
