import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();


// Create a new room
router.post("/", async (req, res) => {
  try {
    const { name, gameMode, host } = req.body;

    if (!name || !gameMode || !host) {
      return res.status(400).json({ error: "Missing data" });
    }

    const allowedModes = ["classic", "speed", "cooperative"];
    if (!allowedModes.includes(gameMode)) {
      return res.status(400).json({ error: "Invalid game mode" });
    }

    const query = `
      INSERT INTO rooms (name, game_mode, host, player_count, players)
      VALUES ($1, $2, $3, 1, $4)
      RETURNING *;
    `;

    const values = [name, gameMode, host, JSON.stringify([host])];

    const result = await pool.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to create room:", err);

    if (err.code === "23505") {
      return res.status(400).json({ error: "Room name already exists" });
    }
    res.status(400).json({ error: "Server error" });
  }
});


// Update Room Name
router.patch("/:roomId/name", async (req, res) => {
  const { roomId } = req.params;
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: "Missing new room name" });

  try {
    const query = `
      UPDATE rooms
      SET name = $1
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [name, roomId]);

    if (!result.rowCount) return res.status(404).json({ error: "Room not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to rename room:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Join room
router.post("/:roomId/join", async (req, res) => {
  const { roomId } = req.params;
  const { username } = req.body;

  if (!username) return res.status(400).json({ error: "Missing username" });

  try {
    // Fetch current room info first
    const roomQuery = `SELECT player_count, players FROM rooms WHERE id = $1`;
    const roomResult = await pool.query(roomQuery, [roomId]);

    if (!roomResult.rowCount) return res.status(404).json({ error: "Room not found" });

    const room = roomResult.rows[0];

    // Check if already max players
    const MAX_PLAYERS = 6;
    if (room.player_count >= MAX_PLAYERS) {
      return res.status(400).json({ error: "Room is full" });
    }

    // Check if user is already in the room
    if (room.players.includes(username)) {
      return res.status(400).json({ error: "User already in room" });
    }

    // Add player
    const updateQuery = `
      UPDATE rooms
      SET players = players || $2::jsonb,
          player_count = player_count + 1
      WHERE id = $1
      RETURNING *;
    `;
    const values = [roomId, JSON.stringify([username])];
    const result = await pool.query(updateQuery, values);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Join room failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Leave room
router.post("/:roomId/leave", async (req, res) => {
  const { roomId } = req.params;
  const { username } = req.body;

  if (!username) return res.status(400).json({ error: "Missing username" });

  try {
    // Get current room data
    const roomQuery = `SELECT players, host, player_count FROM rooms WHERE id = $1`;
    const roomResult = await pool.query(roomQuery, [roomId]);

    if (!roomResult.rowCount) return res.status(404).json({ error: "Room not found" });

    const room = roomResult.rows[0];
    const { players, host } = room;

    // Check if user is in the room
    if (!players.includes(username)) {
      return res.status(400).json({ error: "User not in room" });
    }

    // Remove user from players array
    const updatedPlayers = players.filter((p) => p !== username);

    // Determine new host if needed
    let newHost = host;
    if (username === host) {
      newHost = updatedPlayers.length > 0 ? updatedPlayers[0] : null;
    }

    if (updatedPlayers.length === 0) {
      await pool.query(`DELETE FROM rooms WHERE id = $1`, [roomId]);
      return res.json({ message: "Room deleted" });
    }

    // Update DB
    const updateQuery = `
      UPDATE rooms
      SET players = $2::jsonb,
          player_count = $3,
          host = $4
      WHERE id = $1
      RETURNING *;
    `;
    const values = [roomId, JSON.stringify(updatedPlayers), updatedPlayers.length, newHost];
    const result = await pool.query(updateQuery, values);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Leave room failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Start game
router.post("/:roomId/start", async (req, res) => {
  const { roomId } = req.params;
  const { username } = req.body;

  if (!username) return res.status(400).json({ error: "Missing username" });

  try {
    //  Fetch room
    const roomQuery = `SELECT host, player_count, players FROM rooms WHERE id = $1`;
    const roomResult = await pool.query(roomQuery, [roomId]);

    if (!roomResult.rowCount) return res.status(404).json({ error: "Room not found" });

    const room = roomResult.rows[0];

    //  Only host can start
    if (room.host !== username) {
      return res.status(403).json({ error: "Only the host can start the game" });
    }

    // Optional: prevent starting if no players
    if (room.player_count < 1) {
      return res.status(400).json({ error: "Cannot start game with one player" });
    }

    //  Update status to 'started'
    const updateQuery = `
      UPDATE rooms
      SET status = 'started'
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [roomId]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Start room failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// List all available rooms
router.get("/available", async (req, res) => {
  try {
    const MAX_PLAYERS = 6;

    const query = `
      SELECT id, name, game_mode, host, player_count, players
      FROM rooms
      WHERE player_count < $1
      ORDER BY created_at ASC;
    `;

    const result = await pool.query(query, [MAX_PLAYERS]);

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to list available rooms:", err);
    res.status(500).json({ error: "Server error" });
  }
});



export default router;
