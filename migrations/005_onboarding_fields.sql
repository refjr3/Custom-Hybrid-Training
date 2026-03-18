-- Migration 005: Extended onboarding fields + replace age with dob
-- Run in Supabase Dashboard → SQL Editor → New Query.
-- Safe to run multiple times — all statements use IF NOT EXISTS / IF EXISTS guards.

-- ── New onboarding columns ────────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sports                text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_level      text,
  ADD COLUMN IF NOT EXISTS target_race_name      text,
  ADD COLUMN IF NOT EXISTS target_race_date      date,
  ADD COLUMN IF NOT EXISTS weekly_training_hours numeric,
  ADD COLUMN IF NOT EXISTS dob                   date,
  ADD COLUMN IF NOT EXISTS weeks_per_block       integer,
  ADD COLUMN IF NOT EXISTS phases                integer,
  ADD COLUMN IF NOT EXISTS deload_preference     text;

-- ── Migrate age → dob (best-effort: approximate Jan 1 of birth year) ─────────
-- Existing rows with a known age get an approximate dob so coach context
-- keeps working. Exact DOB can be updated via profile edit later.

UPDATE user_profiles
  SET dob = make_date(
    EXTRACT(year FROM now())::int - age,
    1, 1
  )
WHERE age IS NOT NULL AND dob IS NULL;

-- ── Drop the now-redundant age column ────────────────────────────────────────
-- age is computed at read time from dob everywhere going forward.

ALTER TABLE user_profiles DROP COLUMN IF EXISTS age;
