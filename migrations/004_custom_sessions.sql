-- Migration 004: add custom AI-generated session columns to training_days.
-- Run in Supabase Dashboard → SQL Editor → New Query.

ALTER TABLE training_days
  ADD COLUMN IF NOT EXISTS am_session_custom text,
  ADD COLUMN IF NOT EXISTS pm_session_custom text;

-- am_session_custom / pm_session_custom:
--   Populated by the AI when it generates a fully custom workout that doesn't
--   map to an existing WL key. am_session still holds the nearest matching WL
--   key (for type badge / colour / icon in the day grid). The SessionModal
--   renders am_session_custom content in place of the standard WL steps when
--   ai_modified = true and am_session_custom is non-null.
