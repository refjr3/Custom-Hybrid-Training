-- Migration 000: Bootstrap core training, Garmin/Intervals activity storage, and AI chat tables.
--
-- Intended for a fresh Supabase project so 001_add_user_id.sql and 003_tighten_rls.sql can run
-- without missing-relation errors.
--
-- Column set is derived from:
--   - api/plan/generate.js, api/plan/seed-20week.js, api/plan/days.js, api/plan/update.js,
--     api/synthesis/morning.js
--   - api/intervals/sync.js, api/garmin/activities.js, api/metrics/trends.js
--   - api/coach/chat.js, api/coaching/proactive.js
--   - migrations 004, 010, 014, 018, 023, 024 (merged here so later files stay idempotent).
--
-- If your production information_schema differs, adjust this file to match before applying.
--
-- RLS: enable + service_role full access only. Migration 001 adds temporary allow-all policies;
-- migration 003 replaces them with user-scoped policies (same names as today).

-- ─── training_blocks ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.training_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  block_id text NOT NULL,
  phase text,
  label text,
  block_order integer
);

CREATE INDEX IF NOT EXISTS idx_training_blocks_user_block_order
  ON public.training_blocks (user_id, block_order);

ALTER TABLE public.training_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access training_blocks" ON public.training_blocks;
CREATE POLICY "Service role full access training_blocks"
  ON public.training_blocks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── training_weeks ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.training_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  week_id text NOT NULL,
  block_id text NOT NULL,
  label text,
  dates text,
  phase text,
  subtitle text,
  week_order integer
);

CREATE INDEX IF NOT EXISTS idx_training_weeks_block_week_order
  ON public.training_weeks (block_id, week_order);

CREATE UNIQUE INDEX IF NOT EXISTS training_weeks_user_week_id_key
  ON public.training_weeks (user_id, week_id);

ALTER TABLE public.training_weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access training_weeks" ON public.training_weeks;
CREATE POLICY "Service role full access training_weeks"
  ON public.training_weeks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── training_days ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.training_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  week_id text NOT NULL,
  day_name text NOT NULL,
  date_label text,
  am_session text,
  pm_session text,
  note text,
  is_race_day boolean NOT NULL DEFAULT false,
  is_sunday boolean NOT NULL DEFAULT false,
  ai_modified boolean NOT NULL DEFAULT false,
  am_session_custom text,
  pm_session_custom text,
  am_session_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  pm_session_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_modification_note text
);

CREATE INDEX IF NOT EXISTS idx_training_days_week_id
  ON public.training_days (week_id);

CREATE UNIQUE INDEX IF NOT EXISTS training_days_user_week_day_key
  ON public.training_days (user_id, week_id, day_name);

ALTER TABLE public.training_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access training_days" ON public.training_days;
CREATE POLICY "Service role full access training_days"
  ON public.training_days
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── garmin_activities (multi-source activity rows: Garmin, Strava, Intervals) ─

CREATE TABLE IF NOT EXISTS public.garmin_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  activity_id text NOT NULL,
  activity_type text,
  activity_name text,
  name text,
  date date,
  start_time timestamptz,
  duration_seconds integer,
  distance_meters numeric,
  avg_hr numeric,
  max_hr numeric,
  calories integer,
  aerobic_effect numeric,
  anaerobic_effect numeric,
  source text NOT NULL DEFAULT 'garmin',
  raw_data jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS garmin_activities_activity_id_key
  ON public.garmin_activities (activity_id);

CREATE INDEX IF NOT EXISTS idx_garmin_activities_user_start_time
  ON public.garmin_activities (user_id, start_time DESC);

ALTER TABLE public.garmin_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access garmin_activities" ON public.garmin_activities;
CREATE POLICY "Service role full access garmin_activities"
  ON public.garmin_activities
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── ai_messages ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id uuid,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_user_created_at
  ON public.ai_messages (user_id, created_at DESC);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access ai_messages" ON public.ai_messages;
CREATE POLICY "Service role full access ai_messages"
  ON public.ai_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
