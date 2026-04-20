CREATE TABLE IF NOT EXISTS user_baselines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  computed_at timestamptz DEFAULT now(),

  baseline_recovery_score numeric,
  baseline_hrv_rmssd numeric,
  baseline_resting_hr numeric,
  baseline_sleep_total_min numeric,
  baseline_sleep_score numeric,
  baseline_sleep_deep_min numeric,
  baseline_sleep_rem_min numeric,
  baseline_sleep_awake_min numeric,
  baseline_z2_weekly_min numeric,

  days_of_data integer,
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_baselines_user_idx ON user_baselines (user_id);

ALTER TABLE user_baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own baselines" ON user_baselines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service manages baselines" ON user_baselines FOR ALL USING (auth.role() = 'service_role');
