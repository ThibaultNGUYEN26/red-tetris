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
  const originalEnableRateLimitTests = process.env.ENABLE_RATE_LIMIT_TESTS

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
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
})
