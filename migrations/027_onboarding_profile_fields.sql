-- Phase 4.9 — sport-agnostic onboarding profile fields (AI-ready context).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS training_experience text,
  ADD COLUMN IF NOT EXISTS weekly_training_hours text,
  ADD COLUMN IF NOT EXISTS sessions_per_day text,
  ADD COLUMN IF NOT EXISTS days_per_week text,
  ADD COLUMN IF NOT EXISTS training_environment text,
  ADD COLUMN IF NOT EXISTS equipment_access jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS injuries_limitations text,
  ADD COLUMN IF NOT EXISTS highest_competitive_level text,

  ADD COLUMN IF NOT EXISTS primary_focus text,

  ADD COLUMN IF NOT EXISTS primary_sport text,
  ADD COLUMN IF NOT EXISTS sport_format text,
  ADD COLUMN IF NOT EXISTS sport_distance text,
  ADD COLUMN IF NOT EXISTS sport_division text,
  ADD COLUMN IF NOT EXISTS hyrox_format text,
  ADD COLUMN IF NOT EXISTS target_race_name text,
  ADD COLUMN IF NOT EXISTS target_race_date date,

  ADD COLUMN IF NOT EXISTS performance_type text,
  ADD COLUMN IF NOT EXISTS sport_specific_other text,

  ADD COLUMN IF NOT EXISTS composition_goal text,
  ADD COLUMN IF NOT EXISTS body_fat_current numeric,
  ADD COLUMN IF NOT EXISTS body_fat_goal numeric,

  ADD COLUMN IF NOT EXISTS return_reason text,
  ADD COLUMN IF NOT EXISTS return_details text,
  ADD COLUMN IF NOT EXISTS return_time_off text,

  ADD COLUMN IF NOT EXISTS bodybuilding_stage_status text,

  ADD COLUMN IF NOT EXISTS secondary_goals jsonb DEFAULT '[]'::jsonb;
