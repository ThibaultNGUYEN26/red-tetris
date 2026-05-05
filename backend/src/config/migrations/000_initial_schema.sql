CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  avatar JSONB NOT NULL,
  password_hash TEXT,
  email TEXT,
  reset_password_token TEXT,
  reset_password_expires_at TIMESTAMPTZ,
  solo_games_played INT NOT NULL DEFAULT 0,
  highest_solo_score INT NOT NULL DEFAULT 0,
  multiplayer_games_played INT NOT NULL DEFAULT 0,
  multiplayer_wins INT NOT NULL DEFAULT 0,
  multiplayer_losses INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  delete_after TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS reset_password_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delete_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS multiplayer_games_played INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multiplayer_wins INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multiplayer_losses INT NOT NULL DEFAULT 0;

UPDATE users
SET
  multiplayer_games_played = COALESCE(multiplayer_games_played, 0),
  multiplayer_wins = COALESCE(multiplayer_wins, 0),
  multiplayer_losses = COALESCE(multiplayer_losses, 0);

ALTER TABLE users
  ALTER COLUMN multiplayer_games_played SET NOT NULL,
  ALTER COLUMN multiplayer_wins SET NOT NULL,
  ALTER COLUMN multiplayer_losses SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON users (LOWER(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_reset_password_token_unique_idx
  ON users (reset_password_token)
  WHERE reset_password_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_delete_after_idx
  ON users (delete_after)
  WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  game_mode TEXT NOT NULL,
  host TEXT NOT NULL,
  player_count INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  is_listed BOOLEAN NOT NULL DEFAULT TRUE,
  ready_again TEXT[] NOT NULL DEFAULT '{}',
  players TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'waiting',
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ready_again TEXT[] DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms'
      AND column_name = 'players'
      AND data_type = 'jsonb'
  ) THEN
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS players_tmp TEXT[] DEFAULT '{}';

    UPDATE rooms
    SET players_tmp = COALESCE(
      (
        SELECT array_agg(value)
        FROM jsonb_array_elements_text(players)
      ),
      '{}'
    );

    ALTER TABLE rooms DROP COLUMN players;
    ALTER TABLE rooms RENAME COLUMN players_tmp TO players;
  END IF;
END$$;

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS players TEXT[] DEFAULT '{}';

UPDATE rooms
SET
  status = COALESCE(status, 'waiting'),
  is_listed = COALESCE(is_listed, TRUE),
  ready_again = COALESCE(ready_again, '{}'),
  players = COALESCE(players, '{}');

ALTER TABLE rooms
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN is_listed SET NOT NULL,
  ALTER COLUMN ready_again SET NOT NULL,
  ALTER COLUMN players SET NOT NULL;

CREATE TABLE IF NOT EXISTS solo_scores (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  score INT NOT NULL,
  lines INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  tetris_count INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE solo_scores
  ADD COLUMN IF NOT EXISTS lines INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tetris_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_seconds INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS coop_scores (
  id SERIAL PRIMARY KEY,
  player_one VARCHAR(50) NOT NULL,
  player_two VARCHAR(50) NOT NULL,
  score INT NOT NULL,
  lines INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  tetris_count INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE coop_scores
  ADD COLUMN IF NOT EXISTS lines INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tetris_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_seconds INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS multiplayer_scores (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  score INT NOT NULL DEFAULT 0,
  lines INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  tetris_count INT NOT NULL DEFAULT 0,
  lines_sent INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  game_mode TEXT NOT NULL DEFAULT 'classic',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE multiplayer_scores
  ADD COLUMN IF NOT EXISTS duration_seconds INT NOT NULL DEFAULT 0;
