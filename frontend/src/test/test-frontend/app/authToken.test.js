import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AUTH_STORAGE_KEY,
  DEV_AUTH_TOKEN_STORAGE_KEY,
  authFetchOptions,
  clearStoredAuthToken,
  getStoredAuthToken,
  setStoredAuthToken,
} from '../../../authToken.js'

describe('authToken helpers', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('getStoredAuthToken', () => {
    it('returns the stored token', () => {
      localStorage.setItem(DEV_AUTH_TOKEN_STORAGE_KEY, 'abc123')

      expect(getStoredAuthToken()).toBe('abc123')
    })

    it('returns an empty string when no token is stored', () => {
      expect(getStoredAuthToken()).toBe('')
    })

    it('returns an empty string when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage unavailable')
      })

      expect(getStoredAuthToken()).toBe('')
    })
  })

  describe('setStoredAuthToken', () => {
    it('stores a truthy token', () => {
      setStoredAuthToken('my-token')

      expect(localStorage.getItem(DEV_AUTH_TOKEN_STORAGE_KEY)).toBe('my-token')
    })

    it('removes the token when given an empty string', () => {
      localStorage.setItem(DEV_AUTH_TOKEN_STORAGE_KEY, 'old-token')

      setStoredAuthToken('')

      expect(localStorage.getItem(DEV_AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    })

    it('removes the token when given a non-string value', () => {
      localStorage.setItem(DEV_AUTH_TOKEN_STORAGE_KEY, 'old-token')

      setStoredAuthToken(null)

      expect(localStorage.getItem(DEV_AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    })

    it('silently ignores storage failures', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage unavailable')
      })

      expect(() => setStoredAuthToken('token')).not.toThrow()
    })
  })

  describe('clearStoredAuthToken', () => {
    it('removes the stored token', () => {
      localStorage.setItem(DEV_AUTH_TOKEN_STORAGE_KEY, 'abc123')

      clearStoredAuthToken()

      expect(localStorage.getItem(DEV_AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    })
  })

  describe('authFetchOptions', () => {
    it('returns credentials include', () => {
      expect(authFetchOptions()).toEqual({ credentials: 'include' })
    })
  })
})
