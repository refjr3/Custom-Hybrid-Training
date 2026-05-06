CREATE TABLE IF NOT EXISTS hyrox_races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  external_id text,
  event_name text NOT NULL,
  event_date date NOT NULL,
  division text,
  format text,

  total_time_seconds integer,
  overall_rank integer,
  division_rank integer,
  age_group_rank integer,

  run_1_seconds integer,
  run_2_seconds integer,
  run_3_seconds integer,
  run_4_seconds integer,
  run_5_seconds integer,
  run_6_seconds integer,
  run_7_seconds integer,
  run_8_seconds integer,

  ski_erg_seconds integer,
  sled_push_seconds integer,
  sled_pull_seconds integer,
  burpee_broad_jumps_seconds integer,
  rowing_seconds integer,
  farmers_carry_seconds integer,
  sandbag_lunges_seconds integer,
  wall_balls_seconds integer,

  roxzone_seconds integer,

  scraped_at timestamptz DEFAULT now(),
  source_url text,
  raw_html text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hyrox_races_user_date
  ON hyrox_races(user_id, event_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hyrox_races_user_external
  ON hyrox_races(user_id, external_id);

CREATE TABLE IF NOT EXISTS hyrox_athlete_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_name text NOT NULL,
  athlete_external_id text,
  date_of_birth date,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
