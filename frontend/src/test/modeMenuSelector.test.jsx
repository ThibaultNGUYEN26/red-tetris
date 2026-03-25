import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ModeMenuSelector from '../components/ModeMenuSelector/ModeMenuSelector.jsx'
import { socket } from '../socket'

vi.mock('../socket', () => ({
  socket: {
    emit: vi.fn(),
  },
}))

vi.mock('../components/ModeMenuSelector/Options.jsx/Options.jsx', () => ({
  default: ({ onBack }) => (
    <div data-testid="options">
      <button onClick={onBack}>Back</button>
    </div>
  ),
}))

vi.mock('../components/Rooms/Rooms.jsx', () => ({
  default: () => <div data-testid="rooms" />,
}))

global.fetch = vi.fn()

describe('ModeMenuSelector Component', () => {
  const defaultProps = {
    theme: 'light',
    onThemeChange: vi.fn(),
    onShowRooms: vi.fn(),
    onShowGame: vi.fn(),
    onStartSolo: vi.fn(),
    username: 'TestUser',
    soundEnabled: true,
    onSoundChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    socket.emit.mockImplementation((event, payload, callback) => {
      if ((event === 'leaveGame' || event === 'joinRoom') && typeof callback === 'function') {
        callback({ ok: true })
      }
    })

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 12, name: 'Solo Room', game_mode: 'classic' }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders buttons for solo, multiplayer, and options', () => {
    render(<ModeMenuSelector {...defaultProps} />)

    expect(screen.getByRole('heading', { name: /select game mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /multiplayer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument()
  })

  it('opens options view and returns to menu', () => {
    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /options/i }))
    expect(screen.getByTestId('options')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument()
  })

  it('opens rooms view on multiplayer', () => {
    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    expect(screen.getByTestId('rooms')).toBeInTheDocument()
    expect(defaultProps.onShowRooms).toHaveBeenCalledWith(true)
  })

  it('starts solo game flow and calls callbacks', async () => {
    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /solo/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ gameMode: 'classic', host: 'TestUser' }),
        })
      )
    })

    expect(socket.emit).toHaveBeenCalledWith(
      'joinRoom',
      expect.objectContaining({ roomId: '12', username: 'TestUser' }),
      expect.any(Function)
    )
    expect(socket.emit).toHaveBeenCalledWith(
      'startGame',
      expect.objectContaining({ roomId: '12', username: 'TestUser' })
    )

    expect(defaultProps.onStartSolo).toHaveBeenCalledWith(12)
    expect(defaultProps.onShowGame).toHaveBeenCalledWith(true)
  })

  it('leaves existing room before starting solo', async () => {
    localStorage.setItem('currentRoomId', '99')
    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /solo/i }))

    await waitFor(() => {
      expect(socket.emit).toHaveBeenCalledWith(
        'leaveGame',
        expect.objectContaining({ roomId: '99', username: 'TestUser' }),
        expect.any(Function)
      )
    })
  })
})
