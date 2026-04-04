import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()
const mockBroadcastAvailableRooms = vi.fn()

vi.mock('../../src/config/db.js', () => ({
  pool: {
    query: mockQuery,
  },
}))

vi.mock('../../src/socket/index.js', () => ({
  broadcastAvailableRooms: mockBroadcastAvailableRooms,
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

  it('rejects room creation when the user is already in another room', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 9 }] })

    const { default: router } = await import('../../src/routes/rooms.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler(buildReq({ body: { gameMode: 'classic', host: 'Titi' } }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'User is already in a room' })
  })

  it('creates a room and broadcasts available rooms', async () => {
    mockQuery
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
})
