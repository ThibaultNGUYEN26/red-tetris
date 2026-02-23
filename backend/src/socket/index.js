import { pool } from "../config/db.js";
import { createGame, getGame, removeGame } from "../game/gameManager.js";

function getMaxPlayers() {
  return 2;
}

export async function broadcastAvailableRooms(io) {
  const result = await pool.query(
    `SELECT id, name, game_mode, host, player_count, players
      FROM rooms
      WHERE status = 'waiting'
      ORDER BY created_at ASC;`
  );

  const rows = result.rows
    .map((room) => ({
      ...room,
      maxPlayers: getMaxPlayers(room.game_mode),
    }))
    .filter((room) => room.player_count < room.maxPlayers);

  io.emit("availableRooms", rows);
}

export default function setupSockets(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Helper functions
    const fetchSoloLeaderboard = async () => {
      const result = await pool.query(
        `SELECT s.username, u.avatar, s.score
         FROM solo_scores s
         JOIN users u ON u.username = s.username
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

    const updateSoloStats = async (game) => {
      if (!game || game.mode_player !== "solo") return;

      const player = game.players[0];
      if (!player) return;

      const result = await pool.query(
        `UPDATE users
         SET solo_games_played = solo_games_played + 1,
             highest_solo_score = GREATEST(highest_solo_score, $2)
         WHERE username = $1`,
        [player.username, player.score]
      );
      if (result.rowCount === 0) {
        console.warn(`No user row found for solo stats update: ${player.username}`);
      }

      await pool.query(
        `INSERT INTO solo_scores (username, score)
         VALUES ($1, $2)`,
        [player.username, player.score]
      );

      const leaderboard = await fetchSoloLeaderboard();
      io.emit("leaderboardSolo", leaderboard);
    };

    const attachPlayerAvatars = async (room) => {
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
    };

    const removePlayerFromGame = async (roomId, username) => {
      if (!roomId || !username) return;

      try {
        const id = Number(roomId);

        const roomResult = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players, status
          FROM rooms
          WHERE id = $1`,
          [id]
        );

        if (!roomResult.rowCount) return;

        const room = roomResult.rows[0];
        if (!room.players.includes(username)) return;

        const updatedPlayers = room.players.filter((p) => p !== username);
        let newHost = room.host;
        if (username === room.host) {
          newHost = updatedPlayers.length > 0 ? updatedPlayers[0] : null;
        }

        // No players left → DELETE room
        if (updatedPlayers.length === 0) {
          await pool.query(
            `DELETE FROM rooms WHERE id = $1`,
            [id]
          );

          await broadcastAvailableRooms(io);
          return;
        }

        // CASE 2 — One player left → FINISHED
        if (updatedPlayers.length === 1) {
          const result = await pool.query(
            `UPDATE rooms
            SET players = $2::jsonb,
                player_count = 1,
                host = $3,
                status = 'finished'
            WHERE id = $1
            RETURNING *`,
            [id, JSON.stringify(updatedPlayers), newHost]
          );

          const roomWithAvatars = await attachPlayerAvatars(result.rows[0]);

          io.to(String(roomId)).emit("roomState", roomWithAvatars);
          await broadcastAvailableRooms(io);
          return;
        }

        // More than 1 player → Normal update
        const result = await pool.query(
          `UPDATE rooms
          SET players = $2::jsonb,
              player_count = $3,
              host = $4
          WHERE id = $1
          RETURNING *`,
          [id, JSON.stringify(updatedPlayers), updatedPlayers.length, newHost]
        );

        const roomWithAvatars = await attachPlayerAvatars(result.rows[0]);

        io.to(String(roomId)).emit("roomState", roomWithAvatars);
        await broadcastAvailableRooms(io);

      } catch (err) {
        console.error("removePlayerFromGame failed:", err);
      }
    };

    const removePlayerFromRoom = async (roomId, username) => {
      if (!roomId || !username) return;

      try {
        const id = Number(roomId);

        const roomResult = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players, status
          FROM rooms
          WHERE id = $1`,
          [id]
        );

        if (!roomResult.rowCount) return;

        const room = roomResult.rows[0];
        if (!room.players.includes(username)) return;

        const updatedPlayers = room.players.filter((p) => p !== username);

        // No players left → DELETE room
        if (updatedPlayers.length === 0) {
          await pool.query(`DELETE FROM rooms WHERE id = $1`, [id]);
          await broadcastAvailableRooms(io);
          return;
        }

        // If host left → first remaining player becomes host
        let newHost = room.host;
        if (username === room.host) {
          newHost = updatedPlayers[0]; // always exists here
        }

        // Always keep lobby in WAITING state
        const result = await pool.query(
          `UPDATE rooms
          SET players = $2::jsonb,
              player_count = $3,
              host = $4,
              status = 'waiting'
          WHERE id = $1
          RETURNING *`,
          [id, JSON.stringify(updatedPlayers), updatedPlayers.length, newHost]
        );

        const roomWithAvatars = await attachPlayerAvatars(result.rows[0]);

        io.to(String(roomId)).emit("roomState", roomWithAvatars);
        await broadcastAvailableRooms(io);

      } catch (err) {
        console.error("removePlayerFromRoom failed:", err);
      }
    };

    const updateMultiplayerStats = async (game, summary) => {
      if (!summary || summary.mode === "cooperative") return;
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
           WHERE username = $1`,
          [player.username, isWinner ? 1 : 0, isWinner ? 0 : 1]
        );
      }

      if (game) {
        game.statsUpdated = true;
      }
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

    // Joining room Socket
    socket.on("joinRoom", async ({ roomId, username }, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      if (!roomId || !username) {
        if (ack) ack({ ok: false, error: "Missing roomId or username" });
        return;
      }

      try {
        socket.join(String(roomId));
        socket.data.roomId = String(roomId);
        socket.data.username = username;

        // Fetch current room state
        const result = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players, status
           FROM rooms WHERE id = $1`,
          [roomId]
        );

        if (!result.rowCount) {
          if (ack) ack({ ok: false, error: "Room not found" });
          return socket.emit("error", { message: "Room not found" });
        }
        const room = result.rows[0];

        if (room.status === "started") {
          if (ack) ack({ ok: false, error: "Game already started" });
          return socket.emit("error", { message: "Game already started" });
        }

        const maxPlayers = getMaxPlayers(room.game_mode);
        if (room.player_count >= maxPlayers) {
          if (ack) ack({ ok: false, error: "Room is full" });
          return socket.emit("error", { message: "Room is full" });
        }

        // Add new player if not already in list
        let updatedPlayers = room.players;
        if (!room.players.includes(username)) {
          updatedPlayers = [...room.players, username];
          await pool.query(
            "UPDATE rooms SET players = $2::jsonb, player_count = $3 WHERE id = $1",
            [roomId, JSON.stringify(updatedPlayers), updatedPlayers.length]
          );
        }

        const roomWithAvatars = await attachPlayerAvatars({ ...room, players: updatedPlayers });

        // Emit to ALL players in room AFTER socket joined
        io.to(String(roomId)).emit("roomState", roomWithAvatars);
        if (ack) ack({ ok: true });
        await broadcastAvailableRooms(io);

      } catch (err) {
        console.error("joinRoom failed:", err);
        socket.emit("error", { message: "Server error" });
        if (ack) ack({ ok: false, error: "Server error" });
      }
    });

    // Spectator join (players in the room can spectate)
    socket.on("joinSpectator", async ({ roomId, username }, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      if (!roomId || !username) {
        if (ack) ack({ ok: false, error: "Missing roomId or username" });
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

    // Leaving game Socket
    socket.on("leaveGame", async ({ roomId, username }, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      const effectiveUsername = username || socket.data.username;

      console.log("leaveGame received from", effectiveUsername);

      if (socket.data.isSpectator) {
        socket.leave(String(roomId));
        if (ack) ack({ ok: true });
        return;
      }

      // Remove player from Game instance
      const game = getGame(roomId);
      if (game) {
        if (game.isOver) {
          socket.leave(String(roomId));
          if (ack) ack({ ok: true });
          return;
        }
        const player = game.getPlayer(effectiveUsername);
        if (player) {
          player.isAlive = false;
          console.log(`${effectiveUsername} marked as dead in game`);
        }

        const result = game.checkGameOver();
        console.log("Game over check after player left:", result);

        if (result.over) {
          const summary = game.endGame();
          if (game.onGameOver) {
            await game.onGameOver(summary);
          }
        }
        else {
          console.log("Game not over after player left. Broadcasting updated game state.");
        }
      }

      // Leave socket room
      socket.leave(String(roomId));

      // Optionally update DB but avoid constraints for host mid-game
      await removePlayerFromGame(roomId, effectiveUsername);

      // Broadcast updated room state (including new host if changed)
      const roomResult = await pool.query(
        "SELECT id, name, players, host, game_mode, status FROM rooms WHERE id=$1",
        [roomId]
      );
      if (roomResult.rowCount) {
        const roomWithAvatars = await attachPlayerAvatars(roomResult.rows[0]);
        io.to(String(roomId)).emit("roomState", roomWithAvatars);
      }
      await broadcastAvailableRooms(io);
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

    // Leaving room Socket
    socket.on("leaveRoom", async ({ roomId, username }, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      const effectiveUsername = username || socket.data.username;

      console.log("leaveRoom received from", effectiveUsername);
      if (socket.data.isSpectator) {
        socket.leave(String(roomId));
        if (ack) ack({ ok: true });
        return;
      }

      // Remove player from Game instance
      const game = getGame(roomId);
      if (game) {
        const player = game.getPlayer(effectiveUsername);
        if (player) {
          player.isAlive = false;
          console.log(`${effectiveUsername} left the room`);
        }
      }

      // Leave socket room
      socket.leave(String(roomId));

      // Optionally update DB but avoid constraints for host mid-game
      await removePlayerFromRoom(roomId, effectiveUsername);

      // Broadcast updated room state (including new host if changed)
      const roomResult = await pool.query(
        "SELECT id, name, players, host, game_mode, status FROM rooms WHERE id=$1",
        [roomId]
      );
      if (roomResult.rowCount) {
        const roomWithAvatars = await attachPlayerAvatars(roomResult.rows[0]);
        io.to(String(roomId)).emit("roomState", roomWithAvatars);
      }
      await broadcastAvailableRooms(io);
      if (ack) ack({ ok: true });
    });

    // getAvailableRooms Socket
    socket.on("getAvailableRooms", async () => {
      await broadcastAvailableRooms(io);
    });

    // getRoomState Socket
    socket.on("getRoomState", async ({ roomId }) => {
      try {
        const result = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players, status
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

        socket.emit("gameStarted", {
          roomId
        });
        socket.emit("gameState", game.serialize());

      } catch (err) {
        console.error("getRoomState failed:", err);
        socket.emit("error", { message: "Server error" });
      }
    });

    // playAgain: return players to lobby; first caller becomes new host
    socket.on("playAgain", async ({ roomId, username }) => {
      try {
        if (!roomId || !username) return;

        const result = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players, status
           FROM rooms WHERE id = $1`,
          [roomId]
        );
        if (!result.rowCount) return;

        const room = result.rows[0];

        const game = getGame(String(roomId));
        if (game) {
          game.stop();
          removeGame(roomId);
        }

        const updated = await pool.query(
          `UPDATE rooms
           SET status = 'waiting',
               host = CASE WHEN status = 'waiting' THEN host ELSE $2 END
           WHERE id = $1
           RETURNING id, name, game_mode, host, player_count, players, status`,
          [roomId, username]
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

      try {
        // Fetch current room
        const roomResult = await pool.query(
          "SELECT host, players, status, game_mode FROM rooms WHERE id=$1",
          [roomId]
        );
        if (!roomResult.rowCount) return;

        const room = roomResult.rows[0];

        // Only host can start
        if (room.host !== username) {
          console.log(`User is not host. Host: ${room.host}, User: ${username}`);
          return;
        }

        // Prevent restarting an already started game
        if (room.status === "started") return;

        // Create and store game instance
        const gameMode = room.game_mode || "classic";
        const maxPlayers = getMaxPlayers(gameMode);
        const isSoloStart = room.players.length === 1;
        if (!isSoloStart && room.players.length !== maxPlayers) {
          socket.emit("error", {
            message: `This room requires exactly ${maxPlayers} players to start.`,
          });
          return;
        }

        const game = createGame(roomId, room.players, gameMode, room.host);

        game.setCallbacks({
          onTick: (state) => {
            io.to(String(roomId)).emit("gameState", state);
          },
          onGameOver: async (summary) => {
            io.to(String(roomId)).emit("gameOver", { winner: summary.winner });
            if (game.mode_player === "solo") {
              await updateSoloStats(game);
              await pool.query("DELETE FROM rooms WHERE id = $1", [roomId]);
              removeGame(roomId);
              return;
            }

            await updateMultiplayerStats(game, summary);
            await pool.query(
              "UPDATE rooms SET status = 'finished' WHERE id = $1",
              [roomId]
            );
          },
        });

        // Start game and server tick
        game.start();

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

        // Emit start event; tick will emit gameState
        io.to(String(roomId)).emit("gameStarted", { roomId });

        console.log(`Game started in room ${roomId} by host ${username}`);

      } catch (err) {
        console.error("startGame failed:", err);
      }
    });

    // movePiece during game Socket (enqueue input for server tick)
    socket.on("movePiece", ({ roomId, action }) => {
      const game = getGame(String(roomId));
      if (!game || !game.isRunning || game.isOver) return;

      const username = socket.data.username;
      if (!username || !action || socket.data.isSpectator) return;

      game.enqueueInput(username, action);
    });

    // Socket disconnection
    socket.on("disconnect", () => {
      if (!socket.data.isSpectator) {
        removePlayerFromGame(socket.data.roomId, socket.data.username);
        broadcastAvailableRooms(io);
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
