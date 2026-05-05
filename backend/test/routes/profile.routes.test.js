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
    clearCookie: vi.fn(),
    set: vi.fn(),
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

  it('exports the authenticated account data', async () => {
    const createdAt = new Date('2026-01-01T10:00:00.000Z')
    const resetExpiresAt = new Date('2026-01-01T10:30:00.000Z')

    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          username: 'Titi',
          email: 'titi@example.com',
          avatar: { eyeType: 'happy' },
          solo_games_played: 2,
          highest_solo_score: 900,
          multiplayer_games_played: 3,
          multiplayer_wins: 2,
          multiplayer_losses: 1,
          created_at: createdAt,
          password_hash_stored: true,
          reset_password_token_active: true,
          reset_password_expires_at: resetExpiresAt,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 10, username: 'Titi', score: 900 }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 20, username: 'Titi', score: 800, game_mode: 'classic' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 30, player_one: 'Titi', player_two: 'Riri', score: 1200 }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 40, name: 'Room-ABC', host: 'Titi', players: ['Titi'] }],
      })

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/account/export')
    const res = buildRes()

    await handler({ body: { username: 'Titi' } }, res)

    expect(res.set).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="red-tetris-Titi-data.json"'
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      exportedAt: expect.any(String),
      account: {
        id: 1,
        username: 'Titi',
        email: 'titi@example.com',
        avatar: { eyeType: 'happy' },
        createdAt,
        passwordHashStored: true,
        resetPasswordTokenActive: true,
        resetPasswordExpiresAt: resetExpiresAt,
      },
      profileStats: {
        soloGamesPlayed: 2,
        highestSoloScore: 900,
        multiplayerGamesPlayed: 3,
        multiplayerWins: 2,
        multiplayerLosses: 1,
      },
      scores: {
        solo: [{ id: 10, username: 'Titi', score: 900 }],
        multiplayer: [{ id: 20, username: 'Titi', score: 800, game_mode: 'classic' }],
        cooperative: [{ id: 30, player_one: 'Titi', player_two: 'Riri', score: 1200 }],
      },
      rooms: [{ id: 40, name: 'Room-ABC', host: 'Titi', players: ['Titi'] }],
    }))
  })

  it('returns 401 when exporting without authentication', async () => {
    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/account/export')
    const res = buildRes()

    await handler({ body: {} }, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' })
  })

  it('deletes authenticated account data and clears the session cookie', async () => {
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ username: 'Titi' }] })
      .mockResolvedValueOnce({})

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'delete', '/account')
    const res = buildRes()

    await handler({ body: { username: 'Titi' } }, res)

    expect(mockQuery).toHaveBeenNthCalledWith(1, 'BEGIN')
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM rooms'),
      ['Titi']
    )
    expect(mockQuery).toHaveBeenNthCalledWith(
      6,
      'DELETE FROM users WHERE username = $1 RETURNING username',
      ['Titi']
    )
    expect(mockQuery).toHaveBeenNthCalledWith(7, 'COMMIT')
    expect(res.clearCookie).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ ok: true, message: 'Account deleted' })
  })

  it('rolls back when account deletion fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce({})

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'delete', '/account')
    const res = buildRes()

    await handler({ body: { username: 'Titi' } }, res)

    expect(mockQuery).toHaveBeenNthCalledWith(1, 'BEGIN')
    expect(mockQuery).toHaveBeenLastCalledWith('ROLLBACK')
    expect(consoleError).toHaveBeenCalledWith('Account deletion failed:', expect.any(Error))
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })
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
        solo_highest_level: 8,
        solo_highest_lines: 42,
        solo_total_lines: 120,
        solo_highest_tetris: 3,
        solo_total_tetris: 9,
        solo_average_score: 4500,
        solo_duration_seconds: 3661,
        solo_longest_duration_seconds: 1800,
        multi_highest_score: 8000,
        multi_highest_level: 6,
        multi_highest_lines: 30,
        multi_total_lines: 70,
        multi_highest_lines_sent: 12,
        multi_total_lines_sent: 32,
        multi_highest_tetris: 2,
        multi_total_tetris: 5,
        multi_average_score: 3200,
        multi_duration_seconds: 61,
        multi_longest_duration_seconds: 45,
        coop_games: 2,
        coop_highest_score: 6000,
        coop_highest_level: 5,
        coop_highest_lines: 24,
        coop_total_lines: 44,
        coop_highest_tetris: 1,
        coop_total_tetris: 2,
        coop_duration_seconds: 125,
        coop_longest_duration_seconds: 90,
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
      advanced: {
        timePlayed: {
          total: 3847,
          solo: 3661,
          multi: 61,
          coop: 125,
        },
        solo: {
          games: 3,
          highestScore: 9000,
          averageScore: 4500,
          highestLevel: 8,
          highestLines: 42,
          totalLines: 120,
          highestTetris: 3,
          totalTetris: 9,
          longestGameSeconds: 1800,
        },
        multi: {
          games: 7,
          wins: 4,
          losses: 3,
          winLossRatio: 1.33,
          highestScore: 8000,
          averageScore: 3200,
          highestLevel: 6,
          highestLines: 30,
          totalLines: 70,
          highestLinesSent: 12,
          totalLinesSent: 32,
          highestTetris: 2,
          totalTetris: 5,
          longestGameSeconds: 45,
        },
        coop: {
          games: 2,
          highestScore: 6000,
          highestLevel: 5,
          highestLines: 24,
          totalLines: 44,
          highestTetris: 1,
          totalTetris: 2,
          longestGameSeconds: 90,
        },
      },
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

    expect(mockIsUsernameConnected).toHaveBeenCalledWith('Titi', null)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      username: 'Titi',
      connected: true,
    })
  })

  it('passes socketId through when resolving connection state', async () => {
    mockIsUsernameConnected.mockReturnValueOnce(false)

    const { default: router } = await import('../../src/routes/profile.routes.js')
    const handler = getHandler(router, 'get', '/player/connection')
    const res = buildRes()

    await handler({ query: { username: 'Titi', socketId: 'socket-1' } }, res)

    expect(mockIsUsernameConnected).toHaveBeenCalledWith('Titi', 'socket-1')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      username: 'Titi',
      connected: false,
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
      advanced: {
        timePlayed: {
          total: 0,
          solo: 0,
          multi: 0,
          coop: 0,
        },
        solo: {
          games: 0,
          highestScore: 0,
          averageScore: 0,
          highestLevel: 1,
          highestLines: 0,
          totalLines: 0,
          highestTetris: 0,
          totalTetris: 0,
          longestGameSeconds: 0,
        },
        multi: {
          games: 0,
          wins: 0,
          losses: 0,
          winLossRatio: 0,
          highestScore: 0,
          averageScore: 0,
          highestLevel: 1,
          highestLines: 0,
          totalLines: 0,
          highestLinesSent: 0,
          totalLinesSent: 0,
          highestTetris: 0,
          totalTetris: 0,
          longestGameSeconds: 0,
        },
        coop: {
          games: 0,
          highestScore: 0,
          highestLevel: 1,
          highestLines: 0,
          totalLines: 0,
          highestTetris: 0,
          totalTetris: 0,
          longestGameSeconds: 0,
        },
      },
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
