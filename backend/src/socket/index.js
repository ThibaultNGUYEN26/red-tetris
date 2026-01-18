import { pool } from "../config/db.js";

export default function setupSockets(io) {
  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ roomId }) => {
      socket.join(String(roomId));
      console.log(`${socket.id} joined room ${roomId}`);
    });

    socket.on("leaveRoom", ({ roomId }) => {
      socket.leave(String(roomId));
      console.log(`${socket.id} left room ${roomId}`);
    });

    // Helper function to emit availableRooms to all clients
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

    socket.on("getAvailableRooms", async () => {
      // Only emit once on request, not on interval
      await broadcastAvailableRooms();
    });

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

        // Emit to all sockets in the room, not just the requester
        io.to(String(roomId)).emit("roomState", roomWithAvatars);
      } catch (err) {
        console.error("getRoomState failed:", err);
        socket.emit("error", { message: "Server error" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
