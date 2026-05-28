import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()
const mockGetActiveGameCount = vi.fn()
const mockGetActiveUserCount = vi.fn()
const mockGetPeakActiveUserCount = vi.fn()

vi.mock('../../src/config/db.js', () => ({
  pool: {
    query: mockQuery,
  },
}))

vi.mock('../../src/game/gameManager.js', () => ({
  getActiveGameCount: mockGetActiveGameCount,
}))

vi.mock('../../src/socket/index.js', () => ({
  getActiveUserCount: mockGetActiveUserCount,
  getPeakActiveUserCount: mockGetPeakActiveUserCount,
}))

const buildRes = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res
}

const getHandler = (router, method, path) =>
  router.stack.find(
    (layer) => layer.route?.path === path && layer.route.methods?.[method]
  ).route.stack[0].handle

const buildReq = ({
  username = 'Titi08',
  password = 'secret-admin',
} = {}) => ({
  get: (header) => {
    if (header === 'x-admin-username') return username
    if (header === 'x-admin-password') return password
    return undefined
  },
})

describe('admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ADMIN_USERNAME', 'Titi08')
    vi.stubEnv('ADMIN_PASSWORD', 'secret-admin')
    mockGetActiveGameCount.mockReturnValue(2)
    mockGetActiveUserCount.mockReturnValue(5)
    mockGetPeakActiveUserCount.mockReturnValue(8)
  })

  it('returns aggregate admin summary data', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          registered_users: '12',
          total_rooms: '4',
          waiting_rooms: '2',
          started_rooms: '1',
          players_in_rooms: '7',
          solo_games: '20',
          multiplayer_results: '9',
          coop_games: '3',
          total_lines: '400',
          total_tetris: '18',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          new_users: '2',
          rooms_created: '3',
          solo_games: '4',
          multiplayer_results: '5',
          coop_games: '1',
          lines_cleared: '90',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ month: '2026-05', solo_games: '4', multiplayer_results: '5', coop_games: '1' }],
      })
      .mockResolvedValueOnce({
        rows: [{ game_mode: 'classic', rooms: '2', players: '4' }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: 'RedTetris',
          game_mode: 'classic',
          status: 'waiting',
          player_count: '2',
          is_listed: true,
          created_at: '2026-05-06T10:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          username: 'Titi',
          score: '1200',
          lines: '20',
          level: '3',
          created_at: '2026-05-06T10:10:00.000Z',
        }],
      })

    const { default: router } = await import('../../src/routes/admin.routes.js')
    const handler = getHandler(router, 'get', '/summary')
    const res = buildRes()

    await handler(buildReq(), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      live: {
        activePlayers: 5,
        peakActivePlayers: 8,
        activeGames: 2,
      },
      overview: expect.objectContaining({
        registeredUsers: 12,
        totalRooms: 4,
        totalLines: 400,
      }),
      currentMonth: expect.objectContaining({
        newUsers: 2,
        linesCleared: 90,
      }),
      roomModes: [{ mode: 'classic', rooms: 2, players: 4 }],
      recentRooms: [expect.objectContaining({
        id: 1,
        name: 'RedTetris',
        mode: 'classic',
        playerCount: 2,
        listed: true,
      })],
      topSoloScores: [expect.objectContaining({
        username: 'Titi',
        score: 1200,
      })],
    }))
  })

  it('returns server error when the summary query fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { default: router } = await import('../../src/routes/admin.routes.js')
    const handler = getHandler(router, 'get', '/summary')
    const res = buildRes()

    await handler(buildReq(), res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })
    consoleError.mockRestore()
  })

  it('defaults missing aggregate rows to zero values', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    const { default: router } = await import('../../src/routes/admin.routes.js')
    const handler = getHandler(router, 'get', '/summary')
    const res = buildRes()

    await handler(buildReq(), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      overview: expect.objectContaining({
        registeredUsers: 0,
        totalRooms: 0,
        totalLines: 0,
      }),
      currentMonth: expect.objectContaining({
        newUsers: 0,
        linesCleared: 0,
      }),
      monthlyActivity: [],
      roomModes: [],
      recentRooms: [],
      topSoloScores: [],
    }))
  })

  it('rejects requests without the admin credentials', async () => {
    const { default: router } = await import('../../src/routes/admin.routes.js')
    const handler = getHandler(router, 'get', '/summary')
    const res = buildRes()

    await handler({ get: () => undefined }, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid admin credentials' })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('rejects requests with the wrong admin username', async () => {
    const { default: router } = await import('../../src/routes/admin.routes.js')
    const handler = getHandler(router, 'get', '/summary')
    const res = buildRes()

    await handler(buildReq({ username: 'NotTiti08' }), res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid admin credentials' })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('returns unavailable when the admin password is not configured', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '   ')

    const { default: router } = await import('../../src/routes/admin.routes.js')
    const handler = getHandler(router, 'get', '/summary')
    const res = buildRes()

    await handler(buildReq(), res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin credentials are not configured' })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('returns unavailable when the admin username is not configured', async () => {
    vi.stubEnv('ADMIN_USERNAME', '   ')

    const { default: router } = await import('../../src/routes/admin.routes.js')
    const handler = getHandler(router, 'get', '/summary')
    const res = buildRes()

    await handler(buildReq(), res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin credentials are not configured' })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('treats a missing admin password env var as unconfigured', async () => {
    vi.stubEnv('ADMIN_PASSWORD', undefined)

    const { default: router } = await import('../../src/routes/admin.routes.js')
    const handler = getHandler(router, 'get', '/summary')
    const res = buildRes()

    await handler(buildReq(), res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin credentials are not configured' })
  })
})
