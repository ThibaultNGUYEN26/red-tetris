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
  const roomEmit = vi.fn()
  return {
    id,
    data: {},
    handlers,
    roomEmit,
    on: vi.fn((event, handler) => {
      handlers.set(event, handler)
    }),
    emit: vi.fn(),
    to: vi.fn(() => ({ emit: roomEmit })),
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
        { id: 3, name: 'SoloRoom', game_mode: 'classic', host: 'Solo', player_count: 1, players: ['Solo'], is_listed: false },
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
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('AND is_listed = TRUE'))
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

  it('updateProfile saves through sockets and broadcasts fresh leaderboards', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, username: 'Titi', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' }, score: 42 }],
      })
      .mockResolvedValueOnce({
        rows: [{
          player_one: 'Titi',
          avatar_one: { eyeType: 'happy' },
          player_two: 'Riri',
          avatar_two: { eyeType: 'sad' },
          score: 100,
        }],
      })

    const { io, socket } = await setupConnectedSocket()
    const updateProfileHandler = socket.handlers.get('updateProfile')
    const ack = vi.fn()

    await updateProfileHandler({
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: true,
      profile: { id: 1, username: 'Titi', avatar: { eyeType: 'happy' } },
    })
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['Titi', JSON.stringify({ eyeType: 'happy' })]
    )
    expect(io.emit).toHaveBeenCalledWith('leaderboardSolo', [
      { rank: 1, name: 'Titi', avatar: { eyeType: 'happy' }, score: 42 },
    ])
    expect(io.emit).toHaveBeenCalledWith('leaderboardCoop', [
      {
        rank: 1,
        players: [
          { name: 'Titi', avatar: { eyeType: 'happy' } },
          { name: 'Riri', avatar: { eyeType: 'sad' } },
        ],
        score: 100,
      },
    ])
  })

  it('joinRoom validates required fields', async () => {
    const { socket } = await setupConnectedSocket()

    const joinRoomHandler = socket.handlers.get('joinRoom')
    const ack = vi.fn()

    await joinRoomHandler({ roomId: '', username: '' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Missing roomId or username' })
  })

  it('does not count the same socket as a duplicate username connection', async () => {
    const { socket } = await setupConnectedSocket()

    const registerHandler = socket.handlers.get('registerUser')
    const ack = vi.fn()

    registerHandler({ username: 'Titi' }, ack)

    const { isUsernameConnected } = await import('../../src/socket/index.js')
    expect(isUsernameConnected('Titi')).toBe(true)
    expect(isUsernameConnected('Titi', socket.id)).toBe(false)
    expect(isUsernameConnected('Titi', 'socket-2')).toBe(true)
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

  it('joinRoom adds a new post-game lobby joiner to ready_again', async () => {
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

  it('joinRoom does not mark an existing post-game player ready again', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'classic',
          host: 'Host',
          player_count: 2,
          players: ['Host', 'Titi'],
          status: 'waiting',
          ready_again: ['Host'],
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Host', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Room', game_mode: 'classic', host: 'Host', player_count: 2, players: ['Host', 'Titi'] }],
      })

    const { io, socket } = await setupConnectedSocket()

    const joinRoomHandler = socket.handlers.get('joinRoom')
    const ack = vi.fn()

    await joinRoomHandler({ roomId: '1', username: 'Titi' }, ack)

    expect(mockQuery).not.toHaveBeenCalledWith(
      "UPDATE rooms SET players = $2, player_count = $3, ready_again = $4 WHERE id = $1",
      expect.any(Array)
    )
    expect(io.roomEmit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({
        players: ['Host', 'Titi'],
        ready_again: ['Host'],
      })
    )
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('joinRoom allows a player in when player_count is stale but players still have room', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'cooperative',
          host: 'Riri',
          player_count: 2,
          players: ['Riri'],
          status: 'waiting',
          ready_again: [],
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
        rows: [{ id: 1, name: 'Room', game_mode: 'cooperative', host: 'Riri', player_count: 2, players: ['Riri', 'Titi'] }],
      })

    const { io, socket } = await setupConnectedSocket()

    const joinRoomHandler = socket.handlers.get('joinRoom')
    const ack = vi.fn()

    await joinRoomHandler({ roomId: '1', username: 'Titi' }, ack)

    expect(mockQuery).toHaveBeenCalledWith(
      "UPDATE rooms SET players = $2, player_count = $3, ready_again = $4 WHERE id = $1",
      ['1', ['Riri', 'Titi'], 2, []]
    )
    expect(io.roomEmit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({
        host: 'Riri',
        players: ['Riri', 'Titi'],
        player_count: 2,
      })
    )
    expect(ack).toHaveBeenCalledWith({ ok: true })
    expect(socket.emit).not.toHaveBeenCalledWith('error', { message: 'Room is full' })
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
          ready_again: ['Host'],
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
        ready_again: ['Host'],
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

  it('movePiece processes input immediately and emits changed state for responsive controls', async () => {
    const { socket } = await setupConnectedSocket()
    const authoritativeState = { roomId: '1', players: [{ username: 'Titi' }] }
    const playerState = { roomId: '1', player: { username: 'Titi', board: [['t']] } }
    const game = {
      isRunning: true,
      isOver: false,
      enqueueInput: vi.fn(),
      processQueuedInputsFor: vi.fn(),
      checkGameOver: vi.fn(() => ({ over: false })),
      serializePlayerView: vi.fn(() => playerState),
      emitState: vi.fn(({ emit }) => emit(authoritativeState)),
    }
    mockGetGame.mockReturnValue(game)
    socket.data.username = 'Titi'

    const movePieceHandler = socket.handlers.get('movePiece')
    movePieceHandler({ roomId: '1', action: 'left' })

    expect(game.enqueueInput).toHaveBeenCalledWith('Titi', 'left')
    expect(game.processQueuedInputsFor).toHaveBeenCalledWith('Titi')
    expect(game.serializePlayerView).toHaveBeenCalledWith('Titi')
    expect(game.emitState).toHaveBeenCalledWith({ emit: expect.any(Function) })
    expect(socket.emit).toHaveBeenCalledWith('playerState', playerState)
    expect(socket.emit).not.toHaveBeenCalledWith('gameState', authoritativeState)
    expect(socket.to).toHaveBeenCalledWith('1')
    expect(socket.roomEmit).toHaveBeenCalledWith('gameState', authoritativeState)
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

  it('getRoomState emits server error when the query throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { socket } = await setupConnectedSocket()
    const getRoomStateHandler = socket.handlers.get('getRoomState')

    await getRoomStateHandler({ roomId: '1' })

    expect(consoleError).toHaveBeenCalledWith('getRoomState failed:', expect.any(Error))
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Server error' })
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
      .mockResolvedValueOnce({
        rows: [],
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
    expect(io.emit).toHaveBeenCalledWith('availableRooms', [])
    expect(io.roomEmit).toHaveBeenCalledWith('gameStarted', { roomId: '1' })
  })

  it('startGame stops when the caller is not the host', async () => {
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
    expect(socket.emit).not.toHaveBeenCalledWith('gameStarted', expect.anything())
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
      .mockResolvedValueOnce({
        rows: [],
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

  it('startGame refuses multiplayer restart until enough players clicked play again', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        host: 'Titi',
        players: ['Titi', 'Riri'],
        status: 'waiting',
        game_mode: 'classic',
        ready_again: ['Titi'],
        is_listed: true,
      }],
    })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')
    await startGameHandler({ roomId: '1' })

    expect(mockCreateGame).not.toHaveBeenCalled()
    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'This room requires between 2 and 6 players to start.',
    })
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

  it('startGame returns early for invalid payload ids', async () => {
    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')
    await startGameHandler({ roomId: 'abc' })

    expect(mockQuery).not.toHaveBeenCalled()
    expect(mockCreateGame).not.toHaveBeenCalled()
  })

  it('onTick callback emits gameState to the room', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ host: 'Titi', players: ['Titi'], status: 'waiting', game_mode: 'classic', ready_again: [], is_listed: false }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Room', players: ['Titi'], host: 'Titi', game_mode: 'classic', status: 'started' }] })
      .mockResolvedValueOnce({ rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }] })
      .mockResolvedValueOnce({ rows: [] })

    const game = { setCallbacks: vi.fn(), start: vi.fn(), mode_player: 'solo', players: [{ username: 'Titi', score: 1 }] }
    mockCreateGame.mockReturnValue(game)

    const { io, socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')
    await startGameHandler({ roomId: '1' })

    const callbacks = game.setCallbacks.mock.calls[0][0]
    callbacks.onTick({ tick: 1 })

    expect(io.roomEmit).toHaveBeenCalledWith('gameState', { tick: 1 })
  })

  it('onGameOver callback catches and logs handling failures', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ host: 'Titi', players: ['Titi', 'Riri'], status: 'waiting', game_mode: 'classic', ready_again: [] }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Room', players: ['Titi', 'Riri'], host: 'Titi', game_mode: 'classic', status: 'started' }] })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Titi', avatar: { eyeType: 'happy' } },
          { username: 'Riri', avatar: { eyeType: 'sad' } },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('stats failed'))

    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'multi',
      mode: 'classic',
      statsUpdated: false,
      players: [{ username: 'Titi' }, { username: 'Riri' }],
    }
    mockCreateGame.mockReturnValue(game)

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const startGameHandler = socket.handlers.get('startGame')
    await startGameHandler({ roomId: '1' })

    const callbacks = game.setCallbacks.mock.calls[0][0]
    await callbacks.onGameOver({ mode: 'classic', winner: 'Titi', results: [{ username: 'Titi' }, { username: 'Riri' }] })

    expect(consoleError).toHaveBeenCalledWith('Game over handling failed:', expect.any(Error))
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
        players: ['Riri'],
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
      processQueuedInputsFor: vi.fn(),
      checkGameOver: vi.fn(() => ({ over: false })),
      emitState: vi.fn(),
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

  it('movePiece drops excessive input bursts before enqueueing', async () => {
    const enqueueInput = vi.fn()
    mockGetGame.mockReturnValue({
      isRunning: true,
      isOver: false,
      enqueueInput,
      processQueuedInputsFor: vi.fn(),
      checkGameOver: vi.fn(() => ({ over: false })),
      serializePlayerView: vi.fn(() => null),
      emitState: vi.fn(),
    })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const movePieceHandler = socket.handlers.get('movePiece')
    for (let index = 0; index < 35; index += 1) {
      movePieceHandler({ roomId: '1', action: 'left' })
    }

    expect(enqueueInput).toHaveBeenCalledTimes(30)
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
          is_listed: false,
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Room', players: ['Titi'], host: 'Titi', game_mode: 'classic', status: 'started' }] })
      .mockResolvedValueOnce({ rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }] })
      .mockResolvedValueOnce({ rows: [] })
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
      .mockResolvedValueOnce({ rows: [] })
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

  it('disconnect removes the disconnected host from the room, promotes the next host, and ends the game when needed', async () => {
    const die = vi.fn()
    const onGameOver = vi.fn()
    mockGetGame.mockReturnValue({
      players: [{ username: 'Titi', isAlive: true, die }],
      checkGameOver: vi.fn(() => ({ over: true, winner: 'Riri' })),
      endGame: vi.fn(() => ({ roomId: '1', winner: 'Riri' })),
      onGameOver,
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
        rows: [{ id: 2, name: 'Open', game_mode: 'classic', host: 'Riri', player_count: 1, players: ['Riri'] }],
      })

    const { io, socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    socket.data.roomId = '1'

    const disconnectHandler = socket.handlers.get('disconnect')

    await disconnectHandler()

    expect(die).toHaveBeenCalled()
    expect(onGameOver).toHaveBeenCalledWith({ roomId: '1', winner: 'Riri' })
    expect(io.roomEmit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({
        host: 'Riri',
        players: ['Riri'],
        player_avatars: { Riri: { eyeType: 'sad' } },
      })
    )
  })

  it('disconnect skips room refresh for spectators', async () => {
    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Spec'
    socket.data.isSpectator = true

    const disconnectHandler = socket.handlers.get('disconnect')
    await disconnectHandler()

    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('playerLeave handles removePlayerFromRoom errors and still acknowledges', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetGame.mockReturnValue(null)
    mockQuery.mockRejectedValueOnce(new Error('remove failed'))

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const playerLeaveHandler = socket.handlers.get('playerLeave')
    const ack = vi.fn()
    await playerLeaveHandler({ roomId: '1', username: 'Titi' }, ack)

    expect(consoleError).toHaveBeenCalledWith('removePlayerFromRoom failed:', expect.any(Error))
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('playerLeave deletes room when last player leaves and no ready_again remains', async () => {
    mockGetGame.mockReturnValue(null)
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'classic',
          host: 'Titi',
          player_count: 1,
          players: ['Titi'],
          status: 'waiting',
          ready_again: [],
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    const { io, socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    const playerLeaveHandler = socket.handlers.get('playerLeave')
    const ack = vi.fn()
    await playerLeaveHandler({ roomId: '1', username: 'Titi' }, ack)

    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM rooms WHERE id = $1', [1])
    expect(io.emit).toHaveBeenCalledWith('availableRooms', [])
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('playAgain catches errors from the db path', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { socket } = await setupConnectedSocket()
    const playAgainHandler = socket.handlers.get('playAgain')
    await playAgainHandler({ roomId: '1', username: 'Titi' })

    expect(consoleError).toHaveBeenCalledWith('playAgain failed:', expect.any(Error))
  })

  it('disconnect broadcasts available rooms when no room update happened', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const { io, socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    socket.data.roomId = null

    const disconnectHandler = socket.handlers.get('disconnect')
    await disconnectHandler()

    expect(io.emit).toHaveBeenCalledWith('availableRooms', [])
  })

  it('registerUser rejects duplicate active usernames from another socket', async () => {
    const io = createIo()
    const firstSocket = createSocket('socket-1')
    const secondSocket = createSocket('socket-2')
    const { default: setupSockets } = await import('../../src/socket/index.js')

    setupSockets(io)
    const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
    connectionHandler(firstSocket)
    connectionHandler(secondSocket)

    const ack1 = vi.fn()
    firstSocket.handlers.get('registerUser')({ username: 'Titi' }, ack1)
    expect(ack1).toHaveBeenCalledWith({ ok: true })

    const ack2 = vi.fn()
    secondSocket.handlers.get('registerUser')({ username: 'Titi' }, ack2)
    expect(ack2).toHaveBeenCalledWith({ ok: false, error: 'Username already connected' })
    expect(secondSocket.emit).toHaveBeenCalledWith('usernameTaken', { username: 'Titi' })
  })

  it('registerUser reclaims a username from a stale socket registry entry', async () => {
    const io = createIo()
    const firstSocket = createSocket('socket-1')
    const secondSocket = createSocket('socket-2')
    secondSocket.nsp = {
      sockets: new Map([['socket-2', secondSocket]]),
    }
    const { default: setupSockets, isUsernameConnected } = await import('../../src/socket/index.js')

    setupSockets(io)
    const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
    connectionHandler(firstSocket)
    connectionHandler(secondSocket)

    const ack1 = vi.fn()
    firstSocket.handlers.get('registerUser')({ username: 'Titi' }, ack1)
    expect(ack1).toHaveBeenCalledWith({ ok: true })

    const ack2 = vi.fn()
    secondSocket.handlers.get('registerUser')({ username: 'Titi' }, ack2)

    expect(ack2).toHaveBeenCalledWith({ ok: true })
    expect(isUsernameConnected('Titi', 'socket-2')).toBe(false)
    expect(isUsernameConnected('Titi', 'socket-1')).toBe(true)
  })

  it('unregisterUser acknowledges and clears connectivity state', async () => {
    const { socket } = await setupConnectedSocket()
    const registerAck = vi.fn()
    socket.handlers.get('registerUser')({ username: 'Titi' }, registerAck)

    const { isUsernameConnected } = await import('../../src/socket/index.js')
    expect(isUsernameConnected('Titi')).toBe(true)

    const unregisterAck = vi.fn()
    socket.handlers.get('unregisterUser')({ username: 'Titi' }, unregisterAck)

    expect(unregisterAck).toHaveBeenCalledWith({ ok: true })
    expect(isUsernameConnected('Titi')).toBe(false)
    expect(isUsernameConnected('')).toBe(false)
  })

  it('joinRoom handles room-not-found, started-room, full-room, and catch branches', async () => {
    const { socket } = await setupConnectedSocket()
    const joinRoomHandler = socket.handlers.get('joinRoom')

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    let ack = vi.fn()
    await joinRoomHandler({ roomId: '1', username: 'Titi' }, ack)
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Room not found' })

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, game_mode: 'classic', players: ['Host'], status: 'started', ready_again: [] }],
    })
    ack = vi.fn()
    await joinRoomHandler({ roomId: '1', username: 'Titi' }, ack)
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Game already started' })

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, game_mode: 'cooperative', players: ['A', 'B'], status: 'waiting', ready_again: [] }],
    })
    ack = vi.fn()
    await joinRoomHandler({ roomId: '1', username: 'Titi' }, ack)
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Room is full' })

    mockQuery.mockRejectedValueOnce(new Error('db down'))
    ack = vi.fn()
    await joinRoomHandler({ roomId: '1', username: 'Titi' }, ack)
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Server error' })
  })

  it('joinSpectator handles validation, registration failure, and room-state fallback', async () => {
    const { socket } = await setupConnectedSocket()
    const joinSpectatorHandler = socket.handlers.get('joinSpectator')

    let ack = vi.fn()
    await joinSpectatorHandler({ roomId: '', username: '' }, ack)
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Missing roomId or username' })

    ack = vi.fn()
    await joinSpectatorHandler({ roomId: '1', username: 'bad name' }, ack)
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Invalid username' })

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    ack = vi.fn()
    await joinSpectatorHandler({ roomId: '1', username: 'Titi' }, ack)
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Room not found' })

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Room', players: ['Host'], status: 'waiting' }] })
    mockGetGame.mockReturnValueOnce(null)
    ack = vi.fn()
    await joinSpectatorHandler({ roomId: '1', username: 'Spectator' }, ack)
    expect(socket.emit).toHaveBeenCalledWith('roomState', expect.objectContaining({ id: 1 }))
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('pauseGame returns early for invalid payload and non-solo/non-running games', async () => {
    const pause = vi.fn()
    const resume = vi.fn()
    const { socket } = await setupConnectedSocket()
    const pauseHandler = socket.handlers.get('pauseGame')

    pauseHandler({ roomId: '', paused: true })

    mockGetGame.mockReturnValue({ isOver: true, mode_player: 'solo', pause, resume })
    pauseHandler({ roomId: '1', paused: true })

    mockGetGame.mockReturnValue({ isOver: false, mode_player: 'multi', pause, resume })
    pauseHandler({ roomId: '1', paused: false })

    expect(pause).not.toHaveBeenCalled()
    expect(resume).not.toHaveBeenCalled()
  })

  it('getAvailableRooms handler broadcasts current rooms', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { io, socket } = await setupConnectedSocket()
    const getAvailableRoomsHandler = socket.handlers.get('getAvailableRooms')

    await getAvailableRoomsHandler()

    expect(io.emit).toHaveBeenCalledWith('availableRooms', [])
  })

  it('getRoomState handles room-not-found and started-room-without-game paths', async () => {
    const { socket } = await setupConnectedSocket()
    const getRoomStateHandler = socket.handlers.get('getRoomState')

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    await getRoomStateHandler({ roomId: '1' })
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Room not found' })

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, name: 'Room', game_mode: 'classic', host: 'Host', player_count: 2, players: ['Host'], status: 'started' }],
    })
    mockQuery.mockResolvedValueOnce({ rows: [{ username: 'Host', avatar: { eyeType: 'happy' } }] })
    mockGetGame.mockReturnValueOnce(null)
    await getRoomStateHandler({ roomId: '1' })

    expect(socket.emit).not.toHaveBeenCalledWith('gameStarted', { roomId: '1' })
  })

  it('startGame returns early for missing username, missing room, and started rooms', async () => {
    const { socket } = await setupConnectedSocket()
    const startGameHandler = socket.handlers.get('startGame')

    socket.data.username = null
    await startGameHandler({ roomId: '1' })
    expect(mockQuery).not.toHaveBeenCalled()

    socket.data.username = 'Titi'
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    await startGameHandler({ roomId: '1' })
    expect(mockCreateGame).not.toHaveBeenCalled()

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ host: 'Titi', players: ['Titi'], status: 'started', game_mode: 'classic', ready_again: [] }],
    })
    await startGameHandler({ roomId: '1' })
    expect(mockCreateGame).not.toHaveBeenCalled()
  })

  it('playAgain returns early for invalid payload and missing room rows', async () => {
    const { socket } = await setupConnectedSocket()
    const playAgainHandler = socket.handlers.get('playAgain')

    await playAgainHandler({ roomId: '', username: 'Titi' })
    await playAgainHandler({ roomId: 'abc', username: 'Titi' })

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    await playAgainHandler({ roomId: '1', username: 'Titi' })

    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('movePiece returns early when no running game exists', async () => {
    mockGetGame.mockReturnValueOnce(null)
    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    const movePieceHandler = socket.handlers.get('movePiece')

    expect(() => movePieceHandler({ roomId: '1', action: 'left' })).not.toThrow()

    const enqueueInput = vi.fn()
    mockGetGame.mockReturnValueOnce({ isRunning: false, isOver: false, enqueueInput })
    movePieceHandler({ roomId: '1', action: 'left' })
    expect(enqueueInput).not.toHaveBeenCalled()
  })
})
