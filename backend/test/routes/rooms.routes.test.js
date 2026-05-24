import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()
const mockBroadcastAvailableRooms = vi.fn()
const mockRemoveGame = vi.fn()

vi.mock('../../src/config/db.js', () => ({
  pool: {
    query: mockQuery,
  },
}))

vi.mock('../../src/socket/index.js', () => ({
  broadcastAvailableRooms: mockBroadcastAvailableRooms,
}))

vi.mock('../../src/game/gameManager.js', () => ({
  removeGame: mockRemoveGame,
}))

const buildRes = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res
}

const buildReq = ({ body = {}, params = {}, app = null } = {}) => ({
  body,
  params,
  app: app || { get: vi.fn(() => null) },
})

const getHandler = (router, method, path) =>
  router.stack.find(
    (layer) => layer.route?.path === path && layer.route.methods?.[method]
  ).route.stack[0].handle

describe('rooms routes', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockBroadcastAvailableRooms.mockReset()
    mockRemoveGame.mockReset()
  })

  it('validates room creation input before querying', async () => {
    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({ body: { gameMode: '', host: '' } }), res)

    expect(mockQuery).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing data' })
  })

  it('rejects room creation when the room password is too long', async () => {
    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({
      body: {
        gameMode: 'classic',
        host: 'Titi',
        roomPassword: 'x'.repeat(65),
      },
    }), res)

    expect(mockQuery).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Room password is too long' })
  })

  it('rejects room creation when the user is already in another room', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 9 }] })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({ body: { gameMode: 'classic', host: 'Titi' } }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'User is already in a room' })
  })

  it('returns the existing waiting room when the host retries creation', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 9,
        name: 'ExistingRoom',
        game_mode: 'classic',
        host: 'Titi',
        player_count: 1,
        players: ['Titi'],
        status: 'waiting',
        is_listed: true,
      }],
    })

    const io = { emit: vi.fn() }
    const app = { get: vi.fn(() => io) }

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({ body: { gameMode: 'classic', host: 'Titi' }, app }), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 9,
      name: 'ExistingRoom',
      host: 'Titi',
    }))
    expect(mockBroadcastAvailableRooms).toHaveBeenCalledWith(io)
  })

  it('returns an existing waiting room without broadcasting when io is unavailable', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 9,
        name: 'ExistingRoom',
        game_mode: 'classic',
        host: 'Titi',
        player_count: 1,
        players: ['Titi'],
        status: 'waiting',
        is_listed: true,
      }],
    })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({ body: { gameMode: 'classic', host: 'Titi' } }), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 9,
      name: 'ExistingRoom',
      host: 'Titi',
    }))
    expect(mockBroadcastAvailableRooms).not.toHaveBeenCalled()
  })

  it('creates a room and broadcasts available rooms', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'FastTetris-ABCD',
          game_mode: 'classic',
          host: 'Titi',
          player_count: 1,
          players: ['Titi'],
        }],
      })

    const io = { to: vi.fn(() => ({ emit: vi.fn() })) }
    const app = { get: vi.fn(() => io) }

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({ body: { gameMode: 'classic', host: 'Titi' }, app }), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'Titi',
        player_count: 1,
      })
    )
    expect(mockBroadcastAvailableRooms).toHaveBeenCalledWith(io)
  })

  it('rejects unauthenticated room creation before querying user room state', async () => {
    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({ body: { gameMode: 'classic' } }), res)

    expect(mockQuery).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' })
  })

  it('hashes listed room passwords when creating rooms', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Protected',
          game_mode: 'classic',
          host: 'Titi',
          player_count: 1,
          is_listed: true,
          players: ['Titi'],
          room_password_hash: 'hash',
        }],
      })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({
      body: {
        gameMode: 'classic',
        host: 'Titi',
        name: 'Protected',
        roomPassword: 'secret',
      },
    }), res)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      has_password: true,
    }))
  })

  it('creates a solo room as unlisted', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'SoloRoom',
          game_mode: 'classic',
          host: 'Titi',
          player_count: 1,
          is_listed: false,
          players: ['Titi'],
        }],
      })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({
      body: { gameMode: 'classic', host: 'Titi', name: 'SoloRoom', isListed: false },
    }), res)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO rooms (name, game_mode, host, player_count, is_listed, players, room_password_hash)'),
      ['SoloRoom', 'classic', 'Titi', false, ['Titi'], null]
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ is_listed: false })
    )
  })

  it('cleans up existing private solo rooms before creating a new solo room', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 12 }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 13,
          name: 'SoloRoom',
          game_mode: 'classic',
          host: 'Titi',
          player_count: 1,
          is_listed: false,
          players: ['Titi'],
        }],
      })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({
      body: { gameMode: 'classic', host: 'Titi', name: 'SoloRoom', isListed: false },
    }), res)

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('DELETE FROM rooms'),
      ['Titi']
    )
    expect(mockRemoveGame).toHaveBeenCalledWith('12')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 13, is_listed: false })
    )
  })

  it('returns a room by name', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        name: 'FastTetris-ABCD',
        game_mode: 'classic',
        host: 'Titi',
        player_count: 2,
        players: ['Titi', 'Riri'],
        status: 'waiting',
      }],
    })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'get', '/by-name/:name')
    const res = buildRes()

    await handler(buildReq({ params: { name: 'FastTetris-ABCD' } }), res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'FastTetris-ABCD' })
    )
  })

  it('passes through undefined rooms defensively when exposing room data', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [],
    })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'get', '/by-name/:name')
    const res = buildRes()

    await handler(buildReq({ params: { name: 'GhostRoom' } }), res)

    expect(res.json).toHaveBeenCalledWith(undefined)
  })

  it('returns a room by player username', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 7,
        name: 'TeamRoom',
        game_mode: 'classic',
        host: 'Riri',
        player_count: 2,
        players: ['Riri', 'Titi'],
        status: 'waiting',
      }],
    })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'get', '/by-player/:username')
    const res = buildRes()

    await handler(buildReq({ params: { username: 'Riri' } }), res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'TeamRoom', host: 'Riri' })
    )
  })

  it('renames a room only for the host and emits roomState', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'New-Room',
          host: 'Titi',
          players: ['Titi'],
          game_mode: 'classic',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }],
      })

    const emit = vi.fn()
    const io = { to: vi.fn(() => ({ emit })) }
    const app = { get: vi.fn(() => io) }

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'patch', '/:roomId/name')
    const res = buildRes()

    await handler(buildReq({
      params: { roomId: '1' },
      body: { name: 'New-Room', username: 'Titi' },
      app,
    }), res)

    expect(io.to).toHaveBeenCalledWith('1')
    expect(emit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({
        name: 'New-Room',
        player_avatars: { Titi: { eyeType: 'happy' } },
      })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New-Room',
        player_avatars: { Titi: { eyeType: 'happy' } },
      })
    )
  })

  it('returns 404 when changing the mode of a missing room', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'patch', '/:roomId/mode')
    const res = buildRes()

    await handler(buildReq({
      params: { roomId: '99' },
      body: { mode: 'classic', username: 'Titi' },
    }), res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Room not found' })
  })

  it('updates the room mode for the host', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi', player_count: 1 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          host: 'Titi',
          players: ['Titi'],
          game_mode: 'giant',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ username: 'Titi', avatar: { eyeType: 'happy' } }],
      })

    const emit = vi.fn()
    const io = { to: vi.fn(() => ({ emit })) }
    const app = { get: vi.fn(() => io) }

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'patch', '/:roomId/mode')
    const res = buildRes()

    await handler(buildReq({
      params: { roomId: '1' },
      body: { mode: 'Giant', username: 'Titi' },
      app,
    }), res)

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT host, player_count FROM rooms WHERE id = $1'),
      ['1']
    )
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SET game_mode = $1'),
      ['giant', '1']
    )
    expect(io.to).toHaveBeenCalledWith('1')
    expect(emit).toHaveBeenCalledWith(
      'roomState',
      expect.objectContaining({ game_mode: 'giant' })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ game_mode: 'giant' })
    )
  })

  it('accepts the new cooperative_roles mode for the host', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi', player_count: 2 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          host: 'Titi',
          players: ['Titi', 'Riri'],
          game_mode: 'cooperative_roles',
        }],
      })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Titi', avatar: { eyeType: 'happy' } },
          { username: 'Riri', avatar: { eyeType: 'sad' } },
        ],
      })

    const emit = vi.fn()
    const io = { to: vi.fn(() => ({ emit })) }
    const app = { get: vi.fn(() => io) }

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'patch', '/:roomId/mode')
    const res = buildRes()

    await handler(buildReq({
      params: { roomId: '1' },
      body: { mode: 'cooperative_roles', username: 'Titi' },
      app,
    }), res)

    expect(io.to).toHaveBeenCalledWith('1')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ game_mode: 'cooperative_roles' })
    )
  })

  it('accepts the chaotic mode for the host', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi', player_count: 2 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          host: 'Titi',
          players: ['Titi', 'Riri'],
          game_mode: 'chaotic',
        }],
      })
      .mockResolvedValueOnce({
        rows: [
          { username: 'Titi', avatar: { eyeType: 'happy' } },
          { username: 'Riri', avatar: { eyeType: 'sad' } },
        ],
      })

    const emit = vi.fn()
    const io = { to: vi.fn(() => ({ emit })) }
    const app = { get: vi.fn(() => io) }

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'patch', '/:roomId/mode')
    const res = buildRes()

    await handler(buildReq({
      params: { roomId: '1' },
      body: { mode: 'chaotic', username: 'Titi' },
      app,
    }), res)

    expect(io.to).toHaveBeenCalledWith('1')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ game_mode: 'chaotic' })
    )
  })

  it('rejects a mode change when the room has too many players for that mode', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ host: 'Titi', player_count: 3 }],
    })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'patch', '/:roomId/mode')
    const res = buildRes()

    await handler(buildReq({
      params: { roomId: '1' },
      body: { mode: 'cooperative', username: 'Titi' },
    }), res)

    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cannot switch to Co-op Alternate with 3 players',
    })
  })

  it('rejects room creation when mode is invalid', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({ body: { gameMode: 'unknown', host: 'Titi' } }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid game mode' })
  })

  it('validates requested custom room names and rejects duplicates', async () => {
    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    let res = buildRes()
    await handler(buildReq({ body: { gameMode: 'classic', host: 'Titi', name: 'bad name!' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid room name' })

    mockQuery.mockReset()
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
    res = buildRes()
    await handler(buildReq({ body: { gameMode: 'classic', host: 'Titi', name: 'TakenRoom' } }), res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Room name already exists' })
  })

  it('returns 500 when autogenerated room name conflicts for all retries', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValue({ rowCount: 0, rows: [] })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({ body: { gameMode: 'classic', host: 'Titi' } }), res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to generate unique room name' })
  })

  it('returns 409 on unique-constraint create conflicts and 500 on generic create errors', async () => {
    const duplicateError = Object.assign(new Error('duplicate'), {
      code: '23505',
      constraint: 'rooms_name_key',
    })
    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')

    mockQuery.mockRejectedValueOnce(duplicateError)
    let res = buildRes()
    await handler(buildReq({ body: { gameMode: 'classic', host: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Room name already exists' })

    mockQuery.mockReset()
    mockQuery.mockRejectedValueOnce(new Error('db down'))
    res = buildRes()
    await handler(buildReq({ body: { gameMode: 'classic', host: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })
  })

  it('covers by-name and by-player missing/not-found/error branches', async () => {
    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const byName = getHandler(router, 'get', '/by-name/:name')
    const byPlayer = getHandler(router, 'get', '/by-player/:username')

    let res = buildRes()
    await byName(buildReq({ params: { name: '' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    res = buildRes()
    await byName(buildReq({ params: { name: 'Missing' } }), res)
    expect(res.status).toHaveBeenCalledWith(404)

    mockQuery.mockRejectedValueOnce(new Error('db down'))
    res = buildRes()
    await byName(buildReq({ params: { name: 'Err' } }), res)
    expect(res.status).toHaveBeenCalledWith(500)

    res = buildRes()
    await byPlayer(buildReq({ params: { username: '' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    res = buildRes()
    await byPlayer(buildReq({ params: { username: 'Ghost' } }), res)
    expect(res.status).toHaveBeenCalledWith(404)

    mockQuery.mockRejectedValueOnce(new Error('db down'))
    res = buildRes()
    await byPlayer(buildReq({ params: { username: 'Err' } }), res)
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('covers room-name patch validation and failure branches', async () => {
    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'patch', '/:roomId/name')

    let res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { username: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { name: 'NewRoom' } }), res)
    expect(res.status).toHaveBeenCalledWith(401)

    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { name: 'bad name!', username: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { name: 'NewRoom', username: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(404)

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Host' }] })
    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { name: 'NewRoom', username: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(403)

    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 2 }] })
    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { name: 'Taken', username: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(409)

    mockQuery.mockRejectedValueOnce(new Error('db down'))
    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { name: 'NewRoom', username: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('covers room-mode patch missing/invalid/not-host/error branches', async () => {
    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'patch', '/:roomId/mode')

    let res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { username: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { mode: 'invalid', username: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { mode: 'classic' } }), res)
    expect(res.status).toHaveBeenCalledWith(401)

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Host', player_count: 1 }] })
    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { mode: 'classic', username: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(403)

    mockQuery.mockRejectedValueOnce(new Error('db down'))
    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { mode: 'classic', username: 'Titi' } }), res)
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('formats all mode labels in max-player rejection messages', async () => {
    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'patch', '/:roomId/mode')

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi', player_count: 3 }] })
    let res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { mode: 'cooperative_roles', username: 'Titi' } }), res)
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot switch to Co-op Roles with 3 players' })

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi', player_count: 7 }] })
    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { mode: 'classic', username: 'Titi' } }), res)
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot switch to Classic with 7 players' })

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi', player_count: 7 }] })
    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { mode: 'mirror', username: 'Titi' } }), res)
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot switch to Mirror with 7 players' })

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi', player_count: 7 }] })
    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { mode: 'chaotic', username: 'Titi' } }), res)
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot switch to Chaotic with 7 players' })

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi', player_count: 7 }] })
    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { mode: 'invisible', username: 'Titi' } }), res)
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot switch to Invisible with 7 players' })

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi', player_count: 7 }] })
    res = buildRes()
    await handler(buildReq({ params: { roomId: '1' }, body: { mode: 'giant', username: 'Titi' } }), res)
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot switch to Giant with 7 players' })
  })

  it('returns empty player_avatars when patching a room with no players', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, name: 'NoPlayers', host: 'Titi', players: [] }],
      })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'patch', '/:roomId/name')
    const res = buildRes()

    await handler(buildReq({
      params: { roomId: '1' },
      body: { name: 'NoPlayers', username: 'Titi' },
    }), res)

    expect(mockQuery).toHaveBeenCalledTimes(3)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'NoPlayers',
        player_avatars: {},
      })
    )
  })

  it('updates room mode without emitting when no io instance exists', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ host: 'Titi', player_count: 1 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Room',
          host: 'Titi',
          players: null,
          game_mode: 'mirror',
        }],
      })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'patch', '/:roomId/mode')
    const res = buildRes()

    await handler(buildReq({
      params: { roomId: '1' },
      body: { mode: 'mirror', username: 'Titi' },
    }), res)

    expect(mockBroadcastAvailableRooms).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      game_mode: 'mirror',
      player_avatars: {},
    }))
  })
})
