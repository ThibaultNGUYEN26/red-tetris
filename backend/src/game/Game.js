import { TICK_RATE } from "../config/constants.js";

export default class Game {
  constructor(playerId) {
    this.playerId = playerId;
    this.state = this.createInitialState();

    this.interval = setInterval(() => {
      this.tick();
    }, TICK_RATE);
  }

  createInitialState() {
    return {
      grid: Array.from({ length: 20 }, () => Array(10).fill(0)),
      activePiece: null,
      score: 0,
      gameOver: false,
    };
  }

  handleInput(input) {
    // validate input type
    // update state safely
  }

  tick() {
    if (this.state.gameOver) return;

    // gravity
    // collision
    // lock piece
    // clear lines
  }

  destroy() {
    clearInterval(this.interval);
  }
}
