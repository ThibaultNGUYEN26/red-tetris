import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Game from '../../src/game/Game.js'
import Player from '../../src/game/Player.js'

describe('Game', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('starts a solo game, spawns pieces, and stops cleanly', () => {
    const player = new Player('Titi', 'socket-1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    const result = game.start()

    expect(result).toEqual({ started: true })
    expect(game.isRunning).toBe(true)
    expect(player.currentPiece).not.toBeNull()
    expect(player.nextPiece).not.toBeNull()

    game.stop()
    expect(game.isOver).toBe(true)
    expect(game.tickHandle).toBeNull()
  })

  it('supports pause and resume only while running', () => {
    const game = new Game('room-1', [new Player('Titi', 'socket-1')], 'classic', 'solo', 'Titi')

    game.pause()
    expect(game.isPaused).toBe(false)

    game.start()
    game.pause()
    expect(game.isPaused).toBe(true)

    game.resume()
    expect(game.isPaused).toBe(false)
  })

  it('enqueues inputs only for alive players and enforces cooperative turns', () => {
    const players = [new Player('Titi', '1'), new Player('Riri', '2')]
    const game = new Game('room-1', players, 'cooperative', 'multi', 'Titi')

    game.initializeTurn()
    game.enqueueInput('Titi', 'left')
    game.enqueueInput('Riri', 'right')

    expect(players[0].inputQueue).toEqual(['left'])
    expect(players[1].inputQueue).toEqual([])

    players[0].die()
    game.enqueueInput('Titi', 'rotate')
    expect(players[0].inputQueue).toEqual(['left'])
  })

  it('moves and rotates pieces when placement is valid', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    game.spawnForPlayer(player)
    const originalX = player.currentPiece.x
    const originalRotation = player.currentPiece.rotation

    expect(game.tryMove(player, -1, 0)).toBe(true)
    expect(player.currentPiece.x).toBe(originalX - 1)
    expect(game.tryRotate(player)).toBe(true)
    expect(player.currentPiece.rotation).not.toBe(originalRotation)
  })

  it('spawns the I piece in the horizontal SRS spawn state', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    game.sequenceBuffer = ['I', 'O']

    expect(game.spawnForPlayer(player)).toBe(true)
    expect(player.currentPiece.rotation).toBe(0)
  })

  it('allows a new piece to spawn partly above the board', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    game.sequenceBuffer = ['I', 'O']

    expect(game.spawnForPlayer(player)).toBe(true)
    expect(player.currentPiece.y).toBeLessThan(0)
  })

  it('clears lines, queues penalties, and applies them when the target player locks', () => {
    const attacker = new Player('Titi', '1')
    const defender = new Player('Riri', '2')
    const game = new Game('room-1', [attacker, defender], 'classic', 'multi', 'Titi')

    attacker.board = Array.from({ length: game.boardHeight }, () =>
      Array(game.boardWidth).fill('empty')
    )
    defender.board = Array.from({ length: game.boardHeight }, () =>
      Array(game.boardWidth).fill('empty')
    )

    for (let row = game.boardHeight - 2; row < game.boardHeight; row += 1) {
      attacker.board[row] = Array(game.boardWidth).fill('x')
    }

    game.spawnForPlayer(attacker)
    attacker.currentPiece = {
      type: 'O',
      rotation: 0,
      x: 20,
      y: 20,
    }

    defender.pendingPenaltyLines = 2

    game.lockCurrentPiece(attacker)

    expect(attacker.lines).toBe(2)
    expect(attacker.score).toBe(100)
    expect(defender.pendingPenaltyLines).toBe(3)

    game.spawnForPlayer(defender)
    defender.currentPiece = {
      type: 'O',
      rotation: 0,
      x: 20,
      y: 20,
    }
    game.lockCurrentPiece(defender)

    expect(defender.pendingPenaltyLines).toBe(0)
    expect(defender.board.at(-1).every((cell) => cell === 'black')).toBe(true)
    expect(attacker.currentPiece).not.toBeNull()
  })

  it('produces render boards with active and ghost pieces', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    game.spawnForPlayer(player)

    const rendered = game.getRenderBoard(player)
    const lockedOnly = game.getRenderBoard(player, { includeActive: false, includeGhost: false })

    expect(rendered.flat()).toContain(player.currentPiece.type.toLowerCase())
    expect(rendered.flat()).toContain('ghost')
    expect(lockedOnly.flat()).not.toContain('ghost')
  })

  it('serializes cooperative state from the shared player', () => {
    const players = [new Player('Titi', '1'), new Player('Riri', '2')]
    const game = new Game('room-1', players, 'cooperative', 'multi', 'Titi')

    game.start()
    const state = game.serialize()

    expect(state.mode).toBe('cooperative')
    expect(state.currentTurnUsername).toBe('Titi')
    expect(state.players).toHaveLength(2)
    expect(state.players[0].board).toEqual(state.players[1].board)
  })

  it('ends multiplayer when one player remains alive', () => {
    const players = [new Player('Titi', '1'), new Player('Riri', '2')]
    const game = new Game('room-1', players, 'classic', 'multi', 'Titi')

    players[1].die()

    expect(game.checkGameOver()).toEqual({ over: true, winner: 'Titi' })

    const summary = game.endGame()
    expect(summary.winner).toBe('Titi')
    expect(game.isRunning).toBe(false)
    expect(game.isOver).toBe(true)
  })

  it('ticks, emits updates, and ends the game when all solo players are dead', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')
    const onTick = vi.fn()
    const onGameOver = vi.fn()

    game.setCallbacks({ onTick, onGameOver })
    game.start()
    game.tick()

    expect(onTick).toHaveBeenCalled()

    player.die()
    game.tick()

    expect(onGameOver).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: 'room-1',
        mode: 'classic',
        winner: null,
      })
    )
  })
})
