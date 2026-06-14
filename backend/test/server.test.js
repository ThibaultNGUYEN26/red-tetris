import os from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  appUse,
  appGet,
  appOptions,
  appSet,
  listenMock,
  createServerMock,
  serverCtorMock,
  corsMock,
  setupSocketsMock,
  poolQueryMock,
  ensureSchemaMock,
  purgeExpiredDeletedAccountsMock,
  expressJsonMock,
  appInstance,
} = vi.hoisted(() => {
  const appUse = vi.fn()
  const appGet = vi.fn()
  const appOptions = vi.fn()
  const appSet = vi.fn()
  const listenMock = vi.fn((port, host, callback) => {
    callback?.()
  })
  const createServerMock = vi.fn(() => ({
    listen: listenMock,
  }))
  const serverCtorMock = vi.fn(function ServerMock() {
    return { io: true }
  })
  const corsMock = vi.fn(() => 'cors-middleware')
  const setupSocketsMock = vi.fn()
  const poolQueryMock = vi.fn().mockResolvedValue({ rows: [] })
  const ensureSchemaMock = vi.fn().mockResolvedValue(undefined)
  const purgeExpiredDeletedAccountsMock = vi.fn().mockResolvedValue(undefined)
  const expressJsonMock = vi.fn(() => 'json-middleware')
  const appInstance = {
    use: appUse,
    get: appGet,
    options: appOptions,
    set: appSet,
  }
  return {
    appUse,
    appGet,
    appOptions,
    appSet,
    listenMock,
    createServerMock,
    serverCtorMock,
    corsMock,
    setupSocketsMock,
    poolQueryMock,
    ensureSchemaMock,
    purgeExpiredDeletedAccountsMock,
    expressJsonMock,
    appInstance,
  }
})

vi.mock('express', () => {
  const express = vi.fn(() => appInstance)
  express.json = expressJsonMock
  return { default: express }
})

vi.mock('http', () => ({
  createServer: createServerMock,
}))

vi.mock('socket.io', () => ({
  Server: serverCtorMock,
}))

vi.mock('cors', () => ({
  default: corsMock,
}))

vi.mock('../src/routes/profile.routes.js', () => ({
  default: 'profile-routes',
}))

vi.mock('../src/routes/rooms.routes.js', () => ({
  default: 'rooms-routes',
}))

vi.mock('../src/routes/auth.routes.js', () => ({
  default: 'auth-routes',
}))

vi.mock('../src/routes/contact.routes.js', () => ({
  default: 'contact-routes',
}))

vi.mock('../src/routes/admin.routes.js', () => ({
  default: 'admin-routes',
}))

vi.mock('../src/socket/index.js', () => ({
  default: setupSocketsMock,
}))

vi.mock('../src/config/db.js', () => ({
  pool: {
    query: poolQueryMock,
  },
  ensureSchema: ensureSchemaMock,
}))

vi.mock('../src/services/accountDeletion.service.js', () => ({
  purgeExpiredDeletedAccounts: purgeExpiredDeletedAccountsMock,
}))

vi.mock('../src/config/env.js', () => ({}))

describe('server bootstrap', () => {
  const hostnameShort = (process.env.HOSTNAME || os.hostname()).replace(/\..*/, '')
  const frontendUrl = process.env.FRONTEND_URL || `http://${hostnameShort}:8080`
  const port = process.env.PORT || '3000'
  const getMiddleware = (pathOrIndex, maybeIndex = 0) => {
    if (typeof pathOrIndex === 'string') {
      const matchingCalls = appUse.mock.calls.filter(([path]) => path === pathOrIndex)
      return matchingCalls[maybeIndex]?.[1]
    }
    return appUse.mock.calls[pathOrIndex]?.[0]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useRealTimers()
    vi.stubEnv('FRONTEND_URL', frontendUrl)
    vi.stubEnv('PORT', port)
    vi.stubEnv('PERF_LOG', '')
    purgeExpiredDeletedAccountsMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('wires middleware, routes, sockets, and starts listening', async () => {
    await import('../src/server.js')

    expect(corsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: expect.any(Function),
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Username', 'X-Admin-Password'],
        credentials: true,
        optionsSuccessStatus: 204,
      })
    )
    const corsOrigin = corsMock.mock.calls[0][0].origin
    const corsCallback = vi.fn()
    corsOrigin(frontendUrl.split(',')[0], corsCallback)
    expect(corsCallback).toHaveBeenCalledWith(null, true)
    expect(appOptions).toHaveBeenCalledWith(/.*/, 'cors-middleware')
    expect(appUse).toHaveBeenCalledWith('cors-middleware')
    expect(appUse).toHaveBeenCalledWith('json-middleware')
    expect(appUse).toHaveBeenCalledWith('/api', 'profile-routes')
    expect(appUse).toHaveBeenCalledWith('/api/auth', 'auth-routes')
    expect(appUse).toHaveBeenCalledWith('/api/contact', 'contact-routes')
    expect(appUse).toHaveBeenCalledWith('/api/admin', 'admin-routes')
    expect(appUse).toHaveBeenCalledWith('/api/rooms', 'rooms-routes')

    expect(createServerMock).toHaveBeenCalledWith(appInstance)
    expect(serverCtorMock).toHaveBeenCalled()
    const ioInstance = serverCtorMock.mock.results[0].value
    expect(appSet).toHaveBeenCalledWith('io', ioInstance)
    expect(setupSocketsMock).toHaveBeenCalledWith(ioInstance)

    expect(listenMock).toHaveBeenCalledWith(port, '0.0.0.0')
    expect(poolQueryMock).toHaveBeenCalledWith('SELECT 1')
    expect(ensureSchemaMock).toHaveBeenCalled()
    expect(purgeExpiredDeletedAccountsMock).toHaveBeenCalled()
  })

  it('logs HTTP request durations when perf logging is enabled', async () => {
    vi.stubEnv('PERF_LOG', '1')
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})

    await import('../src/server.js')

    const perfMiddleware = appUse.mock.calls.find(
      ([middleware]) => typeof middleware === 'function'
    )?.[0]
    const req = { method: 'POST', originalUrl: '/api/rooms' }
    const res = {
      statusCode: 201,
      on: vi.fn((event, callback) => {
        if (event === 'finish') callback()
      }),
    }
    const next = vi.fn()

    perfMiddleware(req, res, next)

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function))
    expect(consoleInfo).toHaveBeenCalledWith(
      '[perf] http',
      expect.objectContaining({
        method: 'POST',
        path: '/api/rooms',
        status: 201,
        durationMs: expect.any(Number),
      })
    )
    expect(next).toHaveBeenCalled()
  })

  it('sets no-cache headers for /api requests', async () => {
    await import('../src/server.js')

    const middleware = getMiddleware('/api', 0)
    const res = { set: vi.fn() }
    const next = vi.fn()

    middleware({}, res, next)

    expect(res.set).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
    expect(res.set).toHaveBeenCalledWith('Pragma', 'no-cache')
    expect(res.set).toHaveBeenCalledWith('Expires', '0')
    expect(next).toHaveBeenCalled()
  })

  it('registers a health endpoint that returns ok', async () => {
    await import('../src/server.js')

    const healthHandler = appGet.mock.calls.find(([path]) => path === '/health')?.[1]
    const res = { json: vi.fn() }

    healthHandler({}, res)

    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })

  it('fails startup when DB initialization fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const dbError = new Error('db down')
    poolQueryMock.mockRejectedValueOnce(dbError)

    await expect(import('../src/server.js')).rejects.toThrow('db down')

    expect(consoleError).toHaveBeenCalledWith('DB connection failed:', dbError)
    expect(ensureSchemaMock).not.toHaveBeenCalled()
    expect(purgeExpiredDeletedAccountsMock).not.toHaveBeenCalled()
    expect(listenMock).not.toHaveBeenCalled()
  })

  it('logs scheduled purge failures after startup', async () => {
    vi.useFakeTimers()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const purgeError = new Error('purge failed')
    purgeExpiredDeletedAccountsMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(purgeError)

    await import('../src/server.js')
    await vi.advanceTimersByTimeAsync(1000 * 60 * 60 * 24)

    expect(purgeExpiredDeletedAccountsMock).toHaveBeenCalledTimes(2)
    expect(consoleError).toHaveBeenCalledWith(
      'Expired account purge failed:',
      purgeError
    )
  })

  it('falls back to default port and frontend URL when env vars are missing', async () => {
    vi.stubEnv('FRONTEND_URL', '')
    vi.stubEnv('PORT', '')

    await import('../src/server.js')

    expect(corsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: expect.any(Function),
      })
    )
    const corsOrigin = corsMock.mock.calls[0][0].origin
    const corsCallback = vi.fn()
    corsOrigin('http://localhost:8080', corsCallback)
    expect(corsCallback).toHaveBeenCalledWith(null, true)
    expect(serverCtorMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cors: {
          origin: ['http://localhost:8080'],
          credentials: true,
        },
        perMessageDeflate: false,
        httpCompression: false,
      })
    )
    expect(listenMock).toHaveBeenCalledWith(3000, '0.0.0.0')
  })
})
