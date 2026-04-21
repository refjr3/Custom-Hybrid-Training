-- Phase 10a: plan intake answers + profile schedule preference

CREATE TABLE IF NOT EXISTS plan_generation_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  days_per_week integer,
  schedule_flexibility text,
  unavailable_days jsonb DEFAULT '[]'::jsonb,
  main_focus text,
  race_date date,
  generation_context jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  variant_id uuid REFERENCES plan_variants(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plan_generation_requests_user_idx
  ON plan_generation_requests (user_id, created_at DESC);

ALTER TABLE plan_generation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own requests"
  ON plan_generation_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own requests"
  ON plan_generation_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own requests"
  ON plan_generation_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS schedule_flexibility text DEFAULT 'flexible';
