// src/socket/index.js
import Game from "../game/Game.js";

const games = new Map(); // socket.id → Game instance

export default function setupSockets(io) {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    const game = new Game(socket.id);
    games.set(socket.id, game);

    socket.on("player_input", (input) => {
      game.handleInput(input);
    });

    socket.on("disconnect", () => {
      games.delete(socket.id);
      console.log("Client disconnected:", socket.id);
    });
  });
}
