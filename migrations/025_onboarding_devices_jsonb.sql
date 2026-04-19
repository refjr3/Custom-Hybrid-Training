-- Stores tiered onboarding device picks + demand signals (Phase 4).
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_devices jsonb NOT NULL DEFAULT '{}'::jsonb;
