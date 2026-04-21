-- Plan variants — users can have multiple plans, one is active
CREATE TABLE IF NOT EXISTS plan_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  variant_source text DEFAULT 'manual',
  block_length_weeks integer,
  phases jsonb DEFAULT '[]'::jsonb,
  training_priorities jsonb DEFAULT '[]'::jsonb,
  generation_context jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plan_variants_user_idx ON plan_variants (user_id, is_active);

ALTER TABLE plan_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own variants" ON plan_variants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users write own variants" ON plan_variants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own variants" ON plan_variants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own variants" ON plan_variants FOR DELETE USING (auth.uid() = user_id);

-- Link training_blocks, training_weeks, training_days to a variant
ALTER TABLE training_blocks
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES plan_variants(id) ON DELETE CASCADE;
ALTER TABLE training_weeks
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES plan_variants(id) ON DELETE CASCADE;
ALTER TABLE training_days
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES plan_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS training_blocks_variant_idx ON training_blocks (variant_id);
CREATE INDEX IF NOT EXISTS training_weeks_variant_idx ON training_weeks (variant_id);
CREATE INDEX IF NOT EXISTS training_days_variant_idx ON training_days (variant_id);
