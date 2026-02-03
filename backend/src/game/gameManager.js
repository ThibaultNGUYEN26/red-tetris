import Game from "./Game.js";
import Player from "./Player.js";

const games = new Map();

export function createGame(roomId, playersData) {
  if (games.has(roomId)) {
    return games.get(roomId);
  }

  const players = playersData.map(
    p => new Player(p.username, p.socketId)
  );

  const game = new Game(roomId, players);
  games.set(roomId, game);

  return game;
}

export function getGame(roomId) {
  return games.get(roomId);
}

export function removeGame(roomId) {
  games.delete(roomId);
}
