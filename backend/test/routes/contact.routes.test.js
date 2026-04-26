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

describe('contact routes', () => {
  beforeEach(() => {
    vi.resetModules()
    sendContactEmail.mockReset()
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
    const res = buildRes()

    await handler({
      body: {
        object: 'Bug report',
        message: 'The game got stuck after a solo round.',
        userEmail: 'player@example.com',
      },
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

  it('rate limits repeated contact messages from one client', async () => {
    process.env.CONTACT_RATE_LIMIT_MAX = '2'
    process.env.CONTACT_RATE_LIMIT_WINDOW_MS = '60000'
    sendContactEmail.mockResolvedValue()

    const { default: router } = await import('../../src/routes/contact.routes.js')
    const handler = getHandler(router, 'post', '/')

    const buildReq = () => ({
      ip: '198.51.100.10',
      headers: {},
      body: {
        object: 'Bug report',
        message: 'The game got stuck after a solo round.',
        userEmail: 'player@example.com',
      },
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
    const res = buildRes()

    await handler({
      body: {
        object: 'Suggestion',
        message: 'Add a sprint mode.',
        userEmail: 'player@example.com',
      },
    }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Mail service not configured' })
  })
})
