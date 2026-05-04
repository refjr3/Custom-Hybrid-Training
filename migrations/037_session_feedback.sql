CREATE TABLE IF NOT EXISTS session_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  training_day_id uuid REFERENCES training_days(id) ON DELETE CASCADE,
  session_slot text CHECK (session_slot IN ('am', 'pm')),
  rpe_bucket text CHECK (rpe_bucket IN ('easy', 'solid', 'hard', 'brutal')),
  rpe_numeric integer,
  notes text,
  voice_note_url text,
  energy_pre integer,
  energy_post integer,
  pain_flag boolean DEFAULT false,
  pain_notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_feedback_user_idx
  ON session_feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS session_feedback_day_idx
  ON session_feedback (training_day_id);

ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own feedback"
  ON session_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own feedback"
  ON session_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own feedback"
  ON session_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE training_days
  ADD COLUMN IF NOT EXISTS am_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pm_completed_at timestamptz;
