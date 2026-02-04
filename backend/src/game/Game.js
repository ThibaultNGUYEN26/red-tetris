import { GAME_MODES } from "../config/constants.js";

class SequenceGenerator {
  constructor() {
    this.bag = [];
    this.index = 0;
  }

  next() {
    if (this.index >= this.bag.length) {
      this.bag = ["I", "O", "T", "L", "J", "S", "Z"].sort(() => Math.random() - 0.5);
      this.index = 0;
    }
    const piece = this.bag[this.index];
    this.index += 1;
    return piece;
  }
}

export default class Game {
  constructor(roomId, players, mode) {
    this.roomId = roomId;
    this.players = players;
    this.mode = mode;

    this.sequence = new SequenceGenerator();
    this.isRunning = false;
    this.initialSequence = null; // Store initial sequence for late joiners
  }

  getPlayer(username) {
    return this.players.find(p => p.username === username);
  }

  start() {
    this.isRunning = true;

    const first = this.sequence.next();
    const second = this.sequence.next();

    for (const player of this.players) {
      player.spawnPiece(first);
      player.setNextPiece(second);
    }

    // Store initial sequence for late joiners (first 2 pieces + next 5)
    this.initialSequence = [first, second];
    for (let i = 0; i < 5; i++) {
      this.initialSequence.push(this.sequence.next());
    }

    // Return the pieces used so we can use them in socket handler too
    return { first, second, initialSequence: this.initialSequence };
  }

  movePlayer(username, action) {
    const player = this.getPlayer(username);
    if (!player || !player.isAlive) return;

     const piece = player.currentPiece;

    switch (action) {
      case "left":
        piece.x -= 1;
        break;
      case "right":
        piece.x += 1;
        break;
      case "rotate":
        piece.rotate();
        break;
      case "drop":
        piece.y += 1;
        break;
    }

    return player;
  }

  checkGameOver() {
    // SOLO: one player dies → game over
    if (this.mode === GAME_MODES.SOLO) {
      return !this.players[0].isAlive;
    }

    // MULTI: one or zero players left alive
    const alive = this.players.filter(p => p.isAlive);
    return alive.length <= 1;
  }

  serialize() {
    return {
      roomId: this.roomId,
      mode: this.mode,
      isRunning: this.isRunning,
      players: this.players.map(p => p.serialize()),
    };
  }
}
