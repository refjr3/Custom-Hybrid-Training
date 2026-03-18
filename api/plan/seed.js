// Temporary one-shot seed endpoint.
// Call: GET /api/plan/seed?secret=triad2026
// Upserts all 19 training weeks and 133 days into Supabase.
// DELETE THIS FILE once the seed succeeds.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ---------------------------------------------------------------------------
// Training data — mirrors hardcoded BLOCKS in src/App.jsx
// ---------------------------------------------------------------------------
const d = (day_name, date_label, am_session, pm_session, note, isRaceDay, isSunday) => ({
  day_name,
  date_label,
  am_session: am_session || null,
  pm_session: pm_session || null,
  note:        note        || null,
  is_race_day: !!isRaceDay,
  is_sunday:   !!isSunday,
});

const taperWeeks = [
  {
    week_id: "tw1", block_id: "taper",
    label: "TAPER WK 1", dates: "Mar 15–21",
    phase: "MIAMI TAPER", subtitle: "Moderate Volume · Stay Sharp", week_order: 1,
    days: [
      d("MON","Mar 16","FOR TIME — Hyrox Full Runs Half Stations",null,"80% effort. Don't race it."),
      d("TUE","Mar 17","THRESHOLD — 10×2 Min",null,"Scale to 6×2. Maintain Z4 quality."),
      d("WED","Mar 18","STRENGTH A — Full Body Power","ZONE 2 — Easy Aerobic","AM strength · PM 30 min Z2."),
      d("THU","Mar 19","TEMPO — 20 Min Sustained",null,"Controlled. Z3–Z4. No Z5."),
      d("FRI","Mar 20","FOR TIME — Hyrox Full Send",null,"Lap every station."),
      d("SAT","Mar 21","LONG RUN — Base Builder",null,"8–9 miles @ Z2. Last long effort before Miami."),
      d("SUN","Mar 22",null,null,"Choose your Sunday session below.",false,true),
    ],
  },
  {
    week_id: "tw2", block_id: "taper",
    label: "TAPER WK 2", dates: "Mar 22–28",
    phase: "MIAMI TAPER", subtitle: "Reduced Volume · Race Sharpness", week_order: 2,
    days: [
      d("MON","Mar 23","EMOM 40 — Full Hyrox",null,"Controlled EMOM. Keep HR managed."),
      d("TUE","Mar 24","THRESHOLD — 10×2 Min",null,"Scale to 4×2 @ race pace only."),
      d("WED","Mar 25","STRENGTH B — Full Body Pull","ZONE 2 — Easy Aerobic","AM pull · PM 25 min easy."),
      d("THU","Mar 26","TEMPO — 20 Min Sustained",null,"Short and sharp. No Z5 this week."),
      d("FRI","Mar 27","ZONE 2 — Easy Aerobic",null,"15 min shakeout + 3 strides."),
      d("SAT","Mar 28","RECOVERY — Active Reset",null,"High carb dinner. 8+ hrs sleep."),
      d("SUN","Mar 29","RECOVERY — Active Reset",null,"Travel prep. Visualize race. Early bed.",false,true),
    ],
  },
  {
    week_id: "rw", block_id: "taper",
    label: "RACE WEEK", dates: "Mar 29–Apr 4",
    phase: "MIAMI RACE", subtitle: "Minimal Load · Peak Freshness", week_order: 3,
    days: [
      d("MON","Mar 30","ZONE 2 — Easy Aerobic",null,"15 min only. 3 strides. Walk away."),
      d("TUE","Mar 31","RECOVERY — Active Reset",null,"Full rest. Carb load begins."),
      d("WED","Apr 1","RECOVERY — Active Reset",null,"Off feet. High carb. Sleep."),
      d("THU","Apr 2","RECOVERY — Active Reset",null,"Travel day. Electrolytes. Race kit check."),
      d("FRI","Apr 3","RECOVERY — Active Reset",null,"Race eve. Dinner 6pm. Bed 9pm."),
      d("SAT","Apr 4","🏁 RACE DAY — MIAMI",null,"Wake 3hrs early · High carb · 10min jog + 4 strides · EXECUTE",true),
      d("SUN","Apr 5","RECOVERY — Active Reset",null,"Celebrate. High protein. Phase 1 Monday.",false,true),
    ],
  },
];

const makePhase = (num) => {
  const mo   = ["","Apr","May","Jun","Jul"][num];
  const px   = ["","p1","p2","p3","p4"][num];
  const subs = [
    "Base Rebuild · Reintroduce Volume",
    "Volume Up · Compromised Runs Longer",
    "Peak Week · Full HYROX Simulation",
    "Deload · Recover & Consolidate",
  ];
  const str  = [
    "STRENGTH A — Full Body Power",
    "STRENGTH B — Full Body Pull",
    "STRENGTH C — Full Body Hybrid",
    "STRENGTH A — Full Body Power",
  ];
  const hMon = [
    "FOR TIME — Hyrox Full Runs Half Stations",
    "EMOM 60 — Hyrox Stations",
    "FOR TIME — Ultimate HYROX",
    "AMRAP 40 — Hyrox Grind",
  ];
  const hFri = [
    "FOR TIME — Hyrox Full Send",
    "AMRAP 40 — Hyrox Grind",
    "AMRAP 60 — Ski Row Burpee",
    "EMOM 40 — Full Hyrox",
  ];
  const thu = [
    "TEMPO — 20 Min Sustained",
    "VO2 MAX — Short Intervals",
    "VO2 MAX — Short Intervals",
    "TEMPO — 20 Min Sustained",
  ];
  const lrn = [
    "7–8 miles @ Z2. Gel at 40 min.",
    "9–10 miles @ Z2. Gel every 40 min.",
    "11–12 miles @ Z2. Milestone.",
    "8 miles easy. Adaptation happens here.",
  ];

  return [0, 1, 2, 3].map((i) => ({
    week_id: `${px}w${i + 1}`,
    block_id: `phase${num}`,
    label: `PHASE ${num} · WK ${i + 1}`,
    dates: `${mo} ${7 + i * 7}–${13 + i * 7}`,
    phase: `PHASE ${num}`,
    subtitle: subs[i],
    week_order: i + 1,
    days: [
      d("MON",`${mo} ${7+i*7}`,  hMon[i], null, "Monday HYROX. Lap every station."),
      d("TUE",`${mo} ${8+i*7}`,  "THRESHOLD — 10×2 Min", null, "Z4 = 150–168 bpm on your Garmin."),
      d("WED",`${mo} ${9+i*7}`,  str[i], "ZONE 2 — Easy Aerobic", "AM strength · PM 30 min Z2. 2-a-day."),
      d("THU",`${mo} ${10+i*7}`, thu[i], null, i===1||i===2 ? "GREEN WHOOP only for VO2 Max." : "Controlled tempo. Z3–Z4."),
      d("FRI",`${mo} ${11+i*7}`, hFri[i], null, "Friday HYROX. Different format than Monday."),
      d("SAT",`${mo} ${12+i*7}`, "LONG RUN — Base Builder", null, lrn[i]),
      d("SUN",`${mo} ${13+i*7}`, null, null, "Choose your Sunday session below.", false, true),
    ],
  }));
};

const ALL_WEEKS = [
  ...taperWeeks,
  ...makePhase(1),
  ...makePhase(2),
  ...makePhase(3),
  ...makePhase(4),
];

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.query.secret !== "triad2026") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Optional: scope seeded rows to a specific user (pass ?user_id=<uuid>)
  const userId = req.query.user_id || null;

  const log = [];
  let weekOk = 0, dayOk = 0, errors = [];

  // Generate stable UUIDs for each block and build slug→UUID map
  const blockUuids = {
    taper:  crypto.randomUUID(),
    phase1: crypto.randomUUID(),
    phase2: crypto.randomUUID(),
    phase3: crypto.randomUUID(),
    phase4: crypto.randomUUID(),
  };

  const BLOCKS = [
    { block_id: blockUuids.taper,  label: "MIAMI TAPER", user_id: userId },
    { block_id: blockUuids.phase1, label: "PHASE 1",     user_id: userId },
    { block_id: blockUuids.phase2, label: "PHASE 2",     user_id: userId },
    { block_id: blockUuids.phase3, label: "PHASE 3",     user_id: userId },
    { block_id: blockUuids.phase4, label: "PHASE 4",     user_id: userId },
  ];

  // Count rows before wiping so the response can show before/after
  const countTable = async (name) => {
    const { count } = await supabase.from(name).select("*", { count: "exact", head: true });
    return count ?? 0;
  };
  const before = {
    training_blocks: await countTable("training_blocks"),
    training_weeks:  await countTable("training_weeks"),
    training_days:   await countTable("training_days"),
  };
  log.push(`before: blocks=${before.training_blocks} weeks=${before.training_weeks} days=${before.training_days}`);

  // Wipe in FK order: days → weeks → blocks
  for (const table of ["training_days", "training_weeks", "training_blocks"]) {
    const { error: delErr } = await supabase.from(table).delete().not("id", "is", null);
    if (delErr) return res.status(500).json({ error: `Failed to clear ${table}: ${delErr.message}` });
    log.push(`✓ cleared ${table}`);
  }

  // Seed blocks AFTER wipe so FK constraint is satisfied for the week inserts below
  const { error: blocksErr } = await supabase
    .from("training_blocks")
    .insert(BLOCKS);

  if (blocksErr) {
    return res.status(500).json({ error: `Failed to seed blocks: ${blocksErr.message}` });
  }
  log.push(`✓ seeded ${BLOCKS.length} training_blocks`);

  for (const week of ALL_WEEKS) {
    const { days, ...weekRow } = week;
    // Replace slug block_id with the actual UUID
    weekRow.block_id = blockUuids[weekRow.block_id];

    weekRow.user_id = userId;

    const { data: weekData, error: weekErr } = await supabase
      .from("training_weeks")
      .upsert(weekRow, { onConflict: "week_id" })
      .select("week_id")
      .single();

    if (weekErr) {
      const msg = `week ${week.week_id}: ${weekErr.message}`;
      log.push(`✗ ${msg}`);
      errors.push(msg);
      continue;
    }

    weekOk++;
    const weekDbId = weekData.week_id; // TEXT slug — matches training_days_week_id_fkey → training_weeks.week_id

    const dayRows = days.map((day) => ({
      ...day,
      week_id: weekDbId,
      user_id: userId,
    }));

    const { error: daysErr } = await supabase
      .from("training_days")
      .insert(dayRows);

    if (daysErr) {
      const msg = `days for ${week.week_id}: ${daysErr.message}`;
      log.push(`✗ ${msg}`);
      errors.push(msg);
    } else {
      dayOk += dayRows.length;
      log.push(`✓ ${week.block_id}/${week.week_id}  (${dayRows.length} days)`);
    }
  }

  const after = {
    training_blocks: await countTable("training_blocks"),
    training_weeks:  await countTable("training_weeks"),
    training_days:   await countTable("training_days"),
  };
  log.push(`after:  blocks=${after.training_blocks} weeks=${after.training_weeks} days=${after.training_days}`);

  const summary = {
    success: errors.length === 0,
    user_id: userId,
    weeks_seeded: weekOk,
    days_seeded: dayOk,
    counts: after,
    errors,
    log,
  };

  return res.status(errors.length === 0 ? 200 : 207).json(summary);
}
