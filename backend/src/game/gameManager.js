import { GAME_MODES } from "../config/constants.js";
import Game from "./Game.js";
import Player from "./Player.js";

const games = new Map();

export function createGame(roomId, usernames, gameMode) {
  if (games.has(roomId)) {
    return games.get(roomId);
  }

  const players = usernames.map(username => 
    new Player(username, null)
  );

  const isSolo = gameMode === GAME_MODES.SOLO || players.length === 1;
  const mode_player = isSolo ? 'solo' : 'multi';

  const game = new Game(roomId, players, gameMode, mode_player);
  games.set(roomId, game);

  return game;
}

export function getGame(roomId) {
  return games.get(roomId);
}
