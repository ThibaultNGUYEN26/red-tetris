// // src/socket/index.js
// import Game from "../game/Game.js";

// const games = new Map(); // socket.id → Game instance

// export default function setupSockets(io) {
//   io.on("connection", (socket) => {
//     console.log("Client connected:", socket.id);

//     const game = new Game(socket.id);
//     games.set(socket.id, game);

//     socket.on("player_input", (input) => {
//       game.handleInput(input);
//     });

//     socket.on("disconnect", () => {
//       games.delete(socket.id);
//       console.log("Client disconnected:", socket.id);
//     });
//   });
// }

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

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
