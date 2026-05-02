import os from 'node:os'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  appUse,
  appGet,
  appSet,
  listenMock,
  createServerMock,
  serverCtorMock,
  corsMock,
  setupSocketsMock,
  poolQueryMock,
  ensureSchemaMock,
  expressJsonMock,
  appInstance,
} = vi.hoisted(() => {
  const appUse = vi.fn()
  const appGet = vi.fn()
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
  const expressJsonMock = vi.fn(() => 'json-middleware')
  const appInstance = {
    use: appUse,
    get: appGet,
    set: appSet,
  }
  return {
    appUse,
    appGet,
    appSet,
    listenMock,
    createServerMock,
    serverCtorMock,
    corsMock,
    setupSocketsMock,
    poolQueryMock,
    ensureSchemaMock,
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

vi.mock('../src/socket/index.js', () => ({
  default: setupSocketsMock,
}))

vi.mock('../src/config/db.js', () => ({
  pool: {
    query: poolQueryMock,
  },
  ensureSchema: ensureSchemaMock,
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
    vi.stubEnv('FRONTEND_URL', frontendUrl)
    vi.stubEnv('PORT', port)
  })

  it('wires middleware, routes, sockets, and starts listening', async () => {
    await import('../src/server.js')

    expect(corsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: frontendUrl,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true,
      })
    )
    expect(appUse).toHaveBeenCalledWith('cors-middleware')
    expect(appUse).toHaveBeenCalledWith('json-middleware')
    expect(appUse).toHaveBeenCalledWith('/api', 'profile-routes')
    expect(appUse).toHaveBeenCalledWith('/api/auth', 'auth-routes')
    expect(appUse).toHaveBeenCalledWith('/api/contact', 'contact-routes')
    expect(appUse).toHaveBeenCalledWith('/api/rooms', 'rooms-routes')

    expect(createServerMock).toHaveBeenCalledWith(appInstance)
    expect(serverCtorMock).toHaveBeenCalled()
    const ioInstance = serverCtorMock.mock.results[0].value
    expect(appSet).toHaveBeenCalledWith('io', ioInstance)
    expect(setupSocketsMock).toHaveBeenCalledWith(ioInstance)

    expect(listenMock).toHaveBeenCalledWith(port, '0.0.0.0', expect.any(Function))
    expect(poolQueryMock).toHaveBeenCalledWith('SELECT 1')
    expect(ensureSchemaMock).toHaveBeenCalled()
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

  it('logs requests on finish and calls next', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    await import('../src/server.js')

    const middleware = getMiddleware(3)
    const finishListeners = {}
    const req = { method: 'GET', originalUrl: '/api/test' }
    const res = {
      statusCode: 204,
      on: vi.fn((event, handler) => {
        finishListeners[event] = handler
      }),
    }
    const next = vi.fn()

    middleware(req, res, next)
    finishListeners.finish?.()

    expect(next).toHaveBeenCalled()
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function))
    expect(consoleLog).toHaveBeenCalledWith(
      expect.stringContaining('GET /api/test')
    )
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
    expect(listenMock).not.toHaveBeenCalled()
  })

  it('falls back to default port and frontend URL when env vars are missing', async () => {
    vi.stubEnv('FRONTEND_URL', '')
    vi.stubEnv('PORT', '')

    await import('../src/server.js')

    expect(corsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'http://localhost:8080',
      })
    )
    expect(serverCtorMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cors: {
          origin: 'http://localhost:8080',
          credentials: true,
        },
      })
    )
    expect(listenMock).toHaveBeenCalledWith(3000, '0.0.0.0', expect.any(Function))
  })
})
