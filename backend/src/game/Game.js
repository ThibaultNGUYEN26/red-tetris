export default class Game {
  constructor(roomId, players) {
    this.roomId = roomId;
    this.players = players;
    this.mode = mode;

    this.sequence = new SequenceGenerator();
    this.running = false;
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
}
