-- Migration 006: Add coach_persona column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS coach_persona text DEFAULT 'grinder';
