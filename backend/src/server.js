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

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
    );
  });

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
});

app.set("io", io);
setupSockets(io);

export async function startServer() {
  try {
    await pool.query("SELECT 1");
    await ensureSchema();
    console.log("DB connected");
  } catch (err) {
    console.error("DB connection failed:", err);
    throw err;
  }

  return httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

await startServer();
