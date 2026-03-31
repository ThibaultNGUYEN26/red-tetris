import { describe, it, expect } from 'vitest'

import Piece from '../../src/game/Piece.js'

const makeBoard = (width = 10, height = 20) =>
  Array.from({ length: height }, () => Array(width).fill('empty'))

describe('Piece', () => {
  it('spawns I vertically and other pieces at rotation 0', () => {
    const iPiece = new Piece('I')
    const tPiece = new Piece('T')

    expect(iPiece.rotation).toBe(1)
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

  it('rotate cycles through the available orientations', () => {
    const piece = new Piece('S')
    const initialShape = piece.shape

    piece.rotate()
    expect(piece.rotation).toBe(1)
    expect(piece.shape).not.toBe(initialShape)

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
