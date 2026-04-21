-- Phase 9: primary HR zone for volume tracking + per-zone weekly targets (minutes/week).
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS selected_zone text DEFAULT 'z2',
  ADD COLUMN IF NOT EXISTS zone_targets jsonb DEFAULT '{"z2": 240, "z3": 60, "z4_plus": 30}'::jsonb;
