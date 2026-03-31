import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('react-router-dom', () => ({
  useParams: () => ({ username: 'Titi', roomName: undefined }),
  useNavigate: () => vi.fn(),
}))

vi.mock('../../../socket', () => ({
  socket: { emit: vi.fn() },
}))

vi.mock('../../../components/GoodClouds/GoodClouds.jsx', () => ({
  default: () => <div data-testid="good-clouds" />,
}))

vi.mock('../../../components/TetriminosClouds/TetriminosClouds.jsx', () => ({
  default: () => <div data-testid="tetriminos-clouds" />,
}))

vi.mock('../../../components/PlayerStats/PlayerStats.jsx', () => ({
  default: () => <div data-testid="player-stats" />,
}))

vi.mock('../../../components/Leaderboard/Leaderboard.jsx', () => ({
  default: () => <div data-testid="leaderboard" />,
}))

vi.mock('../../../components/Title/Title.jsx', () => ({
  default: () => <div data-testid="title" />,
}))

vi.mock('../../../components/ModeMenuSelector/ModeMenuSelector.jsx', () => ({
  default: () => (
    <div data-testid="mode-menu">
      <h2>Select Game Mode</h2>
      <button type="button">Solo</button>
      <button type="button">Multiplayer</button>
      <button type="button">Options</button>
    </div>
  ),
}))

vi.mock('../../../components/ProfileMenu/ProfileMenu.jsx', () => ({
  default: () => <div data-testid="profile-menu" />,
}))

vi.mock('../../../components/Rooms/Rooms.jsx', () => ({
  default: () => <div data-testid="rooms" />,
}))

vi.mock('../../../components/Game/Game.jsx', () => ({
  default: () => <div data-testid="game" />,
}))

import Index from '../../../index.jsx'

describe('Index main page', () => {
  it('renders stats, leaderboard, and main menu buttons', () => {
    render(<Index />)

    expect(
      screen.getByRole('button', { name: /change profile/i })
    ).toBeInTheDocument()
    expect(screen.getByTestId('player-stats')).toBeInTheDocument()
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument()
    expect(screen.getByTestId('title')).toBeInTheDocument()
    expect(screen.getByTestId('mode-menu')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /multiplayer/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument()
  })
})
