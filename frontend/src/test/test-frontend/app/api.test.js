import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../authToken', () => ({
  getStoredAuthToken: vi.fn(() => ''),
}))

import { getStoredAuthToken } from '../../../authToken'
import { API_BASE_URL, apiFetch, apiUrl } from '../../../api.js'

describe('api helpers', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true }))
    getStoredAuthToken.mockReturnValue('')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('apiUrl', () => {
    it('returns absolute URLs unchanged', () => {
      expect(apiUrl('https://example.com/foo')).toBe('https://example.com/foo')
      expect(apiUrl('http://example.com/foo')).toBe('http://example.com/foo')
    })

    it('prepends API_BASE_URL to relative paths without a leading slash', () => {
      expect(apiUrl('foo/bar')).toBe(`${API_BASE_URL}/foo/bar`)
    })

    it('prepends API_BASE_URL to paths with a leading slash', () => {
      expect(apiUrl('/foo/bar')).toBe(`${API_BASE_URL}/foo/bar`)
    })
  })

  describe('apiFetch', () => {
    it('omits the Authorization header when no token is stored', async () => {
      getStoredAuthToken.mockReturnValue('')

      await apiFetch('/api/test')

      const [, options] = global.fetch.mock.calls[0]
      expect(options.headers).toBeUndefined()
    })

    it('includes the Authorization header when a token is stored', async () => {
      getStoredAuthToken.mockReturnValue('my-token')

      await apiFetch('/api/test')

      const [, options] = global.fetch.mock.calls[0]
      expect(options.headers).toEqual({ Authorization: 'Bearer my-token' })
    })

    it('merges extra headers with the Authorization header', async () => {
      getStoredAuthToken.mockReturnValue('my-token')

      await apiFetch('/api/test', { headers: { 'Content-Type': 'application/json' } })

      const [, options] = global.fetch.mock.calls[0]
      expect(options.headers).toEqual({
        Authorization: 'Bearer my-token',
        'Content-Type': 'application/json',
      })
    })

    it('uses GET as the default method for perf logging', async () => {
      await apiFetch('/api/test')

      expect(global.fetch).toHaveBeenCalledWith(
        apiUrl('/api/test'),
        expect.objectContaining({ credentials: 'include' })
      )
    })

    it('forwards method and body from options', async () => {
      await apiFetch('/api/test', {
        method: 'POST',
        body: JSON.stringify({ x: 1 }),
        headers: { 'Content-Type': 'application/json' },
      })

      const [, options] = global.fetch.mock.calls[0]
      expect(options.method).toBe('POST')
      expect(options.body).toBe(JSON.stringify({ x: 1 }))
    })
  })
})
