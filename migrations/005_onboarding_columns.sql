-- Migration 005: Add onboarding columns to user_profiles
-- Run this in the Supabase SQL Editor AFTER migrations/004

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS races jsonb DEFAULT '[]';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS connected_wearables jsonb DEFAULT '{}';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deload_preference text;
