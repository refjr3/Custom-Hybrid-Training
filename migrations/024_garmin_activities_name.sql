-- Strava / Intervals workout title for Performance tab and feeds
ALTER TABLE garmin_activities ADD COLUMN IF NOT EXISTS name text;
