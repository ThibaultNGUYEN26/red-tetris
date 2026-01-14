-- SQL script to initialize the Red Tetris database

-- Create users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  avatar JSONB NOT NULL
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  game_mode VARCHAR(20) NOT NULL,
  host VARCHAR(100) NOT NULL,
  player_count INTEGER NOT NULL DEFAULT 1,
  players JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT NOW()
);
