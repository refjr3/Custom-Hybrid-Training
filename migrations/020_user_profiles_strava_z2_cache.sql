ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS strava_z2_minutes integer,
  ADD COLUMN IF NOT EXISTS strava_z2_cached_at timestamptz;
