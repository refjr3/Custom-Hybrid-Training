-- Phase 10b: AI plan generation metadata on variants + request progress

ALTER TABLE plan_variants
  ADD COLUMN IF NOT EXISTS generation_reasoning jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS weekly_pattern jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_week integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS generation_model text;

ALTER TABLE plan_generation_requests
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS stage text;

-- stage values (app-enforced): intake_complete | generating_skeleton | generating_weeks |
--   generating_week1 | complete | failed
