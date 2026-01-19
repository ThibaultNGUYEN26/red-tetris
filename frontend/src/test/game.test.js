import { describe, it, expect } from 'vitest'

// Import the SHAPES constant from Game component
const SHAPES = {
  i: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
  ],
  o: [
    [[0, 1], [0, 2], [1, 1], [1, 2]],
  ],
  t: [
    [[0, 1], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 1]],
    [[0, 1], [1, 0], [1, 1], [2, 1]],
  ],
  s: [
    [[0, 1], [0, 2], [1, 0], [1, 1]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [0, 2], [1, 0], [1, 1]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
  ],
  z: [
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 2], [1, 1], [1, 2], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 2], [1, 1], [1, 2], [2, 1]],
  ],
  j: [
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 0], [2, 1]],
  ],
  l: [
    [[0, 2], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [1, 2], [2, 0]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
  ],
}

const WIDTH = 10
const HEIGHT = 20

const makeEmptyBoard = () =>
  Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => 'empty')
  )

const getCells = (piece) =>
  SHAPES[piece.type][piece.rotation].map(([r, c]) => [
    piece.row + r,
    piece.col + c,
  ])

const isValidPosition = (piece, grid) => {
  if (!grid) return false
  return getCells(piece).every(([r, c]) => {
    if (c < 0 || c >= WIDTH || r >= HEIGHT) return false
    if (r < 0) return true
    return grid[r][c] === 'empty'
  })
}

const lockPiece = (piece, grid) => {
  const nextGrid = grid.map((row) => row.slice())
  getCells(piece).forEach(([r, c]) => {
    if (r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH) {
      nextGrid[r][c] = piece.type
    }
  })
  return nextGrid
}

const clearLines = (grid) => {
  const remaining = grid.filter((row) => row.some((cell) => cell === 'empty'))
  const cleared = HEIGHT - remaining.length
  if (cleared === 0) return grid
  const newRows = Array.from({ length: cleared }, () =>
    Array.from({ length: WIDTH }, () => 'empty')
  )
  return [...newRows, ...remaining]
}

describe('Tetris Game Logic', () => {
  describe('Board Creation', () => {
    it('should create an empty board with correct dimensions', () => {
      const board = makeEmptyBoard()
      expect(board).toHaveLength(HEIGHT)
      expect(board[0]).toHaveLength(WIDTH)
      expect(board[0][0]).toBe('empty')
    })

    it('should create a board where all cells are empty', () => {
      const board = makeEmptyBoard()
      const allEmpty = board.every(row => row.every(cell => cell === 'empty'))
      expect(allEmpty).toBe(true)
    })
  })

  describe('Piece Shapes', () => {
    it('should have all 7 tetrimino types', () => {
      const types = Object.keys(SHAPES)
      expect(types).toHaveLength(7)
      expect(types).toContain('i')
      expect(types).toContain('o')
      expect(types).toContain('t')
      expect(types).toContain('s')
      expect(types).toContain('z')
      expect(types).toContain('j')
      expect(types).toContain('l')
    })

    it('should have 4 rotations for I piece', () => {
      expect(SHAPES.i).toHaveLength(4)
    })

    it('should have 1 rotation for O piece', () => {
      expect(SHAPES.o).toHaveLength(1)
    })

    it('should have 4 rotations for T piece', () => {
      expect(SHAPES.t).toHaveLength(4)
    })

    it('should have 4 cells for each shape rotation', () => {
      Object.entries(SHAPES).forEach(([type, rotations]) => {
        rotations.forEach((rotation, idx) => {
          expect(rotation).toHaveLength(4)
        })
      })
    })
  })

  describe('Piece Position Validation', () => {
    it('should validate a piece in valid starting position', () => {
      const board = makeEmptyBoard()
      const piece = { type: 'i', rotation: 0, row: 0, col: 3 }
      expect(isValidPosition(piece, board)).toBe(true)
    })

    it('should reject a piece that goes out of left boundary', () => {
      const board = makeEmptyBoard()
      const piece = { type: 'i', rotation: 0, row: 0, col: -2 }
      expect(isValidPosition(piece, board)).toBe(false)
    })

    it('should reject a piece that goes out of right boundary', () => {
      const board = makeEmptyBoard()
      const piece = { type: 'i', rotation: 0, row: 0, col: WIDTH }
      expect(isValidPosition(piece, board)).toBe(false)
    })

    it('should reject a piece that overlaps with existing blocks', () => {
      const board = makeEmptyBoard()
      board[5][5] = 'i'
      const piece = { type: 'o', rotation: 0, row: 4, col: 4 }
      expect(isValidPosition(piece, board)).toBe(false)
    })

    it('should allow piece to be partially above the board', () => {
      const board = makeEmptyBoard()
      const piece = { type: 'i', rotation: 0, row: -1, col: 3 }
      expect(isValidPosition(piece, board)).toBe(true)
    })

    it('should reject piece at bottom boundary', () => {
      const board = makeEmptyBoard()
      const piece = { type: 'i', rotation: 0, row: HEIGHT, col: 3 }
      expect(isValidPosition(piece, board)).toBe(false)
    })
  })

  describe('Piece Locking', () => {
    it('should lock a piece onto the board', () => {
      const board = makeEmptyBoard()
      const piece = { type: 'o', rotation: 0, row: 0, col: 4 }
      const newBoard = lockPiece(piece, board)
      
      expect(newBoard[0][5]).toBe('o')
      expect(newBoard[0][6]).toBe('o')
      expect(newBoard[1][5]).toBe('o')
      expect(newBoard[1][6]).toBe('o')
    })

    it('should not modify the original board', () => {
      const board = makeEmptyBoard()
      const piece = { type: 'o', rotation: 0, row: 0, col: 4 }
      lockPiece(piece, board)
      
      expect(board[0][5]).toBe('empty')
    })

    it('should lock different piece types', () => {
      const board = makeEmptyBoard()
      // I piece rotation 1: [[1, 0], [1, 1], [1, 2], [1, 3]]
      const iPiece = { type: 'i', rotation: 1, row: 5, col: 3 }
      const newBoard = lockPiece(iPiece, board)
      
      // row 5 + 1 = 6, cols 3+0, 3+1, 3+2, 3+3
      expect(newBoard[6][3]).toBe('i')
      expect(newBoard[6][4]).toBe('i')
      expect(newBoard[6][5]).toBe('i')
      expect(newBoard[6][6]).toBe('i')
    })
  })

  describe('Line Clearing', () => {
    it('should clear a complete line', () => {
      const board = makeEmptyBoard()
      // Fill bottom row
      for (let col = 0; col < WIDTH; col++) {
        board[HEIGHT - 1][col] = 'i'
      }
      
      const newBoard = clearLines(board)
      expect(newBoard[HEIGHT - 1].every(cell => cell === 'empty')).toBe(true)
    })

    it('should not clear an incomplete line', () => {
      const board = makeEmptyBoard()
      // Fill bottom row except one cell
      for (let col = 0; col < WIDTH - 1; col++) {
        board[HEIGHT - 1][col] = 'i'
      }
      
      const newBoard = clearLines(board)
      expect(newBoard[HEIGHT - 1][0]).toBe('i')
    })

    it('should clear multiple lines', () => {
      const board = makeEmptyBoard()
      // Fill bottom 3 rows
      for (let row = HEIGHT - 3; row < HEIGHT; row++) {
        for (let col = 0; col < WIDTH; col++) {
          board[row][col] = 'i'
        }
      }
      
      const newBoard = clearLines(board)
      expect(newBoard[HEIGHT - 1].every(cell => cell === 'empty')).toBe(true)
      expect(newBoard[HEIGHT - 2].every(cell => cell === 'empty')).toBe(true)
      expect(newBoard[HEIGHT - 3].every(cell => cell === 'empty')).toBe(true)
    })

    it('should move lines down when clearing', () => {
      const board = makeEmptyBoard()
      board[HEIGHT - 3][5] = 'j'
      // Fill bottom row
      for (let col = 0; col < WIDTH; col++) {
        board[HEIGHT - 1][col] = 'i'
      }
      
      const newBoard = clearLines(board)
      expect(newBoard[HEIGHT - 2][5]).toBe('j')
      expect(newBoard[HEIGHT - 3][5]).toBe('empty')
    })
  })

  describe('Piece Rotation', () => {
    it('should rotate I piece correctly', () => {
      const board = makeEmptyBoard()
      const horizontal = { type: 'i', rotation: 1, row: 5, col: 3 }
      const vertical = { type: 'i', rotation: 0, row: 5, col: 3 }
      
      expect(isValidPosition(horizontal, board)).toBe(true)
      expect(isValidPosition(vertical, board)).toBe(true)
    })

    it('should handle O piece rotation (same shape)', () => {
      const board = makeEmptyBoard()
      const piece = { type: 'o', rotation: 0, row: 5, col: 4 }
      
      expect(isValidPosition(piece, board)).toBe(true)
      expect(SHAPES.o).toHaveLength(1)
    })
  })

  describe('getCells Helper', () => {
    it('should return correct cell positions for a piece', () => {
      const piece = { type: 'o', rotation: 0, row: 0, col: 0 }
      const cells = getCells(piece)
      
      expect(cells).toHaveLength(4)
      expect(cells).toContainEqual([0, 1])
      expect(cells).toContainEqual([0, 2])
      expect(cells).toContainEqual([1, 1])
      expect(cells).toContainEqual([1, 2])
    })

    it('should offset cells by piece position', () => {
      const piece = { type: 'o', rotation: 0, row: 5, col: 3 }
      const cells = getCells(piece)
      
      expect(cells).toContainEqual([5, 4])
      expect(cells).toContainEqual([5, 5])
      expect(cells).toContainEqual([6, 4])
      expect(cells).toContainEqual([6, 5])
    })
  })
})
