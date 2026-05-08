CREATE TABLE IF NOT EXISTS manual_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  energy SMALLINT CHECK (energy BETWEEN 1 AND 5),
  legs TEXT CHECK (legs IN ('heavy', 'normal', 'fresh')),
  motivation TEXT CHECK (motivation IN ('low', 'moderate', 'high')),
  sleep_quality TEXT CHECK (sleep_quality IN ('poor', 'fair', 'good')),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_checkins_user_date
  ON manual_checkins(user_id, date);

ALTER TABLE manual_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own checkins" ON manual_checkins;
CREATE POLICY "Users read own checkins" ON manual_checkins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users upsert own checkins" ON manual_checkins;
CREATE POLICY "Users upsert own checkins" ON manual_checkins
  FOR ALL USING (auth.uid() = user_id);
