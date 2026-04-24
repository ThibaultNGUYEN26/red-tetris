import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

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

describe('auth routes', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('validates register payload', async () => {
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/register')

    let res = buildRes()
    await handler({ body: { username: '', password: '', confirmPassword: '', avatar: null } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'bad name', password: '123456', confirmPassword: '123456', avatar: {} } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'Titi', password: '123', confirmPassword: '123', avatar: {} } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'Titi', password: '123456', confirmPassword: '654321', avatar: {} } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('registers a new user', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, username: 'Titi', avatar: { eyeType: 'happy' } }],
      })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/register')
    const res = buildRes()

    await handler({
      body: {
        username: 'Titi',
        password: 'secret123',
        confirmPassword: 'secret123',
        avatar: { eyeType: 'happy' },
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ id: 1, username: 'Titi', avatar: { eyeType: 'happy' } })
  })

  it('returns 409 when registering an existing username', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 4 }] })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/register')
    const res = buildRes()

    await handler({
      body: {
        username: 'Titi',
        password: 'secret123',
        confirmPassword: 'secret123',
        avatar: { eyeType: 'happy' },
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Username already exists' })
  })

  it('validates login payload', async () => {
    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')

    let res = buildRes()
    await handler({ body: { username: '', password: '' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)

    res = buildRes()
    await handler({ body: { username: 'bad name', password: 'secret123' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 401 when login credentials are invalid', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: 'secret123' } }, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' })
  })

  it('returns 401 when user has no password hash', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, username: 'Titi', avatar: { eyeType: 'happy' }, password_hash: null }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: 'secret123' } }, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 when password is incorrect', async () => {
    const hash = await bcrypt.hash('secret123', 10)
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, username: 'Titi', avatar: { eyeType: 'happy' }, password_hash: hash }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: 'wrong-pass' } }, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('logs in with valid credentials', async () => {
    const hash = await bcrypt.hash('secret123', 10)
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, username: 'Titi', avatar: { eyeType: 'happy' }, password_hash: hash }],
    })

    const { default: router } = await import('../../src/routes/auth.routes.js')
    const handler = getHandler(router, 'post', '/login')
    const res = buildRes()

    await handler({ body: { username: 'Titi', password: 'secret123' } }, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      username: 'Titi',
      avatar: { eyeType: 'happy' },
    })
  })
})
