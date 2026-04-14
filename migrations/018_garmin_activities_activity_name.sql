-- Preserve upstream activity titles (e.g. Strava names) for display/compliance matching
ALTER TABLE garmin_activities
  ADD COLUMN IF NOT EXISTS activity_name text;
