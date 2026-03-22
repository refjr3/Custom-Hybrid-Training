-- Migration 008: Unified metrics table
-- Aggregates health/fitness data from multiple wearable sources
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS unified_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  source text NOT NULL,
  is_primary boolean DEFAULT false,
  hrv numeric,
  rhr numeric,
  recovery_score numeric,
  sleep_hours numeric,
  strain numeric,
  steps integer,
  active_calories integer,
  vo2_max numeric,
  training_load numeric,
  created_at timestamptz DEFAULT now()
);

-- Prevent duplicate entries for same user/date/source
CREATE UNIQUE INDEX IF NOT EXISTS unified_metrics_user_date_source
  ON unified_metrics (user_id, date, source);

-- Row Level Security
ALTER TABLE unified_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own metrics"
  ON unified_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
  ON unified_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
  ON unified_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- Add metric_sources preference to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS metric_sources jsonb DEFAULT '{}';
