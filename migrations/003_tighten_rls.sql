-- Phase 3: Tighten RLS — users can only read/write their own rows.
-- Run AFTER migrations/001 and 002, and AFTER existing data has been
-- re-seeded with the correct user_id values.
--
-- NOTE: Rows with user_id IS NULL will become invisible after this migration.
-- Re-seed your plan first: GET /api/plan/seed?secret=triad2026&user_id=<your-uuid>

-- ─── training_blocks ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "allow_all_training_blocks" ON training_blocks;

CREATE POLICY "Users can read own blocks"
  ON training_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blocks"
  ON training_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blocks"
  ON training_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocks"
  ON training_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- ─── training_weeks ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "allow_all_training_weeks" ON training_weeks;

CREATE POLICY "Users can read own weeks"
  ON training_weeks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weeks"
  ON training_weeks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weeks"
  ON training_weeks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weeks"
  ON training_weeks FOR DELETE
  USING (auth.uid() = user_id);

-- ─── training_days ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "allow_all_training_days" ON training_days;

CREATE POLICY "Users can read own days"
  ON training_days FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own days"
  ON training_days FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own days"
  ON training_days FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own days"
  ON training_days FOR DELETE
  USING (auth.uid() = user_id);

-- ─── garmin_activities ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "allow_all_garmin_activities" ON garmin_activities;

CREATE POLICY "Users can read own garmin activities"
  ON garmin_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garmin activities"
  ON garmin_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garmin activities"
  ON garmin_activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own garmin activities"
  ON garmin_activities FOR DELETE
  USING (auth.uid() = user_id);

-- ─── ai_messages ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "allow_all_ai_messages" ON ai_messages;

CREATE POLICY "Users can read own ai messages"
  ON ai_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai messages"
  ON ai_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai messages"
  ON ai_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai messages"
  ON ai_messages FOR DELETE
  USING (auth.uid() = user_id);
