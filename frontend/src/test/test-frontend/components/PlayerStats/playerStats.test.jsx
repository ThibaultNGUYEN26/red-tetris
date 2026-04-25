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
          },
          coop: {
            games: 2,
            highestScore: 6000,
            highestLevel: 4,
            highestLines: 18,
            totalLines: 30,
            highestTetris: 1,
            totalTetris: 2,
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

    expect(screen.getByText('Titi')).toBeInTheDocument()
    expect(screen.getAllByText(/12\D?345/).length).toBeGreaterThan(0)
    expect(screen.getByText('75.0%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /advanced stats/i }))
    expect(screen.getByRole('dialog', { name: /advanced stats/i })).toBeInTheDocument()
    expect(screen.getByText('1h 2m 5s')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })
})
