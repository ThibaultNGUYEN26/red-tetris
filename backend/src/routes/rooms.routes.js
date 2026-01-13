import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

router.post("/rooms", async (req, res) => {
  try {
    const { name, gameMode, host } = req.body;

    if (!name || !gameMode || !host) {
      return res.status(400).json({ error: "Missing data" });
    }

    const allowedModes = ["classic", "speed", "cooperative"];
    if (!allowedModes.includes(gameMode)) {
      return res.status(400).json({ error: "Invalid game mode" });
    }

    const query = `
      INSERT INTO rooms (name, game_mode, host, player_count, players)
      VALUES ($1, $2, $3, 1, $4)
      RETURNING *;
    `;

    const values = [name, gameMode, host, JSON.stringify([host])];

    const result = await pool.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to create room:", err);

    if (err.code === "23505") {
      return res.status(400).json({ error: "Room name already exists" });
    }
    res.status(400).json({ error: "Server error" });
  }
});

export default router;
