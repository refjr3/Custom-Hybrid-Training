-- Drawer / profile editor fields (run in Supabase SQL editor before relying on UI saves)

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS hyrox_division text,
  ADD COLUMN IF NOT EXISTS training_experience text,
  ADD COLUMN IF NOT EXISTS ai_tone text DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS ai_focus text DEFAULT 'performance';
