import "./config/env.js";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

import profileRoutes from "./routes/profile.routes.js";
import roomRoutes from "./routes/rooms.routes.js";

import setupSockets from "./socket/index.js";
import { pool } from "./config/db.js";

import { createGame, getGame } from "./game/gameManager.js";

// App and HTTP Server
const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: "http://localhost:5173",
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
    origin: "http://localhost:5173",
  },
});

app.set("io", io);
setupSockets(io);

io.on("connection", (socket) => {
  console.log(`🟢 Socket connected: ${socket.id}`);

  socket.on("startGame", async ({ roomId, username }) => {
    const room = await pool.query(
      "SELECT host, players, status FROM rooms WHERE id=$1",
      [roomId]
    );
    if (!room.rowCount) return;
    const r = room.rows[0];
    
    if (r.host !== username) return;
    if (r.status === "started") return; // already started

    // create Game instance
    const game = createGame(roomId, r.players.map(u => ({ username: u, socketId: null })), "multiplayer");

    game.start(); // spawn first pieces

    // notify clients
    io.to(roomId).emit("gameStarted", { roomId });

    // optionally update DB
    await pool.query(
      `UPDATE rooms SET status='started' WHERE id=$1`,
      [roomId]
    );
  });

  socket.on("movePiece", ({ roomId, username, action }) => {
    const game = getGame(roomId);
    if (!game || !game.isRunning) return;

    const player = game.getPlayer(username);
    if (!player || !player.isAlive) return;

    game.movePlayer(username, action);

    if (game.checkGameOver()) {
      game.isRunning = false;

      io.to(roomId).emit("gameOver", {
        winner:
          game.mode === "multiplayer"
            ? game.players.find(p => p.isAlive)?.username ?? null
            : null
      });
      return;
    }

    io.to(roomId).emit("gameState", game.serialize());
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(3000, async () => {
  console.log("Backend running on port 3000");

  try {
    await pool.query("SELECT 1");
    console.log("DB connected");
  } catch (err) {
    console.error("DB connection failed:", err);
  }
});
