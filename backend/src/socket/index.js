import { pool } from "../config/db.js";
import { createGame, getGame, removeGame } from "../game/gameManager.js";

const activeUsers = new Map();

const registerUsername = (username, socket) => {
  if (!username) {
    return { ok: false, error: "Missing username" };
  }
  if (socket.data.username && socket.data.username !== username) {
    unregisterUsername(socket.data.username, socket);
  }
  const existing = activeUsers.get(username);
  if (existing && existing !== socket.id) {
    return { ok: false, error: "Username already connected" };
  }
  activeUsers.set(username, socket.id);
  socket.data.username = username;
  return { ok: true };
};

const unregisterUsername = (username, socket) => {
  if (!username) return;
  const existing = activeUsers.get(username);
  if (existing === socket.id) {
    activeUsers.delete(username);
  }
};

function getMaxPlayers(gameMode = "classic") {
  switch (gameMode) {
    case "cooperative":
      return 2;
    case "classic":
    case "speed":
    default:
      return 6;
  }
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

    const fetchCoopLeaderboard = async () => {
      const result = await pool.query(
        `SELECT c.player_one, u1.avatar AS avatar_one,
                c.player_two, u2.avatar AS avatar_two,
                c.score
         FROM coop_scores c
         LEFT JOIN users u1 ON u1.username = c.player_one
         LEFT JOIN users u2 ON u2.username = c.player_two
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

      try {
        await pool.query(
          `INSERT INTO solo_scores (username, score)
           VALUES ($1, $2)`,
          [player.username, player.score]
        );
      } catch (err) {
        if (err?.code === "23505" && err?.constraint === "solo_scores_pkey") {
          await syncSoloScoresSequence();
          await pool.query(
            `INSERT INTO solo_scores (username, score)
             VALUES ($1, $2)`,
            [player.username, player.score]
          );
        } else {
          throw err;
        }
      }

      const leaderboard = await fetchSoloLeaderboard();
      io.emit("leaderboardSolo", leaderboard);
    };

    const updateCoopStats = async (game, summary) => {
      if (!game || game.mode !== "cooperative") return;
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

      await pool.query(
        `INSERT INTO coop_scores (player_one, player_two, score)
         VALUES ($1, $2, $3)`,
        [usernames[0], usernames[1], sharedScore]
      );

      const leaderboard = await fetchCoopLeaderboard();
      io.emit("leaderboardCoop", leaderboard);

      game.statsUpdated = true;
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
    socket.on("registerUser", ({ username }, callback) => {
      const ack = typeof callback === "function" ? callback : null;
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

    // Joining room Socket
    socket.on("joinRoom", async ({ roomId, username }, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      if (!roomId || !username) {
        if (ack) ack({ ok: false, error: "Missing roomId or username" });
        return;
      }

      try {
        const reg = registerUsername(username, socket);
        if (!reg.ok) {
          if (ack) ack(reg);
          socket.emit("error", { message: reg.error });
          return;
        }

        socket.join(String(roomId));
        socket.data.roomId = String(roomId);

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
            "UPDATE rooms SET players = $2, player_count = $3 WHERE id = $1",
            [roomId, updatedPlayers, updatedPlayers.length]
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

      const reg = registerUsername(username, socket);
      if (!reg.ok) {
        if (ack) ack(reg);
        socket.emit("error", { message: reg.error });
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

    const removePlayerFromRoom = async (roomId, username) => {
      if (!roomId || !username) return;

      try {
        const id = Number(roomId);

        const roomResult = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players, status, ready_again
          FROM rooms
          WHERE id = $1`,
          [id]
        );

        if (!roomResult.rowCount) return;

        const room = roomResult.rows[0];
        if (!room.players.includes(username)) return;

        const updatedPlayers = room.players.filter((p) => p !== username);

        let readyAgain = room.ready_again || [];
        readyAgain = readyAgain.filter((p) => p !== username);

        // No players left → DELETE room
        if (updatedPlayers.length === 0 && readyAgain.length === 0) {
          await pool.query(`DELETE FROM rooms WHERE id = $1`, [id]);
          await broadcastAvailableRooms(io);
          return;
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

      } catch (err) {
        console.error("removePlayerFromRoom failed:", err);
      }
    };

    socket.on("playerLeave", async ({ roomId, username }, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      const effectiveUsername = socket.data.username || username;

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

    // playAgain: return players to lobby; first caller becomes new host if original host left
    socket.on("playAgain", async ({ roomId, username }) => {
      try {
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

        const status = readyAgain.length >= 1 ? 'waiting' : 'finished';

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

      try {
        // Fetch current room
        const roomResult = await pool.query(
          "SELECT host, players, status, game_mode, ready_again FROM rooms WHERE id=$1",
          [roomId]
        );
        if (!roomResult.rowCount) return;

        let room = roomResult.rows[0];

        // Only host can start
        if (room.host !== username) {
          console.log(`User is not host. Host: ${room.host}, User: ${username}`);
          return;
        }

        // Prevent restarting an already started game
        if (room.status === "started") return;

        // If ready_again is not empty, use it as the current players
        const playersToStart = (room.ready_again && room.ready_again.length)
          ? room.ready_again
          : room.players;

        // Validate player count based on game mode
        const gameMode = room.game_mode || "classic";
        const maxPlayers = getMaxPlayers(gameMode);
        const playerCount = playersToStart.length;
        const isSoloStart = playerCount === 1;
        const isCoop = gameMode === "cooperative";
        const canStart =
          isSoloStart ||
          (isCoop ? playerCount === 2 : playerCount >= 2 && playerCount <= maxPlayers);

        if (!canStart) {
          socket.emit("error", {
            message: isCoop
              ? "Cooperative mode requires exactly 2 players to start."
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

        // Create and store game instance
        const game = createGame(roomId, playersToStart, gameMode, room.host);

        game.setCallbacks({
          onTick: (state) => {
            io.to(String(roomId)).emit("gameState", state);
          },
          onGameOver: async (summary) => {
            try {
              io.to(String(roomId)).emit("gameOver", { winner: summary.winner });

              if (game.mode_player === "solo") {
                await updateSoloStats(game);
                await pool.query("DELETE FROM rooms WHERE id = $1", [roomId]);
                removeGame(roomId);
                return;
              }

              if (summary?.mode === "cooperative") {
                await updateCoopStats(game, summary);
              }

              await updateMultiplayerStats(game, summary);
              await pool.query(
                "UPDATE rooms SET status = 'finished' WHERE id = $1",
                [roomId]
              );
            } catch (err) {
              console.error("Game over handling failed:", err);
            }
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
    socket.on("disconnect", async () => {
      unregisterUsername(socket.data.username, socket);

      if (!socket.data.isSpectator) {
        const roomId = socket.data.roomId;
        const username = socket.data.username;

        if (roomId && username) {
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
        }

        await broadcastAvailableRooms(io);
      }

      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
