import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

router.post("/profile", async (req, res) => {
  const { username, avatar } = req.body;

  if (!username || !avatar) {
    return res.status(400).json({ error: "Missing username or avatar" });
  }

  try {
    const query = `
      INSERT INTO users (username, avatar)
      VALUES ($1, $2)
      ON CONFLICT (username)
      DO UPDATE SET avatar = EXCLUDED.avatar
      RETURNING id, username, avatar;
    `;

    const { rows } = await pool.query(query, [username, avatar]);
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Profile route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
