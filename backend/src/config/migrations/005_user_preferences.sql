ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{"theme":"light","soundEnabled":true,"language":"en"}'::jsonb;

UPDATE users
SET preferences = COALESCE(preferences, '{"theme":"light","soundEnabled":true,"language":"en"}'::jsonb);

ALTER TABLE users
  ALTER COLUMN preferences SET NOT NULL;
