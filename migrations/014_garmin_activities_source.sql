-- Source of activity row (garmin, intervals, etc.) for unified feeds
ALTER TABLE garmin_activities
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'garmin';

CREATE INDEX IF NOT EXISTS idx_garmin_activities_user_source
  ON garmin_activities (user_id, source);
