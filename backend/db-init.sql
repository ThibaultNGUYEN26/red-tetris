-- JUST TO REMEMBER THE SCHEMA, NOT USED TO INIT THE DB

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  avatar JSONB NOT NULL,
  solo_games_played INT NOT NULL DEFAULT 0,
  highest_solo_score INT NOT NULL DEFAULT 0,
  multiplayer_games_played INT NOT NULL DEFAULT 0,
  multiplayer_wins INT NOT NULL DEFAULT 0,
  multiplayer_losses INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  game_mode TEXT NOT NULL,
  host TEXT NOT NULL,
  player_count INT NOT NULL,
  players JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE solo_scores (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE coop_scores (
  id SERIAL PRIMARY KEY,
  player_one VARCHAR(50) NOT NULL,
  player_two VARCHAR(50) NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
