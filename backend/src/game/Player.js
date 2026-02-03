import Piece from "./Piece.js";

export default class Player {
  constructor(username, socketId) {
    this.username = username;
    this.socketId = socketId;

    this.currentPiece = null;
    this.nextPiece = null;

    this.isAlive = true;
    this.score = 0;
    this.lines = 0;
  }

  spawnPiece(type) {
    this.currentPiece = new Piece(type);
  }

  setNextPiece(type) {
    this.nextPiece = new Piece(type);
  }

  promoteNextPiece() {
    this.currentPiece = this.nextPiece;
    this.nextPiece = null;
  }

  serialize() {
    return {
      username: this.username,
      isAlive: this.isAlive,
      score: this.score,
      lines: this.lines,
      currentPiece: this.currentPiece
        ? {
            type: this.currentPiece.type,
            x: this.currentPiece.x,
            y: this.currentPiece.y,
            shape: this.currentPiece.shape,
          }
        : null,
      nextPiece: this.nextPiece
        ? {
            type: this.nextPiece.type,
            shape: this.nextPiece.shape,
          }
        : null,
    };
  }
}
