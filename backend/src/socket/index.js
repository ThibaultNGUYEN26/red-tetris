import { pool } from "../config/db.js";
import { createGame, getGame } from "../game/gameManager.js";
import Player from "../game/Player.js";

export default function setupSockets(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Helper functions
    async function broadcastAvailableRooms() {
      const MAX_PLAYERS = 6;
      const result = await pool.query(
        `SELECT id, name, game_mode, host, player_count, players
         FROM rooms
         WHERE player_count < $1
         ORDER BY created_at ASC;`,
        [MAX_PLAYERS]
      );
      io.emit("availableRooms", result.rows);
    }

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
        const roomResult = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players
           FROM rooms
           WHERE id = $1`,
          [roomId]
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
          await pool.query("DELETE FROM rooms WHERE id = $1", [roomId]);
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
          roomId,
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
    socket.on("joinRoom", ({ roomId, username }) => {
      socket.join(String(roomId));
      if (roomId && username) {
        socket.data.roomId = String(roomId);
        socket.data.username = username;
      }
      console.log(`${socket.id} joined room ${roomId}`);
    });

    // Leaving room Socket
    socket.on("leaveRoom", ({ roomId }) => {
      socket.leave(String(roomId));
      if (socket.data.roomId === String(roomId)) {
        socket.data.roomId = null;
        socket.data.username = null;
      }
      console.log(`${socket.id} left room ${roomId}`);
    });

    // Player board updates Socket
    socket.on("playerBoard", ({ roomId, username, board }) => {
      if (!roomId || !username) return;
      if (!Array.isArray(board)) return;
      socket.to(String(roomId)).emit("playerBoard", { username, board });
    });

    // getAvailableRooms Socket
    socket.on("getAvailableRooms", async () => {
      await broadcastAvailableRooms();
    });

    // getRoomState Socket
    socket.on("getRoomState", async ({ roomId }) => {
      console.log(`Socket getRoomState: ${socket.id}`);
      try {
        const result = await pool.query(
          `SELECT id, name, game_mode, host, player_count, players
           FROM rooms
           WHERE id = $1`,
          [roomId]
        );

        if (result.rowCount === 0) {
          return socket.emit("error", { message: "Room not found" });
        }

        const roomWithAvatars = await attachPlayerAvatars(result.rows[0]);

        // Emit to all sockets in the room
        io.to(String(roomId)).emit("roomState", roomWithAvatars);

        // If game has started, send the initial sequence to this client (late joiner)
        const game = getGame(roomId);
        if (game && game.isRunning && game.initialSequence) {
          console.log(`Sending initial sequence to late joiner: ${game.initialSequence.join(',')}`);
          socket.emit("gameStarted", { roomId, initialSequence: game.initialSequence });
        }
      } catch (err) {
        console.error("getRoomState failed:", err);
        socket.emit("error", { message: "Server error" });
      }
    });

    // startGame Socket and update room status in DB
    socket.on("startGame", async ({ roomId, username }) => {
      console.log("startGame event received:", { socketId: socket.id, roomId, username });
      try {
        const room = await pool.query(
          "SELECT host, players, status, game_mode FROM rooms WHERE id=$1",
          [roomId]
        );
        console.log("Room query result:", { rowCount: room.rowCount, roomData: room.rows[0] });
        
        if (!room.rowCount) {
          console.log("Room not found");
          return;
        }
        const r = room.rows[0];
        
        if (r.host !== username) {
          console.log("User is not host. Host: ${r.host}, User: ${username}");
          return;
        }
        if (r.status === "started") {
          console.log("Game already started");
          return;
        }

        // create Game instance
        const gameMode = r.game_mode || "multiplayer";
        console.log(`Creating game with mode: ${gameMode}`);
        const game = createGame(
          roomId,
          r.players.map(u => new Player(u, null)),
          gameMode
        );

        const { initialSequence } = game.start();

        // Notify clients with initial sequence
        console.log(`Emitting gameStarted to room ${roomId} with sequence: ${initialSequence.join(',')}`);
        io.to(String(roomId)).emit("gameStarted", { roomId, initialSequence });

        await pool.query(
          "UPDATE rooms SET status='started' WHERE id=$1",
          [roomId]
        );
        console.log("Game started successfully");
      } catch (err) {
        console.error("startGame failed:", err);
      }
    });

    // movePiece during game Socket
    socket.on("movePiece", ({ roomId, username, action }) => {
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
          const payload = game.endGame();
          io.to(String(roomId)).emit("gameOver", payload);
          return;
        }

        io.to(String(roomId)).emit("gameState", game.serialize());
      } catch (err) {
        console.error("movePiece failed:", err);
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
