import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockQuery,
  mockCreateGame,
  mockGetGame,
  mockRemoveGame,
  mockBcryptCompare,
} = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockCreateGame: vi.fn(),
  mockGetGame: vi.fn(),
  mockRemoveGame: vi.fn(),
  mockBcryptCompare: vi.fn(async (password, hash) => password === hash),
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

vi.mock('bcryptjs', () => ({
  default: {
    compare: mockBcryptCompare,
  },
  compare: mockBcryptCompare,
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
    vi.useRealTimers()
    delete process.env.RECONNECT_GRACE_MS
    delete process.env.GAME_OVER_REVEAL_MS
    delete process.env.DISABLE_AUTH_TEST_FALLBACK
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
        maxPlayers: 8,
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

  it('enterMenu clears active presence and socket room state when no rooms contain the user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { socket } = await setupConnectedSocket()
    const { isUsernameConnected } = await import('../../src/socket/index.js')

    socket.handlers.get('registerUser')({ username: 'Titi' }, vi.fn())
    expect(isUsernameConnected('Titi')).toBe(true)

    socket.data.roomId = '1'
    socket.data.isSpectator = true
    const ack = vi.fn()

    await socket.handlers.get('enterMenu')({ username: 'Titi' }, ack)

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE players @> ARRAY[$1]::text[]'), ['Titi'])
    expect(socket.data.roomId).toBeNull()
    expect(socket.data.isSpectator).toBe(false)
    expect(isUsernameConnected('Titi')).toBe(false)
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('isUsernameConnected removes stale disconnected sockets from active presence', async () => {
    const { socket } = await setupConnectedSocket()
    const { isUsernameConnected, getActiveUserCount } = await import('../../src/socket/index.js')

    socket.handlers.get('registerUser')({ username: 'Titi' }, vi.fn())
    socket.connected = false

    expect(isUsernameConnected('Titi')).toBe(false)
    expect(getActiveUserCount()).toBe(0)
  })

  it('enterMenu removes the player from started rooms and ends the game when needed', async () => {
    const leavingPlayer = { isAlive: true }
    const summary = { mode: 'classic', winner: 'Riri' }
    const endGame = vi.fn(() => summary)
    const onGameOver = vi.fn().mockResolvedValue(undefined)
    mockGetGame.mockReturnValue({
      getPlayer: vi.fn(() => leavingPlayer),
      checkGameOver: vi.fn(() => ({ over: true, winner: 'Riri' })),
      endGame,
      onGameOver,
    })
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          players: ['Titi', 'Riri'],
          ready_again: [],
          status: 'started',
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'classic',
          host: 'Titi',
          player_count: 2,
          players: ['Titi', 'Riri'],
          status: 'started',
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
          status: 'started',
          ready_again: [],
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Riri', avatar: { eyeType: 'sad' } }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 2, name: 'Open', game_mode: 'classic', host: 'Lulu', player_count: 1, players: ['Lulu'] }],
      })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    socket.data.roomId = '1'
    const ack = vi.fn()

    await socket.handlers.get('enterMenu')({ username: 'Titi' }, ack)

    expect(leavingPlayer.isAlive).toBe(false)
    expect(endGame).toHaveBeenCalled()
    expect(onGameOver).toHaveBeenCalledWith(summary)
    expect(socket.leave).toHaveBeenCalledWith('1')
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('enterMenu acknowledges authentication failures before leaving rooms', async () => {
    process.env.DISABLE_AUTH_TEST_FALLBACK = 'true'
    const { socket } = await setupConnectedSocket()
    const ack = vi.fn()

    await socket.handlers.get('enterMenu')({ username: 'Titi' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Authentication required' })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('enterMenu reports server errors when room cleanup fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))
    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    const ack = vi.fn()

    await socket.handlers.get('enterMenu')({ username: 'Titi' }, ack)

    expect(consoleError).toHaveBeenCalledWith('enterMenu failed:', expect.any(Error))
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Server error' })
    consoleError.mockRestore()
  })

  it('enterMenu handles room cleanup branches without an acknowledgement callback', async () => {
    const noGameRoom = { id: 2, players: ['Titi'], ready_again: [], status: 'started' }
    const missingPlayerGame = { getPlayer: vi.fn(() => null) }
    const noGameOverMethods = { getPlayer: vi.fn(() => ({ isAlive: true })) }
    const nonFinalGame = {
      getPlayer: vi.fn(() => ({ isAlive: true })),
      checkGameOver: vi.fn(() => ({ over: false })),
      endGame: vi.fn(),
      onGameOver: vi.fn(),
    }
    mockGetGame
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(missingPlayerGame)
      .mockReturnValueOnce(noGameOverMethods)
      .mockReturnValueOnce(nonFinalGame)
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { id: 1, players: ['Titi'], ready_again: [], status: 'waiting' },
          noGameRoom,
          { id: 3, players: ['Titi'], ready_again: [], status: 'started' },
          { id: 4, players: ['Titi'], ready_again: [], status: 'started' },
          { id: 5, players: ['Titi'], ready_again: [], status: 'started' },
        ],
      })
      .mockResolvedValue({ rowCount: 0, rows: [] })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await expect(socket.handlers.get('enterMenu')({ username: 'Titi' })).resolves.toBeUndefined()

    expect(socket.leave).toHaveBeenCalledWith('1')
    expect(socket.leave).toHaveBeenCalledWith('2')
    expect(socket.leave).toHaveBeenCalledWith('3')
    expect(socket.leave).toHaveBeenCalledWith('4')
    expect(socket.leave).toHaveBeenCalledWith('5')
    expect(missingPlayerGame.getPlayer).toHaveBeenCalledWith('Titi')
    expect(nonFinalGame.endGame).not.toHaveBeenCalled()
  })

  it('enterMenu tolerates cleanup queries that omit rows', async () => {
    mockQuery.mockResolvedValueOnce({})
    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await expect(socket.handlers.get('enterMenu')({ username: 'Titi' })).resolves.toBeUndefined()

    expect(socket.leave).not.toHaveBeenCalled()
  })

  it('enterMenu returns authentication failures without an acknowledgement callback', async () => {
    process.env.DISABLE_AUTH_TEST_FALLBACK = 'true'
    const { socket } = await setupConnectedSocket()

    await expect(socket.handlers.get('enterMenu')({ username: 'Titi' })).resolves.toBeUndefined()

    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('enterMenu logs server errors without an acknowledgement callback', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))
    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await expect(socket.handlers.get('enterMenu')({ username: 'Titi' })).resolves.toBeUndefined()

    expect(consoleError).toHaveBeenCalledWith('enterMenu failed:', expect.any(Error))
    consoleError.mockRestore()
  })

  it('registerUser rejects an invalid username', async () => {
    const { socket } = await setupConnectedSocket()

    const registerHandler = socket.handlers.get('registerUser')
    const ack = vi.fn()

    registerHandler({ username: 'Bad Name' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Invalid username' })
    expect(socket.emit).toHaveBeenCalledWith('usernameTaken', { username: 'Bad Name' })
  })

  it('registerUser and unregisterUser work without acknowledgement callbacks', async () => {
    const io = createIo()
    const firstSocket = createSocket('socket-1')
    const secondSocket = createSocket('socket-2')
    const { default: setupSockets, isUsernameConnected } = await import('../../src/socket/index.js')

    setupSockets(io)
    const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
    connectionHandler(firstSocket)
    connectionHandler(secondSocket)

    firstSocket.handlers.get('registerUser')({ username: 'Titi' })
    expect(isUsernameConnected('Titi')).toBe(true)

    secondSocket.handlers.get('registerUser')({ username: '' })
    expect(secondSocket.emit).toHaveBeenCalledWith('usernameTaken', { username: '' })

    secondSocket.handlers.get('registerUser')({ username: 'Titi' })
    expect(secondSocket.emit).toHaveBeenCalledWith('usernameTaken', { username: 'Titi' })

    firstSocket.handlers.get('unregisterUser')({ username: 'Titi' })
    expect(isUsernameConnected('Titi')).toBe(false)

    expect(() => firstSocket.handlers.get('unregisterUser')({})).not.toThrow()
  })

  it('unregisterUser acknowledges successful unregisters', async () => {
    const { socket } = await setupConnectedSocket()
    const ack = vi.fn()

    socket.handlers.get('registerUser')({ username: 'Titi' }, vi.fn())
    socket.handlers.get('unregisterUser')({ username: 'Titi' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: true })
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

  it('updateProfile retries after syncing the users id sequence on primary-key conflicts', async () => {
    mockQuery
      .mockRejectedValueOnce({ code: '23505', constraint: 'users_pkey' })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, username: 'Titi', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    const { socket } = await setupConnectedSocket()
    const updateProfileHandler = socket.handlers.get('updateProfile')
    const ack = vi.fn()

    await updateProfileHandler({
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    }, ack)

    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT setval'))
    expect(ack).toHaveBeenCalledWith({
      ok: true,
      profile: { id: 1, username: 'Titi', avatar: { eyeType: 'happy' } },
    })
  })

  it('updateProfile reports soft-deleted accounts and unexpected failures', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { socket } = await setupConnectedSocket()
    const updateProfileHandler = socket.handlers.get('updateProfile')

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    let ack = vi.fn()
    await updateProfileHandler({
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    }, ack)
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Account scheduled for deletion' })

    mockQuery.mockRejectedValueOnce(new Error('db down'))
    ack = vi.fn()
    await updateProfileHandler({
      username: 'Riri',
      avatar: { eyeType: 'sad' },
    }, ack)
    expect(consoleError).toHaveBeenCalledWith('updateProfile failed:', expect.any(Error))
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Server error' })
    consoleError.mockRestore()
  })

  it('updateProfile handles unexpected failures without an acknowledgement callback', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { socket } = await setupConnectedSocket()

    mockQuery.mockRejectedValueOnce(new Error('db down'))

    await expect(socket.handlers.get('updateProfile')({
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    })).resolves.toBeUndefined()

    expect(consoleError).toHaveBeenCalledWith('updateProfile failed:', expect.any(Error))
    consoleError.mockRestore()
  })

  it('updateProfile handles validation failures without acknowledgement callbacks', async () => {
    const io = createIo()
    const firstSocket = createSocket('socket-1')
    const secondSocket = createSocket('socket-2')
    const { default: setupSockets } = await import('../../src/socket/index.js')

    setupSockets(io)
    const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
    connectionHandler(firstSocket)
    connectionHandler(secondSocket)

    process.env.DISABLE_AUTH_TEST_FALLBACK = 'true'
    await expect(secondSocket.handlers.get('updateProfile')({
      username: 'BadUser',
      avatar: { eyeType: 'happy' },
    })).resolves.toBeUndefined()

    process.env.DISABLE_AUTH_TEST_FALLBACK = 'false'
    await expect(secondSocket.handlers.get('updateProfile')({
      username: 'Titi',
    })).resolves.toBeUndefined()

    firstSocket.handlers.get('registerUser')({ username: 'Titi' }, vi.fn())
    await expect(secondSocket.handlers.get('updateProfile')({
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    })).resolves.toBeUndefined()

    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('updateProfile handles soft-deleted and duplicate-register paths without acknowledgement callbacks', async () => {
    const io = createIo()
    const firstSocket = createSocket('socket-1')
    const secondSocket = createSocket('socket-2')
    const { default: setupSockets } = await import('../../src/socket/index.js')

    setupSockets(io)
    const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
    connectionHandler(firstSocket)
    connectionHandler(secondSocket)

    mockQuery.mockResolvedValueOnce({ rows: [] })
    await expect(firstSocket.handlers.get('updateProfile')({
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    })).resolves.toBeUndefined()

    mockQuery.mockResolvedValueOnce({})
    await expect(firstSocket.handlers.get('updateProfile')({
      username: 'Riri',
      avatar: { eyeType: 'sad' },
    })).resolves.toBeUndefined()

    mockQuery.mockImplementationOnce(async () => {
      firstSocket.handlers.get('registerUser')({ username: 'Titi' }, vi.fn())
      return {
        rowCount: 1,
        rows: [{ id: 1, username: 'Titi', avatar: { eyeType: 'happy' } }],
      }
    })
    await expect(secondSocket.handlers.get('updateProfile')({
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    })).resolves.toBeUndefined()
  })

  it('updateProfile succeeds without an acknowledgement callback', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, username: 'Titi', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    const { io, socket } = await setupConnectedSocket()

    await expect(socket.handlers.get('updateProfile')({
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    })).resolves.toBeUndefined()

    expect(io.emit).toHaveBeenCalledWith('leaderboardSolo', [])
    expect(io.emit).toHaveBeenCalledWith('leaderboardCoop', [])
  })

  it('updateProfile validates usernames before saving', async () => {
    const io = createIo()
    const firstSocket = createSocket('socket-1')
    const secondSocket = createSocket('socket-2')
    const { default: setupSockets } = await import('../../src/socket/index.js')

    setupSockets(io)
    const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
    connectionHandler(firstSocket)
    connectionHandler(secondSocket)

    let ack = vi.fn()
    await secondSocket.handlers.get('updateProfile')({
      username: 'Bad Name',
      avatar: { eyeType: 'happy' },
    }, ack)
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Invalid username' })

    firstSocket.handlers.get('registerUser')({ username: 'Titi' }, vi.fn())

    ack = vi.fn()
    await secondSocket.handlers.get('updateProfile')({
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    }, ack)
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Username already connected' })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('updateProfile rejects missing profile data before saving', async () => {
    const { socket } = await setupConnectedSocket()
    const updateProfileHandler = socket.handlers.get('updateProfile')
    const ack = vi.fn()

    await updateProfileHandler({ username: 'Titi' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Missing data' })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('updateProfile reports duplicate registration if the username is claimed during save', async () => {
    const io = createIo()
    const firstSocket = createSocket('socket-1')
    const secondSocket = createSocket('socket-2')
    const { default: setupSockets } = await import('../../src/socket/index.js')

    setupSockets(io)
    const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
    connectionHandler(firstSocket)
    connectionHandler(secondSocket)

    mockQuery.mockImplementationOnce(async () => {
      firstSocket.handlers.get('registerUser')({ username: 'Titi' }, vi.fn())
      return {
        rowCount: 1,
        rows: [{ id: 1, username: 'Titi', avatar: { eyeType: 'happy' } }],
      }
    })

    const ack = vi.fn()
    await secondSocket.handlers.get('updateProfile')({
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Username already connected' })
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
      .mockResolvedValueOnce({ rows: [] })
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
    socket.data.roomId = '3'

    const playerLeaveHandler = socket.handlers.get('playerLeave')
    const ack = vi.fn()

    await playerLeaveHandler({ roomId: '3', username: 'Spec' }, ack)

    expect(socket.leave).toHaveBeenCalledWith('3')
    expect(socket.data.roomId).toBeNull()
    expect(socket.data.isSpectator).toBe(false)
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
      message: 'This room requires between 2 and 8 players to start.',
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

  it('onGameOver callback emits final gameState before gameOver', async () => {
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
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })

    const finalState = { roomId: '1', players: [{ username: 'Riri', board: [['black']] }] }
    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'multi',
      mode: 'classic',
      statsUpdated: true,
      players: [{ username: 'Titi' }, { username: 'Riri' }],
      emitState: vi.fn(({ emit }) => {
        emit(finalState)
        return true
      }),
    }
    mockCreateGame.mockReturnValue(game)

    const { io, socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await socket.handlers.get('startGame')({ roomId: '1' })

    const callbacks = game.setCallbacks.mock.calls[0][0]
    io.roomEmit.mockClear()
    await callbacks.onGameOver({ mode: 'classic', winner: 'Titi', results: [] })

    expect(game.emitState).toHaveBeenCalledWith({ force: true, emit: expect.any(Function) })
    expect(io.roomEmit).toHaveBeenCalledWith('gameState', finalState)
    expect(io.roomEmit).toHaveBeenCalledWith('gameOver', { winner: 'Titi' })

    const gameStateIndex = io.roomEmit.mock.calls.findIndex(([event]) => event === 'gameState')
    const gameOverIndex = io.roomEmit.mock.calls.findIndex(([event]) => event === 'gameOver')
    expect(io.roomEmit.mock.invocationCallOrder[gameStateIndex]).toBeLessThan(
      io.roomEmit.mock.invocationCallOrder[gameOverIndex]
    )
  })

  it('onGameOver callback falls back to serialize when final state emitState is unavailable', async () => {
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
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })

    const finalState = { roomId: '1', players: [{ username: 'Riri', board: [['black']] }] }
    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'multi',
      mode: 'classic',
      statsUpdated: true,
      players: [{ username: 'Titi' }, { username: 'Riri' }],
      serialize: vi.fn(() => finalState),
    }
    mockCreateGame.mockReturnValue(game)

    const { io, socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await socket.handlers.get('startGame')({ roomId: '1' })

    const callbacks = game.setCallbacks.mock.calls[0][0]
    io.roomEmit.mockClear()
    await callbacks.onGameOver({ mode: 'classic', winner: 'Titi', results: [] })

    expect(game.serialize).toHaveBeenCalled()
    expect(io.roomEmit).toHaveBeenCalledWith('gameState', finalState)
    expect(io.roomEmit).toHaveBeenCalledWith('gameOver', { winner: 'Titi' })
  })

  it('onGameOver callback waits for the configured reveal delay before gameOver', async () => {
    vi.useFakeTimers()
    process.env.GAME_OVER_REVEAL_MS = '25'
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
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })

    const finalState = { roomId: '1', players: [] }
    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'multi',
      mode: 'classic',
      statsUpdated: true,
      players: [{ username: 'Titi' }, { username: 'Riri' }],
      emitState: vi.fn(({ emit }) => {
        emit(finalState)
        return true
      }),
    }
    mockCreateGame.mockReturnValue(game)

    const { io, socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    await socket.handlers.get('startGame')({ roomId: '1' })

    const callbacks = game.setCallbacks.mock.calls[0][0]
    io.roomEmit.mockClear()
    const done = callbacks.onGameOver({ mode: 'classic', winner: 'Titi', results: [] })
    await Promise.resolve()

    expect(io.roomEmit).toHaveBeenCalledWith('gameState', finalState)
    expect(io.roomEmit).not.toHaveBeenCalledWith('gameOver', expect.any(Object))

    await vi.advanceTimersByTimeAsync(25)
    await done

    expect(io.roomEmit).toHaveBeenCalledWith('gameOver', { winner: 'Titi' })
  })

  it('onGameOver callback uses the production reveal delay by default', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    vi.useFakeTimers()
    try {
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
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })

      const finalState = { roomId: '1', players: [] }
      const game = {
        setCallbacks: vi.fn(),
        start: vi.fn(),
        mode_player: 'multi',
        mode: 'classic',
        statsUpdated: true,
        players: [{ username: 'Titi' }, { username: 'Riri' }],
        emitState: vi.fn(({ emit }) => {
          emit(finalState)
          return true
        }),
      }
      mockCreateGame.mockReturnValue(game)

      const { io, socket } = await setupConnectedSocket()
      socket.data.username = 'Titi'
      await socket.handlers.get('startGame')({ roomId: '1' })

      const callbacks = game.setCallbacks.mock.calls[0][0]
      io.roomEmit.mockClear()
      const done = callbacks.onGameOver({ mode: 'classic', winner: 'Titi', results: [] })
      await Promise.resolve()

      expect(io.roomEmit).toHaveBeenCalledWith('gameState', finalState)
      expect(io.roomEmit).not.toHaveBeenCalledWith('gameOver', expect.any(Object))

      await vi.advanceTimersByTimeAsync(799)
      await Promise.resolve()
      expect(io.roomEmit).not.toHaveBeenCalledWith('gameOver', expect.any(Object))

      await vi.advanceTimersByTimeAsync(1)
      await done

      expect(io.roomEmit).toHaveBeenCalledWith('gameOver', { winner: 'Titi' })
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = originalNodeEnv
    }
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

  it('solo onGameOver retries score insert after syncing the solo score id sequence', async () => {
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
      .mockRejectedValueOnce({ code: '23505', constraint: 'solo_scores_pkey' })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' }, score: 42 }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })

    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'solo',
      players: [{ username: 'Titi', score: 42, lines: 4, level: 2, tetrisCount: 1 }],
    }
    mockCreateGame.mockReturnValue(game)

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await socket.handlers.get('startGame')({ roomId: '1' })
    const callbacks = game.setCallbacks.mock.calls[0][0]
    await callbacks.onGameOver({ winner: null })

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('solo_scores_id_seq'))
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO solo_scores'),
      ['Titi', 42, 4, 2, 1, 0]
    )
  })

  it('solo onGameOver skips score insertion when the user stats row is missing', async () => {
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
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })

    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'solo',
      players: [{ username: 'Titi', score: 42 }],
    }
    mockCreateGame.mockReturnValue(game)

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await socket.handlers.get('startGame')({ roomId: '1' })
    const callbacks = game.setCallbacks.mock.calls[0][0]
    await callbacks.onGameOver({ winner: null })

    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO solo_scores'), expect.any(Array))
    expect(mockRemoveGame).toHaveBeenCalledWith('1')
  })

  it('solo onGameOver tolerates games without a player record', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          host: 'Solo',
          players: ['Solo'],
          status: 'waiting',
          game_mode: 'classic',
          ready_again: [],
          is_listed: false,
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Solo', players: ['Solo'], host: 'Solo', game_mode: 'classic', status: 'started' }] })
      .mockResolvedValueOnce({ rows: [{ username: 'Solo', avatar: { eyeType: 'happy' } }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rowCount: 1, rows: [] })

    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'solo',
      mode: 'classic',
      players: [],
    }
    mockCreateGame.mockReturnValue(game)

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Solo'

    await socket.handlers.get('startGame')({ roomId: '1' })
    const callbacks = game.setCallbacks.mock.calls[0][0]
    await callbacks.onGameOver({ winner: null })

    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO solo_scores'), expect.any(Array))
    expect(mockRemoveGame).toHaveBeenCalledWith('1')
  })

  it('solo onGameOver logs non-retryable solo score insert errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
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
      .mockRejectedValueOnce(new Error('insert failed'))

    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'solo',
      players: [{ username: 'Titi', score: 42 }],
    }
    mockCreateGame.mockReturnValue(game)

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await socket.handlers.get('startGame')({ roomId: '1' })
    const callbacks = game.setCallbacks.mock.calls[0][0]
    await callbacks.onGameOver({ winner: null })

    expect(consoleError).toHaveBeenCalledWith('Game over handling failed:', expect.any(Error))
  })

  it('classic multiplayer onGameOver stores per-player match stats', async () => {
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
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Room', players: ['Titi', 'Riri'], host: 'Titi', game_mode: 'classic', status: 'started' }] })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Titi', avatar: { eyeType: 'happy' } },
          { username: 'Riri', avatar: { eyeType: 'sad' } },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rowCount: 1, rows: [] })

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

    await socket.handlers.get('startGame')({ roomId: '1' })
    const callbacks = game.setCallbacks.mock.calls[0][0]
    await callbacks.onGameOver({
      mode: 'classic',
      winner: 'Titi',
      durationSeconds: 90,
      results: [
        { username: 'Titi', score: 100, lines: 10, level: 3, tetrisCount: 2, linesSent: 4 },
        { username: 'Riri', score: 50, lines: 5, level: 2, tetrisCount: 1, linesSent: 0 },
      ],
    })

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO multiplayer_scores'),
      ['Titi', 100, 10, 3, 2, 4, 90, true, 'classic']
    )
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO multiplayer_scores'),
      ['Riri', 50, 5, 2, 1, 0, 90, false, 'classic']
    )
    expect(game.statsUpdated).toBe(true)
  })

  it('classic multiplayer onGameOver skips nameless results and stores default stat values', async () => {
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
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Room', players: ['Titi', 'Riri'], host: 'Titi', game_mode: 'classic', status: 'started' }] })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Titi', avatar: { eyeType: 'happy' } },
          { username: 'Riri', avatar: { eyeType: 'sad' } },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rowCount: 1, rows: [] })

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

    await socket.handlers.get('startGame')({ roomId: '1' })
    const callbacks = game.setCallbacks.mock.calls[0][0]
    await callbacks.onGameOver({
      results: [
        null,
        {},
        { username: 'Titi' },
      ],
    })

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO multiplayer_scores'),
      ['Titi', 0, 0, 1, 0, 0, 0, false, 'classic']
    )
    expect(game.statsUpdated).toBe(true)
  })

  it('classic multiplayer onGameOver skips stat writes for already-updated games and empty result lists', async () => {
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
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Room', players: ['Titi', 'Riri'], host: 'Titi', game_mode: 'classic', status: 'started' }] })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Titi', avatar: { eyeType: 'happy' } },
          { username: 'Riri', avatar: { eyeType: 'sad' } },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rowCount: 1, rows: [] })

    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'multi',
      mode: 'classic',
      statsUpdated: true,
      players: [{ username: 'Titi' }, { username: 'Riri' }],
    }
    mockCreateGame.mockReturnValue(game)

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await socket.handlers.get('startGame')({ roomId: '1' })
    const callbacks = game.setCallbacks.mock.calls[0][0]
    await callbacks.onGameOver({
      mode: 'classic',
      winner: 'Titi',
      results: [{ username: 'Titi', score: 100 }],
    })

    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO multiplayer_scores'),
      expect.any(Array)
    )

    game.statsUpdated = false
    await callbacks.onGameOver({
      mode: 'classic',
      winner: 'Titi',
      results: [],
    })

    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO multiplayer_scores'),
      expect.any(Array)
    )

    await callbacks.onGameOver({
      mode: 'classic',
      winner: 'Titi',
    })

    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO multiplayer_scores'),
      expect.any(Array)
    )
  })

  it('cooperative onGameOver skips incomplete stat inputs and defaults shared values', async () => {
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
      .mockResolvedValue({ rowCount: 1, rows: [] })

    const game = {
      setCallbacks: vi.fn(),
      start: vi.fn(),
      mode_player: 'multi',
      mode: 'cooperative',
      statsUpdated: true,
      activePlayTimeMs: 9100,
      players: [{ username: 'Titi' }, { username: 'Riri' }],
    }
    mockCreateGame.mockReturnValue(game)

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await socket.handlers.get('startGame')({ roomId: '1' })
    const callbacks = game.setCallbacks.mock.calls[0][0]

    await callbacks.onGameOver({ mode: 'cooperative', results: [{ score: 12 }] })
    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO coop_scores'), expect.any(Array))

    game.statsUpdated = false
    game.players = null
    await callbacks.onGameOver({ mode: 'cooperative', results: [{ score: 12 }] })
    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO coop_scores'), expect.any(Array))

    game.players = [{ username: 'Titi' }]
    await callbacks.onGameOver({ mode: 'cooperative', results: [{ score: 12 }] })
    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO coop_scores'), expect.any(Array))

    game.players = [{}, { username: 'Riri' }]
    await callbacks.onGameOver({ mode: 'cooperative', results: [{ score: 12 }] })
    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO coop_scores'), expect.any(Array))

    game.players = [{ username: 'Titi' }, { username: 'Riri' }]
    await callbacks.onGameOver({ mode: 'cooperative', results: [null] })

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO coop_scores'),
      ['Riri', 'Titi', 0, 0, 1, 0, 9]
    )
    expect(game.statsUpdated).toBe(true)

    game.statsUpdated = false
    await callbacks.onGameOver({ mode: 'cooperative' })
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO coop_scores'),
      ['Riri', 'Titi', 0, 0, 1, 0, 9]
    )
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
    vi.useFakeTimers()
    process.env.RECONNECT_GRACE_MS = '1000'
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
    expect(die).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)

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

  it('joinRoom clears a pending disconnect when the player reconnects during the grace period', async () => {
    vi.useFakeTimers()
    process.env.RECONNECT_GRACE_MS = '1000'
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
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Room', game_mode: 'classic', host: 'Titi', player_count: 1, players: ['Titi'] }],
      })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    socket.data.roomId = '1'

    await socket.handlers.get('disconnect')()
    await socket.handlers.get('joinRoom')({ roomId: '1', username: 'Titi' }, vi.fn())

    expect(socket.join).toHaveBeenCalledWith('1')

    await vi.advanceTimersByTimeAsync(1000)
    expect(mockQuery).toHaveBeenCalledTimes(3)
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

    const {
      getActiveUserCount,
      getPeakActiveUserCount,
      isUsernameConnected,
    } = await import('../../src/socket/index.js')
    expect(isUsernameConnected('Titi')).toBe(true)
    expect(getActiveUserCount()).toBe(1)
    expect(getPeakActiveUserCount()).toBeGreaterThanOrEqual(1)

    const unregisterAck = vi.fn()
    socket.handlers.get('unregisterUser')({ username: 'Titi' }, unregisterAck)

    expect(unregisterAck).toHaveBeenCalledWith({ ok: true })
    expect(isUsernameConnected('Titi')).toBe(false)
    expect(isUsernameConnected('')).toBe(false)
    expect(getActiveUserCount()).toBe(0)
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

  it('joinRoom rejects duplicate active usernames before loading the room', async () => {
    const io = createIo()
    const firstSocket = createSocket('socket-1')
    const secondSocket = createSocket('socket-2')
    const { default: setupSockets } = await import('../../src/socket/index.js')

    setupSockets(io)
    const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
    connectionHandler(firstSocket)
    connectionHandler(secondSocket)

    firstSocket.handlers.get('registerUser')({ username: 'Titi' }, vi.fn())

    const ack = vi.fn()
    await secondSocket.handlers.get('joinRoom')({ roomId: '1', username: 'Titi' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Username already connected' })
    expect(secondSocket.emit).toHaveBeenCalledWith('error', { message: 'Username already connected' })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('joinRoom enforces password-protected rooms', async () => {
    const { socket } = await setupConnectedSocket()
    const joinRoomHandler = socket.handlers.get('joinRoom')

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        game_mode: 'classic',
        players: ['Host'],
        player_count: 1,
        status: 'waiting',
        ready_again: [],
        room_password_hash: 'secret',
      }],
    })
    let ack = vi.fn()
    await joinRoomHandler({ roomId: '1', username: 'Titi' }, ack)
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Room password required' })

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        game_mode: 'classic',
        players: ['Host'],
        player_count: 1,
        status: 'waiting',
        ready_again: [],
        room_password_hash: 'secret',
      }],
    })
    ack = vi.fn()
    await joinRoomHandler({ roomId: '1', username: 'Titi', roomPassword: 'wrong' }, ack)
    expect(mockBcryptCompare).toHaveBeenCalledWith('wrong', 'secret')
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Invalid room password' })
  })

  it('joinRoom handles no-callback full, success, and error paths', async () => {
    const { socket } = await setupConnectedSocket()
    const joinRoomHandler = socket.handlers.get('joinRoom')

    await joinRoomHandler({ roomId: '', username: '' })

    await joinRoomHandler({ roomId: '1', username: 'Bad Name' })
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Invalid username' })

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    await joinRoomHandler({ roomId: '99', username: 'Titi' })
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Room not found' })

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, game_mode: 'cooperative', players: ['A', 'B'], player_count: 2, status: 'waiting', ready_again: [] }],
    })
    await joinRoomHandler({ roomId: '1', username: 'Titi' })
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Room is full' })

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
          ready_again: [],
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Host', avatar: { eyeType: 'sad' } },
          { username: 'Riri', avatar: { eyeType: 'happy' } },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
    await joinRoomHandler({ roomId: '1', username: 'Riri' })
    expect(socket.join).toHaveBeenCalledWith('1')

    mockQuery.mockRejectedValueOnce(new Error('db down'))
    await joinRoomHandler({ roomId: '2', username: 'Riri' })
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Server error' })
  })

  it('joinRoom treats malformed room players as an empty list and accepts valid passwords', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          game_mode: 'classic',
          host: 'Host',
          player_count: 0,
          players: null,
          status: 'waiting',
          ready_again: [],
          room_password_hash: 'secret',
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({ rows: [] })
    const { socket } = await setupConnectedSocket()
    const ack = vi.fn()

    await socket.handlers.get('joinRoom')({
      roomId: '1',
      username: 'Titi',
      roomPassword: 'secret',
    }, ack)

    expect(mockBcryptCompare).toHaveBeenCalledWith('secret', 'secret')
    expect(socket.join).toHaveBeenCalledWith('1')
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('joinRoom handles duplicate usernames, started-room failures, and protected-room failures without callbacks', async () => {
    const io = createIo()
    const firstSocket = createSocket('socket-1')
    const secondSocket = createSocket('socket-2')
    const { default: setupSockets } = await import('../../src/socket/index.js')

    setupSockets(io)
    const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
    connectionHandler(firstSocket)
    connectionHandler(secondSocket)

    firstSocket.handlers.get('registerUser')({ username: 'Titi' }, vi.fn())
    await secondSocket.handlers.get('joinRoom')({ roomId: '1', username: 'Titi' })
    expect(secondSocket.emit).toHaveBeenCalledWith('error', { message: 'Username already connected' })

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        game_mode: 'classic',
        players: ['Host'],
        status: 'started',
        ready_again: [],
      }],
    })
    await secondSocket.handlers.get('joinRoom')({ roomId: '1', username: 'Riri' })
    expect(secondSocket.emit).toHaveBeenCalledWith('error', { message: 'Game already started' })

    mockGetGame.mockReturnValueOnce(null)
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        game_mode: 'classic',
        players: ['Riri'],
        status: 'started',
        ready_again: [],
      }],
    })
    await secondSocket.handlers.get('joinRoom')({ roomId: '1', username: 'Riri' })
    expect(secondSocket.emit).toHaveBeenCalledWith('error', { message: 'Game already started' })

    mockGetGame.mockReturnValueOnce({ getPlayer: vi.fn(() => null) })
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        game_mode: 'classic',
        players: ['Riri'],
        status: 'started',
        ready_again: [],
      }],
    })
    await secondSocket.handlers.get('joinRoom')({ roomId: '1', username: 'Riri' })
    expect(secondSocket.emit).toHaveBeenCalledWith('error', { message: 'Game already started' })

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 2,
        game_mode: 'classic',
        players: ['Host'],
        player_count: 1,
        status: 'waiting',
        ready_again: [],
        room_password_hash: 'secret',
      }],
    })
    await secondSocket.handlers.get('joinRoom')({ roomId: '2', username: 'Riri' })

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 2,
        game_mode: 'classic',
        players: ['Host'],
        player_count: 1,
        status: 'waiting',
        ready_again: [],
        room_password_hash: 'secret',
      }],
    })
    await secondSocket.handlers.get('joinRoom')({ roomId: '2', username: 'Riri', roomPassword: 'wrong' })
    expect(mockBcryptCompare).toHaveBeenCalledWith('wrong', 'secret')
  })

  it('joinRoom reconnects an existing player to a started game without a callback', async () => {
    const gameState = { roomId: '1', players: [{ username: 'Titi' }] }
    const player = { username: 'Titi', socketId: null }
    mockGetGame.mockReturnValueOnce({
      getPlayer: vi.fn(() => player),
      serialize: vi.fn(() => gameState),
    })
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        game_mode: 'classic',
        players: ['Titi', 'Riri'],
        status: 'started',
        ready_again: [],
      }],
    })

    const { socket } = await setupConnectedSocket()

    await socket.handlers.get('joinRoom')({ roomId: '1', username: 'Titi' })

    expect(socket.emit).toHaveBeenCalledWith('gameStarted', {
      roomId: '1',
      reconnected: true,
    })
    expect(socket.emit).toHaveBeenCalledWith('gameState', gameState)
    expect(player.socketId).toBe(socket.id)
  })

  it('joinRoom reconnects an existing player to a started game', async () => {
    const gameState = { roomId: '1', players: [{ username: 'Titi' }] }
    const player = { username: 'Titi', socketId: null }
    mockGetGame.mockReturnValueOnce({
      getPlayer: vi.fn(() => player),
      serialize: vi.fn(() => gameState),
    })
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        game_mode: 'classic',
        players: ['Titi', 'Riri'],
        status: 'started',
        ready_again: [],
      }],
    })

    const { socket } = await setupConnectedSocket()
    const joinRoomHandler = socket.handlers.get('joinRoom')
    const ack = vi.fn()

    await joinRoomHandler({ roomId: '1', username: 'Titi' }, ack)

    expect(socket.join).toHaveBeenCalledWith('1')
    expect(socket.emit).toHaveBeenCalledWith('gameStarted', {
      roomId: '1',
      reconnected: true,
    })
    expect(socket.emit).toHaveBeenCalledWith('gameState', gameState)
    expect(player.socketId).toBe(socket.id)
    expect(ack).toHaveBeenCalledWith({ ok: true, reconnected: true })
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

  it('joinSpectator allows an already active username to watch and clears active presence', async () => {
    const io = createIo()
    const firstSocket = createSocket('socket-1')
    const secondSocket = createSocket('socket-2')
    const thirdSocket = createSocket('socket-3')
    const { default: setupSockets, isUsernameConnected } = await import('../../src/socket/index.js')

    setupSockets(io)
    const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
    connectionHandler(firstSocket)
    connectionHandler(secondSocket)
    connectionHandler(thirdSocket)

    firstSocket.handlers.get('registerUser')({ username: 'Titi' }, vi.fn())
    expect(isUsernameConnected('Titi')).toBe(true)

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, name: 'Room', players: ['Titi'], status: 'started' }],
    })

    const ack = vi.fn()
    await secondSocket.handlers.get('joinSpectator')({ roomId: '1', username: 'Titi' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: true })
    expect(secondSocket.emit).not.toHaveBeenCalledWith('error', { message: 'Username already connected' })
    expect(secondSocket.join).toHaveBeenCalledWith('1')
    expect(secondSocket.data.isSpectator).toBe(true)
    expect(isUsernameConnected('Titi')).toBe(false)

    const registerAck = vi.fn()
    thirdSocket.handlers.get('registerUser')({ username: 'Titi' }, registerAck)
    expect(registerAck).toHaveBeenCalledWith({ ok: true })
  })

  it('joinSpectator handles no-callback validation and success paths', async () => {
    const io = createIo()
    const firstSocket = createSocket('socket-1')
    const secondSocket = createSocket('socket-2')
    const thirdSocket = createSocket('socket-3')
    const { default: setupSockets } = await import('../../src/socket/index.js')

    setupSockets(io)
    const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')[1]
    connectionHandler(firstSocket)
    connectionHandler(secondSocket)
    connectionHandler(thirdSocket)

    await firstSocket.handlers.get('joinSpectator')({ roomId: '', username: '' })

    await firstSocket.handlers.get('joinSpectator')({ roomId: '1', username: 'Bad Name' })
    expect(firstSocket.emit).toHaveBeenCalledWith('error', { message: 'Invalid username' })

    firstSocket.handlers.get('registerUser')({ username: 'Titi' }, vi.fn())
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, name: 'Room', players: ['Titi'], status: 'started' }],
    })
    await secondSocket.handlers.get('joinSpectator')({ roomId: '1', username: 'Titi' })
    expect(secondSocket.emit).not.toHaveBeenCalledWith('error', { message: 'Username already connected' })
    expect(secondSocket.join).toHaveBeenCalledWith('1')

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    await thirdSocket.handlers.get('joinSpectator')({ roomId: '1', username: 'Riri' })
    expect(thirdSocket.join).not.toHaveBeenCalled()

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, name: 'Room', players: ['Host'], status: 'waiting' }],
    })
    mockGetGame.mockReturnValueOnce(null)
    await thirdSocket.handlers.get('joinSpectator')({ roomId: '1', username: 'Riri' })
    expect(thirdSocket.emit).toHaveBeenCalledWith('roomState', expect.objectContaining({ id: 1 }))
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

  it('leaderboard handlers emit solo and coop leaderboard payloads', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { username: 'Titi', avatar: { eyeType: 'happy' }, score: 42 },
          { username: 'Riri', avatar: { eyeType: 'sad' }, score: null },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            player_one: 'Titi',
            avatar_one: { eyeType: 'happy' },
            player_two: 'Riri',
            avatar_two: { eyeType: 'sad' },
            score: 500,
          },
          {
            player_one: 'Fifi',
            avatar_one: { eyeType: 'angry' },
            player_two: 'Loulou',
            avatar_two: { eyeType: 'wink' },
            score: null,
          },
        ],
      })

    const { socket } = await setupConnectedSocket()

    await socket.handlers.get('getLeaderboardSolo')()
    await socket.handlers.get('getLeaderboardCoop')()

    expect(socket.emit).toHaveBeenCalledWith('leaderboardSolo', [
      { rank: 1, name: 'Titi', avatar: { eyeType: 'happy' }, score: 42 },
      { rank: 2, name: 'Riri', avatar: { eyeType: 'sad' }, score: 0 },
    ])
    expect(socket.emit).toHaveBeenCalledWith('leaderboardCoop', [
      {
        rank: 1,
        players: [
          { name: 'Titi', avatar: { eyeType: 'happy' } },
          { name: 'Riri', avatar: { eyeType: 'sad' } },
        ],
        score: 500,
      },
      {
        rank: 2,
        players: [
          { name: 'Fifi', avatar: { eyeType: 'angry' } },
          { name: 'Loulou', avatar: { eyeType: 'wink' } },
        ],
        score: 0,
      },
    ])
  })

  it('leaderboard handlers log query failures', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery
      .mockRejectedValueOnce(new Error('solo down'))
      .mockRejectedValueOnce(new Error('coop down'))

    const { socket } = await setupConnectedSocket()

    await socket.handlers.get('getLeaderboardSolo')()
    await socket.handlers.get('getLeaderboardCoop')()

    expect(consoleError).toHaveBeenCalledWith('getLeaderboardSolo failed:', expect.any(Error))
    expect(consoleError).toHaveBeenCalledWith('getLeaderboardCoop failed:', expect.any(Error))
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

  it('startGame defaults missing game mode to classic', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          host: 'Titi',
          players: ['Titi', 'Riri'],
          status: 'waiting',
          ready_again: [],
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Room', players: ['Titi', 'Riri'], host: 'Titi', status: 'started' }] })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Titi', avatar: { eyeType: 'happy' } },
          { username: 'Riri', avatar: { eyeType: 'sad' } },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const game = { setCallbacks: vi.fn(), start: vi.fn(), mode_player: 'multi' }
    mockCreateGame.mockReturnValue(game)

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await socket.handlers.get('startGame')({ roomId: '1' })

    expect(mockCreateGame).toHaveBeenCalledWith('1', ['Titi', 'Riri'], 'classic', 'Titi')
  })

  it('startGame refuses a finished room when no ready_again players are available', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        host: 'Titi',
        players: ['Titi', 'Riri'],
        status: 'finished',
        game_mode: 'classic',
      }],
    })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await socket.handlers.get('startGame')({ roomId: '1' })

    expect(mockCreateGame).not.toHaveBeenCalled()
    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'This room requires between 2 and 8 players to start.',
    })
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

  it('playAgain returns early when socket authentication fails', async () => {
    process.env.DISABLE_AUTH_TEST_FALLBACK = 'true'
    const { socket } = await setupConnectedSocket()

    await socket.handlers.get('playAgain')({ roomId: '1', username: 'Titi' })

    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('playAgain handles null ready_again lists', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, ready_again: null }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          host: 'Titi',
          players: ['Titi'],
          ready_again: ['Titi'],
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Room', game_mode: 'classic', host: 'Titi', player_count: 1, players: ['Titi'] }],
      })

    const { io, socket } = await setupConnectedSocket()

    await socket.handlers.get('playAgain')({ roomId: '1', username: 'Titi' })

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SET ready_again = $1'),
      [['Titi'], 'waiting', 1]
    )
    expect(io.roomEmit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({ ready_again: ['Titi'] })
    )
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

  it('playerLeave succeeds without an acknowledgement callback', async () => {
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

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await expect(socket.handlers.get('playerLeave')({ roomId: '1', username: 'Titi' })).resolves.toBeUndefined()
    expect(socket.leave).toHaveBeenCalledWith('1')
  })

  it('playerLeave reports authentication failures before mutating room state', async () => {
    process.env.DISABLE_AUTH_TEST_FALLBACK = 'true'
    const { socket } = await setupConnectedSocket()
    const playerLeaveHandler = socket.handlers.get('playerLeave')
    const ack = vi.fn()

    await playerLeaveHandler({ roomId: '1', username: 'Titi' }, ack)

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Authentication required' })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('playerLeave returns on authentication failure without an acknowledgement callback', async () => {
    process.env.DISABLE_AUTH_TEST_FALLBACK = 'true'
    const { socket } = await setupConnectedSocket()

    await expect(socket.handlers.get('playerLeave')({ roomId: '1', username: 'Titi' })).resolves.toBeUndefined()
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('playerLeave lets spectators leave without an acknowledgement callback', async () => {
    const { socket } = await setupConnectedSocket()
    socket.data.isSpectator = true
    socket.data.roomId = '1'

    await expect(socket.handlers.get('playerLeave')({ roomId: '1', username: 'Spec' })).resolves.toBeUndefined()
    expect(socket.leave).toHaveBeenCalledWith('1')
    expect(socket.data.roomId).toBeNull()
    expect(socket.data.isSpectator).toBe(false)
  })

  it('playerLeave tolerates missing in-game players and non-final leaves', async () => {
    mockGetGame
      .mockReturnValueOnce({
        getPlayer: vi.fn(() => null),
      })
      .mockReturnValueOnce({
        getPlayer: vi.fn(() => ({ isAlive: true })),
        checkGameOver: vi.fn(() => ({ over: false })),
        endGame: vi.fn(),
      })
    mockQuery.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 1, host: 'Titi', players: ['Titi'], ready_again: [] }],
    })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await socket.handlers.get('playerLeave')({ roomId: '1', username: 'Titi' }, vi.fn())

    socket.data.username = 'Titi'
    await socket.handlers.get('playerLeave')({ roomId: '1', username: 'Titi' }, vi.fn())

    expect(mockGetGame).toHaveBeenCalledWith('1')
  })

  it('playerLeave tolerates missing room ids', async () => {
    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    await socket.handlers.get('playerLeave')({ username: 'Titi' }, vi.fn())

    expect(mockQuery).not.toHaveBeenCalled()
    expect(socket.leave).toHaveBeenCalledWith('undefined')
  })

  it('playerLeave handles missing room rows and players absent from the room', async () => {
    mockGetGame.mockReturnValue(null)
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
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
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({ rows: [] })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Riri'

    await socket.handlers.get('playerLeave')({ roomId: '1', username: 'Riri' }, vi.fn())
    await socket.handlers.get('playerLeave')({ roomId: '1', username: 'Riri' }, vi.fn())

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), [1])
  })

  it('playerLeave tolerates rooms with non-array players', async () => {
    mockGetGame.mockReturnValue(null)
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        name: 'Room',
        game_mode: 'classic',
        host: 'Titi',
        player_count: 1,
        players: null,
        status: 'waiting',
        ready_again: [],
      }],
    })

    const { socket } = await setupConnectedSocket()
    const ack = vi.fn()

    await socket.handlers.get('playerLeave')({ roomId: '1', username: 'Titi' }, ack)

    expect(socket.leave).toHaveBeenCalledWith('1')
    expect(ack).toHaveBeenCalledWith({ ok: true })
  })

  it('playerLeave removes non-host players when ready_again is null', async () => {
    mockGetGame.mockReturnValue(null)
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
          ready_again: null,
        }],
      })
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
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({ rows: [] })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Riri'

    await socket.handlers.get('playerLeave')({ roomId: '1', username: 'Riri' }, vi.fn())

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE rooms'),
      [1, ['Titi'], 1, 'Titi', []]
    )
  })

  it('playerLeave removes the leaving player from ready_again', async () => {
    mockGetGame.mockReturnValue(null)
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
          ready_again: ['Titi', 'Riri'],
        }],
      })
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
          ready_again: ['Titi'],
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({ rows: [] })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Riri'

    await socket.handlers.get('playerLeave')({ roomId: '1', username: 'Riri' }, vi.fn())

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE rooms'),
      [1, ['Titi'], 1, 'Titi', ['Titi']]
    )
  })

  it('playerLeave removes stale ready_again membership even when the player list is already clean', async () => {
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
          ready_again: ['Riri'],
        }],
      })
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
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }],
      })
      .mockResolvedValueOnce({ rows: [] })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Riri'

    await socket.handlers.get('playerLeave')({ roomId: '1', username: 'Riri' }, vi.fn())

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE rooms'),
      [1, ['Titi'], 1, 'Titi', []]
    )
  })

  it('movePiece ends the game when immediate input causes game over', async () => {
    const summary = { roomId: '1', winner: 'Titi' }
    const onGameOver = vi.fn()
    const game = {
      isRunning: true,
      isOver: false,
      enqueueInput: vi.fn(),
      processQueuedInputsFor: vi.fn(),
      checkGameOver: vi.fn(() => ({ over: true })),
      endGame: vi.fn(() => summary),
      onGameOver,
    }
    mockGetGame.mockReturnValueOnce(game)

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    const movePieceHandler = socket.handlers.get('movePiece')

    movePieceHandler({ roomId: '1', action: 'hardDrop' })

    expect(game.endGame).toHaveBeenCalled()
    expect(onGameOver).toHaveBeenCalledWith(summary)
    expect(socket.emit).not.toHaveBeenCalledWith('playerState', expect.anything())
  })

  it('movePiece handles game over when no onGameOver callback is installed', async () => {
    const game = {
      isRunning: true,
      isOver: false,
      enqueueInput: vi.fn(),
      processQueuedInputsFor: vi.fn(),
      checkGameOver: vi.fn(() => ({ over: true })),
      endGame: vi.fn(() => ({ roomId: '1', winner: 'Titi' })),
    }
    mockGetGame.mockReturnValueOnce(game)

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'

    expect(() => socket.handlers.get('movePiece')({ roomId: '1', action: 'hardDrop' })).not.toThrow()
    expect(game.endGame).toHaveBeenCalled()
  })

  it('disconnect can finish a game without an onGameOver callback installed', async () => {
    vi.useFakeTimers()
    process.env.RECONNECT_GRACE_MS = '1000'
    const die = vi.fn()
    mockGetGame.mockReturnValue({
      players: [{ username: 'Titi', isAlive: true, die }],
      checkGameOver: vi.fn(() => ({ over: true, winner: 'Riri' })),
      endGame: vi.fn(() => ({ roomId: '1', winner: 'Riri' })),
    })
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

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    socket.data.roomId = '1'

    await socket.handlers.get('disconnect')()
    await vi.advanceTimersByTimeAsync(1000)

    expect(die).toHaveBeenCalled()
  })

  it('disconnect leaves game state alone when the tracked player is already dead or missing', async () => {
    vi.useFakeTimers()
    process.env.RECONNECT_GRACE_MS = '1000'
    const die = vi.fn()
    mockQuery.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 1, host: 'Titi', players: ['Titi'], ready_again: [] }],
    })
    mockGetGame
      .mockReturnValueOnce({
        players: [{ username: 'Titi', isAlive: false, die }],
        checkGameOver: vi.fn(),
        endGame: vi.fn(),
      })
      .mockReturnValueOnce({
        players: [{ username: 'Riri', isAlive: true, die }],
        checkGameOver: vi.fn(),
        endGame: vi.fn(),
      })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    socket.data.roomId = '1'

    await socket.handlers.get('disconnect')()
    await vi.advanceTimersByTimeAsync(1000)

    socket.data.username = 'Titi'
    socket.data.roomId = '2'
    await socket.handlers.get('disconnect')()
    await vi.advanceTimersByTimeAsync(1000)

    expect(die).not.toHaveBeenCalled()
  })

  it('disconnect timeout tolerates missing games and non-final player deaths', async () => {
    vi.useFakeTimers()
    process.env.RECONNECT_GRACE_MS = '1000'
    const die = vi.fn()
    const endGame = vi.fn()
    mockQuery.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 1, host: 'Titi', players: ['Titi'], ready_again: [] }],
    })
    mockGetGame
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        players: [{ username: 'Titi', isAlive: true, die }],
        checkGameOver: vi.fn(() => ({ over: false })),
        endGame,
      })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    socket.data.roomId = '1'

    await socket.handlers.get('disconnect')()
    await vi.advanceTimersByTimeAsync(1000)

    socket.data.username = 'Titi'
    socket.data.roomId = '2'
    await socket.handlers.get('disconnect')()
    await vi.advanceTimersByTimeAsync(1000)

    expect(die).toHaveBeenCalled()
    expect(endGame).not.toHaveBeenCalled()
  })

  it('disconnect uses the default grace period for invalid reconnect settings', async () => {
    vi.useFakeTimers()
    process.env.RECONNECT_GRACE_MS = '-1'
    mockGetGame.mockReturnValue(null)
    mockQuery.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 1, host: 'Titi', players: ['Titi'], ready_again: [] }],
    })

    const { socket } = await setupConnectedSocket()
    socket.data.username = 'Titi'
    socket.data.roomId = '1'

    await socket.handlers.get('disconnect')()
    await vi.advanceTimersByTimeAsync(14999)
    expect(mockQuery).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), [1])
  })
})
