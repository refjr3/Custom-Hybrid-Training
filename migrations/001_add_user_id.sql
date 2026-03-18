-- Phase 1: Add user_id to all tables + enable permissive RLS
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times — uses IF NOT EXISTS / IF EXISTS guards.

-- ─── 1. Add user_id column to each table (nullable FK → auth.users) ──────────

ALTER TABLE training_blocks
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE training_weeks
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE training_days
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE garmin_activities
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;


-- ─── 2. Enable RLS on each table ─────────────────────────────────────────────

ALTER TABLE training_blocks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_weeks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_days      ENABLE ROW LEVEL SECURITY;
ALTER TABLE garmin_activities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages        ENABLE ROW LEVEL SECURITY;


-- ─── 3. Permissive policies (allow-all for now, tighten in Phase 3) ──────────
-- These let the app continue working without auth while the schema is ready.
-- In Phase 3 replace USING (true) with USING (auth.uid() = user_id).

DROP POLICY IF EXISTS "allow_all_training_blocks"   ON training_blocks;
DROP POLICY IF EXISTS "allow_all_training_weeks"    ON training_weeks;
DROP POLICY IF EXISTS "allow_all_training_days"     ON training_days;
DROP POLICY IF EXISTS "allow_all_garmin_activities" ON garmin_activities;
DROP POLICY IF EXISTS "allow_all_ai_messages"       ON ai_messages;

CREATE POLICY "allow_all_training_blocks"
  ON training_blocks FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_training_weeks"
  ON training_weeks FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_training_days"
  ON training_days FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_garmin_activities"
  ON garmin_activities FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_ai_messages"
  ON ai_messages FOR ALL USING (true) WITH CHECK (true);


-- ─── 4. Index user_id on the tables queried per-user most often ──────────────

CREATE INDEX IF NOT EXISTS idx_training_blocks_user_id   ON training_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_training_weeks_user_id    ON training_weeks(user_id);
CREATE INDEX IF NOT EXISTS idx_training_days_user_id     ON training_days(user_id);
CREATE INDEX IF NOT EXISTS idx_garmin_activities_user_id ON garmin_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_id       ON ai_messages(user_id);


-- Done. Verify with:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'training_blocks' AND column_name = 'user_id';
