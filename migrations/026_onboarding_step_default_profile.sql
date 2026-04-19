-- New profiles should enter tiered onboarding at Step 1 (Phase 4).
ALTER TABLE user_profiles
  ALTER COLUMN onboarding_step SET DEFAULT 'profile';
