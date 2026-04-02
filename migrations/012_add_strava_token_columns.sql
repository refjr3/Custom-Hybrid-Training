-- Migration 012: Add Strava token columns to user_profiles
-- Safe to run multiple times.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS strava_access_token text,
  ADD COLUMN IF NOT EXISTS strava_refresh_token text,
  ADD COLUMN IF NOT EXISTS strava_token_expires_at timestamptz;
