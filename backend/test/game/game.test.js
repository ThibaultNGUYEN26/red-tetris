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
    vi.restoreAllMocks()
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

  it('clears the active piece when top-out happens after a lock', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    player.board = Array.from({ length: game.boardHeight }, () =>
      Array(game.boardWidth).fill('empty')
    )

    player.currentPiece = {
      type: 'O',
      rotation: 0,
      x: 4,
      y: 0,
    }

    // Block the next spawn at the top of the visible board without creating
    // a full line that would be cleared by the lock.
    game.sequenceBuffer = ['O', 'I']
    player.sequenceIndex = 0
    player.board[0][3] = 'filled'
    player.board[0][4] = 'filled'
    player.board[0][5] = 'filled'
    player.board[0][6] = 'filled'

    game.lockCurrentPiece(player)

    expect(player.isAlive).toBe(false)
    expect(player.currentPiece).toBeNull()

    const rendered = game.getRenderBoard(player)
    expect(rendered.flat()).not.toContain('ghost')
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

  it('assigns cooperative roles and filters inputs in cooperative_roles mode', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const players = [new Player('Titi', '1'), new Player('Riri', '2')]
    const game = new Game('room-1', players, 'cooperative_roles', 'multi', 'Titi')

    game.start()
    game.enqueueInput('Titi', 'rotate')
    game.enqueueInput('Titi', 'left')
    game.enqueueInput('Riri', 'left')
    game.enqueueInput('Riri', 'rotate')

    expect(players[0].inputQueue).toEqual(['rotate', 'left'])

    const state = game.serialize()
    expect(state.players.find((player) => player.username === 'Titi')?.cooperativeRole).toBe('rotate')
    expect(state.players.find((player) => player.username === 'Riri')?.cooperativeRole).toBe('place')

    randomSpy.mockRestore()
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

  it('advances alternating cooperative turns to the next alive player or clears the turn', () => {
    const players = [new Player('Titi', '1'), new Player('Riri', '2'), new Player('Lulu', '3')]
    const game = new Game('room-1', players, 'cooperative', 'multi', 'Titi')

    game.currentTurnIndex = 0
    players[1].die()
    game.advanceTurn()
    expect(game.currentTurnUsername).toBe('Lulu')

    players[2].die()
    players[0].die()
    game.advanceTurn()
    expect(game.currentTurnUsername).toBe(null)
  })

  it('marks players dead when the initial spawn fails', () => {
    const soloPlayer = new Player('Solo', '1')
    const soloGame = new Game('solo-room', [soloPlayer], 'classic', 'solo', 'Solo')
    vi.spyOn(soloGame, 'spawnForPlayer').mockReturnValue(false)

    soloGame.start()
    expect(soloPlayer.isAlive).toBe(false)

    const coopPlayers = [new Player('Titi', '1'), new Player('Riri', '2')]
    const coopGame = new Game('coop-room', coopPlayers, 'cooperative', 'multi', 'Titi')
    vi.spyOn(coopGame, 'spawnForPlayer').mockReturnValue(false)

    coopGame.start()
    expect(coopPlayers[0].isAlive).toBe(false)
    expect(coopPlayers[1].isAlive).toBe(false)
  })

  it('enqueues inputs directly for non-cooperative games', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    game.enqueueInput('Titi', 'left')

    expect(player.inputQueue).toEqual(['left'])
  })

  it('allows canPlace checks above the board and rejects invalid moves or rotations', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    expect(game.canPlace('I', 0, 3, -1, player.board)).toBe(true)

    player.currentPiece = {
      type: 'O',
      rotation: 0,
      shape: [[1, 1], [1, 1]],
      x: 0,
      y: 0,
    }
    let canPlaceSpy = vi.spyOn(game, 'canPlace').mockReturnValue(false)
    expect(game.tryMove(player, -1, 0)).toBe(false)
    canPlaceSpy.mockRestore()

    player.currentPiece = {
      type: 'T',
      rotation: 0,
      shape: [[0, 1, 0], [1, 1, 1]],
      x: 4,
      y: 0,
    }
    canPlaceSpy = vi.spyOn(game, 'canPlace').mockReturnValue(false)

    expect(game.tryRotate(player)).toBe(false)

    canPlaceSpy.mockRestore()

    // Explicitly test the continue and return false branches in canPlace
    // Out of bounds (boardX < 0)
    expect(game.canPlace('I', 0, -5, 0, player.board)).toBe(false)
    // Out of bounds (boardX >= boardWidth)
    expect(game.canPlace('I', 0, 20, 0, player.board)).toBe(false)
    // Out of bounds (boardY >= boardHeight)
    expect(game.canPlace('I', 0, 0, 25, player.board)).toBe(false)
    // boardY < 0 triggers continue (should not throw)
    expect(game.canPlace('I', 0, 0, -5, player.board)).toBe(true)
    // Collision with existing blocks
    const board = player.board.map(row => row.slice())
    board[1][3] = 'filled'
    expect(game.canPlace('I', 0, 3, 0, board)).toBe(false)
  })

  it('processes queued inputs including lock paths and gravity lock', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    const moveSpy = vi.spyOn(game, 'tryMove')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
    const rotateSpy = vi.spyOn(game, 'tryRotate').mockReturnValue(true)
    const lockSpy = vi.spyOn(game, 'lockCurrentPiece').mockImplementation(() => {})

    player.currentPiece = { type: 'I', rotation: 0, x: 3, y: 0 }
    player.inputQueue = ['left', 'right', 'rotate', 'drop', 'hardDrop']

    game.processInputs(player)

    expect(rotateSpy).toHaveBeenCalled()
    expect(lockSpy).toHaveBeenCalledTimes(2)

    player.dropAccumulator = 500
    game.applyGravity(player)
    expect(lockSpy).toHaveBeenCalledTimes(3)
    expect(player.dropAccumulator).toBe(60)

    moveSpy.mockRestore()
    rotateSpy.mockRestore()
    lockSpy.mockRestore()
  })

  it('locks a cooperative piece and advances the turn', () => {
    const players = [new Player('Titi', '1'), new Player('Riri', '2')]
    const game = new Game('room-1', players, 'cooperative', 'multi', 'Titi')

    const advanceSpy = vi.spyOn(game, 'advanceTurn')
    vi.spyOn(game, 'spawnForPlayer').mockReturnValue(true)

    const sharedPlayer = players[0]
    sharedPlayer.board = Array.from({ length: game.boardHeight }, () =>
      Array(game.boardWidth).fill('empty')
    )
    sharedPlayer.currentPiece = {
      type: 'O',
      rotation: 0,
      x: 4,
      y: 0,
    }

    game.lockCurrentPiece(sharedPlayer)

    expect(advanceSpy).toHaveBeenCalled()
  })

  it('handles cooperative game-over checks and tick spawn failures', () => {
    const players = [new Player('Titi', '1'), new Player('Riri', '2')]
    const game = new Game('room-1', players, 'cooperative', 'multi', 'Titi')
    const sharedPlayer = players[0]

    sharedPlayer.die()
    expect(game.checkGameOver()).toEqual({ over: true, winner: null })

    sharedPlayer.isAlive = true
    expect(game.checkGameOver()).toEqual({ over: false })

    sharedPlayer.currentPiece = null
    game.isRunning = true
    vi.spyOn(game, 'spawnForPlayer').mockReturnValue(false)
    const syncSpy = vi.spyOn(game, 'syncCooperativeStateFrom')

    game.tick()

    expect(sharedPlayer.isAlive).toBe(false)
    expect(syncSpy).toHaveBeenCalledWith(sharedPlayer)
  })

  it('marks multiplayer players dead when tick-time spawning fails', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'multi', 'Titi')

    game.isRunning = true
    player.currentPiece = null
    vi.spyOn(game, 'spawnForPlayer').mockReturnValue(false)

    game.tick()

    expect(player.isAlive).toBe(false)
  })

  it('processes inputs and gravity for alive cooperative shared player', () => {
    const players = [new Player('Titi', '1'), new Player('Riri', '2')]
    const game = new Game('room-1', players, 'cooperative', 'multi', 'Titi')
    const sharedPlayer = players[0]

    game.isRunning = true
    sharedPlayer.isAlive = true
    sharedPlayer.currentPiece = { type: 'T', rotation: 0, x: 4, y: 0 }

    const processSpy = vi.spyOn(game, 'processInputs').mockImplementation(() => {})
    const gravitySpy = vi.spyOn(game, 'applyGravity').mockImplementation(() => {})
    const syncSpy = vi.spyOn(game, 'syncCooperativeStateFrom').mockImplementation(() => {})

    game.tick()

    expect(processSpy).toHaveBeenCalledWith(sharedPlayer)
    expect(gravitySpy).toHaveBeenCalledWith(sharedPlayer)
    expect(syncSpy).toHaveBeenCalledWith(sharedPlayer)
  })

  it('returns early in tick when game is stopped, over, or paused', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')
    const processSpy = vi.spyOn(game, 'processInputs')

    game.tick()
    expect(processSpy).not.toHaveBeenCalled()

    game.isRunning = true
    game.isOver = true
    game.tick()
    expect(processSpy).not.toHaveBeenCalled()

    game.isOver = false
    game.isPaused = true
    game.tick()
    expect(processSpy).not.toHaveBeenCalled()
  })

  it('renders active blocks without ghost when includeGhost is false', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    player.board = Array.from({ length: game.boardHeight }, () =>
      Array(game.boardWidth).fill('empty')
    )
    player.currentPiece = {
      type: 'O',
      rotation: 0,
      x: 4,
      y: 0,
    }

    const rendered = game.getRenderBoard(player, { includeActive: true, includeGhost: false })

    expect(rendered.flat()).toContain('o')
    expect(rendered.flat()).not.toContain('ghost')
  })

  it('does not overwrite occupied cells when drawing ghost and active pieces', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    player.board = Array.from({ length: game.boardHeight }, () =>
      Array(game.boardWidth).fill('empty')
    )
    player.currentPiece = {
      type: 'O',
      rotation: 0,
      x: 4,
      y: 0,
    }
    player.board[0][5] = 'black'

    vi.spyOn(game, 'canPlace').mockReturnValue(false)

    const rendered = game.getRenderBoard(player, { includeActive: true, includeGhost: true })

    expect(rendered[0][5]).toBe('black')
    expect(rendered.flat()).not.toContain('ghost')
  })

  it('serializes cooperative mode with safe fallbacks when no shared player is available', () => {
    const players = [new Player('Titi', '1'), new Player('Riri', '2')]
    const game = new Game('room-1', players, 'cooperative', 'multi', 'Titi')

    vi.spyOn(game, 'getCooperativePlayer').mockReturnValue(null)

    const state = game.serialize()

    expect(state.players).toEqual([
      expect.objectContaining({
        username: 'Titi',
        isAlive: false,
        score: 0,
        lines: 0,
        level: 1,
        nextType: null,
        board: [],
        boardLocked: [],
      }),
      expect.objectContaining({
        username: 'Riri',
        isAlive: false,
        score: 0,
        lines: 0,
        level: 1,
        nextType: null,
        board: [],
        boardLocked: [],
      }),
    ])
  })

  it('evaluates non-cooperative isCurrentTurn from username comparison branch', () => {
    const players = [new Player('Titi', '1'), new Player('Riri', '2')]
    const game = new Game('room-1', players, 'classic', 'multi', 'Titi')

    game.currentTurnUsername = 'Riri'
    vi.spyOn(game, 'isCooperativeMode')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)

    const state = game.serialize()

    expect(state.players.find((player) => player.username === 'Titi')?.isCurrentTurn).toBe(false)
    expect(state.players.find((player) => player.username === 'Riri')?.isCurrentTurn).toBe(true)
  })

  it('handles out-of-bounds render cells and active-disabled rendering paths', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'solo', 'Titi')

    player.board = Array.from({ length: game.boardHeight }, () =>
      Array(game.boardWidth).fill('empty')
    )
    player.currentPiece = {
      type: 'O',
      rotation: 0,
      x: 4,
      y: -2,
    }

    vi.spyOn(game, 'canPlace').mockReturnValue(false)

    const ghostOnly = game.getRenderBoard(player, { includeActive: false, includeGhost: true })
    expect(ghostOnly.flat()).not.toContain('ghost')

    const activeOnly = game.getRenderBoard(player, { includeActive: true, includeGhost: false })
    expect(activeOnly.flat()).not.toContain('o')
  })

  it('skips cooperative tick body when shared player is not alive', () => {
    const players = [new Player('Titi', '1'), new Player('Riri', '2')]
    const game = new Game('room-1', players, 'cooperative', 'multi', 'Titi')
    const sharedPlayer = players[0]

    game.isRunning = true
    sharedPlayer.isAlive = false

    const processSpy = vi.spyOn(game, 'processInputs')
    const gravitySpy = vi.spyOn(game, 'applyGravity')
    const syncSpy = vi.spyOn(game, 'syncCooperativeStateFrom')

    game.tick()

    expect(processSpy).not.toHaveBeenCalled()
    expect(gravitySpy).not.toHaveBeenCalled()
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it('continues cooperative tick when spawning succeeds', () => {
    const players = [new Player('Titi', '1'), new Player('Riri', '2')]
    const game = new Game('room-1', players, 'cooperative', 'multi', 'Titi')
    const sharedPlayer = players[0]

    game.isRunning = true
    sharedPlayer.isAlive = true
    sharedPlayer.currentPiece = null

    vi.spyOn(game, 'spawnForPlayer').mockReturnValue(true)
    const processSpy = vi.spyOn(game, 'processInputs').mockImplementation(() => {})
    const gravitySpy = vi.spyOn(game, 'applyGravity').mockImplementation(() => {})

    game.tick()

    expect(processSpy).toHaveBeenCalledWith(sharedPlayer)
    expect(gravitySpy).toHaveBeenCalledWith(sharedPlayer)
  })

  it('continues multiplayer tick when spawning succeeds', () => {
    const player = new Player('Titi', '1')
    const game = new Game('room-1', [player], 'classic', 'multi', 'Titi')

    game.isRunning = true
    player.currentPiece = null
    player.isAlive = true

    vi.spyOn(game, 'spawnForPlayer').mockReturnValue(true)
    const processSpy = vi.spyOn(game, 'processInputs').mockImplementation(() => {})
    const gravitySpy = vi.spyOn(game, 'applyGravity').mockImplementation(() => {})

    game.tick()

    expect(processSpy).toHaveBeenCalledWith(player)
    expect(gravitySpy).toHaveBeenCalledWith(player)
  })
})
