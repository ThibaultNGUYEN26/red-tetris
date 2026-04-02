import { describe, it, expect } from 'vitest'

import Player from '../../src/game/Player.js'

describe('Player', () => {
  it('initializes with a default empty board and base stats', () => {
    const player = new Player('Titi', 'socket-1')

    expect(player.username).toBe('Titi')
    expect(player.socketId).toBe('socket-1')
    expect(player.board).toHaveLength(20)
    expect(player.board[0]).toHaveLength(10)
    expect(player.score).toBe(0)
    expect(player.lines).toBe(0)
    expect(player.level).toBe(1)
    expect(player.isAlive).toBe(true)
  })

  it('spawns and tracks current and next pieces', () => {
    const player = new Player('Titi', 'socket-1')

    expect(player.spawnPiece('T', player.board)).toBe(true)
    expect(player.currentPiece.type).toBe('T')

    player.setNextPiece('I')
    expect(player.nextPiece.type).toBe('I')

    player.promoteNextPiece()
    expect(player.currentPiece.type).toBe('I')
    expect(player.nextPiece).toBeNull()
  })

  it('serializes the public player state', () => {
    const player = new Player('Titi', 'socket-1')
    player.setNextPiece('L')

    expect(player.serialize()).toEqual({
      username: 'Titi',
      isAlive: true,
      score: 0,
      lines: 0,
      level: 1,
      nextType: 'l',
    })
  })

  it('applyLineClear updates score, lines, and level', () => {
    const player = new Player('Titi', 'socket-1')
    player.lines = 9

    const result = player.applyLineClear(1)

    expect(result).toEqual({
      scoreDelta: 40,
      lines: 10,
      level: 2,
    })
    expect(player.score).toBe(40)
    expect(player.lines).toBe(10)
    expect(player.level).toBe(2)
  })

  it('applyLineClear ignores invalid inputs and die marks the player dead', () => {
    const player = new Player('Titi', 'socket-1')

    expect(player.applyLineClear(0)).toEqual({
      scoreDelta: 0,
      lines: 0,
      level: 1,
    })

    player.die()
    expect(player.isAlive).toBe(false)
  })
})
