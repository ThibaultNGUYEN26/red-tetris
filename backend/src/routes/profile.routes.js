import express from "express";
import { pool } from "../config/db.js";
import { isUsernameConnected } from "../socket/index.js";

const router = express.Router();

async function syncUsersIdSequence() {
  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence('users', 'id'),
      COALESCE((SELECT MAX(id) FROM users), 0) + 1,
      false
    )
  `);
}

async function updateProfile(username, avatar) {
  const query = `
    INSERT INTO users (
      username,
      avatar,
      solo_games_played,
      highest_solo_score,
      multiplayer_games_played,
      multiplayer_wins,
      multiplayer_losses
    )
    VALUES ($1, $2, 0, 0, 0, 0, 0)
    ON CONFLICT (username)
    DO UPDATE SET avatar = EXCLUDED.avatar
    RETURNING id, username, avatar;
  `;

  const values = [username, JSON.stringify(avatar)];
  return pool.query(query, values);
}

router.get("/player/stats", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Missing username" });
    }

    const result = await pool.query(
      `SELECT
          u.username,
          u.avatar,
          u.solo_games_played,
          u.highest_solo_score,
          u.multiplayer_games_played,
          u.multiplayer_wins,
          u.multiplayer_losses,
          COALESCE(ss.highest_level, 1) AS solo_highest_level,
          COALESCE(ss.highest_lines, 0) AS solo_highest_lines,
          COALESCE(ss.total_lines, 0) AS solo_total_lines,
          COALESCE(ss.highest_tetris, 0) AS solo_highest_tetris,
          COALESCE(ss.total_tetris, 0) AS solo_total_tetris,
          COALESCE(ss.average_score, 0) AS solo_average_score,
          COALESCE(ss.total_duration_seconds, 0) AS solo_duration_seconds,
          COALESCE(ms.highest_score, 0) AS multi_highest_score,
          COALESCE(ms.highest_level, 1) AS multi_highest_level,
          COALESCE(ms.highest_lines, 0) AS multi_highest_lines,
          COALESCE(ms.total_lines, 0) AS multi_total_lines,
          COALESCE(ms.highest_lines_sent, 0) AS multi_highest_lines_sent,
          COALESCE(ms.total_lines_sent, 0) AS multi_total_lines_sent,
          COALESCE(ms.highest_tetris, 0) AS multi_highest_tetris,
          COALESCE(ms.total_tetris, 0) AS multi_total_tetris,
          COALESCE(ms.average_score, 0) AS multi_average_score,
          COALESCE(ms.total_duration_seconds, 0) AS multi_duration_seconds,
          COALESCE(cs.games, 0) AS coop_games,
          COALESCE(cs.highest_score, 0) AS coop_highest_score,
          COALESCE(cs.highest_level, 1) AS coop_highest_level,
          COALESCE(cs.highest_lines, 0) AS coop_highest_lines,
          COALESCE(cs.total_lines, 0) AS coop_total_lines,
          COALESCE(cs.highest_tetris, 0) AS coop_highest_tetris,
          COALESCE(cs.total_tetris, 0) AS coop_total_tetris,
          COALESCE(cs.total_duration_seconds, 0) AS coop_duration_seconds
       FROM users u
       LEFT JOIN (
         SELECT username,
                MAX(score) AS highest_score,
                MAX(level) AS highest_level,
                MAX(lines) AS highest_lines,
                SUM(lines) AS total_lines,
                MAX(tetris_count) AS highest_tetris,
                SUM(tetris_count) AS total_tetris,
                AVG(score) AS average_score,
                SUM(duration_seconds) AS total_duration_seconds
         FROM solo_scores
         GROUP BY username
       ) ss ON ss.username = u.username
       LEFT JOIN (
         SELECT username,
                MAX(score) AS highest_score,
                MAX(level) AS highest_level,
                MAX(lines) AS highest_lines,
                SUM(lines) AS total_lines,
                MAX(lines_sent) AS highest_lines_sent,
                SUM(lines_sent) AS total_lines_sent,
                MAX(tetris_count) AS highest_tetris,
                SUM(tetris_count) AS total_tetris,
                AVG(score) AS average_score,
                SUM(duration_seconds) AS total_duration_seconds
         FROM multiplayer_scores
         GROUP BY username
       ) ms ON ms.username = u.username
       LEFT JOIN (
         SELECT player_name,
                COUNT(*) AS games,
                MAX(score) AS highest_score,
                MAX(level) AS highest_level,
                MAX(lines) AS highest_lines,
                SUM(lines) AS total_lines,
                MAX(tetris_count) AS highest_tetris,
                SUM(tetris_count) AS total_tetris,
                SUM(duration_seconds) AS total_duration_seconds
         FROM (
           SELECT player_one AS player_name, score, lines, level, tetris_count, duration_seconds FROM coop_scores
           UNION ALL
           SELECT player_two AS player_name, score, lines, level, tetris_count, duration_seconds FROM coop_scores
         ) coop_player_scores
         GROUP BY player_name
       ) cs ON cs.player_name = u.username
       WHERE u.username = $1`,
      [username]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = result.rows[0];
    return res.status(200).json({
      name: row.username,
      avatar: row.avatar,
      soloGames: row.solo_games_played ?? 0,
      soloTopScore: row.highest_solo_score ?? 0,
      multiGames: row.multiplayer_games_played ?? 0,
      wins: row.multiplayer_wins ?? 0,
      losses: row.multiplayer_losses ?? 0,
      advanced: {
        timePlayed: {
          total:
            Number(row.solo_duration_seconds ?? 0) +
            Number(row.multi_duration_seconds ?? 0) +
            Number(row.coop_duration_seconds ?? 0),
          solo: row.solo_duration_seconds ?? 0,
          multi: row.multi_duration_seconds ?? 0,
          coop: row.coop_duration_seconds ?? 0,
        },
        solo: {
          games: row.solo_games_played ?? 0,
          highestScore: row.highest_solo_score ?? 0,
          averageScore: Math.round(Number(row.solo_average_score ?? 0)),
          highestLevel: row.solo_highest_level ?? 1,
          highestLines: row.solo_highest_lines ?? 0,
          totalLines: row.solo_total_lines ?? 0,
          highestTetris: row.solo_highest_tetris ?? 0,
          totalTetris: row.solo_total_tetris ?? 0,
        },
        multi: {
          games: row.multiplayer_games_played ?? 0,
          wins: row.multiplayer_wins ?? 0,
          losses: row.multiplayer_losses ?? 0,
          winLossRatio:
            (row.multiplayer_losses ?? 0) > 0
              ? Number(((row.multiplayer_wins ?? 0) / row.multiplayer_losses).toFixed(2))
              : row.multiplayer_wins ?? 0,
          highestScore: row.multi_highest_score ?? 0,
          averageScore: Math.round(Number(row.multi_average_score ?? 0)),
          highestLevel: row.multi_highest_level ?? 1,
          highestLines: row.multi_highest_lines ?? 0,
          totalLines: row.multi_total_lines ?? 0,
          highestLinesSent: row.multi_highest_lines_sent ?? 0,
          totalLinesSent: row.multi_total_lines_sent ?? 0,
          highestTetris: row.multi_highest_tetris ?? 0,
          totalTetris: row.multi_total_tetris ?? 0,
        },
        coop: {
          games: row.coop_games ?? 0,
          highestScore: row.coop_highest_score ?? 0,
          highestLevel: row.coop_highest_level ?? 1,
          highestLines: row.coop_highest_lines ?? 0,
          totalLines: row.coop_total_lines ?? 0,
          highestTetris: row.coop_highest_tetris ?? 0,
          totalTetris: row.coop_total_tetris ?? 0,
        },
      },
    });
  } catch (err) {
    console.error("Fetch player stats failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/player/connection", (req, res) => {
  const { username } = req.query;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Missing username" });
  }

  return res.status(200).json({
    username,
    connected: isUsernameConnected(username),
  });
});

router.get("/leaderboard/solo", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.username, u.avatar, s.score
       FROM solo_scores s
       JOIN users u ON u.username = s.username
       ORDER BY s.score DESC, s.id ASC
       LIMIT 10`
    );

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      name: row.username,
      avatar: row.avatar,
      score: row.score ?? 0,
    }));

    res.status(200).json(leaderboard);
  } catch (err) {
    console.error("Fetch solo leaderboard failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/leaderboard/coop", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.player_one, u1.avatar AS avatar_one,
              c.player_two, u2.avatar AS avatar_two,
              c.score
       FROM coop_scores c
       LEFT JOIN users u1 ON u1.username = c.player_one
       LEFT JOIN users u2 ON u2.username = c.player_two
       ORDER BY c.score DESC, c.id ASC
       LIMIT 10`
    );

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      players: [
        { name: row.player_one, avatar: row.avatar_one },
        { name: row.player_two, avatar: row.avatar_two },
      ],
      score: row.score ?? 0,
    }));

    res.status(200).json(leaderboard);
  } catch (err) {
    console.error("Fetch coop leaderboard failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/profile", async (req, res) => {
  try {
    const { username, avatar } = req.body;

    if (!username || !avatar) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (!/^[a-zA-Z0-9]{1,15}$/.test(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }

    let result;
    try {
      result = await updateProfile(username, avatar);
    } catch (err) {
      if (err?.code === "23505" && err?.constraint === "users_pkey") {
        await syncUsersIdSequence();
        result = await updateProfile(username, avatar);
      } else {
        throw err;
      }
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Profile upsert failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
