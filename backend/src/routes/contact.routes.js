import express from "express";
import { sendContactEmail } from "../services/mail.service.js";

const router = express.Router();
const OBJECT_MAX_LENGTH = 120;
const MESSAGE_MAX_LENGTH = 4000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 3;

const contactAttempts = new Map();

const getPositiveNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const getClientKey = (req) => {
  const realIp = typeof req.headers?.["x-real-ip"] === "string" ? req.headers["x-real-ip"].trim() : "";
  const forwardedFor = req.headers?.["x-forwarded-for"];
  const forwardedIp = typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : "";

  return realIp || forwardedIp || req.ip || req.socket?.remoteAddress || "unknown";
};

const getRateLimitConfig = () => ({
  windowMs: getPositiveNumber(process.env.CONTACT_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS),
  max: getPositiveNumber(process.env.CONTACT_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX),
});

const checkContactRateLimit = (clientKey, now = Date.now()) => {
  const { windowMs, max } = getRateLimitConfig();
  const windowStart = now - windowMs;
  const attempts = (contactAttempts.get(clientKey) || []).filter((timestamp) => timestamp > windowStart);

  if (attempts.length >= max) {
    contactAttempts.set(clientKey, attempts);
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((attempts[0] + windowMs - now) / 1000)),
    };
  }

  attempts.push(now);
  contactAttempts.set(clientKey, attempts);
  return { limited: false, retryAfterSeconds: 0 };
};

export const resetContactRateLimit = () => {
  contactAttempts.clear();
};

router.post("/", async (req, res) => {
  try {
    const object = typeof req.body?.object === "string" ? req.body.object.trim() : "";
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const userEmail = typeof req.body?.userEmail === "string" ? req.body.userEmail.trim().toLowerCase() : "";
    const website = typeof req.body?.website === "string" ? req.body.website.trim() : "";

    if (website) {
      return res.status(400).json({ error: "Unable to send message" });
    }

    if (!object || !message) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (!userEmail || !EMAIL_PATTERN.test(userEmail)) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (object.length > OBJECT_MAX_LENGTH) {
      return res.status(400).json({ error: "Object is too long" });
    }

    if (message.length > MESSAGE_MAX_LENGTH) {
      return res.status(400).json({ error: "Message is too long" });
    }

    const rateLimit = checkContactRateLimit(getClientKey(req));
    if (rateLimit.limited) {
      res.set("Retry-After", String(rateLimit.retryAfterSeconds));
      return res.status(429).json({ error: "Too many contact messages. Please try again later." });
    }

    await sendContactEmail({ object, message, userEmail });

    return res.status(200).json({
      ok: true,
      message: "Message sent",
    });
  } catch (err) {
    console.error("Contact email failed:", err);
    if (err?.message === "Mail service not configured") {
      return res.status(500).json({ error: "Mail service not configured" });
    }
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
