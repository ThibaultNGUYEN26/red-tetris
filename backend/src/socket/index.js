import { pool } from "../config/db.js";

export default function setupSockets(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("joinRoom", ({ roomId, username }) => {
      console.log("socket_join_room", { socketId: socket.id, roomId, username });
      // DB logic to add the player
    });

    socket.on("getAvailableRooms", async () => {
      const MAX_PLAYERS = 6;
      const result = await pool.query(
        `SELECT id, name, game_mode, host, player_count, players
         FROM rooms
         WHERE player_count < $1
         ORDER BY created_at ASC;`,
        [MAX_PLAYERS]
      );
      socket.emit("availableRooms", result.rows);
    });

    socket.on("getRoomState", async ({ roomId }) => {
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

        socket.emit("roomState", result.rows[0]);
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
