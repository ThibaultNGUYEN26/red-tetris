import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

async function attachPlayerAvatars(room) {
  const players = Array.isArray(room.players) ? room.players : [];
  if (players.length === 0) {
    return { ...room, player_avatars: {} };
  }

  const result = await pool.query(
    `SELECT username, avatar
     FROM users
     WHERE username = ANY($1::text[])`,
    [players]
  );

  const player_avatars = {};
  for (const row of result.rows) {
    player_avatars[row.username] = row.avatar;
  }

  return { ...room, player_avatars };
}

async function emitAvailableRooms(io) {
  if (!io) return;
  const MAX_PLAYERS = 6;
  const result = await pool.query(
    `SELECT id, name, game_mode, host, player_count, players
     FROM rooms
     WHERE player_count < $1
     ORDER BY created_at ASC;`,
    [MAX_PLAYERS]
  );
  const rows = result.rows.map((room) => ({
    ...room,
    maxPlayers: room.game_mode === "cooperative" ? 2 : 6,
  }));
  io.emit("availableRooms", rows);
}

function generateRoomName() {
  const adjectives = ["Red", "Blue", "Fast", "Crazy", "Happy", "Silent"];
  const nouns = ["Tetris", "Block", "Stack", "Line", "Drop", "Game"];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  // 4-char alphanumeric suffix
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${adj}${noun}-${randomSuffix}`;
}

// Create a new room
router.post("/", async (req, res) => {
  try {
    const { gameMode, host } = req.body;

    const checkUserQuery = `
      SELECT id
      FROM rooms
      WHERE players @> $1::jsonb
      LIMIT 1;
    `;

    const checkResult = await pool.query(
      checkUserQuery,
      [JSON.stringify([host])]
    );

    if (checkResult.rowCount > 0) {
      return res.status(400).json({
        error: "User is already in a room"
      });
    }

    if (!gameMode || !host) {
      return res.status(400).json({ error: "Missing data" });
    }

    const allowedModes = ["classic", "speed", "cooperative"];
    if (!allowedModes.includes(gameMode)) {
      return res.status(400).json({ error: "Invalid game mode" });
    }

    let room;
    let attempts = 0;

    while (!room && attempts < 5) {
      const name = generateRoomName();

      const query = `
        INSERT INTO rooms (name, game_mode, host, player_count, players)
        VALUES ($1, $2, $3, 1, $4)
        ON CONFLICT (name) DO NOTHING
        RETURNING *;
      `;

      const values = [name, gameMode, host, JSON.stringify([host])];
      const result = await pool.query(query, values);

      if (result.rowCount > 0) {
        room = result.rows[0];
      } else {
        attempts++;
      }
    }

    if (!room) {
      return res.status(500).json({ error: "Failed to generate unique room name" });
    }

    const io = req.app.get("io");
    await emitAvailableRooms(io);

    res.status(200).json(room);
  } catch (err) {
    console.error("Failed to create room:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Update Room Name
router.patch("/:roomId/name", async (req, res) => {
  const { roomId } = req.params;
  const { name, username } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Missing new room name" });
  }

  try {
    const roomResult = await pool.query(
      `SELECT host FROM rooms WHERE id = $1`,
      [roomId]
    );

    if (!roomResult.rowCount) {
      return res.status(404).json({ error: "Room not found" });
    }

    const { host } = roomResult.rows[0];

    if (host !== username) {
      return res.status(403).json({
        error: "Only the host can rename the room"
      });
    }

    const updateResult = await pool.query(
      `
      UPDATE rooms
      SET name = $1
      WHERE id = $2
      RETURNING *;
      `,
      [name, roomId]
    );

    const updatedRoom = updateResult.rows[0];
    const roomWithAvatars = await attachPlayerAvatars(updatedRoom);

    const io = req.app.get("io");
    if (io) {
      io.to(String(roomId)).emit("roomState", roomWithAvatars);
      await emitAvailableRooms(io);
    }

    res.json(roomWithAvatars);
  } catch (err) {
    console.error("Failed to rename room:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Update Room Mode
router.patch("/:roomId/mode", async (req, res) => {
  const { roomId } = req.params;
  const { mode, username } = req.body;

  if (!mode) {
    return res.status(400).json({ error: "Missing new room mode" });
  }

  const allowedModes = ["classic", "speed", "cooperative"];
  const normalizedMode = mode.toLowerCase();

  if (!allowedModes.includes(normalizedMode)) {
    return res.status(400).json({
      error: "Invalid game mode. Allowed: classic, speed, cooperative",
    });
  }

  try {
    const roomResult = await pool.query(
      `SELECT host FROM rooms WHERE id = $1`,
      [roomId]
    );

    if (!roomResult.rowCount) {
      return res.status(404).json({ error: "Room not found" });
    }

    const { host } = roomResult.rows[0];

    if (host !== username) {
      return res.status(403).json({
        error: "Only the host can rename the room"
      });
    }

    const updateResult = await pool.query(
      `
      UPDATE rooms
      SET game_mode = $1
      WHERE id = $2
      RETURNING *;
      `,
      [normalizedMode, roomId]
    );

    const updatedRoom = updateResult.rows[0];
    const roomWithAvatars = await attachPlayerAvatars(updatedRoom);

    const io = req.app.get("io");
    if (io) {
      io.to(String(roomId)).emit("roomState", roomWithAvatars);
      await emitAvailableRooms(io);
    }

    res.json(roomWithAvatars);
  } catch (err) {
    console.error("Failed to change room mode:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Join room
router.post("/:roomId/join", async (req, res) => {
  const { roomId } = req.params;
  const { username } = req.body;

  const checkUserQuery = `
      SELECT id
      FROM rooms
      WHERE players @> $1::jsonb
      LIMIT 1;
    `;

    const checkResult = await pool.query(
      checkUserQuery,
      [JSON.stringify([username])]
    );

    if (checkResult.rowCount > 0) {
      return res.status(400).json({
        error: "User is already in a room"
      });
    }

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

    const io = req.app.get("io");
    await emitAvailableRooms(io);

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
      const io = req.app.get("io");
      await emitAvailableRooms(io);
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
    const roomWithAvatars = await attachPlayerAvatars(result.rows[0]);

    const io = req.app.get("io");
    io.to(String(roomId)).emit("roomState", roomWithAvatars);
    await emitAvailableRooms(io);
    
    res.json(roomWithAvatars);
  } catch (err) {
    console.error("Leave room failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
