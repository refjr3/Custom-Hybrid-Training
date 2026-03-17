#!/usr/bin/env node
// One-time restore: fixes am_session values corrupted by AI free-text writes.
// Run with:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/restore-corrupted-days.js
// or:
//   node --env-file=.env scripts/restore-corrupted-days.js

import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Rows to restore: [ week_id (slug), day, correct am_session, correct pm_session ]
const RESTORES = [
  { week_id: "tw1", day: "WED", am_session: "STRENGTH A — Full Body Power", pm_session: "ZONE 2 — Easy Aerobic", ai_modified: false, ai_modification_note: null },
];

async function restore() {
  let ok = 0, errors = 0;

  for (const row of RESTORES) {
    // Resolve UUID from slug
    const { data: weekRow, error: weekErr } = await supabase
      .from("training_weeks")
      .select("id")
      .eq("week_id", row.week_id)
      .single();

    if (weekErr || !weekRow) {
      console.error(`  ✗ week not found: ${row.week_id}`, weekErr?.message);
      errors++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("training_days")
      .update({
        am_session: row.am_session,
        pm_session: row.pm_session,
        ai_modified: row.ai_modified,
        ai_modification_note: row.ai_modification_note,
      })
      .eq("week_id", weekRow.id)
      .eq("day", row.day);

    if (updateErr) {
      console.error(`  ✗ ${row.week_id}/${row.day}: ${updateErr.message}`);
      errors++;
    } else {
      console.log(`  ✓ ${row.week_id}/${row.day} → am_session="${row.am_session}"`);
      ok++;
    }
  }

  console.log(`\nDone — ${ok} restored, ${errors} errors.`);
  if (errors) process.exit(1);
}

restore().catch((err) => {
  console.error("Restore failed:", err);
  process.exit(1);
});
