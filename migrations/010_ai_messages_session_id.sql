-- Scope chat history to an explicit client session.
-- Safe to run multiple times.

ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS session_id uuid;

CREATE INDEX IF NOT EXISTS idx_ai_messages_user_session
  ON ai_messages(user_id, session_id, created_at DESC);
