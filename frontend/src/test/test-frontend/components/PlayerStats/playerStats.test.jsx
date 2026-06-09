import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import PlayerStats from '../../../../components/PlayerStats/PlayerStats.jsx'

vi.mock('../../../../components/FaceAvatar/FaceAvatar', () => ({
  default: () => <div data-testid="face-avatar" />,
}))

global.fetch = vi.fn()

describe('PlayerStats Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'Titi',
        soloGames: 10,
        soloTopScore: 12345,
        multiGames: 4,
        wins: 3,
        losses: 1,
        advanced: {
          timePlayed: {
            total: 3725,
            solo: 3600,
            multi: 65,
            coop: 60,
          },
          solo: {
            games: 10,
            highestScore: 12345,
            averageScore: 5000,
            highestLevel: 7,
            highestLines: 44,
            totalLines: 120,
            highestTetris: 3,
            totalTetris: 8,
            longestGameSeconds: 2400,
          },
          multi: {
            games: 4,
            wins: 3,
            losses: 1,
            winLossRatio: 3,
            highestScore: 9000,
            averageScore: 4000,
            highestLevel: 5,
            highestLines: 20,
            totalLines: 50,
            highestLinesSent: 9,
            totalLinesSent: 25,
            highestTetris: 2,
            totalTetris: 6,
            longestGameSeconds: 55,
          },
          coop: {
            games: 2,
            highestScore: 6000,
            highestLevel: 4,
            highestLines: 18,
            totalLines: 30,
            highestTetris: 1,
            totalTetris: 2,
            longestGameSeconds: 60,
          },
        },
        avatar: { skinColor: '#ffffff', eyeType: 'normal', mouthType: 'neutral' },
      }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders stats from userProfile without fetch', async () => {
    render(
      <PlayerStats
        theme="light"
        username="Titi"
        userProfile={{
          username: 'Titi',
          avatar: { skinColor: '#cccccc', eyeType: 'normal', mouthType: 'neutral' },
          soloGames: 2,
          soloTopScore: 900,
          multiGames: 1,
          wins: 1,
          losses: 0,
          advanced: {
            timePlayed: {
              total: 125,
              solo: 65,
              multi: 40,
              coop: 20,
            },
            solo: {
              games: 2,
              highestScore: 900,
              highestLevel: 3,
              totalLines: 12,
              longestGameSeconds: 45,
            },
          },
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/player stats/i)).toBeInTheDocument()
    })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByText('Titi')).toBeInTheDocument()
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('900').length).toBeGreaterThan(0)
    expect(screen.getByText('100.0%')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /advanced stats/i }))
    expect(screen.getByRole('dialog', { name: /advanced stats/i })).toBeInTheDocument()
    expect(screen.getByText(/time played/i)).toBeInTheDocument()
    expect(screen.getByText('2m 5s')).toBeInTheDocument()
    expect(screen.getByText('45s')).toBeInTheDocument()
    expect(screen.getAllByText(/total lines/i).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /close advanced stats/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('fetches stats when no profile stats are provided', async () => {
    render(<PlayerStats theme="light" username="Titi" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/player/stats?username=Titi'),
        expect.objectContaining({ credentials: 'include' })
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Titi')).toBeInTheDocument()
    })

    expect(screen.getAllByText(/12\D?345/).length).toBeGreaterThan(0)
    expect(screen.getByText('75.0%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /advanced stats/i }))
    expect(screen.getByRole('dialog', { name: /advanced stats/i })).toBeInTheDocument()
    expect(screen.getByText('1h 2m 5s')).toBeInTheDocument()
    expect(screen.getByText('40m 0s')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('renders snake_case profile stats and default fallbacks', async () => {
    render(
      <PlayerStats
        theme="light"
        userProfile={{
          solo_games_played: 5,
          highest_solo_score: 1200,
          multiplayer_games_played: 3,
          multiplayer_wins: 2,
          multiplayer_losses: 1,
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/player stats/i)).toBeInTheDocument()
    })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByText('Player')).toBeInTheDocument()
    expect(screen.getByText(/1\D?200/)).toBeInTheDocument()
    expect(screen.getByText('66.7%')).toBeInTheDocument()
  })

  it('uses default profile values when optional profile stats are missing', async () => {
    render(
      <PlayerStats
        theme="light"
        userProfile={{
          username: 'SoloOnly',
          soloGames: 0,
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('SoloOnly')).toBeInTheDocument()
    })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('fetches newer stats when profile stats are stale', async () => {
    render(
      <PlayerStats
        theme="light"
        username="Titi"
        userProfile={{
          username: 'CachedName',
          soloGames: 1,
          soloTopScore: 100,
          statsFetchedAt: Date.now() - 31_000,
        }}
      />
    )

    expect(screen.getByText('CachedName')).toBeInTheDocument()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/player/stats?username=CachedName'),
        expect.objectContaining({ credentials: 'include' })
      )
      expect(screen.getByText('Titi')).toBeInTheDocument()
    })
  })

  it('uses fresh profile stats when the fetched-at timestamp is recent', async () => {
    render(
      <PlayerStats
        theme="light"
        username="Titi"
        userProfile={{
          username: 'FreshName',
          soloGames: 1,
          soloTopScore: 100,
          statsFetchedAt: Date.now(),
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('FreshName')).toBeInTheDocument()
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('ignores fetch results after unmount', async () => {
    let resolveJson
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => new Promise((resolve) => {
        resolveJson = resolve
      }),
    })

    const { unmount } = render(<PlayerStats theme="light" username="LateUser" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/player/stats?username=LateUser'),
        expect.any(Object)
      )
    })

    unmount()
    resolveJson({
      name: 'TooLate',
      soloGames: 9,
      soloTopScore: 999,
    })

    await Promise.resolve()

    expect(screen.queryByText('TooLate')).not.toBeInTheDocument()
  })

  it('uses fetch fallbacks when the response omits optional fields', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        soloGames: 1,
        soloTopScore: 50,
        multiGames: 0,
        wins: 0,
        losses: 0,
      }),
    })

    render(<PlayerStats theme="light" username="FallbackName" />)

    await waitFor(() => {
      expect(screen.getByText('FallbackName')).toBeInTheDocument()
    })

    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('uses profile avatar when fetched stats omit an avatar', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: 'FetchedName',
        soloGames: 1,
        soloTopScore: 75,
        multiGames: 0,
        wins: 0,
        losses: 0,
      }),
    })

    render(
      <PlayerStats
        theme="light"
        username="FallbackName"
        userProfile={{
          username: 'ProfileName',
          avatar: { skinColor: '#123456', eyeType: 'happy', mouthType: 'smile' },
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('FetchedName')).toBeInTheDocument()
    })

    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('renders default stats without fetching when no username is available', async () => {
    render(<PlayerStats theme="dark" />)

    await waitFor(() => {
      expect(screen.getByText(/player stats/i)).toBeInTheDocument()
    })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByText('Player')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(document.querySelector('.player-stats-panel.dark')).toBeTruthy()
  })

  it('keeps default stats and logs when fetching fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch.mockRejectedValueOnce(new Error('network down'))

    render(<PlayerStats theme="light" username="Titi" />)

    await waitFor(() => {
      expect(screen.getByText(/player stats/i)).toBeInTheDocument()
    })

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to fetch player stats',
      expect.any(Error)
    )
    expect(screen.getByText('Player')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it('closes advanced stats when the overlay is clicked', async () => {
    render(
      <PlayerStats
        theme="light"
        username="Titi"
        userProfile={{
          username: 'Titi',
          soloGames: 1,
          soloTopScore: 100,
          multiGames: 0,
          wins: 0,
          losses: 0,
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/player stats/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /advanced stats/i }))
    expect(screen.getByRole('dialog', { name: /advanced stats/i })).toBeInTheDocument()

    fireEvent.click(document.querySelector('.advanced-stats-overlay'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('applies dark theme to the advanced stats modal', async () => {
    render(<PlayerStats theme="dark" username="Titi" />)

    await waitFor(() => {
      expect(screen.getByText(/player stats/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /advanced stats/i }))

    expect(screen.getByRole('dialog', { name: /advanced stats/i })).toHaveClass('dark')
  })
})
