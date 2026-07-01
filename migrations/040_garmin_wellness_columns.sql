-- Garmin garth sync: Body Battery and stress (nullable; safe to re-run).
-- Canonical sleep/HRV columns already exist from 009_unified_metrics.sql.

ALTER TABLE unified_metrics
  ADD COLUMN IF NOT EXISTS body_battery numeric,
  ADD COLUMN IF NOT EXISTS stress_level numeric;
