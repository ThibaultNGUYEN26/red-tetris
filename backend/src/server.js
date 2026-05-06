import "./config/env.js";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

import profileRoutes from "./routes/profile.routes.js";
import roomRoutes from "./routes/rooms.routes.js";
import authRoutes from "./routes/auth.routes.js";
import contactRoutes from "./routes/contact.routes.js";

import setupSockets from "./socket/index.js";
import { ensureSchema, pool } from "./config/db.js";
import { assertSessionSecret } from "./auth/session.js";
import { purgeExpiredDeletedAccounts } from "./services/accountDeletion.service.js";
import { isPerfLogEnabled, perfLogDuration, perfStart } from "./perf.js";

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";
assertSessionSecret();

// App and HTTP Server
const app = express();
const httpServer = createServer(app);
app.set("etag", false);

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

if (isPerfLogEnabled()) {
  app.use((req, res, next) => {
    const start = perfStart();
    res.on("finish", () => {
      perfLogDuration("http", start, {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
      });
    });
    next();
  });
}

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use("/api", profileRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/rooms", roomRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
  transports: ["websocket"],
  perMessageDeflate: false,
  httpCompression: false,
});

app.set("io", io);
setupSockets(io);

export async function startServer() {
  try {
    await pool.query("SELECT 1");
    await ensureSchema();
    await purgeExpiredDeletedAccounts();
  } catch (err) {
    console.error("DB connection failed:", err);
    throw err;
  }

  const purgeTimer = setInterval(() => {
    purgeExpiredDeletedAccounts().catch((err) => {
      console.error("Expired account purge failed:", err);
    });
  }, 1000 * 60 * 60 * 24);
  purgeTimer.unref?.();

  return httpServer.listen(PORT, "0.0.0.0");
}

await startServer();
