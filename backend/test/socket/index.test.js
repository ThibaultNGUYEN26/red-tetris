import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockQuery,
  mockCreateGame,
  mockGetGame,
  mockRemoveGame,
} = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockCreateGame: vi.fn(),
  mockGetGame: vi.fn(),
  mockRemoveGame: vi.fn(),
}))

vi.mock('../../src/config/db.js', () => ({
  pool: {
    query: mockQuery,
  },
}))

vi.mock('../../src/game/gameManager.js', () => ({
  createGame: mockCreateGame,
  getGame: mockGetGame,
  removeGame: mockRemoveGame,
}))

const createSocket = (id = 'socket-1') => {
  const handlers = new Map()
  return {
    id,
    data: {},
    handlers,
    on: vi.fn((event, handler) => {
      handlers.set(event, handler)
    }),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
  }
}

const createIo = () => {
  const roomEmit = vi.fn()
  return {
    roomEmit,
    emit: vi.fn(),
    to: vi.fn(() => ({ emit: roomEmit })),
    on: vi.fn(),
  }
}

const setupConnectedSocket = async () => {
  const io = createIo()
  const socket = createSocket()
  const { default: setupSockets } = await import('../../src/socket/index.js')

  setupSockets(io)
  const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
  connectionHandler(socket)

  return { io, socket }
}

describe('socket setup', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('broadcastAvailableRooms emits only joinable waiting rooms', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'A', game_mode: 'classic', host: 'Titi', player_count: 2, players: ['Titi'] },
        { id: 2, name: 'B', game_mode: 'cooperative', host: 'Riri', player_count: 2, players: ['Riri'] },
      ],
    })

    const io = createIo()
    const { broadcastAvailableRooms } = await import('../../src/socket/index.js')

    await broadcastAvailableRooms(io)

    expect(io.emit).toHaveBeenCalledWith('availableRooms', [
      expect.objectContaining({
        id: 1,
        maxPlayers: 6,
      }),
    ])
  })

  it('registerUser rejects a missing username', async () => {
    const { socket } = await setupConnectedSocket()

    const registerHandler = socket.handlers.get('registerUser')
    const ack = vi.fn()

    registerHandler({ username: '' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Missing username' })
    expect(socket.emit).toHaveBeenCalledWith('usernameTaken', { username: '' })
  })

  it('registerUser rejects an invalid username', async () => {
    const { socket } = await setupConnectedSocket()

    const registerHandler = socket.handlers.get('registerUser')
    const ack = vi.fn()

    registerHandler({ username: 'Bad Name' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Invalid username' })
    expect(socket.emit).toHaveBeenCalledWith('usernameTaken', { username: 'Bad Name' })
  })

  it('joinRoom validates required fields', async () => {
    const { socket } = await setupConnectedSocket()

    const joinRoomHandler = socket.handlers.get('joinRoom')
    const ack = vi.fn()

    await joinRoomHandler({ roomId: '', username: '' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Missing roomId or username' })
  })

  it('joinRoom rejects an invalid username', async () => {
    const { socket } = await setupConnectedSocket()

    const joinRoomHandler = socket.handlers.get('joinRoom')
    const ack = vi.fn()

    await joinRoomHandler({ roomId: '1', username: 'Bad Name' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Invalid username' })
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Invalid username' })
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('joinRoom adds a player and emits roomState', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'classic',
          host: 'Host',
          player_count: 1,
          players: ['Host'],
          status: 'waiting',
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Room', game_mode: 'classic', host: 'Host', player_count: 2, players: ['Host', 'Titi'] }],
      })

    const { io, socket } = await setupConnectedSocket()

    const joinRoomHandler = socket.handlers.get('joinRoom')
    const ack = vi.fn()

    await joinRoomHandler({ roomId: '1', username: 'Titi' }, ack)

    expect(socket.join).toHaveBeenCalledWith('1')
    expect(io.roomEmit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({
        player_avatars: { Titi: { eyeType: 'happy' } },
      })
    )
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('joinRoom also adds a rejoining player to ready_again for a post-game lobby', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'classic',
          host: 'Host',
          player_count: 2,
          players: ['Host', 'Riri'],
          status: 'waiting',
          ready_again: ['Riri'],
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Riri', avatar: { eyeType: 'sad' } },
          { username: 'Titi', avatar: { eyeType: 'happy' } },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Room', game_mode: 'classic', host: 'Host', player_count: 3, players: ['Host', 'Riri', 'Titi'] }],
      })

    const { io, socket } = await setupConnectedSocket()

    const joinRoomHandler = socket.handlers.get('joinRoom')
    const ack = vi.fn()

    await joinRoomHandler({ roomId: '1', username: 'Titi' }, ack)

    expect(mockQuery).toHaveBeenCalledWith(
      "UPDATE rooms SET players = $2, player_count = $3, ready_again = $4 WHERE id = $1",
      ['1', ['Host', 'Riri', 'Titi'], 3, ['Riri', 'Titi']]
    )
    expect(io.roomEmit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({
        players: ['Host', 'Riri', 'Titi'],
        ready_again: ['Riri', 'Titi'],
      })
    )
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('getRoomState emits roomState for a waiting room', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'classic',
          host: 'Host',
          player_count: 1,
          players: ['Host'],
          status: 'waiting',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Host', avatar: { eyeType: 'happy' } }],
      })

    const { socket } = await setupConnectedSocket()

    const getRoomStateHandler = socket.handlers.get('getRoomState')

    await getRoomStateHandler({ roomId: '1' })

    expect(socket.emit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({
        id: 1,
        player_avatars: { Host: { eyeType: 'happy' } },
      })
    )
  })

  it('playAgain stores ready_again players and emits the updated room', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, ready_again: ['Host'] }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          host: 'Host',
          players: ['Host'],
          ready_again: ['Host', 'Titi'],
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Host', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Room', game_mode: 'classic', host: 'Host', player_count: 1, players: ['Host'] }],
      })

    const { io, socket } = await setupConnectedSocket()

    const playAgainHandler = socket.handlers.get('playAgain')

    await playAgainHandler({ roomId: '1', username: 'Titi' })

    expect(io.roomEmit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({
        ready_again: ['Host', 'Titi'],
      })
    )
  })

  it('pauseGame pauses and resumes solo games only', async () => {
    const pause = vi.fn()
    const resume = vi.fn()
    mockGetGame.mockReturnValue({
      isOver: false,
      mode_player: 'solo',
      pause,
      resume,
    })

    const { socket } = await setupConnectedSocket()

    const pauseHandler = socket.handlers.get('pauseGame')

    pauseHandler({ roomId: '1', paused: true })
    pauseHandler({ roomId: '1', paused: false })

    expect(pause).toHaveBeenCalled()
    expect(resume).toHaveBeenCalled()
  })

  it('joinSpectator emits gameState when a live game exists', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, name: 'Room', players: ['Host'], status: 'started' }],
    })
    mockGetGame.mockReturnValue({
      serialize: vi.fn(() => ({ roomId: '1', players: [] })),
    })

    const { socket } = await setupConnectedSocket()
    const joinSpectatorHandler = socket.handlers.get('joinSpectator')
    const ack = vi.fn()

    await joinSpectatorHandler({ roomId: '1', username: 'Spectator' }, ack)

    expect(socket.join).toHaveBeenCalledWith('1')
    expect(socket.emit).toHaveBeenCalledWith('gameState', { roomId: '1', players: [] })
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('getRoomState emits gameStarted and gameState for a started room', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        name: 'Room',
        game_mode: 'classic',
        host: 'Host',
        player_count: 2,
        players: ['Host', 'Riri'],
        status: 'started',
      }],
    })
    mockQuery.mockResolvedValueOnce({
      rows: [
        { username: 'Host', avatar: { eyeType: 'happy' } },
        { username: 'Riri', avatar: { eyeType: 'sad' } },
      ],
    })
    mockGetGame.mockReturnValue({
      serialize: vi.fn(() => ({ roomId: '1', running: true })),
    })

    const { socket } = await setupConnectedSocket()
    const getRoomStateHandler = socket.handlers.get('getRoomState')

    await getRoomStateHandler({ roomId: '1' })

    expect(socket.emit).toHaveBeenCalledWith('gameStarted', { roomId: '1' })
    expect(socket.emit).toHaveBeenCalledWith('gameState', { roomId: '1', running: true })
  })

  it('playerLeave immediately acknowledges spectators', async () => {
    const { socket } = await setupConnectedSocket()
    socket.data.isSpectator = true

    const playerLeaveHandler = socket.handlers.get('playerLeave')
    const ack = vi.fn()

    await playerLeaveHandler({ roomId: '3', username: 'Spec' }, ack)

    expect(socket.leave).toHaveBeenCalledWith('3')
    expect(ack).toHaveBeenCalledWith({ ok: true })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('startGame creates a game, marks the room started, and emits gameStarted', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          host: 'Titi',
          players: ['Titi', 'Riri'],
          status: 'waiting',
          game_mode: 'classic',
          ready_again: [],
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          players: ['Titi', 'Riri'],
          host: 'Titi',
          game_mode: 'classic',
          status: 'started',
        }],
      })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Titi', avatar: { eyeType: 'happy' } },
          { username: 'Riri', avatar: { eyeType: 'sad' } },
        ],
      })

    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'multi',
    }
    mockCreateGame.mockReturnValue(game)

    const { io, socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')

    await startGameHandler({ roomId: '1' })

    expect(mockRemoveGame).toHaveBeenCalledWith('1')
    expect(mockCreateGame).toHaveBeenCalledWith('1', ['Titi', 'Riri'], 'classic', 'Titi')
    expect(game.setCallbacks).toHaveBeenCalled()
    expect(game.start).toHaveBeenCalled()
    expect(mockQuery).toHaveBeenCalledWith("UPDATE rooms SET status='started' WHERE id=$1", ['1'])
    expect(io.roomEmit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({
        status: 'started',
        player_avatars: {
          Titi: { eyeType: 'happy' },
          Riri: { eyeType: 'sad' },
        },
      })
    )
    expect(io.roomEmit).toHaveBeenCalledWith('gameStarted', { roomId: '1' })
  })

  it('startGame stops when the caller is not the host', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        host: 'Host',
        players: ['Host', 'Titi'],
        status: 'waiting',
        game_mode: 'classic',
        ready_again: [],
      }],
    })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')
    await startGameHandler({ roomId: '1' })

    expect(mockCreateGame).not.toHaveBeenCalled()
    expect(consoleLog).toHaveBeenCalled()
  })

  it('startGame emits an error for invalid cooperative player count', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        host: 'Titi',
        players: ['Titi', 'Riri', 'Lulu'],
        status: 'waiting',
        game_mode: 'cooperative',
        ready_again: [],
      }],
    })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')
    await startGameHandler({ roomId: '1' })

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Co-op Alternate requires exactly 2 players to start.',
    })
  })

  it('startGame enforces the same 2-player rule for cooperative_roles', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        host: 'Titi',
        players: ['Titi', 'Riri', 'Lulu'],
        status: 'waiting',
        game_mode: 'cooperative_roles',
        ready_again: [],
      }],
    })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')
    await startGameHandler({ roomId: '1' })

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Co-op Roles requires exactly 2 players to start.',
    })
  })

  it('startGame replaces players with ready_again before starting', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          host: 'Titi',
          players: ['Titi', 'Old'],
          status: 'waiting',
          game_mode: 'classic',
          ready_again: ['Titi', 'Riri'],
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Room', players: ['Titi', 'Riri'], host: 'Titi', game_mode: 'classic', status: 'started' }] })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Titi', avatar: { eyeType: 'happy' } },
          { username: 'Riri', avatar: { eyeType: 'sad' } },
        ],
      })

    const game = { setCallbacks: vi.fn(), start: vi.fn(), mode_player: 'multi' }
    mockCreateGame.mockReturnValue(game)

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')
    await startGameHandler({ roomId: '1' })

    expect(mockQuery).toHaveBeenCalledWith(
      "UPDATE rooms SET players=$1, ready_again='{}' WHERE id=$2",
      [['Titi', 'Riri'], '1']
    )
    expect(mockCreateGame).toHaveBeenCalledWith('1', ['Titi', 'Riri'], 'classic', 'Titi')
  })

  it('startGame logs failures from the database path', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')
    await startGameHandler({ roomId: '1' })

    expect(consoleError).toHaveBeenCalledWith('startGame failed:', expect.any(Error))
  })

  it('playerLeave removes the player from the room and acknowledges success', async () => {
    const leavingPlayer = { isAlive: true }
    mockGetGame.mockReturnValue({
      getPlayer: vi.fn(() => leavingPlayer),
    })

    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'classic',
          host: 'Titi',
          player_count: 2,
          players: ['Titi', 'Riri'],
          status: 'waiting',
          ready_again: [],
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'classic',
          host: 'Riri',
          player_count: 1,
          players: ['Riri'],
          status: 'waiting',
          ready_again: [],
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Riri', avatar: { eyeType: 'sad' } }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          players: ['Riri'],
          host: 'Riri',
          game_mode: 'classic',
          status: 'waiting',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Riri', avatar: { eyeType: 'sad' } }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Open', game_mode: 'classic', host: 'Riri', player_count: 1, players: ['Riri'] }],
      })

    const { io, socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const playerLeaveHandler = socket.handlers.get('playerLeave')
    const ack = vi.fn()

    await playerLeaveHandler({ roomId: '1', username: 'Titi' }, ack)

    expect(leavingPlayer.isAlive).toBe(false)
    expect(socket.leave).toHaveBeenCalledWith('1')
    expect(io.roomEmit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({
        host: 'Riri',
      })
    )
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('playerLeave ends a cooperative game immediately when a player leaves', async () => {
    const leavingPlayer = { isAlive: true }
    const onGameOver = vi.fn().mockResolvedValue(undefined)
    const endGame = vi.fn(() => ({ mode: 'cooperative', winner: null }))
    mockGetGame.mockReturnValue({
      mode: 'cooperative',
      getPlayer: vi.fn(() => leavingPlayer),
      checkGameOver: vi.fn(() => ({ over: true, winner: null })),
      endGame,
      onGameOver,
    })

    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'cooperative',
          host: 'Titi',
          player_count: 1,
          players: ['Riri'],
          status: 'started',
          ready_again: [],
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'cooperative',
          host: 'Riri',
          player_count: 1,
          players: ['Riri'],
          status: 'started',
          ready_again: [],
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Riri', avatar: { eyeType: 'sad' } }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          players: ['Riri'],
          host: 'Riri',
          game_mode: 'cooperative',
          status: 'started',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Riri', avatar: { eyeType: 'sad' } }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Open', game_mode: 'classic', host: 'Riri', player_count: 1, players: ['Riri'] }],
      })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const playerLeaveHandler = socket.handlers.get('playerLeave')
    const ack = vi.fn()

    await playerLeaveHandler({ roomId: '1', username: 'Titi' }, ack)

    expect(endGame).toHaveBeenCalled()
    expect(onGameOver).toHaveBeenCalledWith({ mode: 'cooperative', winner: null })
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('movePiece enqueues inputs only for a running non-spectator game', async () => {
    const enqueueInput = vi.fn()
    mockGetGame.mockReturnValue({
      isRunning: true,
      isOver: false,
      enqueueInput,
    })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const movePieceHandler = socket.handlers.get('movePiece')
    movePieceHandler({ roomId: '1', action: 'left' })

    expect(enqueueInput).toHaveBeenCalledWith('Titi', 'left')

    socket.data.isSpectator = true
    movePieceHandler({ roomId: '1', action: 'right' })
    expect(enqueueInput).toHaveBeenCalledTimes(1)
  })

  it('solo onGameOver updates solo stats, deletes the room, and removes the game', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          host: 'Titi',
          players: ['Titi'],
          status: 'waiting',
          game_mode: 'classic',
          ready_again: [],
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Room', players: ['Titi'], host: 'Titi', game_mode: 'classic', status: 'started' }] })
      .mockResolvedValueOnce({ rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [{ username: 'Titi', avatar: { eyeType: 'happy' }, score: 42 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })

    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'solo',
      players: [{ username: 'Titi', score: 42 }],
    }
    mockCreateGame.mockReturnValue(game)

    const { io, socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')
    await startGameHandler({ roomId: '1' })

    const callbacks = game.setCallbacks.mock.calls[0][0]
    await callbacks.onGameOver({ winner: null })

    expect(io.roomEmit).toHaveBeenCalledWith('gameOver', { winner: null })
    expect(io.emit).toHaveBeenCalledWith('leaderboardSolo', [
      { rank: 1, name: 'Titi', avatar: { eyeType: 'happy' }, score: 42 },
    ])
    expect(mockRemoveGame).toHaveBeenCalledWith('1')
  })

  it('cooperative onGameOver updates coop leaderboard and finishes the room', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          host: 'Titi',
          players: ['Titi', 'Riri'],
          status: 'waiting',
          game_mode: 'cooperative',
          ready_again: [],
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Room', players: ['Titi', 'Riri'], host: 'Titi', game_mode: 'cooperative', status: 'started' }] })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Titi', avatar: { eyeType: 'happy' } },
          { username: 'Riri', avatar: { eyeType: 'sad' } },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          player_one: 'Riri',
          avatar_one: { eyeType: 'sad' },
          player_two: 'Titi',
          avatar_two: { eyeType: 'happy' },
          score: 500,
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })

    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'multi',
      mode: 'cooperative',
      statsUpdated: false,
      players: [
        { username: 'Titi' },
        { username: 'Riri' },
      ],
      getCooperativePlayer: vi.fn(() => ({ score: 500 })),
    }
    mockCreateGame.mockReturnValue(game)

    const { io, socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')
    await startGameHandler({ roomId: '1' })

    const callbacks = game.setCallbacks.mock.calls[0][0]
    await callbacks.onGameOver({
      mode: 'cooperative',
      winner: null,
      results: [{ score: 500 }, { score: 400 }],
    })

    expect(io.emit).toHaveBeenCalledWith('leaderboardCoop', [
      {
        rank: 1,
        players: [
          { name: 'Riri', avatar: { eyeType: 'sad' } },
          { name: 'Titi', avatar: { eyeType: 'happy' } },
        ],
        score: 500,
      },
    ])
    expect(mockQuery).toHaveBeenCalledWith(
      "UPDATE rooms SET status = 'finished' WHERE id = $1",
      ['1']
    )
    expect(mockRemoveGame).toHaveBeenCalledWith('1')
  })

  it('disconnect kills the live player, ends the game when needed, and refreshes rooms', async () => {
    const die = vi.fn()
    const onGameOver = vi.fn()
    mockGetGame.mockReturnValue({
      players: [{ username: 'Titi', isAlive: true, die }],
      checkGameOver: vi.fn(() => ({ over: true, winner: 'Riri' })),
      endGame: vi.fn(() => ({ roomId: '1', winner: 'Riri' })),
      onGameOver,
    })
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, name: 'Open', game_mode: 'classic', host: 'Riri', player_count: 1, players: ['Riri'] }],
    })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    socket.data.roomId = '1'

    const disconnectHandler = socket.handlers.get('disconnect')

    await disconnectHandler()

    expect(die).toHaveBeenCalled()
    expect(onGameOver).toHaveBeenCalledWith({ roomId: '1', winner: 'Riri' })
  })

  it('disconnect skips room refresh for spectators', async () => {
    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Spec'
    socket.data.isSpectator = true

    const disconnectHandler = socket.handlers.get('disconnect')
    await disconnectHandler()

    expect(mockQuery).not.toHaveBeenCalled()
  })
})
