import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import AdminPage from '../../../AdminPage.jsx'
import { API_BASE_URL, apiUrl } from '../../../api.js'

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}))

vi.mock('../../../components/TetriminosClouds/TetriminosClouds.jsx', () => ({
  default: () => <div data-testid="tetriminos-clouds" />,
}))

describe('AdminPage', () => {
  const summaryPayload = {
    generatedAt: '2026-05-06T10:00:00.000Z',
    live: { activePlayers: 5, peakActivePlayers: 8, activeGames: 2 },
    overview: {
      registeredUsers: 12,
      totalRooms: 4,
      waitingRooms: 2,
      startedRooms: 1,
      playersInRooms: 7,
      soloGames: 20,
      multiplayerResults: 9,
      coopGames: 3,
      totalLines: 400,
      totalTetris: 18,
    },
    currentMonth: {
      newUsers: 2,
      roomsCreated: 3,
      soloGames: 4,
      multiplayerResults: 5,
      coopGames: 1,
      linesCleared: 90,
    },
    monthlyActivity: [
      { month: '2026-04', soloGames: 1, multiplayerResults: 1, coopGames: 0 },
      { month: '2026-05', soloGames: 4, multiplayerResults: 5, coopGames: 1 },
    ],
    roomModes: [
      { mode: 'classic', rooms: 2, players: 4 },
      { mode: 'cooperative', rooms: 1, players: 2 },
      { mode: 'cooperative_roles', rooms: 1, players: 2 },
      { mode: 'mirror', rooms: 1, players: 2 },
      { mode: 'giant', rooms: 1, players: 2 },
      { mode: 'chaotic', rooms: 1, players: 2 },
      { mode: 'invisible', rooms: 1, players: 1 },
      { mode: 'custom_mode', rooms: 1, players: 2 },
      { mode: null, rooms: 1, players: 2 },
    ],
    recentRooms: [{
      id: 1,
      name: 'RedTetris',
      mode: 'classic',
      status: 'waiting',
      playerCount: 2,
      listed: true,
      createdAt: '2026-05-06T09:00:00.000Z',
    }],
    topSoloScores: [{
      username: 'Titi',
      score: 1200,
      lines: 20,
      level: 3,
      createdAt: '2026-05-06T09:10:00.000Z',
    }],
    performance: {
      avgSoloScore: 950,
      maxSoloScore: 1200,
      avgSoloLines: 15,
      avgSoloLevel: 2,
      avgSoloDuration: 90,
      avgSoloTetrises: 3,
      avgMpScore: 800,
      avgLinesSent: 5,
      avgCoopScore: 700,
      avgCoopDuration: 120,
    },
    topPlayers: [
      { username: 'Titi', soloGamesPlayed: 5, highestSoloScore: 1200, multiplayerWins: 3, multiplayerGamesPlayed: 5, winRate: 60 },
      { username: 'Ghost', soloGamesPlayed: 2, highestSoloScore: 800, multiplayerWins: 0, multiplayerGamesPlayed: 0, winRate: 0 },
    ],
    multiplayerInsights: [
      { mode: 'classic', totalResults: 9, avgScore: 800, avgLinesSent: 5, avgDuration: 100 },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    global.fetch = vi.fn()
  })

  const mockSummary = (payload = summaryPayload) => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => payload,
    })
  }

  const unlock = async (username = 'Titi08', password = 'secret-admin') => {
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: username },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: password },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    await waitFor(() => {
      expect(screen.getByText('Active Players')).toBeInTheDocument()
    })
  }

  it('renders admin summary metrics', async () => {
    mockSummary()

    render(<AdminPage />)

    expect(screen.getByRole('heading', { name: 'Admin Access' })).toBeInTheDocument()
    await unlock()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument()
      expect(screen.getByText('Signed in as Titi08')).toBeInTheDocument()
      expect(screen.getByText('Active Players')).toBeInTheDocument()
      expect(screen.getByText('Peak Players')).toBeInTheDocument()
      expect(screen.getAllByText('5').length).toBeGreaterThan(0)
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('This Month')).toBeInTheDocument()
      expect(screen.getByText('RedTetris')).toBeInTheDocument()
      expect(screen.getAllByText('Titi').length).toBeGreaterThan(0)
      expect(screen.getByText('Co-op Alternate')).toBeInTheDocument()
      expect(screen.getByText('Co-op Roles')).toBeInTheDocument()
      expect(screen.getByText('Mirror')).toBeInTheDocument()
      expect(screen.getByText('Giant')).toBeInTheDocument()
      expect(screen.getByText('Chaotic')).toBeInTheDocument()
      expect(screen.getByText('Invisible')).toBeInTheDocument()
      expect(screen.getByText('custom_mode')).toBeInTheDocument()
      expect(screen.getByText('Unknown')).toBeInTheDocument()
      expect(screen.getByText('Top Players')).toBeInTheDocument()
      expect(screen.getByText('Ghost')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
      expect(screen.getAllByText('—').length).toBeGreaterThan(0)
      expect(screen.getByText('Multiplayer by Mode')).toBeInTheDocument()
      expect(screen.getByText('1m 30s')).toBeInTheDocument()
      expect(screen.getByText('Avg duration 2m')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledWith(
      apiUrl('/api/admin/summary'),
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'X-Admin-Username': 'Titi08',
          'X-Admin-Password': 'secret-admin',
        },
      })
    )
  })

  it('validates empty credentials and does not request summary without credentials', () => {
    render(<AdminPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(screen.getByText('Enter the admin username')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'Titi08' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(screen.getByText('Enter the admin password')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('auto-loads with stored credentials and refreshes summary data', async () => {
    sessionStorage.setItem('red-tetris-admin-username', 'Titi08')
    sessionStorage.setItem('red-tetris-admin-password', 'stored-secret')
    mockSummary()

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Active Players')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
    })
    expect(fetch).toHaveBeenLastCalledWith(
      apiUrl('/api/admin/summary'),
      expect.objectContaining({
        headers: {
          'X-Admin-Username': 'Titi08',
          'X-Admin-Password': 'stored-secret',
        },
      })
    )
  })

  it('handles rejected, unconfigured, and unavailable admin summary responses', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 500 })

    render(<AdminPage />)

    await unlock('wrong-user', 'wrong-password').catch(() => {})
    await waitFor(() => {
      expect(screen.getByText('Wrong admin username or password')).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'Admin Access' })).toBeInTheDocument()

    await unlock('Titi08', 'unconfigured-password').catch(() => {})
    await waitFor(() => {
      expect(screen.getByText('Admin credentials are not configured on the server')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    await waitFor(() => {
      expect(screen.getByText('Admin stats unavailable')).toBeInTheDocument()
    })
  })

  it('uses the fallback error message when loading fails without an error message', async () => {
    global.fetch.mockRejectedValueOnce({})

    render(<AdminPage />)

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'Titi08' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'broken-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))

    await waitFor(() => {
      expect(screen.getByText('Admin stats unavailable')).toBeInTheDocument()
    })
  })

  it('renders empty summaries and date fallbacks', async () => {
    mockSummary({
      generatedAt: 'invalid-date',
      live: {},
      overview: {},
      currentMonth: {},
      monthlyActivity: [
        { month: '2026-06', soloGames: 2 },
        { month: '2026-07', multiplayerResults: 3 },
      ],
      roomModes: [],
      topSoloScores: [],
      recentRooms: [
        { id: 1, name: 'PrivateRoom', mode: null, status: 'finished', playerCount: undefined, listed: false, createdAt: null },
        { id: 2, name: 'BrokenDateRoom', mode: 'mirror', status: 'waiting', playerCount: 0, listed: true, createdAt: 'not-a-date' },
      ],
    })

    render(<AdminPage />)
    await unlock()

    expect(screen.getByText('Updated Unknown')).toBeInTheDocument()
    expect(screen.getByText('No rooms yet')).toBeInTheDocument()
    expect(screen.getByText('No scores yet')).toBeInTheDocument()
    expect(screen.getByText(/Unknown · Private/)).toBeInTheDocument()
    expect(screen.getByText('Never')).toBeInTheDocument()
    expect(screen.getByText('BrokenDateRoom')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('returns absolute API URLs unchanged and prefixes relative paths', () => {
    expect(apiUrl('https://example.test/api')).toBe('https://example.test/api')
    expect(apiUrl('api/admin/summary')).toBe(`${API_BASE_URL}/api/admin/summary`)
  })

  it('prefixes relative API paths without a configured backend URL', async () => {
    vi.stubEnv('VITE_BACKEND_URL', '')
    vi.resetModules()

    try {
      const { API_BASE_URL: emptyBaseUrl, apiUrl: apiUrlWithoutBase } = await import('../../../api.js')

      expect(emptyBaseUrl).toBe('')
      expect(apiUrlWithoutBase('api/admin/summary')).toBe('/api/admin/summary')
    } finally {
      vi.unstubAllEnvs()
      vi.resetModules()
    }
  })
})
