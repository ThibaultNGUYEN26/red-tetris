ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_password_token TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
ON users (LOWER(email))
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_reset_password_token_unique_idx
ON users (reset_password_token)
WHERE reset_password_token IS NOT NULL;

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT TRUE;

UPDATE rooms
SET is_listed = TRUE
WHERE is_listed IS NULL;

ALTER TABLE rooms
  ALTER COLUMN is_listed SET NOT NULL;
