-- Migration 023: Add session blocks columns to training_days
-- Stores structured workout blocks as JSONB arrays
-- Run this in the Supabase SQL Editor

ALTER TABLE training_days
  ADD COLUMN IF NOT EXISTS am_session_blocks jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pm_session_blocks jsonb DEFAULT '[]';
