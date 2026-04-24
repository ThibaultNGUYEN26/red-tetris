import express from "express";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

const router = express.Router();
const USERNAME_PATTERN = /^[a-zA-Z0-9]{1,15}$/;
const PASSWORD_MIN_LENGTH = 6;

router.post("/register", async (req, res) => {
  try {
    const { username, password, confirmPassword, avatar } = req.body || {};

    if (!username || !password || !confirmPassword || !avatar) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }

    if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const existing = await pool.query(
      `SELECT id
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (
        username,
        avatar,
        password_hash,
        solo_games_played,
        highest_solo_score,
        multiplayer_games_played,
        multiplayer_wins,
        multiplayer_losses
      )
      VALUES ($1, $2, $3, 0, 0, 0, 0, 0)
      RETURNING id, username, avatar`,
      [username, JSON.stringify(avatar), passwordHash]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Username already exists" });
    }
    console.error("Register failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }

    const result = await pool.query(
      `SELECT id, username, avatar, password_hash
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (!result.rowCount) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    if (!user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    return res.status(200).json({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    });
  } catch (err) {
    console.error("Login failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
