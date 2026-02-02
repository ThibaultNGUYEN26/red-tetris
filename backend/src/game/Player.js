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
}
