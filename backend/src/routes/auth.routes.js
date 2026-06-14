import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "../config/db.js";
import { sendResetPasswordEmail } from "../services/mail.service.js";
import {
  restoreDeletedAccount,
  softDeleteAccount,
} from "../services/accountDeletion.service.js";
import {
  authenticateRequest,
  clearSessionCookie,
  createSessionToken,
  rejectUnauthenticated,
  setSessionCookie,
} from "../auth/session.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();
const USERNAME_PATTERN = /^[a-zA-Z0-9]{1,15}$/;
const PASSWORD_MIN_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;
const DEFAULT_PREFERENCES = {
  theme: "light",
  soundEnabled: true,
  language: "en",
};

const shouldExposeDevSessionToken = () =>
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "test" ||
  process.env.VITEST === "true" ||
  Boolean(process.env.VITEST_WORKER_ID);

const withDevSessionToken = (payload, token) =>
  shouldExposeDevSessionToken() ? { ...payload, authToken: token } : payload;

const normalizePreferences = (preferences) => ({
  ...DEFAULT_PREFERENCES,
  ...(preferences && typeof preferences === "object" ? preferences : {}),
});

const buildResetUrl = (token) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
  return `${frontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
};

const getPasswordValidationError = (password) => {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return "Password must be at least 8 characters";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least 1 uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least 1 lowercase letter";
  }
  if (!/\d/.test(password)) {
    return "Password must contain at least 1 number";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least 1 special character";
  }
  return null;
};

router.post("/register", async (req, res) => {
  try {
    if (authRateLimiter(req, res)) return;

    const { username, email, password, confirmPassword, avatar } = req.body || {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!username || !normalizedEmail || !password || !confirmPassword || !avatar) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Password doesn't match" });
    }

    const existing = await pool.query(
      `SELECT username, email, deleted_at, delete_after
       FROM users
       WHERE username = $1 OR LOWER(email) = $2`,
      [username, normalizedEmail]
    );

    if (existing.rowCount > 0) {
      const existingUser = existing.rows[0];
      if (existingUser.deleted_at) {
        return res.status(409).json({
          error: "Account scheduled for deletion",
          canRestore: true,
          deleteAfter: existingUser.delete_after,
        });
      }
      if (existingUser.username === username) {
        return res.status(409).json({ error: "Username already exists" });
      }
      return res.status(409).json({ error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (
        username,
        email,
        avatar,
        password_hash,
        solo_games_played,
        highest_solo_score,
        multiplayer_games_played,
        multiplayer_wins,
        multiplayer_losses
      )
      VALUES ($1, $2, $3, $4, 0, 0, 0, 0, 0)
      RETURNING id, username, email, avatar, preferences`,
      [username, normalizedEmail, JSON.stringify(avatar), passwordHash]
    );

    const user = result.rows[0];
    const token = createSessionToken(user);
    setSessionCookie(res, token);

    return res.status(201).json(withDevSessionToken({
      ...user,
      preferences: normalizePreferences(user.preferences),
    }, token));
  } catch (err) {
    if (err?.code === "23505") {
      if (String(err?.constraint).includes("email")) {
        return res.status(409).json({ error: "Email already exists" });
      }
      return res.status(409).json({ error: "Username already exists" });
    }
    console.error("Register failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    if (authRateLimiter(req, res)) return;

    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }

    const result = await pool.query(
      `SELECT id, username, email, avatar, preferences, password_hash, deleted_at, delete_after
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "User does not exist" });
    }

    const user = result.rows[0];
    if (user.deleted_at) {
      return res.status(403).json({
        error: "Account scheduled for deletion",
        canRestore: Boolean(user.delete_after && new Date(user.delete_after).getTime() > Date.now()),
        deleteAfter: user.delete_after,
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createSessionToken(user);
    setSessionCookie(res, token);

    return res.status(200).json(withDevSessionToken({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      preferences: normalizePreferences(user.preferences),
    }, token));
  } catch (err) {
    console.error("Login failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const auth = authenticateRequest(req);
    if (!auth) return rejectUnauthenticated(res);

    const result = await pool.query(
      `SELECT id, username, email, avatar, preferences
       FROM users
       WHERE username = $1
         AND deleted_at IS NULL`,
      [auth.username]
    );

    if (!result.rowCount) {
      clearSessionCookie(res);
      return rejectUnauthenticated(res);
    }

    const user = result.rows[0];
    const token = shouldExposeDevSessionToken() ? createSessionToken(user) : "";
    if (token) {
      setSessionCookie(res, token);
    }

    return res.status(200).json(withDevSessionToken({
      ...user,
      preferences: normalizePreferences(user.preferences),
    }, token));
  } catch (err) {
    console.error("Fetch current session failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/restore", async (req, res) => {
  try {
    if (authRateLimiter(req, res)) return;

    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }

    const result = await pool.query(
      `SELECT id, username, email, avatar, preferences, password_hash, deleted_at, delete_after
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "User does not exist" });
    }

    const user = result.rows[0];
    if (!user.deleted_at) {
      return res.status(400).json({ error: "Account is not scheduled for deletion" });
    }

    if (!user.delete_after || new Date(user.delete_after).getTime() <= Date.now()) {
      return res.status(410).json({ error: "Restore period expired" });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const restored = await restoreDeletedAccount(username);
    if (!restored.rowCount) {
      return res.status(410).json({ error: "Restore period expired" });
    }

    const restoredUser = restored.rows[0];
    const token = createSessionToken(restoredUser);
    setSessionCookie(res, token);

    return res.status(200).json(withDevSessionToken({
      id: restoredUser.id,
      username: restoredUser.username,
      email: restoredUser.email,
      avatar: restoredUser.avatar,
      preferences: normalizePreferences(restoredUser.preferences),
    }, token));
  } catch (err) {
    console.error("Restore account failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    if (authRateLimiter(req, res)) return;

    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!username || !email) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const userResult = await pool.query(
      `SELECT id
       FROM users
       WHERE username = $1 AND LOWER(email) = $2 AND deleted_at IS NULL`,
      [username, email]
    );

    if (!userResult.rowCount) {
      return res.status(200).json({
        ok: true,
        message: "If that email exists, a reset link has been generated",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await pool.query(
      `UPDATE users
       SET reset_password_token = $1,
           reset_password_expires_at = $2
       WHERE id = $3`,
      [resetToken, expiresAt, userResult.rows[0].id]
    );

    const resetUrl = buildResetUrl(resetToken);
    await sendResetPasswordEmail({
      username,
      email,
      resetUrl,
    });

    return res.status(200).json({
      ok: true,
      message: "Password reset email sent",
    });
  } catch (err) {
    console.error("Forgot password failed:", err);
    if (err?.message === "Mail service not configured") {
      return res.status(500).json({ error: "Mail service not configured" });
    }
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    if (authRateLimiter(req, res)) return;

    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const password = req.body?.password;
    const confirmPassword = req.body?.confirmPassword;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: "Missing data" });
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Password doesn't match" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const updateResult = await pool.query(
      `UPDATE users
       SET password_hash = $1,
           reset_password_token = NULL,
           reset_password_expires_at = NULL
       WHERE reset_password_token = $2
         AND reset_password_expires_at IS NOT NULL
         AND reset_password_expires_at >= NOW()
         AND deleted_at IS NULL
       RETURNING id`,
      [passwordHash, token]
    );

    if (!updateResult.rowCount) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    return res.status(200).json({ ok: true, message: "Password updated" });
  } catch (err) {
    console.error("Reset password failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
});

router.delete("/account", async (req, res) => {
  try {
    const auth = authenticateRequest(req);
    if (!auth) return rejectUnauthenticated(res);

    const result = await softDeleteAccount(auth.username);
    if (!result.rowCount) {
      return res.status(404).json({ error: "User not found" });
    }

    clearSessionCookie(res);
    return res.status(200).json({
      ok: true,
      username: result.rows[0].username,
      deletedAt: result.rows[0].deleted_at,
      deleteAfter: result.rows[0].delete_after,
    });
  } catch (err) {
    console.error("Delete account failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
