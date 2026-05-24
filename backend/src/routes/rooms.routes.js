import express from "express";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { removeGame } from "../game/gameManager.js";
import { broadcastAvailableRooms } from "../socket/index.js";
import { authenticateRequest, rejectUnauthenticated } from "../auth/session.js";

const router = express.Router();
const ROOM_PASSWORD_MAX_LENGTH = 64;
const getMaxPlayers = (gameMode) =>
  ["cooperative", "cooperative_roles"].includes(gameMode) ? 2 : 6;
const MODE_LABELS = {
  cooperative: "Co-op Alternate",
  cooperative_roles: "Co-op Roles",
  classic: "Classic",
  mirror: "Mirror",
  giant: "Giant",
  chaotic: "Chaotic",
  invisible: "Invisible",
};
const formatModeLabel = (mode) => MODE_LABELS[mode];

async function attachPlayerAvatars(room) {
  const players = Array.isArray(room.players) ? room.players : [];
  if (players.length === 0) {
    return exposeRoom({ ...room, player_avatars: {} });
  }

  const result = await pool.query(
    `SELECT username, avatar
     FROM users
     WHERE username = ANY($1::text[])
       AND deleted_at IS NULL`,
    [players]
  );

  const player_avatars = {};
  for (const row of result.rows) {
    player_avatars[row.username] = row.avatar;
  }

  return exposeRoom({ ...room, player_avatars });
}

function exposeRoom(room) {
  if (!room) return room;
  const { room_password_hash, ...safeRoom } = room;
  return {
    ...safeRoom,
    has_password: Boolean(room_password_hash),
  };
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

async function cleanupExistingSoloRooms(username) {
  const result = await pool.query(
    `DELETE FROM rooms
     WHERE host = $1
       AND players @> ARRAY[$1]::text[]
       AND is_listed = FALSE
     RETURNING id`,
    [username]
  );

  for (const row of result.rows) {
    removeGame(String(row.id));
  }
}

// Create a new room
router.post("/", async (req, res) => {
  try {
    const { gameMode, name: requestedName, isListed = true } = req.body;
    const roomPassword = typeof req.body?.roomPassword === "string" ? req.body.roomPassword : "";
    const trimmedRoomPassword = roomPassword.trim();

    if (!gameMode) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (trimmedRoomPassword && trimmedRoomPassword.length > ROOM_PASSWORD_MAX_LENGTH) {
      return res.status(400).json({ error: "Room password is too long" });
    }

    const auth = authenticateRequest(req);
    if (!auth) return rejectUnauthenticated(res);
    const host = auth.username;

    if (isListed === false) {
      await cleanupExistingSoloRooms(host);
    }

    const checkUserQuery = `
      SELECT id, name, game_mode, host, player_count, players, status, is_listed, room_password_hash
      FROM rooms
      WHERE players @> ARRAY[$1]::text[]
      ORDER BY created_at ASC
      LIMIT 1;
    `;

    const checkResult = await pool.query(
      checkUserQuery,
      [host]
    );

    if (checkResult.rowCount > 0) {
      const existingRoom = checkResult.rows[0];
      if (existingRoom.host === host && existingRoom.status === "waiting") {
        const io = req.app.get("io");
        if (io) {
          await broadcastAvailableRooms(io);
        }
        return res.status(200).json(exposeRoom(existingRoom));
      }

      return res.status(400).json({
        error: "User is already in a room"
      });
    }

    const allowedModes = ["classic", "mirror", "chaotic", "invisible", "cooperative", "cooperative_roles", "giant"];
    if (!allowedModes.includes(gameMode)) {
      return res.status(400).json({ error: "Invalid game mode" });
    }

    const roomPasswordHash =
      Boolean(isListed) && trimmedRoomPassword
        ? await bcrypt.hash(trimmedRoomPassword, 10)
        : null;

    let room;
    let attempts = 0;

    if (requestedName) {
      const trimmedName = String(requestedName).trim();
      const isValidName = /^[a-zA-Z0-9-]{1,15}$/.test(trimmedName);
      if (!isValidName) {
        return res.status(400).json({ error: "Invalid room name" });
      }

      const existing = await pool.query(
        `SELECT id
         FROM rooms
         WHERE name COLLATE "C" = $1 COLLATE "C"`,
        [trimmedName]
      );
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: "Room name already exists" });
      }

      const query = `
        INSERT INTO rooms (name, game_mode, host, player_count, is_listed, players, room_password_hash)
        VALUES ($1, $2, $3, 1, $4, $5, $6)
        RETURNING *;
      `;

      const values = [trimmedName, gameMode, host, Boolean(isListed), [host], roomPasswordHash];
      const result = await pool.query(query, values);
      room = result.rows[0];
    }

    while (!room && attempts < 5) {
      const name = generateRoomName();

      const query = `
        INSERT INTO rooms (name, game_mode, host, player_count, is_listed, players, room_password_hash)
        VALUES ($1, $2, $3, 1, $4, $5, $6)
        ON CONFLICT (name) DO NOTHING
        RETURNING *;
      `;

      const values = [name, gameMode, host, Boolean(isListed), [host], roomPasswordHash];
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

    res.status(200).json(exposeRoom(room));
  } catch (err) {
    if (err?.code === "23505" && err?.constraint === "rooms_name_key") {
      return res.status(409).json({ error: "Room name already exists" });
    }
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
      `SELECT id, name, game_mode, host, player_count, players, status, room_password_hash
       FROM rooms
       WHERE name COLLATE "C" = $1 COLLATE "C"`,
      [name]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json(exposeRoom(result.rows[0]));
  } catch (err) {
    console.error("Failed to get room by name:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/by-player/:username", async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: "Missing username" });

    const result = await pool.query(
      `SELECT id, name, game_mode, host, player_count, players, status, room_password_hash
       FROM rooms
       WHERE players @> ARRAY[$1]::text[]
       ORDER BY created_at ASC
       LIMIT 1`,
      [username]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json(exposeRoom(result.rows[0]));
  } catch (err) {
    console.error("Failed to get room by player:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Update Room Name
router.patch("/:roomId/name", async (req, res) => {
  const { roomId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Missing new room name" });
  }

  const auth = authenticateRequest(req);
  if (!auth) return rejectUnauthenticated(res);
  const username = auth.username;

  const trimmedName = String(name).trim();
  const isValidName = /^[a-zA-Z0-9-]{1,15}$/.test(trimmedName);
  if (!isValidName) {
    return res.status(400).json({ error: "Invalid room name" });
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

    const duplicateResult = await pool.query(
      `SELECT id
       FROM rooms
       WHERE id <> $1
         AND name COLLATE "C" = $2 COLLATE "C"
       LIMIT 1`,
      [roomId, trimmedName]
    );

    if (duplicateResult.rowCount > 0) {
      return res.status(409).json({ error: "Room already used" });
    }

    const updateResult = await pool.query(
      `
      UPDATE rooms
      SET name = $1
      WHERE id = $2
      RETURNING *;
      `,
      [trimmedName, roomId]
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
  const { mode } = req.body;
  const allowedModes = ["classic", "mirror", "chaotic", "invisible", "cooperative", "cooperative_roles", "giant"];

  if (!mode) {
    return res.status(400).json({ error: "Missing new room mode" });
  }

  const normalizedMode = mode.toLowerCase();

  if (!allowedModes.includes(normalizedMode)) {
    return res.status(400).json({
      error: "Invalid game mode. Allowed: Classic, Mirror, Chaotic, Invisible, Co-op Alternate, Co-op Roles, Giant",
    });
  }

  const auth = authenticateRequest(req);
  if (!auth) return rejectUnauthenticated(res);
  const username = auth.username;

  try {
    const roomResult = await pool.query(
      `SELECT host, player_count FROM rooms WHERE id = $1`,
      [roomId]
    );

    if (!roomResult.rowCount) {
      return res.status(404).json({ error: "Room not found" });
    }

    const { host, player_count } = roomResult.rows[0];

    if (host !== username) {
      return res.status(403).json({
        error: "Only the host can rename the room"
      });
    }

    const maxPlayers = getMaxPlayers(normalizedMode);
    if (player_count > maxPlayers) {
      return res.status(400).json({
        error: `Cannot switch to ${formatModeLabel(normalizedMode)} with ${player_count} players`,
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
