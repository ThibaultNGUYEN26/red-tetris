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

vi.mock('../src/socket/index.js', () => ({
  default: setupSocketsMock,
}))

vi.mock('../src/config/db.js', () => ({
  pool: {
    query: poolQueryMock,
  },
}))

vi.mock('../src/config/env.js', () => ({}))

describe('server bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('DB_HOST', 'c1r3p8')
    vi.stubEnv('BACKEND_HOST', '0.0.0.0')
  })

  it('wires middleware, routes, sockets, and starts listening', async () => {
    await import('../src/server.js')

    expect(corsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: expect.arrayContaining([
          'http://c1r3p8:5173',
          'http://localhost:5173',
          'http://127.0.0.1:5173',
        ]),
      })
    )
    expect(appUse).toHaveBeenCalledWith('cors-middleware')
    expect(appUse).toHaveBeenCalledWith('json-middleware')
    expect(appUse).toHaveBeenCalledWith('/api', 'profile-routes')
    expect(appUse).toHaveBeenCalledWith('/api/rooms', 'rooms-routes')

    expect(createServerMock).toHaveBeenCalledWith(appInstance)
    expect(serverCtorMock).toHaveBeenCalled()
    const ioInstance = serverCtorMock.mock.results[0].value
    expect(appSet).toHaveBeenCalledWith('io', ioInstance)
    expect(setupSocketsMock).toHaveBeenCalledWith(ioInstance)

    expect(listenMock).toHaveBeenCalledWith(3000, '0.0.0.0', expect.any(Function))
    expect(poolQueryMock).toHaveBeenCalledWith('SELECT 1')
  })
})
