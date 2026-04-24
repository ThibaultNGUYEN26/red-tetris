import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()
const mockIsUsernameConnected = vi.fn()

vi.mock('../../src/config/db.js', () => ({
  pool: {
    query: mockQuery,
  },
}))

vi.mock('../../src/socket/index.js', () => ({
  isUsernameConnected: mockIsUsernameConnected,
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

describe('profile routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsUsernameConnected.mockReset()
  })

  it('returns 400 when username is missing for player stats', async () => {
    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/player/stats')
    const res = buildRes()

    await handler({ query: {} }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing username' })
  })

  it('returns player stats when the user exists', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        username: 'Titi',
        avatar: { eyeType: 'happy' },
        solo_games_played: 3,
        highest_solo_score: 9000,
        multiplayer_games_played: 7,
        multiplayer_wins: 4,
        multiplayer_losses: 3,
      }],
    })

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/player/stats')
    const res = buildRes()

    await handler({ query: { username: 'Titi' } }, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      name: 'Titi',
      avatar: { eyeType: 'happy' },
      soloGames: 3,
      soloTopScore: 9000,
      multiGames: 7,
      wins: 4,
      losses: 3,
    })
  })

  it('returns 404 when player stats are missing', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/player/stats')
    const res = buildRes()

    await handler({ query: { username: 'Ghost' } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' })
  })

  it('returns connection state for a username', async () => {
    mockIsUsernameConnected.mockReturnValueOnce(true)

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/player/connection')
    const res = buildRes()

    await handler({ query: { username: 'Titi' } }, res)

    expect(mockIsUsernameConnected).toHaveBeenCalledWith('Titi')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      username: 'Titi',
      connected: true,
    })
  })

  it('returns 400 when username is missing for player connection', async () => {
    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/player/connection')
    const res = buildRes()

    await handler({ query: {} }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing username' })
  })

  it('uses default zero values when player stats fields are null', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        username: 'Titi',
        avatar: { eyeType: 'happy' },
        solo_games_played: null,
        highest_solo_score: null,
        multiplayer_games_played: null,
        multiplayer_wins: null,
        multiplayer_losses: null,
      }],
    })

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/player/stats')
    const res = buildRes()

    await handler({ query: { username: 'Titi' } }, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      name: 'Titi',
      avatar: { eyeType: 'happy' },
      soloGames: 0,
      soloTopScore: 0,
      multiGames: 0,
      wins: 0,
      losses: 0,
    })
  })

  it('returns 500 when fetching player stats fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/player/stats')
    const res = buildRes()

    await handler({ query: { username: 'Titi' } }, res)

    expect(consoleError).toHaveBeenCalledWith('Fetch player stats failed:', expect.any(Error))
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })
  })

  it('maps the solo leaderboard response', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { username: 'Titi', avatar: { eyeType: 'happy' }, score: 1200 },
        { username: 'Riri', avatar: { eyeType: 'sad' }, score: 900 },
      ],
    })

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/leaderboard/solo')
    const res = buildRes()

    await handler({}, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith([
      { rank: 1, name: 'Titi', avatar: { eyeType: 'happy' }, score: 1200 },
      { rank: 2, name: 'Riri', avatar: { eyeType: 'sad' }, score: 900 },
    ])
  })

  it('defaults solo leaderboard score to 0 when score is null', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ username: 'Titi', avatar: { eyeType: 'happy' }, score: null }],
    })

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/leaderboard/solo')
    const res = buildRes()

    await handler({}, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith([
      { rank: 1, name: 'Titi', avatar: { eyeType: 'happy' }, score: 0 },
    ])
  })

  it('returns 500 when fetching solo leaderboard fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/leaderboard/solo')
    const res = buildRes()

    await handler({}, res)

    expect(consoleError).toHaveBeenCalledWith('Fetch solo leaderboard failed:', expect.any(Error))
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })
  })

  it('maps the coop leaderboard response', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        player_one: 'Titi',
        avatar_one: { eyeType: 'happy' },
        player_two: 'Riri',
        avatar_two: { eyeType: 'sad' },
        score: 2500,
      }],
    })

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/leaderboard/coop')
    const res = buildRes()

    await handler({}, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith([
      {
        rank: 1,
        players: [
          { name: 'Titi', avatar: { eyeType: 'happy' } },
          { name: 'Riri', avatar: { eyeType: 'sad' } },
        ],
        score: 2500,
      },
    ])
  })

  it('defaults coop leaderboard score to 0 when score is null', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        player_one: 'Titi',
        avatar_one: { eyeType: 'happy' },
        player_two: 'Riri',
        avatar_two: { eyeType: 'sad' },
        score: null,
      }],
    })

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/leaderboard/coop')
    const res = buildRes()

    await handler({}, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith([
      {
        rank: 1,
        players: [
          { name: 'Titi', avatar: { eyeType: 'happy' } },
          { name: 'Riri', avatar: { eyeType: 'sad' } },
        ],
        score: 0,
      },
    ])
  })

  it('returns 500 when fetching coop leaderboard fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/leaderboard/coop')
    const res = buildRes()

    await handler({}, res)

    expect(consoleError).toHaveBeenCalledWith('Fetch coop leaderboard failed:', expect.any(Error))
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })
  })

  it('validates profile payloads before upserting', async () => {
    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'post', '/profile')

    let res = buildRes()
    await handler({ body: { username: '', avatar: null } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing data' })

    res = buildRes()
    await handler({ body: { username: 'bad name', avatar: {} } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid username' })
  })

  it('upserts a profile and returns the saved row', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1,
        username: 'Titi',
        avatar: { eyeType: 'happy' },
      }],
    })

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'post', '/profile')
    const res = buildRes()

    await handler({
      body: {
        username: 'Titi',
        avatar: { eyeType: 'happy' },
      },
    }, res)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['Titi', JSON.stringify({ eyeType: 'happy' })]
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    })
  })

  it('repairs the users id sequence and retries when the primary key sequence drifted', async () => {
    const duplicateIdError = Object.assign(new Error('duplicate key value violates unique constraint "users_pkey"'), {
      code: '23505',
      constraint: 'users_pkey',
    })

    mockQuery
      .mockRejectedValueOnce(duplicateIdError)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 65,
          username: 'Titi',
          avatar: { eyeType: 'happy' },
        }],
      })

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'post', '/profile')
    const res = buildRes()

    await handler({
      body: {
        username: 'Titi',
        avatar: { eyeType: 'happy' },
      },
    }, res)

    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('pg_get_serial_sequence')
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      id: 65,
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    })
  })

  it('returns 500 when profile upsert throws a non-recoverable error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'post', '/profile')
    const res = buildRes()

    await handler({
      body: {
        username: 'Titi',
        avatar: { eyeType: 'happy' },
      },
    }, res)

    expect(consoleError).toHaveBeenCalledWith('Profile upsert failed:', expect.any(Error))
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })
  })

  it('rethrows duplicate errors that are not users_pkey and returns 500', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const duplicateOnOtherConstraint = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'users_username_key',
    })
    mockQuery.mockRejectedValueOnce(duplicateOnOtherConstraint)

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'post', '/profile')
    const res = buildRes()

    await handler({
      body: {
        username: 'Titi',
        avatar: { eyeType: 'happy' },
      },
    }, res)

    expect(consoleError).toHaveBeenCalledWith('Profile upsert failed:', duplicateOnOtherConstraint)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })
  })
})
