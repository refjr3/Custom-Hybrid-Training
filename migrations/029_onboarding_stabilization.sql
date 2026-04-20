-- Phase A — onboarding stabilization: sports column + race catalog for search.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sports jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS races_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sport text NOT NULL,
  category text,
  race_date date,
  city text,
  country text,
  source text DEFAULT 'curated',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS races_catalog_name_idx ON races_catalog USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS races_catalog_sport_idx ON races_catalog (sport);
CREATE INDEX IF NOT EXISTS races_catalog_date_idx ON races_catalog (race_date);

ALTER TABLE races_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "races_catalog readable by all authenticated users" ON races_catalog;
CREATE POLICY "races_catalog readable by all authenticated users"
  ON races_catalog FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "races_catalog service write" ON races_catalog;
CREATE POLICY "races_catalog service write"
  ON races_catalog FOR ALL
  USING (auth.role() = 'service_role');
