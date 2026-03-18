-- Migration 006: Add week_order to training_weeks
-- Safe to run multiple times — uses IF NOT EXISTS guard.

ALTER TABLE training_weeks
  ADD COLUMN IF NOT EXISTS week_order integer;

-- Verify:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'training_weeks' AND column_name = 'week_order';
