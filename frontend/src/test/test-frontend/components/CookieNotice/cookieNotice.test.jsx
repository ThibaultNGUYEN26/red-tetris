import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'

import StorageConsent, {
  COOKIE_NOTICE_STORAGE_KEY,
} from '../../../../components/StorageConsent/StorageConsent.jsx'

describe('CookieNotice', () => {
  beforeEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('explains necessary cookies and renews the notice acknowledgement for 13 months', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'))

    render(
      <MemoryRouter>
        <StorageConsent />
      </MemoryRouter>
    )

    expect(screen.getByRole('region', { name: /cookie notice/i })).toHaveTextContent(/only necessary cookies/i)
    expect(screen.getByRole('region', { name: /cookie notice/i })).toHaveTextContent(/not used for advertising or analytics/i)
    expect(screen.getByRole('region', { name: /cookie notice/i })).toHaveTextContent(/13 months/i)

    fireEvent.click(screen.getByRole('button', { name: /got it/i }))

    expect(screen.queryByRole('region', { name: /cookie notice/i })).not.toBeInTheDocument()

    const stored = JSON.parse(localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY))
    const expectedExpiry = new Date('2026-01-15T12:00:00.000Z')
    expectedExpiry.setMonth(expectedExpiry.getMonth() + 13)

    expect(stored.answeredAt).toBe(Date.now())
    expect(stored.expiresAt).toBe(expectedExpiry.getTime())
  })

  it('asks again after the 13-month renewal expires', () => {
    localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, JSON.stringify({
      acceptedAt: 1,
      expiresAt: Date.now() - 1,
    }))

    render(
      <MemoryRouter>
        <StorageConsent />
      </MemoryRouter>
    )

    expect(screen.getByRole('region', { name: /cookie notice/i })).toBeInTheDocument()
  })

  it('asks again when the saved cookie answer is unreadable', () => {
    localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, '{invalid-json')

    render(
      <MemoryRouter>
        <StorageConsent />
      </MemoryRouter>
    )

    expect(screen.getByRole('region', { name: /cookie notice/i })).toBeInTheDocument()
  })

  it('stays hidden while the acknowledgement is still active', () => {
    localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, JSON.stringify({
      acceptedAt: Date.now(),
      expiresAt: Date.now() + 1000,
    }))

    render(
      <MemoryRouter>
        <StorageConsent />
      </MemoryRouter>
    )

    expect(screen.queryByRole('region', { name: /cookie notice/i })).not.toBeInTheDocument()
  })
})
