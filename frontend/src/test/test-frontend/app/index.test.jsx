import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const navigateMock = vi.fn()
let mockParams = { username: 'Titi', roomName: undefined }

vi.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useNavigate: () => navigateMock,
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
  default: ({ onLeaveRoom }) => (
    <div data-testid="rooms">
      <button onClick={onLeaveRoom}>Leave joined room</button>
    </div>
  ),
}))

vi.mock('../../../components/Game/Game.jsx', () => ({
  default: () => <div data-testid="game" />,
}))

import Index from '../../../index.jsx'

describe('Index main page', () => {
  it('clears the joined-room URL flow when leaving a room', () => {
    mockParams = { username: 'Titi', roomName: 'Room-ABC' }

    render(<Index />)

    expect(screen.getByTestId('rooms')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /leave joined room/i }))

    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })

    mockParams = { username: 'Titi', roomName: undefined }
  })

  it('renders stats, leaderboard, and main menu buttons', () => {
    mockParams = { username: 'Titi', roomName: undefined }
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

  it('rejects an invalid username from the room join URL', () => {
    mockParams = { username: 'Bad Name', roomName: 'Room-ABC' }

    render(<Index />)

    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
    expect(screen.getByTestId('profile-menu')).toBeInTheDocument()
  })
})
