import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import { createGame, getGame, removeGame } from "../game/gameManager.js";
import { resolveSocketUser, USERNAME_PATTERN } from "../auth/session.js";
import { perfLogDuration, perfStart } from "../perf.js";

const activeUsers = new Map();
const activeUserSockets = new Map();
let peakActiveUserCount = 0;
const pendingDisconnects = new Map();
const MOVE_INPUT_RATE_PER_SECOND = 45;
const MOVE_INPUT_BURST = 30;
const DEFAULT_GAME_START_COUNTDOWN_MS = process.env.NODE_ENV === "test" ? 0 : 3200;
const DEFAULT_RECONNECT_GRACE_MS = 15000;
const DEFAULT_GAME_OVER_REVEAL_MS = process.env.NODE_ENV === "test" ? 0 : 800;

const getReconnectGraceMs = () => {
  const value = Number(process.env.RECONNECT_GRACE_MS);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_RECONNECT_GRACE_MS;
};

const getGameOverRevealMs = () => {
  const value = Number(process.env.GAME_OVER_REVEAL_MS);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_GAME_OVER_REVEAL_MS;
};

const getGameStartCountdownMs = () => {
  const value = Number(process.env.GAME_START_COUNTDOWN_MS);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_GAME_START_COUNTDOWN_MS;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const clearGameStartCountdown = (game) => {
  if (!game) return;
  if (game.startCountdownTimeout) {
    clearTimeout(game.startCountdownTimeout);
    game.startCountdownTimeout = null;
  }
  game.startCountdownEndsAt = null;
};

const getRemainingGameStartCountdownMs = (game) => {
  if (!game?.isPaused) return 0;
  const endsAt = Number(game.startCountdownEndsAt);
  if (!Number.isFinite(endsAt)) return 0;
  return Math.max(0, endsAt - Date.now());
};

const emitFinalGameState = (io, roomId, game) => {
  const emit = (state) => io.to(String(roomId)).emit("gameState", state);

  if (typeof game?.emitState === "function") {
    return game.emitState({ force: true, emit });
  }

  if (typeof game?.serialize === "function") {
    emit(game.serialize());
    return true;
  }

  return false;
};

const getDisconnectKey = (roomId, username) => `${String(roomId)}:${username}`;

const clearPendingDisconnect = (roomId, username) => {
  const key = getDisconnectKey(roomId, username);
  const timeout = pendingDisconnects.get(key);
  if (!timeout) return;
  clearTimeout(timeout);
  pendingDisconnects.delete(key);
};

const consumeMoveInputBudget = (socket) => {
  const now = Date.now();
  const budget = socket.data.moveInputBudget ?? {
    tokens: MOVE_INPUT_BURST,
    updatedAt: now,
  };
  const elapsedSeconds = Math.max(0, (now - budget.updatedAt) / 1000);
  const tokens = Math.min(
    MOVE_INPUT_BURST,
    budget.tokens + elapsedSeconds * MOVE_INPUT_RATE_PER_SECOND
  );

  if (tokens < 1) {
    socket.data.moveInputBudget = { tokens, updatedAt: now };
    return false;
  }

  socket.data.moveInputBudget = { tokens: tokens - 1, updatedAt: now };
  return true;
};

export const isUsernameConnected = (username, socketId = null) => {
  if (!username) return false;
  const connectedSocketId = activeUsers.get(username);
  if (!connectedSocketId) return false;
  if (socketId && connectedSocketId === socketId) return false;
  const activeSocket = activeUserSockets.get(username);
  if (activeSocket && activeSocket.id === connectedSocketId && activeSocket.connected === false) {
    activeUsers.delete(username);
    activeUserSockets.delete(username);
    return false;
  }
  return true;
};

export const getActiveUserCount = () => activeUsers.size;
export const getPeakActiveUserCount = () => peakActiveUserCount;

const registerUsername = (username, socket) => {
  if (socket.data.username && socket.data.username !== username) {
    unregisterUsername(socket.data.username, socket);
  }
  const existing = activeUsers.get(username);
  if (existing && existing !== socket.id) {
    const socketRegistry = socket.nsp?.sockets || socket.server?.sockets?.sockets;
    if (!socketRegistry || socketRegistry.has(existing)) {
      return { ok: false, error: "Username already connected" };
    }
    activeUsers.delete(username);
  }
  activeUsers.set(username, socket.id);
  activeUserSockets.set(username, socket);
  peakActiveUserCount = Math.max(peakActiveUserCount, activeUsers.size);
  socket.data.username = username;
  return { ok: true };
};

const unregisterUsername = (username, socket) => {
  if (!username) return;
  const existing = activeUsers.get(username);
  if (existing === socket.id) {
    activeUsers.delete(username);
    activeUserSockets.delete(username);
  }
};

const unregisterUsernamePresence = (username) => {
  activeUsers.delete(username);
  activeUserSockets.delete(username);
};

async function syncUsersIdSequence() {
  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence('users', 'id'),
      COALESCE((SELECT MAX(id) FROM users), 0) + 1,
      false
    )
  `);
}

async function updateProfile(username, avatar) {
  const query = `
    INSERT INTO users (
      username,
      avatar,
      preferences,
      solo_games_played,
      highest_solo_score,
      multiplayer_games_played,
      multiplayer_wins,
      multiplayer_losses
    )
    VALUES ($1, $2, '{"theme":"light","soundEnabled":true,"language":"en"}'::jsonb, 0, 0, 0, 0, 0)
    ON CONFLICT (username)
    DO UPDATE SET avatar = EXCLUDED.avatar
    WHERE users.deleted_at IS NULL
    RETURNING id, username, avatar, preferences;
  `;

  const values = [username, JSON.stringify(avatar)];
  return pool.query(query, values);
}

function getMaxPlayers(gameMode = "classic") {
  switch (gameMode) {
    case "cooperative":
    case "cooperative_roles":
      return 2;
    case "classic":
    case "mirror":
    case "chaotic":
    case "invisible":
    default:
      return 8;
  }
}

function exposeRoom(room) {
  const { room_password_hash, ...safeRoom } = room;
  return {
    ...safeRoom,
    has_password: Boolean(room_password_hash),
  };
}

function getCoopStartError(gameMode) {
  return gameMode === "cooperative_roles"
    ? "Co-op Roles requires exactly 2 players to start."
    : "Co-op Alternate requires exactly 2 players to start.";
}

export async function broadcastAvailableRooms(io) {
  const start = perfStart();
  const result = await pool.query(
    `SELECT id, name, game_mode, host, player_count, players, room_password_hash
      FROM rooms
      WHERE status = 'waiting'
        AND is_listed = TRUE
      ORDER BY created_at ASC;`
  );

  const rows = result.rows
    .filter((room) => room.is_listed !== false)
    .map((room) => ({
      ...exposeRoom(room),
      maxPlayers: getMaxPlayers(room.game_mode),
    }))
    .filter((room) => room.player_count < room.maxPlayers);

  io.emit("availableRooms", rows);
  perfLogDuration("socket:broadcastAvailableRooms", start, {
    count: rows.length,
  });
}

export default function setupSockets(io) {
  io.on("connection", (socket) => {
    // Helper functions
    const syncSoloScoresSequence = async () => {
      await pool.query(`
        SELECT setval(
          'public.solo_scores_id_seq',
          COALESCE((SELECT MAX(id) FROM solo_scores), 0) + 1,
          false
        )
      `);
    };

    const fetchSoloLeaderboard = async () => {
      const result = await pool.query(
        `SELECT s.username, u.avatar, s.score
         FROM solo_scores s
         JOIN users u ON u.username = s.username AND u.deleted_at IS NULL
         ORDER BY s.score DESC, s.id ASC
         LIMIT 10`
      );

      return result.rows.map((row, index) => ({
        rank: index + 1,
        name: row.username,
        avatar: row.avatar,
        score: row.score ?? 0,
      }));
    };

    const fetchCoopLeaderboard = async () => {
      const result = await pool.query(
        `SELECT c.player_one, u1.avatar AS avatar_one,
                c.player_two, u2.avatar AS avatar_two,
                c.score
         FROM coop_scores c
         JOIN users u1 ON u1.username = c.player_one AND u1.deleted_at IS NULL
         JOIN users u2 ON u2.username = c.player_two AND u2.deleted_at IS NULL
         ORDER BY c.score DESC, c.id ASC
         LIMIT 10`
      );

      return result.rows.map((row, index) => ({
        rank: index + 1,
        players: [
          { name: row.player_one, avatar: row.avatar_one },
          { name: row.player_two, avatar: row.avatar_two },
        ],
        score: row.score ?? 0,
      }));
    };

    const broadcastLeaderboards = async () => {
      const [soloLeaderboard, coopLeaderboard] = await Promise.all([
        fetchSoloLeaderboard(),
        fetchCoopLeaderboard(),
      ]);

      io.emit("leaderboardSolo", soloLeaderboard);
      io.emit("leaderboardCoop", coopLeaderboard);
    };

    const updateSoloStats = async (game) => {
      const player = game.players[0];
      if (!player) return;

      const result = await pool.query(
        `UPDATE users
         SET solo_games_played = solo_games_played + 1,
             highest_solo_score = GREATEST(highest_solo_score, $2)
         WHERE username = $1
           AND deleted_at IS NULL`,
        [player.username, player.score]
      );
      if (result.rowCount === 0) {
        console.warn(`No user row found for solo stats update: ${player.username}`);
        return;
      }

      try {
        await pool.query(
          `INSERT INTO solo_scores (username, score, lines, level, tetris_count, duration_seconds)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [player.username, player.score, player.lines, player.level, player.tetrisCount, Math.floor((game.activePlayTimeMs ?? 0) / 1000)]
        );
      } catch (err) {
        if (err?.code === "23505" && err?.constraint === "solo_scores_pkey") {
          await syncSoloScoresSequence();
          await pool.query(
            `INSERT INTO solo_scores (username, score, lines, level, tetris_count, duration_seconds)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [player.username, player.score, player.lines, player.level, player.tetrisCount, Math.floor((game.activePlayTimeMs ?? 0) / 1000)]
          );
        } else {
          throw err;
        }
      }

      const leaderboard = await fetchSoloLeaderboard();
      io.emit("leaderboardSolo", leaderboard);
    };

    const updateCoopStats = async (game, summary) => {
      if (game.statsUpdated) return;

      const players = Array.isArray(game.players) ? game.players : [];
      if (players.length < 2) return;

      const usernames = players
        .map((player) => player?.username)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      if (usernames.length < 2) return;

      const summaryScores = Array.isArray(summary?.results)
        ? summary.results.map((result) => result?.score ?? 0)
        : [];
      const sharedScore = Math.max(
        game.getCooperativePlayer?.()?.score ?? 0,
        ...summaryScores
      );
      const sharedPlayer = game.getCooperativePlayer?.() ?? {};

      await pool.query(
        `INSERT INTO coop_scores (player_one, player_two, score, lines, level, tetris_count, duration_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          usernames[0],
          usernames[1],
          sharedScore,
          sharedPlayer.lines ?? 0,
          sharedPlayer.level ?? 1,
          sharedPlayer.tetrisCount ?? 0,
          summary?.durationSeconds ?? Math.floor((game.activePlayTimeMs ?? 0) / 1000),
        ]
      );

      const leaderboard = await fetchCoopLeaderboard();
      io.emit("leaderboardCoop", leaderboard);

      game.statsUpdated = true;
    };

    const attachPlayerAvatars = async (room) => {
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
    };

    const updateMultiplayerStats = async (game, summary) => {
      if (!summary || ["cooperative", "cooperative_roles"].includes(summary.mode)) return;
      if (game?.statsUpdated) return;

      const players = Array.isArray(summary.results) ? summary.results : [];
      if (!players.length) return;

      const winner = summary.winner ?? null;

      for (const player of players) {
        if (!player?.username) continue;
        const isWinner = winner && player.username === winner;

        await pool.query(
          `UPDATE users
           SET multiplayer_games_played = multiplayer_games_played + 1,
               multiplayer_wins = multiplayer_wins + $2,
               multiplayer_losses = multiplayer_losses + $3
           WHERE username = $1
             AND deleted_at IS NULL`,
          [player.username, isWinner ? 1 : 0, isWinner ? 0 : 1]
        );

        await pool.query(
          `INSERT INTO multiplayer_scores (
             username, score, lines, level, tetris_count, lines_sent, duration_seconds, is_winner, game_mode
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            player.username,
            player.score ?? 0,
            player.lines ?? 0,
            player.level ?? 1,
            player.tetrisCount ?? 0,
            player.linesSent ?? 0,
            player.durationSeconds ?? summary.durationSeconds ?? 0,
            Boolean(isWinner),
            summary.mode || "classic",
          ]
        );
      }

      game.statsUpdated = true;
    };

    // getLeaderboardSolo Socket
    socket.on("getLeaderboardSolo", async () => {
      try {
        const leaderboard = await fetchSoloLeaderboard();
        socket.emit("leaderboardSolo", leaderboard);
      } catch (err) {
        console.error("getLeaderboardSolo failed:", err);
      }
    });

    // getLeaderboardCoop Socket
    socket.on("getLeaderboardCoop", async () => {
      try {
        const leaderboard = await fetchCoopLeaderboard();
        socket.emit("leaderboardCoop", leaderboard);
      } catch (err) {
        console.error("getLeaderboardCoop failed:", err);
      }
    });

    // Register user (ensure username is unique per active connection)
    socket.on("registerUser", (payload = {}, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      const resolved = resolveSocketUser(socket, payload);
      const username = resolved.username || payload.username;
      if (!resolved.ok) {
        socket.emit("usernameTaken", { username });
        if (ack) ack(resolved);
        return;
      }
      const result = registerUsername(username, socket);
      if (!result.ok) {
        socket.emit("usernameTaken", { username });
      }
      if (ack) ack(result);
    });

    socket.on("unregisterUser", ({ username }, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      unregisterUsername(username, socket);
      if (ack) ack({ ok: true });
    });

    socket.on("updateProfile", async (payload = {}, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      const resolved = resolveSocketUser(socket, payload);
      const username = resolved.username || payload.username;
      const { avatar } = payload;

      if (!resolved.ok) {
        if (ack) ack(resolved);
        return;
      }

      if (!username || !avatar) {
        if (ack) ack({ ok: false, error: "Missing data" });
        return;
      }

      const existing = activeUsers.get(username);
      if (existing && existing !== socket.id) {
        if (ack) ack({ ok: false, error: "Username already connected" });
        return;
      }

      try {
        let result;
        try {
          result = await updateProfile(username, avatar);
        } catch (err) {
          if (err?.code === "23505" && err?.constraint === "users_pkey") {
            await syncUsersIdSequence();
            result = await updateProfile(username, avatar);
          } else {
            throw err;
          }
        }

        if ((result.rowCount ?? result.rows?.length ?? 0) === 0) {
          if (ack) ack({ ok: false, error: "Account scheduled for deletion" });
          return;
        }

        const reg = registerUsername(username, socket);
        if (!reg.ok) {
          if (ack) ack(reg);
          return;
        }

        await broadcastLeaderboards();
        const profile = result.rows[0];
        if (ack) ack({ ok: true, profile });
      } catch (err) {
        console.error("updateProfile failed:", err);
        if (ack) ack({ ok: false, error: "Server error" });
      }
    });

    // Joining room Socket
    socket.on("joinRoom", async (payload = {}, callback) => {
      const start = perfStart();
      const ack = typeof callback === "function" ? callback : null;
      const resolved = resolveSocketUser(socket, payload);
      const { roomId } = payload;
      const roomPassword = typeof payload.roomPassword === "string" ? payload.roomPassword : "";
      const username = resolved.username || payload.username;
      if (!roomId || !username) {
        if (ack) ack({ ok: false, error: "Missing roomId or username" });
        return;
      }
      if (!resolved.ok) {
        if (ack) ack(resolved);
        socket.emit("error", { message: resolved.error });
        return;
      }

      try {
        const reg = registerUsername(username, socket);
        if (!reg.ok) {
          if (ack) ack(reg);
          socket.emit("error", { message: reg.error });
          return;
        }

        // Fetch current room state
        const result = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players, status, ready_again, room_password_hash
           FROM rooms WHERE id = $1`,
          [roomId]
        );

        if (!result.rowCount) {
          if (ack) ack({ ok: false, error: "Room not found" });
          return socket.emit("error", { message: "Room not found" });
        }
        const room = result.rows[0];

        const currentPlayers = Array.isArray(room.players) ? room.players : [];
        const normalizedPlayerCount = currentPlayers.length;
        const maxPlayers = getMaxPlayers(room.game_mode);
        const isAlreadyInRoom = currentPlayers.includes(username);

        if (room.status === "started") {
          const game = getGame(String(roomId));
          const player = game?.getPlayer?.(username);
          if (!isAlreadyInRoom || !game || !player) {
            if (ack) ack({ ok: false, error: "Game already started" });
            return socket.emit("error", { message: "Game already started" });
          }

          clearPendingDisconnect(roomId, username);
          socket.join(String(roomId));
          socket.data.roomId = String(roomId);
          socket.data.isSpectator = false;
          player.socketId = socket.id;
          {
            const remainingCountdownMs = getRemainingGameStartCountdownMs(game);
            socket.emit(
              "gameStarted",
              remainingCountdownMs > 0
                ? { roomId: String(roomId), reconnected: true, remainingCountdownMs }
                : { roomId: String(roomId), reconnected: true }
            );
          }
          socket.emit("gameState", game.serialize());
          if (ack) ack({ ok: true, reconnected: true });
          return;
        }

        clearPendingDisconnect(roomId, username);

        if (!isAlreadyInRoom && room.room_password_hash) {
          if (!roomPassword) {
            if (ack) ack({ ok: false, error: "Room password required" });
            return;
          }

          const passwordMatches = await bcrypt.compare(roomPassword, room.room_password_hash);
          if (!passwordMatches) {
            if (ack) ack({ ok: false, error: "Invalid room password" });
            return;
          }
        }

        if (!isAlreadyInRoom && normalizedPlayerCount >= maxPlayers) {
          if (ack) ack({ ok: false, error: "Room is full" });
          return socket.emit("error", { message: "Room is full" });
        }

        socket.join(String(roomId));
        socket.data.roomId = String(roomId);

        // Add new player if not already in list
        let updatedPlayers = currentPlayers;
        let updatedReadyAgain = room.ready_again || [];
        let hasChanges = false;

        if (!isAlreadyInRoom) {
          updatedPlayers = [...currentPlayers, username];
          hasChanges = true;
        }

        // During a post-game lobby, ready_again is the visible/starting player
        // list. Existing room members must click Play again to enter it, but a
        // player who actually joins the lobby after leaving should be visible.
        if (!isAlreadyInRoom && updatedReadyAgain.length > 0 && !updatedReadyAgain.includes(username)) {
          updatedReadyAgain = [...updatedReadyAgain, username];
          hasChanges = true;
        }

        if (hasChanges) {
          await pool.query(
            "UPDATE rooms SET players = $2, player_count = $3, ready_again = $4 WHERE id = $1",
            [roomId, updatedPlayers, updatedPlayers.length, updatedReadyAgain]
          );
        }

        const roomWithAvatars = await attachPlayerAvatars({
          ...room,
          players: updatedPlayers,
          ready_again: updatedReadyAgain,
          player_count: updatedPlayers.length,
        });

        // Emit to ALL players in room AFTER socket joined
        io.to(String(roomId)).emit("roomState", roomWithAvatars);
        if (ack) ack({ ok: true });
        await broadcastAvailableRooms(io);

      } catch (err) {
        console.error("joinRoom failed:", err);
        socket.emit("error", { message: "Server error" });
        if (ack) ack({ ok: false, error: "Server error" });
      } finally {
        perfLogDuration("socket:joinRoom", start, { roomId });
      }
    });

    // Spectator join (players in the room can spectate)
    socket.on("joinSpectator", async (payload = {}, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      const resolved = resolveSocketUser(socket, payload);
      const { roomId } = payload;
      const username = resolved.username || payload.username;
      if (!roomId || !username) {
        if (ack) ack({ ok: false, error: "Missing roomId or username" });
        return;
      }
      if (!resolved.ok) {
        if (ack) ack(resolved);
        socket.emit("error", { message: resolved.error });
        return;
      }

      const roomResult = await pool.query(
        `SELECT id, name, players, status
         FROM rooms
         WHERE id = $1`,
        [roomId]
      );
      if (!roomResult.rowCount) {
        if (ack) ack({ ok: false, error: "Room not found" });
        return;
      }
      const room = roomResult.rows[0];
      unregisterUsernamePresence(username);
      socket.join(String(roomId));
      socket.data.roomId = String(roomId);
      socket.data.username = username;
      socket.data.isSpectator = true;

      const game = getGame(String(roomId));
      if (game) {
        socket.emit("gameState", game.serialize());
      } else {
        socket.emit("roomState", room);
      }
      if (ack) ack({ ok: true });
    });

    // Pause/resume (solo only)
    socket.on("pauseGame", ({ roomId, paused }) => {
      if (!roomId) return;
      const game = getGame(String(roomId));
      if (!game || game.isOver || game.mode_player !== "solo") return;

      if (paused) {
        game.pause();
      } else {
        game.resume();
      }
    });

    // getAvailableRooms Socket
    socket.on("getAvailableRooms", async () => {
      const start = perfStart();
      await broadcastAvailableRooms(io);
      perfLogDuration("socket:getAvailableRooms", start);
    });

    // getRoomState Socket
    socket.on("getRoomState", async ({ roomId }) => {
      const start = perfStart();
      try {
        const result = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players, status, ready_again, room_password_hash
          FROM rooms WHERE id = $1`,
          [roomId]
        );

        if (!result.rowCount) {
          return socket.emit("error", { message: "Room not found" });
        }

        const room = result.rows[0];
        const roomWithAvatars = await attachPlayerAvatars(room);

        // If game hasn't started, send room state
        if (room.status !== "started") {
          socket.emit("roomState", roomWithAvatars);
          return;
        }

        // If game already started, send current state for late joiner
        const game = getGame(String(roomId));
        if (!game) return; // or recreate the game instance if needed

        const remainingCountdownMs = getRemainingGameStartCountdownMs(game);
        socket.emit(
          "gameStarted",
          remainingCountdownMs > 0 ? { roomId, remainingCountdownMs } : { roomId }
        );
        socket.emit("gameState", game.serialize());

      } catch (err) {
        console.error("getRoomState failed:", err);
        socket.emit("error", { message: "Server error" });
      } finally {
        perfLogDuration("socket:getRoomState", start, { roomId });
      }
    });

    const removePlayerFromRoom = async (roomId, username) => {
      if (!roomId || !username) return null;

      try {
        const id = Number(roomId);

        const roomResult = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players, status, ready_again
          FROM rooms
          WHERE id = $1`,
          [id]
        );

        if (!roomResult.rowCount) return null;

        const room = roomResult.rows[0];
        const currentPlayers = Array.isArray(room.players) ? room.players : [];
        const currentReadyAgain = Array.isArray(room.ready_again) ? room.ready_again : [];
        const isInPlayers = currentPlayers.includes(username);
        const isReadyAgain = currentReadyAgain.includes(username);
        if (!isInPlayers && !isReadyAgain) return await attachPlayerAvatars(room);

        const updatedPlayers = currentPlayers.filter((p) => p !== username);
        const readyAgain = currentReadyAgain.filter((p) => p !== username);

        // No players left → DELETE room
        if (updatedPlayers.length === 0 && readyAgain.length === 0) {
          await pool.query(`DELETE FROM rooms WHERE id = $1`, [id]);
          await broadcastAvailableRooms(io);
          return null;
        }

        let newHost = room.host;
        if (username === room.host) {
          newHost = updatedPlayers[0];
        }

        // Always keep lobby in WAITING state
        const result = await pool.query(
          `UPDATE rooms
          SET players = $2,
              player_count = $3,
              host = $4,
              ready_again = $5
          WHERE id = $1
          RETURNING *`,
          [id, updatedPlayers, updatedPlayers.length, newHost, readyAgain]
        );

        const roomWithAvatars = await attachPlayerAvatars(result.rows[0]);

        io.to(String(roomId)).emit("roomState", roomWithAvatars);
        await broadcastAvailableRooms(io);
        return roomWithAvatars;

      } catch (err) {
        console.error("removePlayerFromRoom failed:", err);
        return null;
      }
    };

    const leaveAllRoomsForUser = async (username) => {
      const roomsResult = await pool.query(
        `SELECT id, players, ready_again, status
         FROM rooms
         WHERE players @> ARRAY[$1]::text[]
            OR ready_again @> ARRAY[$1]::text[]`,
        [username]
      );

      for (const room of roomsResult.rows || []) {
        const roomId = String(room.id);
        const game = getGame(roomId);
        if (game && room.status === "started") {
          const player = game.getPlayer?.(username);
          if (player) {
            player.isAlive = false;
            if (typeof game.checkGameOver === "function" && typeof game.endGame === "function") {
              const result = game.checkGameOver();
              if (result.over && game.onGameOver) {
                const summary = game.endGame();
                await game.onGameOver(summary);
              }
            }
          }
        }
        socket.leave(roomId);
        clearPendingDisconnect(roomId, username);
        await removePlayerFromRoom(roomId, username);
      }
    };

    socket.on("enterMenu", async (payload = {}, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      const resolved = resolveSocketUser(socket, payload);
      const username = resolved.username || payload.username;

      if (!resolved.ok) {
        if (ack) ack(resolved);
        return;
      }

      try {
        await leaveAllRoomsForUser(username);
        unregisterUsername(username, socket);
        socket.data.roomId = null;
        socket.data.isSpectator = false;
        if (ack) ack({ ok: true });
      } catch (err) {
        console.error("enterMenu failed:", err);
        if (ack) ack({ ok: false, error: "Server error" });
      }
    });

    socket.on("playerLeave", async (payload = {}, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      const { roomId } = payload;
      const resolved = resolveSocketUser(socket, payload);
      const effectiveUsername = resolved.username;

      if (!resolved.ok) {
        if (ack) ack(resolved);
        return;
      }

      if (socket.data.isSpectator) {
        socket.leave(String(roomId));
        socket.data.roomId = null;
        socket.data.isSpectator = false;
        if (ack) ack({ ok: true });
        return;
      }

      clearPendingDisconnect(roomId, effectiveUsername);

      // Remove player from Game instance
      const game = getGame(roomId);
      if (game) {
        const player = game.getPlayer(effectiveUsername);
        if (player) {
          player.isAlive = false;
          if (typeof game.checkGameOver === "function" && typeof game.endGame === "function") {
            const result = game.checkGameOver();
            if (result.over && game.onGameOver) {
              const summary = game.endGame();
              await game.onGameOver(summary);
            }
          }
        }
      }

      // Leave socket room
      socket.leave(String(roomId));
      socket.data.roomId = null;
      socket.data.isSpectator = false;

      // Optionally update DB but avoid constraints for host mid-game
      await removePlayerFromRoom(roomId, effectiveUsername);
      if (ack) ack({ ok: true });
    });

    // playAgain: return players to lobby; first caller becomes new host if original host left
    socket.on("playAgain", async (payload = {}) => {
      try {
        const resolved = resolveSocketUser(socket, payload);
        const { roomId } = payload;
        const username = resolved.username;
        if (!resolved.ok) return;
        if (!roomId || !username) return;

        const id = Number(roomId);
        if (isNaN(id)) return;

        const result = await pool.query(
          `SELECT id, ready_again
          FROM rooms
          WHERE id = $1`,
          [id]
        );
        if (!result.rowCount) return;

        let readyAgain = result.rows[0].ready_again || [];
        if (!readyAgain.includes(username)) readyAgain.push(username);

        const status = 'waiting';

        const updated = await pool.query(
          `UPDATE rooms
          SET ready_again = $1,
              status = $2
          WHERE id = $3
          RETURNING *`,
          [readyAgain, status, id]
        );

        const roomWithAvatars = await attachPlayerAvatars(updated.rows[0]);
        io.to(String(roomId)).emit("roomState", roomWithAvatars);
        await broadcastAvailableRooms(io);

      } catch (err) {
        console.error("playAgain failed:", err);
      }
    });

    // startGame Socket and update room status in DB
    socket.on("startGame", async ({ roomId }) => {
      const username = socket.data.username;
      if (!roomId || !username) return;

      const id = Number(roomId);

      if (!Number.isInteger(id) || id <= 0 || !username) {
        return;
      }

      try {
        // Fetch current room
        const roomResult = await pool.query(
          "SELECT host, players, status, game_mode, ready_again, is_listed FROM rooms WHERE id=$1",
          [roomId]
        );
        if (!roomResult.rowCount) return;

        let room = roomResult.rows[0];

        // Only host can start
        if (room.host !== username) {
          return;
        }

        // Prevent restarting an already started game
        if (room.status === "started") return;

        const isRestartingFinishedGame = room.status === "finished" || (room.ready_again && room.ready_again.length);
        const playersToStart = isRestartingFinishedGame
          ? (room.ready_again || [])
          : room.players;

        // Validate player count based on game mode
        const gameMode = room.game_mode || "classic";
        const maxPlayers = getMaxPlayers(gameMode);
        const playerCount = playersToStart.length;
        const isSoloStart = playerCount === 1;
        const isPrivateSoloRoom = room.is_listed === false;
        const isCoop = ["cooperative", "cooperative_roles"].includes(gameMode);
        const canStart =
          (isSoloStart && isPrivateSoloRoom) ||
          (isCoop ? playerCount === 2 : playerCount >= 2 && playerCount <= maxPlayers);

        if (!canStart) {
          socket.emit("error", {
            message: isCoop
              ? getCoopStartError(gameMode)
              : `This room requires between 2 and ${maxPlayers} players to start.`,
          });
          return;
        }

        // Replace room.players with ready_again if applicable
        if (room.ready_again && room.ready_again.length) {
          await pool.query(
            "UPDATE rooms SET players=$1, ready_again='{}' WHERE id=$2",
            [playersToStart, roomId]
          );
        }

        // Always rebuild the in-memory game from the current DB room state.
        removeGame(roomId);
        const game = createGame(roomId, playersToStart, gameMode, room.host);

        game.setCallbacks({
          onTick: (state) => {
            const roomEmitter = io.to(String(roomId));
            (roomEmitter.volatile ?? roomEmitter).emit("gameState", state);
          },
          onGameOver: async (summary) => {
            try {
              const finalStateEmitted = emitFinalGameState(io, roomId, game);
              if (finalStateEmitted) {
                await wait(getGameOverRevealMs());
              }

              io.to(String(roomId)).emit("gameOver", { winner: summary.winner });

              if (game.mode_player === "solo") {
                await updateSoloStats(game);
                await pool.query("DELETE FROM rooms WHERE id = $1", [roomId]);
                removeGame(roomId);
                return;
              }

              if (["cooperative", "cooperative_roles"].includes(summary?.mode)) {
                await updateCoopStats(game, summary);
              }

              await updateMultiplayerStats(game, summary);
              await pool.query(
                "UPDATE rooms SET status = 'finished' WHERE id = $1",
                [roomId]
              );
              removeGame(roomId);
            } catch (err) {
              console.error("Game over handling failed:", err);
            }
          },
        });

        const countdownMs = getGameStartCountdownMs();
        clearGameStartCountdown(game);

        // Start game and server tick
        game.start({ paused: countdownMs > 0 });

        // Update DB to mark room as started
        await pool.query("UPDATE rooms SET status='started' WHERE id=$1", [roomId]);

        // Fetch latest room info (including avatars)
        const latestRoom = await pool.query(
          "SELECT id, name, players, host, game_mode, status FROM rooms WHERE id=$1",
          [roomId]
        );

        const roomWithAvatars = await attachPlayerAvatars(latestRoom.rows[0]);

        // Emit updated room state to all players
        io.to(String(roomId)).emit("roomState", roomWithAvatars);

        await broadcastAvailableRooms(io);

        if (countdownMs > 0) {
          game.startCountdownEndsAt = Date.now() + countdownMs;
          game.startCountdownTimeout = setTimeout(() => {
            const currentGame = getGame(String(roomId));
            if (!currentGame || currentGame !== game || currentGame.isOver) return;
            clearGameStartCountdown(currentGame);
            currentGame.resume();
            currentGame.emitState({
              force: true,
              emit: (state) => io.to(String(roomId)).emit("gameState", state),
            });
          }, countdownMs);
        }

        // Emit start event after countdown timing has been recorded so
        // immediately-following getRoomState/joinRoom calls can recover it.
        io.to(String(roomId)).emit(
          "gameStarted",
          countdownMs > 0 ? { roomId, countdownMs } : { roomId }
        );

      } catch (err) {
        console.error("startGame failed:", err);
      }
    });

    // movePiece during game Socket (enqueue input for server tick)
    socket.on("movePiece", ({ roomId, action }) => {
      const game = getGame(String(roomId));
      if (!game || !game.isRunning || game.isOver || game.isPaused) return;

      const username = socket.data.username;
      if (!username || !action || socket.data.isSpectator) return;
      if (!consumeMoveInputBudget(socket)) return;

      game.enqueueInput(username, action);
      game.processQueuedInputsFor(username);

      const result = game.checkGameOver();
      if (result.over) {
        const summary = game.endGame();
        if (game.onGameOver) game.onGameOver(summary);
        return;
      }

      const playerState = game.serializePlayerView?.(username);
      if (playerState) {
        socket.emit("playerState", playerState);
      }

      game.emitState({
        emit: (state) => {
          socket.to(String(roomId)).emit("gameState", state);
        },
      });
    });

    // Socket disconnection
    socket.on("disconnect", async () => {
      const username = socket.data.username;
      const roomId = socket.data.roomId;

      unregisterUsername(username, socket);

      if (!socket.data.isSpectator) {
        if (roomId && username) {
          clearPendingDisconnect(roomId, username);
          const key = getDisconnectKey(roomId, username);
          const timeout = setTimeout(async () => {
            pendingDisconnects.delete(key);
            const game = getGame(String(roomId));

            if (game) {
              const player = game.players.find(p => p.username === username);

              if (player && player.isAlive) {
                player.die();

                const result = game.checkGameOver();
                if (result.over) {
                  const summary = game.endGame();
                  if (game.onGameOver) game.onGameOver(summary);
                }
              }
            }

            await removePlayerFromRoom(roomId, username);
          }, getReconnectGraceMs());

          pendingDisconnects.set(key, timeout);
          return;
        }

        await broadcastAvailableRooms(io);
      }

    });
  });
}
