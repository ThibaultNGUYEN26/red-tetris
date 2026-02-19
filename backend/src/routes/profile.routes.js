import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

router.get("/player/stats", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Missing username" });
    }

    const result = await pool.query(
      `SELECT username, avatar, solo_games_played, highest_solo_score
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
      multiGames: 0,
      wins: 0,
      losses: 0,
    });
  } catch (err) {
    console.error("Fetch player stats failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/leaderboard/solo", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT username, avatar, highest_solo_score
       FROM users
       WHERE highest_solo_score > 0
       ORDER BY highest_solo_score DESC, id ASC
       LIMIT 10`
    );

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      name: row.username,
      avatar: row.avatar,
      score: row.highest_solo_score ?? 0,
    }));

    res.status(200).json(leaderboard);
  } catch (err) {
    console.error("Fetch solo leaderboard failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/profile", async (req, res) => {
  try {
    const { username, avatar } = req.body;

    if (!username || !avatar) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (!/^[a-zA-Z0-9]{3,15}$/.test(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }

    const query = `
      INSERT INTO users (username, avatar, solo_games_played, highest_solo_score)
      VALUES ($1, $2, 0, 0)
      ON CONFLICT (username)
      DO UPDATE SET avatar = EXCLUDED.avatar
      RETURNING id, username, avatar;
    `;

    const values = [username, JSON.stringify(avatar)];
    const result = await pool.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Profile upsert failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
