import { pool } from "../config/db.js";
import { createGame, getGame, removeGame } from "../game/gameManager.js";

export async function broadcastAvailableRooms(io) {
  const MAX_PLAYERS = 6;
  const result = await pool.query(
    `SELECT id, name, game_mode, host, player_count, players
      FROM rooms
      WHERE player_count < $1 AND status = 'waiting'
      ORDER BY created_at ASC;`,
    [MAX_PLAYERS]
  );

  const rows = result.rows.map((room) => ({
      ...room,
      maxPlayers: room.game_mode === "cooperative" ? 2 : 6,
    }));

  io.emit("availableRooms", result.rows);
}

export default function setupSockets(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Helper functions
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

    const removePlayerFromRoom = async (roomId, username) => {
      if (!roomId || !username) return;

      try {
        const id = Number(roomId);

        const roomResult = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players
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

        if (updatedPlayers.length === 0) {
          await pool.query("DELETE FROM rooms WHERE id = $1", [id]);
          return;
        }

        const updateQuery = `
          UPDATE rooms
          SET players = $2::jsonb,
              player_count = $3,
              host = $4
          WHERE id = $1
          RETURNING *;
        `;

        const values = [
          id,
          JSON.stringify(updatedPlayers),
          updatedPlayers.length,
          newHost,
        ];
        const result = await pool.query(updateQuery, values);
        const roomWithAvatars = await attachPlayerAvatars(result.rows[0]);

        io.to(String(roomId)).emit("roomState", roomWithAvatars);

      } catch (err) {
        console.error("removePlayerFromRoom failed:", err);
      }
    };
    
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

        const MAX_PLAYERS = 6;
        if (room.player_count >= MAX_PLAYERS) {
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

      } catch (err) {
        console.error("joinRoom failed:", err);
        socket.emit("error", { message: "Server error" });
        if (ack) ack({ ok: false, error: "Server error" });
      }
    });

    // Leaving room Socket
    socket.on("leaveRoom", async ({ roomId, username }, callback) => {
      const ack = typeof callback === "function" ? callback : null;
      const effectiveUsername = username || socket.data.username;

      console.log("leaveRoom received from", effectiveUsername);

      // Remove player from Game instance
      const game = getGame(roomId);
      if (game) {
        const player = game.getPlayer(effectiveUsername);
        if (player) {
          player.isAlive = false;
          console.log(`${effectiveUsername} marked as dead in game`);
        }

        const result = game.checkGameOver();
        if (result.over) {
          console.log("Game over! Winner:", result.winner);
          io.to(String(roomId)).emit("gameOver", { winner: result.winner });
          await pool.query("DELETE FROM rooms WHERE id = $1", [roomId]);
          removeGame(roomId);
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

    // Player board updates Socket
    socket.on("playerBoard", ({ roomId, username, board, clearedLines }) => {
      if (!roomId || !username) return;
      if (!Array.isArray(board)) return;
      socket.to(String(roomId)).emit("playerBoard", { username, board });

      if (Number.isInteger(clearedLines) && clearedLines > 0) {
        const game = getGame(String(roomId));
        if (!game || !game.isRunning) return;

        const result = game.applyLineClear(username, clearedLines);
        if (result) {
          io.to(String(roomId)).emit("gameState", game.serialize());
        }
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

        // If game already started, send initial sequence for late joiner
        const game = getGame(String(roomId));
        if (!game) return; // or recreate the game instance if needed

        socket.emit("gameStarted", {
          roomId,
          initialSequence: game.initialSequence
        });
        socket.emit("gameState", game.serialize());

      } catch (err) {
        console.error("getRoomState failed:", err);
        socket.emit("error", { message: "Server error" });
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
        const game = createGame(
          roomId,
          room.players,
          gameMode
        );

        // Start game and generate initial sequence
        const { initialSequence } = game.start();
        console.log("Initial sequence generated:", initialSequence);

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

        // Emit initial sequence to all players
        io.to(String(roomId)).emit("gameStarted", { roomId, initialSequence });
        // Emit initial game state (scores/lines/levels)
        io.to(String(roomId)).emit("gameState", game.serialize());

        console.log(`Game started in room ${roomId} by host ${username}`);

      } catch (err) {
        console.error("startGame failed:", err);
      }
    });

    // movePiece during game Socket
    socket.on("movePiece", ({ roomId, action }) => {
      const username = socket.data.username;
      console.log("movePiece received:", { socketId: socket.id, roomId, username, action });

      try {
        const game = getGame(String(roomId));
        if (!game || !game.isRunning) {
          console.log(`Game not running for room ${roomId}`);
          return;
        }
        
        const player = game.getPlayer(username);
        if (!player || !player.isAlive) {
          console.log(`Player ${username} not found or dead`);
          return;
        }
        
        console.log(`Player ${username} moving: ${action}`);
        game.movePlayer(username, action);
        
        const status = game.checkGameOver();

        if (status.over) {
          return;
        }

        io.to(String(roomId)).emit("gameState", game.serialize());
      } catch (err) {
        console.error("movePiece failed:", err);
      }
    });

    // playerLost Socket - client notifies loss (e.g., spawn blocked)
    socket.on("playerLost", ({ roomId }) => {
      const username = socket.data.username;
      if (!roomId || !username) return;

      try {
        const game = getGame(String(roomId));
        if (!game || !game.isRunning) return;

        const player = game.getPlayer(username);
        if (!player || !player.isAlive) return;

        player.die();
        const status = game.checkGameOver();

        if (status.over) {
          const payload = game.endGame();
          io.to(String(roomId)).emit("gameOver", payload);
          removeGame(roomId);
          return;
        }

        io.to(String(roomId)).emit("gameState", game.serialize());
      } catch (err) {
        console.error("playerLost failed:", err);
      }
    });

    // requestNextBatch of Piece Sequence Socket
    socket.on("requestNextBatch", async ({ roomId, username }) => {
      console.log("requestNextBatch received:", { socketId: socket.id, roomId, username });
      try {
        const game = getGame(String(roomId));
        if (!game || !game.isRunning) {
          console.log(`Game not running for room ${roomId}`);
          return;
        }

        // Get next batch (cached so all players get the same one)
        const nextBatch = game.getNextBatch();
        
        console.log(`Sending next batch to room ${roomId}: ${nextBatch.join(',')}`);
        io.to(String(roomId)).emit("nextPieceBatch", { nextBatch });
        
        // Mark that this player has consumed the batch
        game.consumeBatch();
      } catch (err) {
        console.error("requestNextBatch failed:", err);
      }
    });

    // Socket disconnection
    socket.on("disconnect", () => {
      removePlayerFromRoom(socket.data.roomId, socket.data.username);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
