import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

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
      INSERT INTO users (username, avatar)
      VALUES ($1, $2)
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
