import Piece from "./Piece.js";
import { LINES_PER_LEVEL, SCORE_BY_LINES } from "../config/constants.js";

export default class Player {
  constructor(username, socketId) {
    this.username = username;
    this.socketId = socketId;

    this.currentPiece = null;
    this.nextPiece = null;
    this.inputQueue = [];
    this.sequenceIndex = 0;
    this.dropAccumulator = 0;

    this.isAlive = true;
    this.score = 0;
    this.lines = 0;
    this.level = 1;

    this.pendingPenaltyLines = 0;

    this.board = Array.from({ length: 20 }, () =>
      Array(10).fill("empty")
    );
  }

  spawnPiece(type, board) {
    const piece = new Piece(type);

    if (!piece.canSpawn(this.board)) {
      return false;
    }

    this.currentPiece = piece;
    return true;
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
      level: this.level,
      nextType: this.nextPiece ? this.nextPiece.type.toLowerCase() : null,
    };
  }

  die() {
    this.isAlive = false;
  }

  applyLineClear(clearedLines) {
    if (!Number.isInteger(clearedLines) || clearedLines <= 0) {
      return { scoreDelta: 0, lines: this.lines, level: this.level };
    }

    const base = SCORE_BY_LINES[clearedLines] ?? 0;
    const scoreDelta = base * this.level;

    this.score += scoreDelta;
    this.lines += clearedLines;
    this.level = 1 + Math.floor(this.lines / LINES_PER_LEVEL);

    return { scoreDelta, lines: this.lines, level: this.level };
  }
}
