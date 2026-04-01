import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()

vi.mock('../../src/config/db.js', () => ({
  pool: {
    query: mockQuery,
  },
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

  it('validates profile payloads before upserting', async () => {
    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'post', '/profile')

    let res = buildRes()
    await handler({ body: { username: '', avatar: null } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing data' })

    res = buildRes()
    await handler({ body: { username: 'ab', avatar: {} } }, res)
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
})
