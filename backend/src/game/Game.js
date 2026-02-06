import { GAME_MODES } from "../config/constants.js";
import SequenceGenerator from "./sequenceGenerator.js";

export default class Game {
  constructor(roomId, players, mode) {
    this.roomId = roomId;
    this.players = players;
    this.mode = mode;

    this.sequence = new SequenceGenerator();
    this.isRunning = false;
    this.initialSequence = null;
    this.cachedNextBatch = null;
    this.batchRequestCount = 0;
  }

  getPlayer(username) {
    return this.players.find(p => p.username === username);
  }

  start() {
    this.isRunning = true;
    this.initialSequence = [];

    for (let i = 0; i < 7; i++) {
      this.initialSequence.push(this.sequence.next());
    }

    this.players.forEach(player => {
      player.spawnPiece(this.initialSequence[0]);
    });

    return { initialSequence: this.initialSequence };
  }

  getNextBatch() {
    // If no cached batch exists, generate one and cache it
    if (!this.cachedNextBatch) {
      this.cachedNextBatch = [];
      for (let i = 0; i < 7; i++) {
        this.cachedNextBatch.push(this.sequence.next());
      }
      this.batchRequestCount = 0;
      console.log("Generated new batch: ${this.cachedNextBatch.join(',')}");
    }
    
    // Increment request count
    this.batchRequestCount += 1;
    
    // Return the cached batch
    return this.cachedNextBatch;
  }

  consumeBatch() {
    // Once all players have requested, clear the cache for the next batch
    if (this.batchRequestCount >= this.players.length) {
      console.log("Batch consumed by all ${this.players.length} players, clearing cache");
      this.cachedNextBatch = null;
      this.batchRequestCount = 0;
    }
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
    return alive.length == 1;
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
