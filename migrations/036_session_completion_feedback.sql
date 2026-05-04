-- Session completion timestamps, user edit flag, and post-session feedback.

ALTER TABLE public.training_days
  ADD COLUMN IF NOT EXISTS am_completed_at timestamptz;

ALTER TABLE public.training_days
  ADD COLUMN IF NOT EXISTS is_user_modified boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  training_day_id uuid NOT NULL REFERENCES public.training_days (id) ON DELETE CASCADE,
  session_slot text NOT NULL DEFAULT 'am',
  rpe_bucket text,
  rpe_numeric numeric,
  notes text,
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_feedback_user_id ON public.session_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_training_day_id ON public.session_feedback (training_day_id);

ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own session_feedback" ON public.session_feedback;
CREATE POLICY "Users manage own session_feedback"
  ON public.session_feedback
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access session_feedback" ON public.session_feedback;
CREATE POLICY "Service role full access session_feedback"
  ON public.session_feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
