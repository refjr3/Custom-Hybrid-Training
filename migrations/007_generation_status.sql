-- Migration 007: Add generation_status to user_profiles
-- Values: pending | in_progress | complete | failed
-- Safe to run multiple times — uses IF NOT EXISTS guard.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS generation_status text
    CHECK (generation_status IN ('pending', 'in_progress', 'complete', 'failed'))
    DEFAULT 'pending';

-- Verify:
-- SELECT column_name, data_type, column_default FROM information_schema.columns
-- WHERE table_name = 'user_profiles' AND column_name = 'generation_status';
