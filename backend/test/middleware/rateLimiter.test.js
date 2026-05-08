import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRateLimiter, resetRateLimiters } from '../../src/middleware/rateLimiter.js'

const buildRes = () => {
  const res = {
    set: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res
}

describe('rate limiter middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalVitest = process.env.VITEST
  const originalVitestWorkerId = process.env.VITEST_WORKER_ID
  const originalEnableRateLimitTests = process.env.ENABLE_RATE_LIMIT_TESTS

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    if (originalVitest === undefined) delete process.env.VITEST
    else process.env.VITEST = originalVitest
    if (originalVitestWorkerId === undefined) delete process.env.VITEST_WORKER_ID
    else process.env.VITEST_WORKER_ID = originalVitestWorkerId
    process.env.ENABLE_RATE_LIMIT_TESTS = originalEnableRateLimitTests
    vi.useRealTimers()
    resetRateLimiters()
  })

  it('allows requests until the limit is exceeded', () => {
    process.env.NODE_ENV = 'production'
    process.env.ENABLE_RATE_LIMIT_TESTS = 'true'
    vi.setSystemTime(new Date('2026-05-01T00:00:00Z'))
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 2, keyPrefix: 'test' })
    const req = { ip: '127.0.0.1', path: '/api/auth/login', headers: {} }

    expect(limiter(req, buildRes())).toBe(false)
    expect(limiter(req, buildRes())).toBe(false)

    const res = buildRes()
    expect(limiter(req, res)).toBe(true)
    expect(res.set).toHaveBeenCalledWith('Retry-After', '1')
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith({ error: 'Too many requests' })
  })

  it('uses forwarded IPs, resets windows, and stays disabled in normal tests', () => {
    process.env.NODE_ENV = 'test'
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1, keyPrefix: 'test-disabled' })
    const req = {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
      originalUrl: '/api/auth/register',
    }

    expect(limiter(req, buildRes())).toBe(false)
    expect(limiter(req, buildRes())).toBe(false)

    process.env.ENABLE_RATE_LIMIT_TESTS = 'true'
    vi.setSystemTime(new Date('2026-05-01T00:00:00Z'))
    expect(limiter(req, buildRes())).toBe(false)
    expect(limiter(req, buildRes())).toBe(true)

    vi.setSystemTime(new Date('2026-05-01T00:00:02Z'))
    expect(limiter(req, buildRes())).toBe(false)
  })

  it('uses alternate client and path fallbacks with default options', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.VITEST
    delete process.env.VITEST_WORKER_ID
    process.env.ENABLE_RATE_LIMIT_TESTS = 'true'
    vi.setSystemTime(new Date('2026-05-01T00:00:00Z'))
    const limiter = createRateLimiter()

    const socketReq = {
      headers: { 'X-Forwarded-For': '' },
      socket: { remoteAddress: '192.0.2.10' },
      url: '/socket-path',
    }
    expect(limiter(socketReq, buildRes())).toBe(false)

    const unknownReq = { headers: {} }
    expect(limiter(unknownReq, buildRes())).toBe(false)
  })

  it('rate limits without Retry-After when the response has no set helper', () => {
    process.env.NODE_ENV = 'production'
    process.env.ENABLE_RATE_LIMIT_TESTS = 'true'
    vi.setSystemTime(new Date('2026-05-01T00:00:00Z'))
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 0, keyPrefix: 'no-set' })
    const res = {
      status: vi.fn(function status() {
        return this
      }),
      json: vi.fn(),
    }

    const req = { headers: {}, ip: '127.0.0.2', path: '/limited' }

    expect(limiter(req, res)).toBe(false)
    expect(limiter(req, res)).toBe(true)
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith({ error: 'Too many requests' })
  })

  it('stays disabled through Vitest environment variables unless explicitly enabled', () => {
    process.env.NODE_ENV = 'development'
    process.env.VITEST = 'true'
    process.env.VITEST_WORKER_ID = '1'
    delete process.env.ENABLE_RATE_LIMIT_TESTS
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 0, keyPrefix: 'vitest-disabled' })

    expect(limiter({ headers: {}, path: '/dev' }, buildRes())).toBe(false)
  })
})
