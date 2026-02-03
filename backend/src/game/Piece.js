import { BOARD_WIDTH } from "../config/constants.js";

export const SHAPES = {
  I: [
    [[1,1,1,1]],
    [[1],[1],[1],[1]]
  ],
  O: [
    [[1,1],
     [1,1]]
  ],
  T: [
    [[0,1,0],
     [1,1,1]],

    [[1,0],
     [1,1],
     [1,0]],

    [[1,1,1],
     [0,1,0]],

    [[0,1],
     [1,1],
     [0,1]]
  ],
  J: [
    [[1,0,0],
     [1,1,1]],

    [[1,1],
     [1,0],
     [1,0]],

    [[1,1,1],
     [0,0,1]],

    [[0,1],
     [0,1],
     [1,1]]
  ],
  L: [
    [[0,0,1],
     [1,1,1]],

    [[1,0],
     [1,0],
     [1,1]],

    [[1,1,1],
     [1,0,0]],

    [[1,1],
     [0,1],
     [0,1]]
  ],
  S: [
    [[0,1,1],
     [1,1,0]],

    [[1,0],
     [1,1],
     [0,1]]
  ],
  Z: [
    [[1,1,0],
     [0,1,1]],

    [[0,1],
     [1,1],
     [1,0]]
  ]
};

export default class Piece {
  constructor(type) {
    this.type = type;
    this.rotation = 0;
    this.shape = SHAPES[type][this.rotation];
    this.y = 0;

    // Spawn the piece in the center based on its width
    this.x = Math.floor((BOARD_WIDTH - this.shape[0].length) / 2);
  }

  rotate() {
    const rotations = SHAPES[this.type];
    this.rotation = (this.rotation + 1) % rotations.length;
    this.shape = rotations[this.rotation];
  }

  // Get all occupied cells on the board
  getCells() {
    const cells = [];
    for (let row = 0; row < this.shape.length; row++) {
      for (let col = 0; col < this.shape[row].length; col++) {
        if (this.shape[row][col]) {
          cells.push({ x: this.x + col, y: this.y + row });
        }
      }
    }
    return cells;
  }
}
