import SequenceGenerator from "./sequenceGenerator.js";
import Piece, { SHAPES } from "./Piece.js";
import { BOARD_HEIGHT, BOARD_WIDTH, LINES_PER_LEVEL } from "../config/constants.js";

const TICK_MS = 60;
const BASE_DROP_MS = 500;

export default class Game {
  constructor(roomId, players, mode, mode_player) {
    this.roomId = roomId;
    this.players = players;
    this.mode = mode;
    this.mode_player = mode_player;

    this.sequence = new SequenceGenerator();
    this.sequenceBuffer = [];

    this.isRunning = false;
    this.isOver = false;

    this.onTick = null;
    this.onGameOver = null;
    this.tickHandle = null;
  }

  setCallbacks({ onTick, onGameOver }) {
    this.onTick = onTick;
    this.onGameOver = onGameOver;
  }

  getPlayer(username) {
    return this.players.find(p => p.username === username);
  }

  ensureSequenceLength(length) {
    while (this.sequenceBuffer.length < length) {
      this.sequenceBuffer.push(this.sequence.next());
    }
  }

  getSequenceAt(index) {
    this.ensureSequenceLength(index + 1);
    return this.sequenceBuffer[index];
  }

  resetPlayer(player) {
    player.board = Array.from({ length: BOARD_HEIGHT }, () =>
      Array(BOARD_WIDTH).fill("empty")
    );
    player.isAlive = true;
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    player.currentPiece = null;
    player.nextPiece = null;
    player.inputQueue = [];
    player.sequenceIndex = 0;
    player.dropAccumulator = 0;
  }

  start() {
    this.isRunning = true;
    this.isOver = false;

    this.players.forEach(player => this.resetPlayer(player));

    this.players.forEach(player => {
      const ok = this.spawnForPlayer(player);
      if (!ok) {
        player.die();
      }
    });

    if (!this.tickHandle) {
      this.tickHandle = setInterval(() => this.tick(), TICK_MS);
    }

    return { started: true };
  }

  stop() {
    this.isRunning = false;
    this.isOver = true;
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  enqueueInput(username, action) {
    const player = this.getPlayer(username);
    if (!player || !player.isAlive) return;
    player.inputQueue.push(action);
  }

  getDropInterval(level) {
    const interval = BASE_DROP_MS - (level - 1) * 40;
    return Math.max(TICK_MS, interval);
  }

  canPlace(type, rotation, x, y, board) {
    const shape = SHAPES[type][rotation];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue;
        const boardX = x + col;
        const boardY = y + row;
        if (boardX < 0 || boardX >= BOARD_WIDTH || boardY < 0 || boardY >= BOARD_HEIGHT) {
          return false;
        }
        if (board[boardY][boardX] !== "empty") {
          return false;
        }
      }
    }
    return true;
  }

  tryMove(player, dx, dy) {
    const piece = player.currentPiece;
    if (!piece) return false;
    const nextX = piece.x + dx;
    const nextY = piece.y + dy;
    if (!this.canPlace(piece.type, piece.rotation, nextX, nextY, player.board)) {
      return false;
    }
    piece.x = nextX;
    piece.y = nextY;
    return true;
  }

  tryRotate(player) {
    const piece = player.currentPiece;
    if (!piece) return false;
    const rotations = SHAPES[piece.type];
    const nextRotation = (piece.rotation + 1) % rotations.length;
    if (!this.canPlace(piece.type, nextRotation, piece.x, piece.y, player.board)) {
      return false;
    }
    piece.rotation = nextRotation;
    piece.shape = rotations[nextRotation];
    return true;
  }

  lockCurrentPiece(player) {
    const piece = player.currentPiece;
    if (!piece) return;

    const shape = SHAPES[piece.type][piece.rotation];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue;
        const boardY = piece.y + row;
        const boardX = piece.x + col;
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          player.board[boardY][boardX] = piece.type.toLowerCase();
        }
      }
    }

    const remaining = player.board.filter((row) => row.some((cell) => cell === "empty"));
    const cleared = BOARD_HEIGHT - remaining.length;
    if (cleared > 0) {
      const newRows = Array.from({ length: cleared }, () =>
        Array(BOARD_WIDTH).fill("empty")
      );
      player.board = [...newRows, ...remaining];

      const base = {
        1: 40,
        2: 100,
        3: 300,
        4: 1200,
      }[cleared] ?? 0;
      const scoreDelta = base * player.level;
      player.score += scoreDelta;
      player.lines += cleared;
      player.level = 1 + Math.floor(player.lines / LINES_PER_LEVEL);
    }

    player.sequenceIndex += 1;
    const ok = this.spawnForPlayer(player);
    if (!ok) {
      player.die();
    }
  }

  spawnForPlayer(player) {
    const type = this.getSequenceAt(player.sequenceIndex);
    const piece = new Piece(type);

    if (!this.canPlace(type, piece.rotation, piece.x, piece.y, player.board)) {
      return false;
    }

    player.currentPiece = piece;
    const nextType = this.getSequenceAt(player.sequenceIndex + 1);
    player.nextPiece = new Piece(nextType);

    return true;
  }

  processInputs(player) {
    while (player.inputQueue.length > 0) {
      const action = player.inputQueue.shift();
      switch (action) {
        case "left":
          this.tryMove(player, -1, 0);
          break;
        case "right":
          this.tryMove(player, 1, 0);
          break;
        case "rotate":
          this.tryRotate(player);
          break;
        case "drop": {
          const moved = this.tryMove(player, 0, 1);
          if (!moved) {
            this.lockCurrentPiece(player);
          }
          break;
        }
        case "hardDrop": {
          let moved = true;
          while (moved) {
            moved = this.tryMove(player, 0, 1);
          }
          this.lockCurrentPiece(player);
          break;
        }
      }
    }
  }

  applyGravity(player) {
    const dropInterval = this.getDropInterval(player.level);
    player.dropAccumulator += TICK_MS;
    if (player.dropAccumulator < dropInterval) return;

    player.dropAccumulator -= dropInterval;
    const moved = this.tryMove(player, 0, 1);
    if (!moved) {
      this.lockCurrentPiece(player);
    }
  }

  checkGameOver() {
    const alive = this.players.filter(p => p.isAlive);

    if (this.mode_player === "solo" && !this.players[0].isAlive) {
      return { over: true, winner: null };
    }

    if (this.mode_player === "multi" && alive.length <= 1) {
      return { over: true, winner: alive[0]?.username ?? null };
    }

    return { over: false };
  }

  getRenderBoard(player, { includeActive = true, includeGhost = true } = {}) {
    const grid = player.board.map((row) => row.slice());
    const piece = player.currentPiece;
    if (!piece || (!includeActive && !includeGhost)) return grid;

    const shape = SHAPES[piece.type][piece.rotation];
    if (includeGhost) {
      let ghostY = piece.y;
      while (this.canPlace(piece.type, piece.rotation, piece.x, ghostY + 1, player.board)) {
        ghostY += 1;
      }

      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (!shape[row][col]) continue;
          const boardY = ghostY + row;
          const boardX = piece.x + col;
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            if (grid[boardY][boardX] === "empty") {
              grid[boardY][boardX] = "ghost";
            }
          }
        }
      }
    }

    if (includeActive) {
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (!shape[row][col]) continue;
          const boardY = piece.y + row;
          const boardX = piece.x + col;
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            if (grid[boardY][boardX] === "empty" || grid[boardY][boardX] === "ghost") {
              grid[boardY][boardX] = piece.type.toLowerCase();
            }
          }
        }
      }
    }
    return grid;
  }

  tick() {
    if (!this.isRunning || this.isOver) return;

    this.players.forEach(player => {
      if (!player.isAlive) return;
      if (!player.currentPiece) {
        const ok = this.spawnForPlayer(player);
        if (!ok) {
          player.die();
          return;
        }
      }

      this.processInputs(player);
      this.applyGravity(player);
    });

    const result = this.checkGameOver();
    if (result.over) {
      const summary = this.endGame();
      if (this.onGameOver) this.onGameOver(summary);
      return;
    }

    if (this.onTick) this.onTick(this.serialize());
  }

  serialize() {
    return {
      roomId: this.roomId,
      mode: this.mode,
      mode_player: this.mode_player,
      isRunning: this.isRunning,
      players: this.players.map(player => ({
        ...player.serialize(),
        board: this.getRenderBoard(player, { includeActive: true, includeGhost: true }),
        boardLocked: this.getRenderBoard(player, { includeActive: false, includeGhost: false }),
      }))
    };
  }

  endGame() {
    this.stop();

    const alive = this.players.filter(p => p.isAlive);

    return {
      roomId: this.roomId,
      mode: this.mode,
      winner:
        this.mode_player === "multi"
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
