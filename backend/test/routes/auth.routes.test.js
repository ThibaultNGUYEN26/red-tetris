import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetRateLimiters } from '../../src/middleware/rateLimiter.js'

const mockQuery = vi.fn()
const VALID_PASSWORD = 'Secret123!'
const sendResetPasswordEmail = vi.fn()
const mockBcryptHash = vi.fn(async (password) => `hashed:${password}`)
const mockBcryptCompare = vi.fn(async (password, hash) => hash === `hashed:${password}`)

vi.mock('../../src/config/db.js', () => ({
  pool: {
    query: mockQuery,
  },
}))

vi.mock('../../src/services/mail.service.js', () => ({
  sendResetPasswordEmail,
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: mockBcryptHash,
    compare: mockBcryptCompare,
  },
  hash: mockBcryptHash,
  compare: mockBcryptCompare,
}))

const buildRes = () => {
  const res = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
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

describe('auth routes', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    sendResetPasswordEmail.mockReset()
    mockBcryptHash.mockClear()
    mockBcryptCompare.mockClear()
    resetRateLimiters()
    delete process.env.ENABLE_RATE_LIMIT_TESTS
  })

  it('validates register payload', async () => {
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/register')

    let res = buildRes()
    await handler({ body: { username: '', email: '', password: '', confirmPassword: '', avatar: null } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({}, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'bad name', email: 'test@example.com', password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD, avatar: {} } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'Titi', email: 'wrong-email', password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD, avatar: {} } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'Titi', email: 'test@example.com', password: '123', confirmPassword: '123', avatar: {} } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'Titi', email: 'test@example.com', password: VALID_PASSWORD, confirmPassword: 'Other123!', avatar: {} } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('validates each password complexity rule on register', async () => {
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/register')

    const cases = [
      ['secret123!', 'Password must contain at least 1 uppercase letter'],
      ['SECRET123!', 'Password must contain at least 1 lowercase letter'],
      ['SecretABC!', 'Password must contain at least 1 number'],
      ['Secret123', 'Password must contain at least 1 special character'],
    ]

    for (const [password, error] of cases) {
      const res = buildRes()
      await handler({
        body: {
          username: 'Titi',
          email: 'titi@example.com',
          password,
          confirmPassword: password,
          avatar: {},
        },
      }, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error })
    }
  })

  it('registers a new user', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, username: 'Titi', email: 'titi@example.com', avatar: { eyeType: 'happy' } }],
      })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/register')
    const res = buildRes()

    await handler({
      body: {
        username: 'Titi',
        email: 'titi@example.com',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
        avatar: { eyeType: 'happy' },
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      username: 'Titi',
      email: 'titi@example.com',
      avatar: { eyeType: 'happy' },
    }))
  })

  it('returns 409 when registering an existing username', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ username: 'Titi', email: 'other@example.com' }] })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/register')
    const res = buildRes()

    await handler({
      body: {
        username: 'Titi',
        email: 'titi@example.com',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
        avatar: { eyeType: 'happy' },
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Username already exists' })
  })

  it('returns 409 when registering an existing email', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ username: 'SomeoneElse', email: 'titi@example.com' }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/register')
    const res = buildRes()

    await handler({
      body: {
        username: 'Titi',
        email: 'titi@example.com',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
        avatar: { eyeType: 'happy' },
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Email already exists' })
  })

  it('returns restore metadata when registering a soft-deleted account', async () => {
    const deleteAfter = new Date(Date.now() + 1000 * 60 * 60).toISOString()
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        username: 'Titi',
        email: 'titi@example.com',
        deleted_at: new Date().toISOString(),
        delete_after: deleteAfter,
      }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/register')
    const res = buildRes()

    await handler({
      body: {
        username: 'Titi',
        email: 'titi@example.com',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
        avatar: {},
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Account scheduled for deletion',
      canRestore: true,
      deleteAfter,
    })
  })

  it('maps register unique constraint errors', async () => {
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/register')

    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockRejectedValueOnce({ code: '23505', constraint: 'users_email_key' })

    let res = buildRes()
    await handler({
      body: {
        username: 'Titi',
        email: 'titi@example.com',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
        avatar: {},
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Email already exists' })

    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockRejectedValueOnce({ code: '23505', constraint: 'users_username_key' })

    res = buildRes()
    await handler({
      body: {
        username: 'Riri',
        email: 'riri@example.com',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
        avatar: {},
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Username already exists' })
  })

  it('returns server error when register fails unexpectedly', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockRejectedValueOnce(new Error('db down'))

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/register')
    const res = buildRes()

    await handler({
      body: {
        username: 'Titi',
        email: 'titi@example.com',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
        avatar: {},
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })

    consoleError.mockRestore()
  })

  it('validates login payload', async () => {
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')

    let res = buildRes()
    await handler({ body: { username: '', password: '' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({}, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'bad name', password: VALID_PASSWORD } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 404 when login username does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'User does not exist' })
  })

  it('returns 401 when user has no password hash', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, username: 'Titi', avatar: { eyeType: 'happy' }, password_hash: null }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 when password is incorrect', async () => {
    const hash = await mockBcryptHash(VALID_PASSWORD, 10)
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, username: 'Titi', email: 'titi@example.com', avatar: { eyeType: 'happy' }, password_hash: hash }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: 'wrong-pass' } }, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('logs in with valid credentials', async () => {
    const hash = await mockBcryptHash(VALID_PASSWORD, 10)
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, username: 'Titi', email: 'titi@example.com', avatar: { eyeType: 'happy' }, password_hash: hash }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      username: 'Titi',
      email: 'titi@example.com',
      avatar: { eyeType: 'happy' },
    }))
    expect(res.cookie).toHaveBeenCalledWith('red_tetris_session', expect.any(String), expect.objectContaining({
      httpOnly: true,
      sameSite: 'lax',
    }))
  })

  it('blocks login for accounts scheduled for deletion', async () => {
    const hash = await mockBcryptHash(VALID_PASSWORD, 10)
    const deleteAfter = new Date(Date.now() + 1000 * 60 * 60).toISOString()
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        username: 'Titi',
        email: 'titi@example.com',
        avatar: { eyeType: 'happy' },
        password_hash: hash,
        deleted_at: new Date().toISOString(),
        delete_after: deleteAfter,
      }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Account scheduled for deletion',
      canRestore: true,
      deleteAfter,
    }))
  })

  it('returns server error when login query fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })

    consoleError.mockRestore()
  })

  it('restores a soft-deleted account with valid credentials', async () => {
    const hash = await mockBcryptHash(VALID_PASSWORD, 10)
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          username: 'Titi',
          email: 'titi@example.com',
          avatar: { eyeType: 'happy' },
          password_hash: hash,
          deleted_at: new Date().toISOString(),
          delete_after: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, username: 'Titi', email: 'titi@example.com', avatar: { eyeType: 'happy' } }],
      })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/restore')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)

    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SET deleted_at = NULL'),
      ['Titi']
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.cookie).toHaveBeenCalled()
  })

  it('validates restore failure cases', async () => {
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/restore')

    let res = buildRes()
    await handler({ body: { username: '', password: '' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({}, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'bad name', password: VALID_PASSWORD } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    res = buildRes()
    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)
    expect(res.status).toHaveBeenCalledWith(404)

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ username: 'Titi', deleted_at: null, delete_after: null, password_hash: 'hashed' }],
    })
    res = buildRes()
    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        username: 'Titi',
        deleted_at: new Date().toISOString(),
        delete_after: new Date(Date.now() - 1000).toISOString(),
        password_hash: 'hashed',
      }],
    })
    res = buildRes()
    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)
    expect(res.status).toHaveBeenCalledWith(410)

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        username: 'Titi',
        deleted_at: new Date().toISOString(),
        delete_after: new Date(Date.now() + 1000 * 60).toISOString(),
        password_hash: null,
      }],
    })
    res = buildRes()
    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('rejects restore when password is invalid or restore update expires', async () => {
    const hash = await mockBcryptHash(VALID_PASSWORD, 10)
    const deletedUser = {
      username: 'Titi',
      deleted_at: new Date().toISOString(),
      delete_after: new Date(Date.now() + 1000 * 60).toISOString(),
      password_hash: hash,
    }

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/restore')

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [deletedUser] })
    let res = buildRes()
    await handler({ body: { username: 'Titi', password: 'wrong-pass' } }, res)
    expect(res.status).toHaveBeenCalledWith(401)

    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [deletedUser] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
    res = buildRes()
    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)
    expect(res.status).toHaveBeenCalledWith(410)
  })

  it('returns server error when restore query fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/restore')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })

    consoleError.mockRestore()
  })

  it('validates forgot password payload', async () => {
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/forgot-password')

    let res = buildRes()
    await handler({ body: { username: '', email: '' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({}, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'bad name', email: 'titi@example.com' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'Titi', email: 'bad-email' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns a reset link when forgot password email exists', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 8 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
    sendResetPasswordEmail.mockResolvedValueOnce()

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/forgot-password')
    const res = buildRes()

    await handler({ body: { username: 'Titi', email: 'titi@example.com' } }, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(sendResetPasswordEmail).toHaveBeenCalledWith(expect.objectContaining({
      username: 'Titi',
      email: 'titi@example.com',
      resetUrl: expect.stringContaining('/reset-password?token='),
    }))
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      message: 'Password reset email sent',
    })
  })

  it('uses a configured frontend URL for reset links', async () => {
    const previousFrontendUrl = process.env.FRONTEND_URL
    process.env.FRONTEND_URL = 'https://red-tetris.example/'

    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 8 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
    sendResetPasswordEmail.mockResolvedValueOnce()

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/forgot-password')
    const res = buildRes()

    await handler({ body: { username: 'Titi', email: 'titi@example.com' } }, res)

    expect(sendResetPasswordEmail).toHaveBeenCalledWith(expect.objectContaining({
      resetUrl: expect.stringContaining('https://red-tetris.example/reset-password?token='),
    }))

    if (previousFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL
    } else {
      process.env.FRONTEND_URL = previousFrontendUrl
    }
  })

  it('uses the local frontend URL for reset links when none is configured', async () => {
    const previousFrontendUrl = process.env.FRONTEND_URL
    delete process.env.FRONTEND_URL

    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 8 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
    sendResetPasswordEmail.mockResolvedValueOnce()

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/forgot-password')
    const res = buildRes()

    await handler({ body: { username: 'Titi', email: 'titi@example.com' } }, res)

    expect(sendResetPasswordEmail).toHaveBeenCalledWith(expect.objectContaining({
      resetUrl: expect.stringContaining('http://localhost:8080/reset-password?token='),
    }))

    if (previousFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL
    } else {
      process.env.FRONTEND_URL = previousFrontendUrl
    }
  })

  it('succeeds silently when forgot password email does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/forgot-password')
    const res = buildRes()

    await handler({ body: { username: 'Titi', email: 'missing@example.com' } }, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      message: 'If that email exists, a reset link has been generated',
    })
  })

  it('maps forgot password mail configuration and generic failures', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/forgot-password')

    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 8 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
    sendResetPasswordEmail.mockRejectedValueOnce(new Error('Mail service not configured'))

    let res = buildRes()
    await handler({ body: { username: 'Titi', email: 'titi@example.com' } }, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Mail service not configured' })

    mockQuery.mockRejectedValueOnce(new Error('db down'))

    res = buildRes()
    await handler({ body: { username: 'Titi', email: 'titi@example.com' } }, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })

    consoleError.mockRestore()
  })

  it('validates reset password payload', async () => {
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/reset-password')

    let res = buildRes()
    await handler({ body: { token: '', password: '', confirmPassword: '' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({}, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { token: 'abc', password: '123', confirmPassword: '123' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { token: 'abc', password: VALID_PASSWORD, confirmPassword: 'Different123!' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects an invalid reset token', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/reset-password')
    const res = buildRes()

    await handler({ body: { token: 'bad-token', password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired reset link' })
  })

  it('updates the password for a valid reset token', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 3 }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/reset-password')
    const res = buildRes()

    await handler({ body: { token: 'good-token', password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD } }, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ ok: true, message: 'Password updated' })
  })

  it('returns server error when reset password update fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/reset-password')
    const res = buildRes()

    await handler({ body: { token: 'good-token', password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD } }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })

    consoleError.mockRestore()
  })

  it('short-circuits auth endpoints when rate limited', async () => {
    process.env.ENABLE_RATE_LIMIT_TESTS = 'true'
    vi.setSystemTime(new Date('2026-05-01T00:00:00Z'))
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const endpoints = [
      ['post', '/register'],
      ['post', '/login'],
      ['post', '/restore'],
      ['post', '/forgot-password'],
      ['post', '/reset-password'],
    ]

    for (const [method, path] of endpoints) {
      resetRateLimiters()
      const handler = getHandler(router, method, path)
      const req = {
        body: {},
        headers: {},
        ip: '198.51.100.50',
        originalUrl: path,
      }

      for (let i = 0; i < 20; i += 1) {
        await handler(req, buildRes())
      }

      const res = buildRes()
      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(429)
      expect(res.json).toHaveBeenCalledWith({ error: 'Too many requests' })
    }
  })

  it('allows login with the new password after reset', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 3 }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const resetHandler = getHandler(router, 'post', '/reset-password')
    const loginHandler = getHandler(router, 'post', '/login')

    let res = buildRes()
    await resetHandler({ body: { token: 'good-token', password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD } }, res)

    expect(res.status).toHaveBeenCalledWith(200)

    const updatedHash = mockQuery.mock.calls[0][1][0]
    expect(await mockBcryptCompare(VALID_PASSWORD, updatedHash)).toBe(true)

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 3, username: 'Titi', email: 'titi@example.com', avatar: { eyeType: 'happy' }, password_hash: updatedHash }],
    })

    res = buildRes()
    await loginHandler({ body: { username: 'Titi', password: VALID_PASSWORD } }, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 3,
      username: 'Titi',
      email: 'titi@example.com',
      avatar: { eyeType: 'happy' },
    }))
    expect(res.cookie).toHaveBeenCalledWith('red_tetris_session', expect.any(String), expect.objectContaining({
      httpOnly: true,
      sameSite: 'lax',
    }))
  })

  it('clears the session cookie on logout', async () => {
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/logout')
    const res = buildRes()

    await handler({}, res)

    expect(res.clearCookie).toHaveBeenCalledWith('red_tetris_session', expect.objectContaining({
      httpOnly: true,
      sameSite: 'lax',
    }))
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })

  it('soft deletes the authenticated account and clears the session cookie', async () => {
    const deleteAfter = new Date(Date.now() + 1000 * 60 * 60).toISOString()
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        username: 'Titi',
        deleted_at: new Date().toISOString(),
        delete_after: deleteAfter,
      }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'delete', '/account')
    const res = buildRes()

    await handler({ body: { username: 'Titi' } }, res)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SET deleted_at = NOW()'),
      ['Titi', 30]
    )
    expect(res.clearCookie).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: true,
      username: 'Titi',
      deleteAfter,
    }))
  })

  it('rejects unauthenticated account deletion', async () => {
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'delete', '/account')
    const res = buildRes()

    await handler({ body: {} }, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' })
  })

  it('returns not found when authenticated account deletion finds no user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'delete', '/account')
    const res = buildRes()

    await handler({ body: { username: 'Titi' } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' })
  })

  it('returns server error when authenticated account deletion fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQuery.mockRejectedValueOnce(new Error('db down'))

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'delete', '/account')
    const res = buildRes()

    await handler({ body: { username: 'Titi' } }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })

    consoleError.mockRestore()
  })
})
