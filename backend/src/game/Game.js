import SequenceGenerator from "./sequenceGenerator.js";
import Piece, { SHAPES } from "./Piece.js";
import { BOARD_HEIGHT, BOARD_WIDTH, LINES_PER_LEVEL } from "../config/constants.js";

const TICK_MS = 60;
const BASE_DROP_MS = 500;

export default class Game {
  constructor(roomId, players, mode, mode_player, hostUsername = null) {
    this.roomId = roomId;
    this.players = players;
    this.mode = mode;
    this.mode_player = mode_player;
    this.hostUsername = hostUsername;

    this.sequence = new SequenceGenerator();
    this.sequenceBuffer = [];

    this.isRunning = false;
    this.isOver = false;
    this.statsUpdated = false;
    this.isPaused = false;

    this.onTick = null;
    this.onGameOver = null;
    this.tickHandle = null;
    this.currentTurnIndex = 0;
    this.currentTurnUsername = null;
  }

  setCallbacks({ onTick, onGameOver }) {
    this.onTick = onTick;
    this.onGameOver = onGameOver;
  }

  getPlayer(username) {
    return this.players.find(p => p.username === username);
  }

  getCooperativePlayer() {
    return this.players[0] ?? null;
  }

  isCooperativeMode() {
    return this.mode === "cooperative";
  }

  initializeTurn() {
    if (!this.isCooperativeMode()) {
      this.currentTurnIndex = 0;
      this.currentTurnUsername = null;
      return;
    }

    const hostIndex = this.players.findIndex((p) => p.username === this.hostUsername);
    this.currentTurnIndex = hostIndex >= 0 ? hostIndex : 0;
    this.currentTurnUsername = this.players[this.currentTurnIndex]?.username ?? null;
  }

  advanceTurn() {
    if (!this.isCooperativeMode() || this.players.length === 0) return;

    for (let offset = 1; offset <= this.players.length; offset += 1) {
      const nextIndex = (this.currentTurnIndex + offset) % this.players.length;
      const nextPlayer = this.players[nextIndex];
      if (nextPlayer?.isAlive) {
        this.currentTurnIndex = nextIndex;
        this.currentTurnUsername = nextPlayer.username;
        return;
      }
    }

    this.currentTurnUsername = null;
  }

  syncCooperativeStateFrom(sourcePlayer) {
    if (!this.isCooperativeMode() || !sourcePlayer) return;

    this.players.forEach((player, index) => {
      if (index === 0) return;
      player.board = sourcePlayer.board.map((row) => row.slice());
      player.isAlive = sourcePlayer.isAlive;
      player.score = sourcePlayer.score;
      player.lines = sourcePlayer.lines;
      player.level = sourcePlayer.level;
      player.currentPiece = sourcePlayer.currentPiece
        ? { ...sourcePlayer.currentPiece }
        : null;
      player.nextPiece = sourcePlayer.nextPiece
        ? new Piece(sourcePlayer.nextPiece.type)
        : null;
      if (player.nextPiece) {
        player.nextPiece.rotation = sourcePlayer.nextPiece.rotation;
        player.nextPiece.shape = sourcePlayer.nextPiece.shape.map((row) => [...row]);
        player.nextPiece.x = sourcePlayer.nextPiece.x;
        player.nextPiece.y = sourcePlayer.nextPiece.y;
      }
      player.sequenceIndex = sourcePlayer.sequenceIndex;
      player.dropAccumulator = sourcePlayer.dropAccumulator;
      player.inputQueue = [];
    });
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
    player.pendingPenaltyLines = 0;
  }

  start() {
    this.isRunning = true;
    this.isOver = false;
    this.statsUpdated = false;
    this.isPaused = false;

    this.players.forEach(player => this.resetPlayer(player));

    if (this.isCooperativeMode()) {
      const sharedPlayer = this.getCooperativePlayer();
      if (sharedPlayer) {
        const ok = this.spawnForPlayer(sharedPlayer);
        if (!ok) {
          sharedPlayer.die();
        }
        this.syncCooperativeStateFrom(sharedPlayer);
      }
    } else {
      this.players.forEach(player => {
        const ok = this.spawnForPlayer(player);
        if (!ok) {
          player.die();
        }
      });
    }
    this.initializeTurn();

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

  pause() {
    if (!this.isRunning || this.isOver) return;
    this.isPaused = true;
  }

  resume() {
    if (!this.isRunning || this.isOver) return;
    this.isPaused = false;
  }

  enqueueInput(username, action) {
    const player = this.getPlayer(username);
    if (!player || !player.isAlive) return;
    if (this.isCooperativeMode()) {
      if (username !== this.currentTurnUsername) return;
      const sharedPlayer = this.getCooperativePlayer();
      if (!sharedPlayer || !sharedPlayer.isAlive) return;
      sharedPlayer.inputQueue.push(action);
      return;
    }
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
    const from = piece.rotation;
    const to = (piece.rotation + 1) % rotations.length;

    const kicksJLSTZ = {
      "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
      "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
      "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
      "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    };

    const kicksI = {
      "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
      "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
      "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
      "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    };

    const key = `${from}>${to}`;
    const kickTable = piece.type === "I"
      ? kicksI[key]
      : piece.type === "O"
        ? [[0, 0]]
        : kicksJLSTZ[key];

    if (!kickTable) return false;

    for (const [dx, dy] of kickTable) {
      if (this.canPlace(piece.type, to, piece.x + dx, piece.y + dy, player.board)) {
        piece.rotation = to;
        piece.shape = rotations[to];
        piece.x += dx;
        piece.y += dy;
        return true;
      }
    }

    return false;
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

    let cleared = 0;
    const remaining = [];
    for (const row of player.board) {
      const hasEmpty = row.some((cell) => cell === "empty");
      const hasBlack = row.some((cell) => cell === "black");
      // Only clear fully-filled rows that are not indestructible
      if (!hasEmpty && !hasBlack) {
        cleared += 1;
      } else {
        remaining.push(row);
      }
    }
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

    // In multiplayer mode, queue penalty lines (n-1) for other alive players
    if (this.mode_player === "multi" && cleared > 1) {
      const penaltyLines = cleared - 1;
      this.players.forEach(otherPlayer => {
        if (otherPlayer.username !== player.username && otherPlayer.isAlive) {
          otherPlayer.pendingPenaltyLines += penaltyLines;
        }
      });
    }

    // Apply pending penalties only after the player locks a piece
    if (this.mode_player === "multi" && player.pendingPenaltyLines > 0) {
      const penaltyLines = player.pendingPenaltyLines;
      const penaltyRows = Array.from({ length: penaltyLines }, () =>
        Array(BOARD_WIDTH).fill("black")
      );
      player.board = [...player.board.slice(penaltyLines), ...penaltyRows];
      player.pendingPenaltyLines = 0;
    }

    player.sequenceIndex += 1;
    const ok = this.spawnForPlayer(player);
    if (!ok) {
      player.die();
    }

    if (this.isCooperativeMode()) {
      this.advanceTurn();
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
    if (this.isCooperativeMode()) {
      const sharedPlayer = this.getCooperativePlayer();
      if (!sharedPlayer || !sharedPlayer.isAlive) {
        return { over: true, winner: null };
      }
      return { over: false };
    }

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
    if (this.isPaused) return;

    if (this.isCooperativeMode()) {
      const sharedPlayer = this.getCooperativePlayer();
      if (sharedPlayer?.isAlive) {
        if (!sharedPlayer.currentPiece) {
          const ok = this.spawnForPlayer(sharedPlayer);
          if (!ok) {
            sharedPlayer.die();
          }
        }

        if (sharedPlayer.isAlive) {
          this.processInputs(sharedPlayer);
          this.applyGravity(sharedPlayer);
        }
        this.syncCooperativeStateFrom(sharedPlayer);
      }
    } else {
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
    }

    const result = this.checkGameOver();
    if (result.over) {
      const summary = this.endGame();
      if (this.onGameOver) this.onGameOver(summary);
      return;
    }

    if (this.onTick) this.onTick(this.serialize());
  }

  serialize() {
    if (this.isCooperativeMode()) {
      const sharedPlayer = this.getCooperativePlayer();
      return {
        roomId: this.roomId,
        mode: this.mode,
        mode_player: this.mode_player,
        currentTurnUsername: this.currentTurnUsername,
        isRunning: this.isRunning,
        players: this.players.map(player => ({
          username: player.username,
          isAlive: sharedPlayer?.isAlive ?? false,
          score: sharedPlayer?.score ?? 0,
          lines: sharedPlayer?.lines ?? 0,
          level: sharedPlayer?.level ?? 1,
          nextType: sharedPlayer?.nextPiece ? sharedPlayer.nextPiece.type.toLowerCase() : null,
          isCurrentTurn: player.username === this.currentTurnUsername,
          board: sharedPlayer
            ? this.getRenderBoard(sharedPlayer, { includeActive: true, includeGhost: true })
            : [],
          boardLocked: sharedPlayer
            ? this.getRenderBoard(sharedPlayer, { includeActive: false, includeGhost: false })
            : [],
        }))
      };
    }

    return {
      roomId: this.roomId,
      mode: this.mode,
      mode_player: this.mode_player,
      currentTurnUsername: this.currentTurnUsername,
      isRunning: this.isRunning,
      players: this.players.map(player => ({
        ...player.serialize(),
        isCurrentTurn:
          !this.isCooperativeMode() || player.username === this.currentTurnUsername,
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
        this.mode_player === "multi" && !this.isCooperativeMode()
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
