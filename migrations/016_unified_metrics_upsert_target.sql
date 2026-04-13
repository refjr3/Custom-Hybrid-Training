-- Ensure PostgREST/Supabase upsert onConflict (user_id, date, source) has a target.
-- Migration 008 already creates this index; this file re-applies safely if 008 was skipped.

CREATE UNIQUE INDEX IF NOT EXISTS unified_metrics_user_date_source
  ON unified_metrics (user_id, date, source);
