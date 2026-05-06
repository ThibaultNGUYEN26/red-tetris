CREATE INDEX IF NOT EXISTS solo_scores_username_idx
  ON solo_scores (username);

CREATE INDEX IF NOT EXISTS solo_scores_score_id_idx
  ON solo_scores (score DESC, id ASC);

CREATE INDEX IF NOT EXISTS multiplayer_scores_username_idx
  ON multiplayer_scores (username);

CREATE INDEX IF NOT EXISTS coop_scores_player_one_idx
  ON coop_scores (player_one);

CREATE INDEX IF NOT EXISTS coop_scores_player_two_idx
  ON coop_scores (player_two);

CREATE INDEX IF NOT EXISTS coop_scores_score_id_idx
  ON coop_scores (score DESC, id ASC);

CREATE INDEX IF NOT EXISTS rooms_waiting_listed_created_idx
  ON rooms (status, is_listed, created_at);

CREATE INDEX IF NOT EXISTS rooms_name_c_idx
  ON rooms (name COLLATE "C");

CREATE INDEX IF NOT EXISTS rooms_players_gin_idx
  ON rooms USING GIN (players);
