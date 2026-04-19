-- Columns referenced in app code but sometimes missing if earlier migrations were not applied.
-- Idempotent: safe to re-run (IF NOT EXISTS).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS hyrox_division text,
  ADD COLUMN IF NOT EXISTS hyrox_format text,
  ADD COLUMN IF NOT EXISTS bodybuilding_stage_status text;
