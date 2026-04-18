-- Lab Phase 1: unified_metrics lab columns + profile fields for resolver / onboarding.
-- Run in Supabase SQL Editor after migration 008 (and 013–017 if applicable).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.
--
-- Note: unified_metrics was originally created in 008_unified_metrics.sql with a
-- smaller column set. This migration adds the Lab resolver fields without dropping
-- legacy columns (hrv, rhr, recovery_score, sleep_hours, etc.).

ALTER TABLE unified_metrics
  ADD COLUMN IF NOT EXISTS readiness_score numeric,
  ADD COLUMN IF NOT EXISTS readiness_color text,
  ADD COLUMN IF NOT EXISTS hrv_rmssd numeric,
  ADD COLUMN IF NOT EXISTS resting_hr numeric,
  ADD COLUMN IF NOT EXISTS sleep_total_min numeric,
  ADD COLUMN IF NOT EXISTS sleep_score numeric,
  ADD COLUMN IF NOT EXISTS sleep_deep_min numeric,
  ADD COLUMN IF NOT EXISTS sleep_rem_min numeric,
  ADD COLUMN IF NOT EXISTS sleep_light_min numeric,
  ADD COLUMN IF NOT EXISTS sleep_awake_min numeric,
  ADD COLUMN IF NOT EXISTS total_activity_min numeric,
  ADD COLUMN IF NOT EXISTS z2_minutes numeric,
  ADD COLUMN IF NOT EXISTS z3_minutes numeric,
  ADD COLUMN IF NOT EXISTS z4_plus_minutes numeric,
  ADD COLUMN IF NOT EXISTS body_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS unified_metrics_user_date
  ON unified_metrics (user_id, date DESC);

DROP POLICY IF EXISTS "Service can write metrics" ON unified_metrics;
CREATE POLICY "Service can write metrics" ON unified_metrics
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS connected_sources jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_preferences jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step text DEFAULT 'devices',
  ADD COLUMN IF NOT EXISTS time_zone text DEFAULT 'America/New_York';
