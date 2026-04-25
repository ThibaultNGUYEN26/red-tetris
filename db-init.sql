-- USERS TABLE

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  avatar JSONB NOT NULL,
  password_hash TEXT,
  solo_games_played INT NOT NULL DEFAULT 0,
  highest_solo_score INT NOT NULL DEFAULT 0,
  multiplayer_games_played INT NOT NULL DEFAULT 0,
  multiplayer_wins INT NOT NULL DEFAULT 0,
  multiplayer_losses INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure multiplayer columns exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS multiplayer_games_played INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multiplayer_wins INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multiplayer_losses INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS reset_password_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMPTZ;

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

-- ROOMS TABLE

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  game_mode TEXT NOT NULL,
  host TEXT NOT NULL,
  player_count INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  is_listed BOOLEAN NOT NULL DEFAULT TRUE,
  players JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'waiting';

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT TRUE;

UPDATE rooms
SET status = 'waiting'
WHERE status IS NULL;

UPDATE rooms
SET is_listed = TRUE
WHERE is_listed IS NULL;

ALTER TABLE rooms
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE rooms
  ALTER COLUMN is_listed SET NOT NULL;

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS ready_again TEXT[] DEFAULT '{}';

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS players_tmp TEXT[] DEFAULT '{}';

-- Convert JSONB players to TEXT[]
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='rooms' AND column_name='players' AND data_type='jsonb'
  ) THEN
    UPDATE rooms
    SET players_tmp = (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(players)
    );

    ALTER TABLE rooms DROP COLUMN players;
    ALTER TABLE rooms RENAME COLUMN players_tmp TO players;
  END IF;
END$$;

-- SOLO SCORES

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

-- COOP SCORES

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

-- MULTIPLAYER SCORES

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
