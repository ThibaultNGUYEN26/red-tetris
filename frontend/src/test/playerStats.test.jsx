import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import PlayerStats from '../components/PlayerStats/PlayerStats.jsx'

vi.mock('../components/FaceAvatar/FaceAvatar', () => ({
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
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/player stats/i)).toBeInTheDocument()
    })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByText('Titi')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('900')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
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
    expect(screen.getByText(/12\D?345/)).toBeInTheDocument()
    expect(screen.getByText('75.0%')).toBeInTheDocument()
  })
})
