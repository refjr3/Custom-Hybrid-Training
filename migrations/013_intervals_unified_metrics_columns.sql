-- Migration 013: Additional unified_metrics fields for Intervals.icu sync
-- Safe to run multiple times.

ALTER TABLE unified_metrics
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS distance_meters numeric,
  ADD COLUMN IF NOT EXISTS avg_hr numeric,
  ADD COLUMN IF NOT EXISTS atl numeric,
  ADD COLUMN IF NOT EXISTS ctl numeric,
  ADD COLUMN IF NOT EXISTS tsb numeric,
  ADD COLUMN IF NOT EXISTS intervals_synced_at timestamptz;
