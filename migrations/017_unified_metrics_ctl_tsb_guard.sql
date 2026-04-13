-- CTL/TSB for Intervals wellness sync (013 may already have added these)
ALTER TABLE unified_metrics ADD COLUMN IF NOT EXISTS ctl numeric;
ALTER TABLE unified_metrics ADD COLUMN IF NOT EXISTS tsb numeric;
