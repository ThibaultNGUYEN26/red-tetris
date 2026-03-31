import express from "express";
import { pool } from "../config/db.js";
import { broadcastAvailableRooms } from "../socket/index.js";

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

    if (!gameMode || !host) {
      console.log("Missing data:", { gameMode, host });
      return res.status(400).json({ error: "Missing data" });
    }

    const checkUserQuery = `
      SELECT id
      FROM rooms
      WHERE players @> ARRAY[$1]::text[]
      LIMIT 1;
    `;

    const checkResult = await pool.query(
      checkUserQuery,
      [host]
    );

    if (checkResult.rowCount > 0) {
      console.log("User already in a room:", host);
      return res.status(400).json({
        error: "User is already in a room"
      });
    }

    const allowedModes = ["classic", "speed", "cooperative", "giant"];
    if (!allowedModes.includes(gameMode)) {
      console.log("Invalid game mode:", gameMode);
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

      const values = [name, gameMode, host, [host]];
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
    if (io) {
      await broadcastAvailableRooms(io);
    }

    res.status(200).json(room);
  } catch (err) {
    console.error("Failed to create room:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get room by name (for spectator mode)
router.get("/by-name/:name", async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) return res.status(400).json({ error: "Missing room name" });

    const result = await pool.query(
      `SELECT id, name, game_mode, host, player_count, players, status
       FROM rooms
       WHERE name = $1`,
      [name]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to get room by name:", err);
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
      await broadcastAvailableRooms(io);
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
  const allowedModes = ["classic", "speed", "cooperative", "giant"];

  if (!mode) {
    return res.status(400).json({ error: "Missing new room mode" });
  }

  const normalizedMode = mode.toLowerCase();

  if (!allowedModes.includes(normalizedMode)) {
    return res.status(400).json({
      error: "Invalid game mode. Allowed: classic, speed, cooperative, giant",
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
      await broadcastAvailableRooms(io);
    }

    res.json(roomWithAvatars);
  } catch (err) {
    console.error("Failed to change room mode:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
