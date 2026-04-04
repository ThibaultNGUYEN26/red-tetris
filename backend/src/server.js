import "./config/env.js";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

import profileRoutes from "./routes/profile.routes.js";
import roomRoutes from "./routes/rooms.routes.js";

import setupSockets from "./socket/index.js";
import { pool } from "./config/db.js";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const DEV_ORIGINS = [
  FRONTEND_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

// App and HTTP Server
const app = express();
const httpServer = createServer(app);

app.use(
  cors({
    origin: DEV_ORIGINS,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

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
    origin: DEV_ORIGINS,
  },
});

app.set("io", io);
setupSockets(io);

const BIND_HOST = process.env.BACKEND_HOST || "0.0.0.0";
httpServer.listen(3000, BIND_HOST, async () => {
  console.log(`Backend running on http://${BIND_HOST}:3000`);

  try {
    await pool.query("SELECT 1");
    console.log("DB connected");
  } catch (err) {
    console.error("DB connection failed:", err);
  }
});
