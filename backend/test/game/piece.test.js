import { describe, it, expect } from 'vitest'

import Piece from '../../src/game/Piece.js'

const makeBoard = (width = 10, height = 20) =>
  Array.from({ length: height }, () => Array(width).fill('empty'))

describe('Piece', () => {
  it('spawns pieces in SRS rotation state 0', () => {
    const iPiece = new Piece('I')
    const tPiece = new Piece('T')

    expect(iPiece.rotation).toBe(0)
    expect(tPiece.rotation).toBe(0)
  })

  it('canSpawn returns false when the spawn area is blocked', () => {
    const board = makeBoard()
    const piece = new Piece('T')

    piece.getCells().forEach(({ x, y }) => {
      board[y][x] = 'locked'
    })

    expect(piece.canSpawn(board)).toBe(false)
  })

  it('spawns partially above the visible board when the shape has top padding', () => {
    const piece = new Piece('I')

    expect(piece.y).toBe(-1)
  })

  it('allows spawning above the board while still checking visible collisions', () => {
    const board = makeBoard()
    const piece = new Piece('I')

    expect(piece.canSpawn(board)).toBe(true)

    board[0][piece.x + 0] = 'locked'
    board[0][piece.x + 1] = 'locked'
    board[0][piece.x + 2] = 'locked'
    board[0][piece.x + 3] = 'locked'

    expect(piece.canSpawn(board)).toBe(false)
  })

  it('rotate cycles through the available orientations', () => {
    const piece = new Piece('S')
    const initialShape = piece.shape

    piece.rotate()
    expect(piece.rotation).toBe(1)
    expect(piece.shape).not.toBe(initialShape)


  it('canSpawn returns false for out-of-bounds and continues for negative y', () => {
    const board = makeBoard()
    const piece = new Piece('I')
    // Out of bounds (boardX < 0)
    piece.x = -10
    expect(piece.canSpawn(board)).toBe(false)
    // Out of bounds (boardX >= boardWidth)
    piece.x = 20
    expect(piece.canSpawn(board)).toBe(false)
    // Out of bounds (boardY >= boardHeight)
    piece.x = 0
    piece.y = 25
    expect(piece.canSpawn(board)).toBe(false)
    // boardY < 0 triggers continue (should not throw)
    piece.x = 0
    piece.y = -5
    expect(piece.canSpawn(board)).toBe(true)
    // Collision with existing blocks
    piece.x = 3
    piece.y = 0
    board[0][3] = 'filled'
    expect(piece.canSpawn(board)).toBe(false)
  })
    piece.rotate()
    piece.rotate()
    piece.rotate()

    expect(piece.rotation).toBe(0)
  })

  it('getCells returns occupied board coordinates', () => {
    const piece = new Piece('O')

    expect(piece.getCells()).toEqual([
      { x: piece.x + 1, y: 0 },
      { x: piece.x + 2, y: 0 },
      { x: piece.x + 1, y: 1 },
      { x: piece.x + 2, y: 1 },
    ])
  })
})
