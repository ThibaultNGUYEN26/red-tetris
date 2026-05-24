import crypto from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  assertSessionSecret,
  authenticateRequest,
  clearSessionCookie,
  createSessionToken,
  getBearerToken,
  getCookieToken,
  rejectUnauthenticated,
  requireAuth,
  resolveSocketUser,
  setSessionCookie,
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from '../../src/auth/session.js'

const buildRes = () => ({
  cookie: vi.fn(function cookie() {
    return this
  }),
  clearCookie: vi.fn(function clearCookie() {
    return this
  }),
  status: vi.fn(function status() {
    return this
  }),
  json: vi.fn(function json() {
    return this
  }),
})

const signPayload = (payload, secret = 'test-secret') =>
  crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')

describe('session auth helpers', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalSessionSecret = process.env.SESSION_SECRET
  const originalJwtSecret = process.env.JWT_SECRET
  const originalDbPassword = process.env.DB_PASSWORD
  const originalDisableAuthTestFallback = process.env.DISABLE_AUTH_TEST_FALLBACK
  const originalCookieSameSite = process.env.COOKIE_SAME_SITE
  const originalVitest = process.env.VITEST
  const originalVitestWorkerId = process.env.VITEST_WORKER_ID

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = originalSessionSecret
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalJwtSecret
    if (originalDbPassword === undefined) delete process.env.DB_PASSWORD
    else process.env.DB_PASSWORD = originalDbPassword
    if (originalDisableAuthTestFallback === undefined) delete process.env.DISABLE_AUTH_TEST_FALLBACK
    else process.env.DISABLE_AUTH_TEST_FALLBACK = originalDisableAuthTestFallback
    if (originalCookieSameSite === undefined) delete process.env.COOKIE_SAME_SITE
    else process.env.COOKIE_SAME_SITE = originalCookieSameSite
    if (originalVitest === undefined) delete process.env.VITEST
    else process.env.VITEST = originalVitest
    if (originalVitestWorkerId === undefined) delete process.env.VITEST_WORKER_ID
    else process.env.VITEST_WORKER_ID = originalVitestWorkerId
    vi.useRealTimers()
  })

  it('creates and verifies signed session tokens', () => {
    process.env.SESSION_SECRET = 'test-secret'

    const token = createSessionToken({ id: 7, username: 'Titi' })

    expect(token).toContain('.')
    expect(verifySessionToken(token)).toEqual({ id: '7', username: 'Titi' })
    expect(authenticateRequest({
      headers: { authorization: `Bearer ${token}` },
    })).toEqual({ id: '7', username: 'Titi' })
  })

  it('uses the dev secret outside production and username as the default subject', () => {
    delete process.env.SESSION_SECRET
    process.env.NODE_ENV = 'development'
    delete process.env.JWT_SECRET
    delete process.env.DB_PASSWORD

    const defaultToken = createSessionToken({ username: 'DefaultUser' })
    expect(verifySessionToken(defaultToken)).toEqual({ id: 'DefaultUser', username: 'DefaultUser' })

    process.env.NODE_ENV = 'production'
    expect(() => assertSessionSecret()).toThrow('SESSION_SECRET is required in production')
  })

  it('rejects invalid session users and malformed tokens', () => {
    expect(() => createSessionToken({ id: 1, username: 'bad name' })).toThrow('Invalid session user')
    expect(() => createSessionToken({ id: 1 })).toThrow('Invalid session user')
    expect(verifySessionToken()).toBeNull()
    expect(verifySessionToken('missing-signature')).toBeNull()
    expect(verifySessionToken('.signature')).toBeNull()
    expect(verifySessionToken('payload.')).toBeNull()
    expect(verifySessionToken('payload.short')).toBeNull()
  })

  it('rejects tampered, expired, invalid, and undecodable tokens', () => {
    process.env.SESSION_SECRET = 'test-secret'
    vi.setSystemTime(new Date('2026-05-01T00:00:00Z'))

    const token = createSessionToken({ id: 1, username: 'Titi' })
    const [payload, signature] = token.split('.')
    expect(verifySessionToken(`${payload}.${signature}x`)).toBeNull()

    const invalidUsernamePayload = Buffer.from(JSON.stringify({
      sub: '1',
      username: 'bad name',
      exp: Date.now() + 1000,
    })).toString('base64url')
    const invalidUsernameSignature = signPayload(invalidUsernamePayload)
    expect(verifySessionToken(`${invalidUsernamePayload}.${invalidUsernameSignature}`)).toBeNull()

    const missingUsernamePayload = Buffer.from(JSON.stringify({
      sub: '1',
      exp: Date.now() + 1000,
    })).toString('base64url')
    expect(verifySessionToken(`${missingUsernamePayload}.${signPayload(missingUsernamePayload)}`)).toBeNull()

    const invalidExpPayload = Buffer.from(JSON.stringify({
      sub: '1',
      username: 'Titi',
      exp: 'not-a-number',
    })).toString('base64url')
    expect(verifySessionToken(`${invalidExpPayload}.${signPayload(invalidExpPayload)}`)).toBeNull()

    vi.setSystemTime(new Date('2026-05-09T00:00:00Z'))
    expect(verifySessionToken(token)).toBeNull()

    const badPayload = Buffer.from('{not-json').toString('base64url')
    const badSignature = signPayload(badPayload)
    expect(verifySessionToken(`${badPayload}.${badSignature}`)).toBeNull()
  })

  it('parses bearer headers and rejects missing auth', () => {
    expect(getBearerToken({ headers: { authorization: 'Bearer abc.def' } })).toBe('abc.def')
    expect(getBearerToken({ headers: { Authorization: 'Bearer upper.case' } })).toBe('upper.case')
    expect(getBearerToken({ headers: { authorization: 'Basic abc' } })).toBe('')

    process.env.NODE_ENV = 'production'
    const res = buildRes()
    rejectUnauthenticated(res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' })

    const next = vi.fn()
    requireAuth({ headers: {}, body: {} }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('accepts authenticated requests and test fallback identities', () => {
    process.env.SESSION_SECRET = 'test-secret'
    process.env.NODE_ENV = 'production'
    const token = createSessionToken({ id: 1, username: 'Titi' })
    const req = { headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` } }
    const res = buildRes()
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(req.auth).toEqual({ id: '1', username: 'Titi' })
    expect(next).toHaveBeenCalled()
    expect(getCookieToken(req)).toBe(token)
    expect(getCookieToken({
      headers: { cookie: `${SESSION_COOKIE_NAME}=%E0%A4%A` },
    })).toBe('')

    const cookieRes = buildRes()
    setSessionCookie(cookieRes, token)
    clearSessionCookie(cookieRes)
    expect(cookieRes.cookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, token, expect.objectContaining({
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    }))
    expect(cookieRes.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, expect.objectContaining({
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    }))

    process.env.COOKIE_SAME_SITE = 'none'
    const crossSiteCookieRes = buildRes()
    setSessionCookie(crossSiteCookieRes, token)
    clearSessionCookie(crossSiteCookieRes)
    expect(crossSiteCookieRes.cookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, token, expect.objectContaining({
      secure: true,
      sameSite: 'none',
    }))
    expect(crossSiteCookieRes.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, expect.objectContaining({
      secure: true,
      sameSite: 'none',
    }))

    process.env.COOKIE_SAME_SITE = 'invalid'
    const fallbackCookieRes = buildRes()
    setSessionCookie(fallbackCookieRes, token)
    expect(fallbackCookieRes.cookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, token, expect.objectContaining({
      sameSite: 'lax',
    }))

    process.env.NODE_ENV = 'test'
    const fallbackReq = { headers: {}, body: { username: 'FallbackUser' } }
    const fallbackNext = vi.fn()
    requireAuth(fallbackReq, buildRes(), fallbackNext)
    expect(fallbackReq.auth).toEqual({ username: 'FallbackUser' })
    expect(fallbackNext).toHaveBeenCalled()

    expect(authenticateRequest({ body: { host: 'HostUser' } })).toEqual({ username: 'HostUser' })
    expect(authenticateRequest({ params: { username: 'ParamUser' } })).toEqual({ username: 'ParamUser' })
    expect(authenticateRequest({ body: { username: 'bad name' } })).toBeNull()

    process.env.DISABLE_AUTH_TEST_FALLBACK = 'true'
    expect(authenticateRequest({ body: { username: 'FallbackUser' } })).toBeNull()
  })

  it('allows test identity fallback through the Vitest worker environment', () => {
    process.env.NODE_ENV = 'development'
    process.env.VITEST = 'false'
    process.env.VITEST_WORKER_ID = '1'
    delete process.env.DISABLE_AUTH_TEST_FALLBACK

    expect(authenticateRequest({ body: { username: 'WorkerUser' } })).toEqual({
      username: 'WorkerUser',
    })
  })

  it('resolves socket users from tokens, test payloads, socket state, and failures', () => {
    process.env.SESSION_SECRET = 'test-secret'
    process.env.NODE_ENV = 'production'
    const token = createSessionToken({ id: 9, username: 'TokenUser' })
    const socket = { data: {}, handshake: { auth: {}, headers: {} } }

    expect(resolveSocketUser(socket, { username: 'PayloadUser', authToken: token })).toEqual({
      ok: true,
      username: 'TokenUser',
    })
    expect(socket.data.username).toBe('TokenUser')

    socket.handshake.auth.token = token
    expect(resolveSocketUser(socket, { username: 'PayloadUser' })).toEqual({
      ok: true,
      username: 'TokenUser',
    })

    const cookieSocket = {
      data: {},
      handshake: {
        auth: {},
        headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` },
      },
    }
    expect(resolveSocketUser(cookieSocket, { username: 'PayloadUser' })).toEqual({
      ok: true,
      username: 'TokenUser',
    })

    expect(resolveSocketUser(socket, {})).toEqual({ ok: false, error: 'Missing username' })
    expect(resolveSocketUser(socket, { username: 'bad name' })).toEqual({ ok: false, error: 'Invalid username' })

    process.env.NODE_ENV = 'test'
    expect(resolveSocketUser({ data: {}, handshake: { auth: {} } }, { username: 'TestUser' })).toEqual({
      ok: true,
      username: 'TestUser',
    })

    process.env.NODE_ENV = 'production'
    process.env.DISABLE_AUTH_TEST_FALLBACK = 'true'
    expect(resolveSocketUser({ data: { username: 'Existing' }, handshake: { auth: {} } }, { username: 'PayloadUser' })).toEqual({
      ok: true,
      username: 'Existing',
    })
    expect(resolveSocketUser({ data: {}, handshake: { auth: {} } }, { username: 'PayloadUser' })).toEqual({
      ok: false,
      error: 'Authentication required',
    })

    process.env.NODE_ENV = 'test'
    expect(resolveSocketUser({ data: {}, handshake: { auth: {} } }, { username: 'PayloadUser' })).toEqual({
      ok: false,
      error: 'Authentication required',
    })
  })
})
