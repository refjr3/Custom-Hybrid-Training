-- Create supplements table and seed it for the seeded user.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query).

CREATE TABLE IF NOT EXISTS supplements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  dose        text NOT NULL,
  note        text,
  timing      text NOT NULL,
  time_group  text NOT NULL,  -- MORNING | AFTERNOON | NIGHT | DAILY TARGETS
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own supplements"
  ON supplements FOR SELECT
  USING (auth.uid() = user_id);

-- Seed current stack for the seeded user
INSERT INTO supplements (user_id, name, dose, note, timing, time_group, sort_order) VALUES
  ('a3b4d96d-6b2b-47fe-ba0f-d37262dd043d', 'Beta Alanine',         '3.2–6.4g',   'With breakfast. Tingling is normal.',                        'AM',         'MORNING',        0),
  ('a3b4d96d-6b2b-47fe-ba0f-d37262dd043d', 'Creatine Monohydrate', '5g',          'Daily. Any time — just stay consistent.',                    'ANY',        'MORNING',        1),
  ('a3b4d96d-6b2b-47fe-ba0f-d37262dd043d', 'Whey Protein #1',      '25–40g',      'Post AM workout or with breakfast.',                         'POST AM',    'MORNING',        2),
  ('a3b4d96d-6b2b-47fe-ba0f-d37262dd043d', 'Whey Protein #2',      '25–40g',      'Post PM workout or between meals.',                          'POST PM',    'AFTERNOON',      3),
  ('a3b4d96d-6b2b-47fe-ba0f-d37262dd043d', 'Magnesium Glycinate',  '300–400mg',   'Supports deep sleep and HRV. 30–60 min pre-bed.',           'NIGHT',      'NIGHT',          4),
  ('a3b4d96d-6b2b-47fe-ba0f-d37262dd043d', 'L-Theanine',           '200–400mg',   'Pairs with magnesium for calm, natural sleep.',             'NIGHT',      'NIGHT',          5),
  ('a3b4d96d-6b2b-47fe-ba0f-d37262dd043d', 'Sermorelin',           'Per Rx',      'Empty stomach before sleep. Max GH pulse.',                 'PRE-SLEEP',  'NIGHT',          6),
  ('a3b4d96d-6b2b-47fe-ba0f-d37262dd043d', 'Protein',              '180–215g',    '~1g per lb lean mass. 2 shakes + meals.',                   'ALL DAY',    'DAILY TARGETS',  7),
  ('a3b4d96d-6b2b-47fe-ba0f-d37262dd043d', 'Hydration',            '3–4L',        'Critical for creatine + endurance performance.',            'ALL DAY',    'DAILY TARGETS',  8),
  ('a3b4d96d-6b2b-47fe-ba0f-d37262dd043d', 'LDL / ApoB',           'Diet flag',   'LDL 145 ⚠ · ApoB 103 ⚠ — reduce sat fat.',                'EVERY MEAL', 'DAILY TARGETS',  9)
ON CONFLICT DO NOTHING;
