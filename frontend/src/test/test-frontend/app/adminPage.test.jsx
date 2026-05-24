import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import AdminPage from '../../../AdminPage.jsx'
import { apiUrl } from '../../../api.js'

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}))

vi.mock('../../../components/TetriminosClouds/TetriminosClouds.jsx', () => ({
  default: () => <div data-testid="tetriminos-clouds" />,
}))

describe('AdminPage', () => {
  it('renders admin summary metrics', async () => {
    sessionStorage.clear()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        generatedAt: '2026-05-06T10:00:00.000Z',
        live: { activePlayers: 5, peakActivePlayers: 8, activeGames: 2 },
        overview: {
          registeredUsers: 12,
          totalRooms: 4,
          waitingRooms: 2,
          startedRooms: 1,
          playersInRooms: 7,
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
        roomModes: [{ mode: 'classic', rooms: 2, players: 4 }],
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
      }),
    })

    render(<AdminPage />)

    expect(screen.getByRole('heading', { name: 'Admin Access' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret-admin' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument()
      expect(screen.getByText('Active Players')).toBeInTheDocument()
      expect(screen.getByText('Peak Players')).toBeInTheDocument()
      expect(screen.getAllByText('5').length).toBeGreaterThan(0)
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('This Month')).toBeInTheDocument()
      expect(screen.getByText('RedTetris')).toBeInTheDocument()
      expect(screen.getByText('Titi')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledWith(
      apiUrl('/api/admin/summary'),
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'X-Admin-Password': 'secret-admin',
        },
      })
    )
  })
})
