-- Rich Strava Z2 weekly cache (minutes + per-activity list) for API / UI.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS strava_z2_cache jsonb;
