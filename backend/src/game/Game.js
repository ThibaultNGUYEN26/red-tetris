import SequenceGenerator from "./sequenceGenerator.js";

export default class Game {
  constructor(roomId, players, mode, mode_player) {
    this.roomId = roomId;
    this.players = players;
    this.mode = mode;
    this.mode_player = mode_player;

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
      const ok = player.spawnPiece(this.initialSequence[0]);
      if (!ok) {
        player.die();
      }
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
      console.log(`Generated new batch: ${this.cachedNextBatch.join(',')}`);
    }
    
    // Increment request count
    this.batchRequestCount += 1;
    
    // Return the cached batch
    return this.cachedNextBatch;
  }

  consumeBatch() {
    // Once all players have requested, clear the cache for the next batch
    if (this.batchRequestCount >= this.players.length) {
      console.log(`Batch consumed by all ${this.players.length} players, clearing cache`);
      this.cachedNextBatch = null;
      this.batchRequestCount = 0;
    }
  }

  movePlayer(username, action) {
    const player = this.getPlayer(username);
    if (!player || !player.isAlive) return;

    const piece = player.currentPiece;
    if (!piece) return;

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
  }

  checkGameOver() {
    const alive = this.players.filter(p => p.isAlive);
    console.log("Alive players:", alive.map(p => p.username));

    if (this.mode_player === 'solo' && !this.players[0].isAlive) {
      return { over: true, winner: null };
    }

    if (this.mode_player === 'multi' && alive.length <= 1) {
      return { over: true, winner: alive[0]?.username ?? null };
    }

    return { over: false };
  }

  spawnNextPiece(username, type, board) {
    const player = this.getPlayer(username);
    if (!player || !this.isRunning) return false;

    const success = player.spawnPiece(type, board);

    if (!success) {
      player.die();
      return false;
    }
    return true;
  }

  applyLineClear(username, clearedLines) {
    const player = this.getPlayer(username);
    if (!player || !player.isAlive || !this.isRunning) return null;

    return player.applyLineClear(clearedLines);
  }

  serialize() {
    return {
      roomId: this.roomId,
      mode: this.mode,
      mode_player: this.mode_player,
      isRunning: this.isRunning,
      players: this.players.map(player => player.serialize())
    };
  }

  endGame() {
    this.isRunning = false;

    const alive = this.players.filter(p => p.isAlive);

    return {
      roomId: this.roomId,
      mode: this.mode,
      winner:
        this.mode_player === 'multi'
          ? alive[0]?.username ?? null
          : null,
      results: this.players.map(p => ({
        username: p.username,
        score: p.score,
        lines: p.lines,
        level: p.level,
        isAlive: p.isAlive
      }))
    };
  }
}
