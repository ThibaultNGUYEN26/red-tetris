import "./config/env.js";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

import profileRoutes from "./routes/profile.routes.js";
import roomRoutes from "./routes/rooms.routes.js";

import setupSockets from "./socket/index.js";
import { pool } from "./config/db.js";

// App and HTTP Server
const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());

app.use("/api", profileRoutes);
app.use("/api", roomRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

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
