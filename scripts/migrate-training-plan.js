#!/usr/bin/env node
// Migration script: inserts all training weeks and days into Supabase
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/migrate-training-plan.js

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// --- Training data (mirrors App.jsx) ---

const d = (day, date, am, pm, note2a, isRaceDay, isSunday) => ({
  day,
  date,
  am: am || null,
  pm: pm || null,
  note2a: note2a || null,
  is_race_day: !!isRaceDay,
  is_sunday: !!isSunday,
});

const taperWeeks = [
  {
    week_id: "tw1", block_id: "taper", label: "TAPER WK 1",
    dates: "Mar 15–21", phase: "MIAMI TAPER",
    subtitle: "Moderate Volume · Stay Sharp", sort_order: 1,
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
    week_id: "tw2", block_id: "taper", label: "TAPER WK 2",
    dates: "Mar 22–28", phase: "MIAMI TAPER",
    subtitle: "Reduced Volume · Race Sharpness", sort_order: 2,
    days: [
      d("MON","Mar 23","EMOM 40 — Full Hyrox",null,"Controlled EMOM. Keep HR managed."),
      d("TUE","Mar 24","THRESHOLD — 10×2 Min",null,"Scale to 4×2 @ race pace only."),
      d("WED","Mar 25","STRENGTH B — Full Body Pull","ZONE 2 — Easy Aerobic","AM pull · PM 25 min easy."),
      d("THU","Mar 26","TEMPO — 20 Min Sustained",null,"Short and sharp. No Z5 this week."),
      d("FRI","Mar 27","ZONE 2 — Easy Aerobic",null,"15 min shakeout + 3 strides."),
      d("SAT","Mar 28","RECOVERY — Active Reset",null,"High carb dinner. 8+ hrs sleep."),
      d("SUN","Mar 29","RECOVERY — Active Reset",null,"Travel prep. Visualize race. Early bed."),
    ],
  },
  {
    week_id: "rw", block_id: "taper", label: "RACE WEEK",
    dates: "Mar 29–Apr 4", phase: "MIAMI RACE",
    subtitle: "Minimal Load · Peak Freshness", sort_order: 3,
    days: [
      d("MON","Mar 30","ZONE 2 — Easy Aerobic",null,"15 min only. 3 strides. Walk away."),
      d("TUE","Mar 31","RECOVERY — Active Reset",null,"Full rest. Carb load begins."),
      d("WED","Apr 1","RECOVERY — Active Reset",null,"Off feet. High carb. Sleep."),
      d("THU","Apr 2","RECOVERY — Active Reset",null,"Travel day. Electrolytes. Race kit check."),
      d("FRI","Apr 3","RECOVERY — Active Reset",null,"Race eve. Dinner 6pm. Bed 9pm."),
      d("SAT","Apr 4","🏁 RACE DAY — MIAMI",null,"Wake 3hrs early · High carb · 10min jog + 4 strides · EXECUTE",true),
      d("SUN","Apr 5","RECOVERY — Active Reset",null,"Celebrate. High protein. Phase 1 Monday."),
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
  const thu  = [
    "TEMPO — 20 Min Sustained",
    "VO2 MAX — Short Intervals",
    "VO2 MAX — Short Intervals",
    "TEMPO — 20 Min Sustained",
  ];
  const lrn  = [
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
    sort_order: i + 1,
    days: [
      d("MON",`${mo} ${7+i*7}`,hMon[i],null,"Monday HYROX. Lap every station."),
      d("TUE",`${mo} ${8+i*7}`,"THRESHOLD — 10×2 Min",null,"Z4 = 150–168 bpm on your Garmin."),
      d("WED",`${mo} ${9+i*7}`,str[i],"ZONE 2 — Easy Aerobic","AM strength · PM 30 min Z2. 2-a-day."),
      d("THU",`${mo} ${10+i*7}`,thu[i],null,i===1||i===2?"GREEN WHOOP only for VO2 Max.":"Controlled tempo. Z3–Z4."),
      d("FRI",`${mo} ${11+i*7}`,hFri[i],null,"Friday HYROX. Different format than Monday."),
      d("SAT",`${mo} ${12+i*7}`,"LONG RUN — Base Builder",null,lrn[i]),
      d("SUN",`${mo} ${13+i*7}`,null,null,"Choose your Sunday session below.",false,true),
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

// --- Migration ---

async function migrate() {
  console.log(`Migrating ${ALL_WEEKS.length} weeks to Supabase...`);

  for (const week of ALL_WEEKS) {
    const { days, ...weekRow } = week;

    // Upsert week row
    const { data: weekData, error: weekErr } = await supabase
      .from("training_weeks")
      .upsert(weekRow, { onConflict: "week_id" })
      .select("id")
      .single();

    if (weekErr) {
      console.error(`Error upserting week ${week.week_id}:`, weekErr.message);
      continue;
    }

    const weekDbId = weekData.id;

    // Upsert days for this week
    const dayRows = days.map((day, sort_order) => ({
      ...day,
      week_id: weekDbId,
      sort_order,
    }));

    const { error: daysErr } = await supabase
      .from("training_days")
      .upsert(dayRows, { onConflict: "week_id,day" });

    if (daysErr) {
      console.error(`Error upserting days for ${week.week_id}:`, daysErr.message);
    } else {
      console.log(`✓ ${week.block_id} / ${week.week_id} — ${days.length} days`);
    }
  }

  console.log("Migration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
