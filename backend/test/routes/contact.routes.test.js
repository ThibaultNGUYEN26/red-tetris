import crypto from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendContactEmail = vi.fn()

vi.mock('../../src/services/mail.service.js', () => ({
  sendContactEmail,
}))

const buildRes = () => {
  const res = {
    status: vi.fn(),
    set: vi.fn(),
    json: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.set.mockReturnValue(res)
  return res
}

const getHandler = (router, method, path) =>
  router.stack.find(
    (layer) => layer.route?.path === path && layer.route.methods?.[method]
  ).route.stack[0].handle

const getCaptchaPayload = async (router) => {
  const handler = getHandler(router, 'get', '/captcha')
  const res = buildRes()

  await handler({}, res)

  return res.json.mock.calls[0][0]
}

const getCaptchaAnswer = (captcha) =>
  captcha.question.split(' + ').reduce((sum, value) => sum + Number(value), 0).toString()

const signCaptchaPayload = (payload) =>
  crypto
    .createHmac('sha256', process.env.CONTACT_CAPTCHA_SECRET)
    .update(payload)
    .digest('base64url')

const buildContactBody = (captcha, overrides = {}) => ({
  object: 'Bug report',
  message: 'The game got stuck after a solo round.',
  userEmail: 'player@example.com',
  captchaToken: captcha.token,
  captchaAnswer: getCaptchaAnswer(captcha),
  ...overrides,
})

describe('contact routes', () => {
  beforeEach(() => {
    vi.resetModules()
    sendContactEmail.mockReset()
    process.env.CONTACT_CAPTCHA_SECRET = 'test-contact-captcha-secret'
    delete process.env.CONTACT_RATE_LIMIT_MAX
    delete process.env.CONTACT_RATE_LIMIT_WINDOW_MS
  })

  it('validates the contact payload', async () => {
    const { default: router } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler({ body: { object: '', message: '' } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing data' })
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('sends a contact email', async () => {
    sendContactEmail.mockResolvedValueOnce()

    const { default: router } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')
    const captcha = await getCaptchaPayload(router)
    const res = buildRes()

    await handler({
      body: buildContactBody(captcha),
    }, res)

    expect(sendContactEmail).toHaveBeenCalledWith({
      object: 'Bug report',
      message: 'The game got stuck after a solo round.',
      userEmail: 'player@example.com',
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      message: 'Message sent',
    })
  })

  it('normalizes forwarded contact sender data and non-string fields', async () => {
    sendContactEmail.mockResolvedValueOnce()

    const { default: router } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')
    const captcha = await getCaptchaPayload(router)
    const res = buildRes()

    await handler({
      headers: { 'x-forwarded-for': '198.51.100.20, 10.0.0.1' },
      body: buildContactBody(captcha, {
        object: '  Feedback  ',
        message: '  Nice game  ',
        userEmail: ' PLAYER@EXAMPLE.COM ',
        website: 42,
      }),
    }, res)

    expect(sendContactEmail).toHaveBeenCalledWith({
      object: 'Feedback',
      message: 'Nice game',
      userEmail: 'player@example.com',
    })
    expect(res.status).toHaveBeenCalledWith(200)

    const missingRes = buildRes()
    await handler({ body: { object: 123, message: null, userEmail: 'player@example.com' } }, missingRes)
    expect(missingRes.status).toHaveBeenCalledWith(400)
    expect(missingRes.json).toHaveBeenCalledWith({ error: 'Missing data' })
  })

  it('returns captcha challenges and rejects incorrect captcha answers', async () => {
    const { default: router } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')
    const captcha = await getCaptchaPayload(router)
    const res = buildRes()

    expect(captcha.question).toMatch(/^\d+ \+ \d+$/)
    expect(captcha.token).toEqual(expect.any(String))

    await handler({
      body: buildContactBody(captcha, {
        captchaToken: captcha.token,
        captchaAnswer: 'wrong',
      }),
    }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Captcha answer is incorrect' })
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('rejects malformed captcha tokens', async () => {
    const { default: router } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')
    const captcha = await getCaptchaPayload(router)

    let res = buildRes()
    await handler({
      body: buildContactBody(captcha, {
        captchaToken: 'payload.signature.extra',
      }),
    }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Captcha answer is incorrect' })

    res = buildRes()
    await handler({
      body: buildContactBody(captcha, {
        captchaToken: `${captcha.token.split('.')[0]}.bad-signature`,
      }),
    }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Captcha answer is incorrect' })

    const invalidPayload = Buffer.from('not-json').toString('base64url')
    res = buildRes()
    await handler({
      body: buildContactBody(captcha, {
        captchaToken: `${invalidPayload}.${signCaptchaPayload(invalidPayload)}`,
      }),
    }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Captcha answer is incorrect' })
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('accepts captcha tokens signed with configured fallback secrets', async () => {
    const secretScenarios = [
      { SESSION_SECRET: 'session-secret' },
      { JWT_SECRET: 'jwt-secret' },
      {},
    ]

    for (const [index, secrets] of secretScenarios.entries()) {
      vi.resetModules()
      sendContactEmail.mockResolvedValueOnce()
      delete process.env.CONTACT_CAPTCHA_SECRET
      delete process.env.SESSION_SECRET
      delete process.env.JWT_SECRET
      Object.assign(process.env, secrets)

      const { default: router } = await import('../../src/routes/contact.routes.js')
      const handler = getHandler(router, 'post', '/')
      const captcha = await getCaptchaPayload(router)
      const res = buildRes()

      await handler({
        ip: `198.51.100.${index + 20}`,
        headers: {},
        body: buildContactBody(captcha),
      }, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Message sent',
      })
    }
  })

  it('rejects honeypot submissions', async () => {
    const { default: router } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler({
      body: {
        object: 'Bug report',
        message: 'The game got stuck after a solo round.',
        userEmail: 'player@example.com',
        website: 'https://spam.example',
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unable to send message' })
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('requires a sender email', async () => {
    const { default: router } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')
    const res = buildRes()

    await handler({
      body: {
        object: 'Bug report',
        message: 'The game got stuck after a solo round.',
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Email is required' })
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('rejects oversized contact fields', async () => {
    const { default: router } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')

    let res = buildRes()
    await handler({
      body: {
        object: 'x'.repeat(121),
        message: 'Short enough',
        userEmail: 'player@example.com',
      },
    }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Object is too long' })

    res = buildRes()
    await handler({
      body: {
        object: 'Bug report',
        message: 'x'.repeat(4001),
        userEmail: 'player@example.com',
      },
    }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Message is too long' })
  })

  it('rate limits repeated contact messages from one client', async () => {
    process.env.CONTACT_RATE_LIMIT_MAX = '2'
    process.env.CONTACT_RATE_LIMIT_WINDOW_MS = '60000'
    sendContactEmail.mockResolvedValue()

    const { default: router } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')
    const captcha = await getCaptchaPayload(router)

    const buildReq = () => ({
      ip: '198.51.100.10',
      headers: {},
      body: buildContactBody(captcha),
    })

    await handler(buildReq(), buildRes())
    await handler(buildReq(), buildRes())

    const limitedRes = buildRes()
    await handler(buildReq(), limitedRes)

    expect(sendContactEmail).toHaveBeenCalledTimes(2)
    expect(limitedRes.set).toHaveBeenCalledWith('Retry-After', expect.any(String))
    expect(limitedRes.status).toHaveBeenCalledWith(429)
    expect(limitedRes.json).toHaveBeenCalledWith({
      error: 'Too many contact messages. Please try again later.',
    })
  })

  it('reports mail configuration errors', async () => {
    sendContactEmail.mockRejectedValueOnce(new Error('Mail service not configured'))

    const { default: router } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')
    const captcha = await getCaptchaPayload(router)
    const res = buildRes()

    await handler({
      body: buildContactBody(captcha, {
        object: 'Suggestion',
        message: 'Add a sprint mode.',
      }),
    }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Mail service not configured' })
  })

  it('resets contact rate limits and reports generic send failures', async () => {
    process.env.CONTACT_RATE_LIMIT_MAX = '1'
    process.env.CONTACT_RATE_LIMIT_WINDOW_MS = '60000'
    sendContactEmail
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('smtp down'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { default: router, resetContactRateLimit } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')
    const captcha = await getCaptchaPayload(router)
    const req = {
      headers: { 'x-real-ip': '203.0.113.10' },
      body: buildContactBody(captcha),
    }

    await handler(req, buildRes())
    resetContactRateLimit()
    await handler(req, buildRes())

    const res = buildRes()
    await handler({ ...req, headers: { 'x-real-ip': '203.0.113.11' } }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' })
    consoleError.mockRestore()
  })
})
