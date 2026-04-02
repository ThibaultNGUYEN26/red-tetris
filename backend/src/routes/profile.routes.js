import express from "express";
import { pool } from "../config/db.js";

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
      `SELECT username, avatar, solo_games_played, highest_solo_score,
              multiplayer_games_played, multiplayer_wins, multiplayer_losses
       FROM users
       WHERE username = $1`,
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
    });
  } catch (err) {
    console.error("Fetch player stats failed:", err);
    res.status(500).json({ error: "Server error" });
  }
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
