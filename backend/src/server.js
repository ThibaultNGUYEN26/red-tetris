import "./config/env.js";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

import profileRoutes from "./routes/profile.routes.js";
import roomRoutes from "./routes/rooms.routes.js";

import setupSockets from "./socket/index.js";
import { pool } from "./config/db.js";

const HOST = process.env.HOST || process.env.DB_HOST || "localhost";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || `http://${HOST}:5173`;

// App and HTTP Server
const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());

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
app.use("/api/rooms", roomRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGIN,
  },
});

app.set("io", io);
setupSockets(io);

httpServer.listen(3000, async () => {
  console.log("Backend running on port 3000");

  try {
    await pool.query("SELECT 1");
    console.log("DB connected");
  } catch (err) {
    console.error("DB connection failed:", err);
  }
});
