ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delete_after TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_delete_after_idx
ON users (delete_after)
WHERE deleted_at IS NOT NULL;
