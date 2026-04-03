import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ModeMenuSelector from '../../../../components/ModeMenuSelector/ModeMenuSelector.jsx'
import { socket } from '../../../../socket'

vi.mock('../../../../socket', () => ({
  socket: {
    emit: vi.fn(),
  },
}))

vi.mock('../../../../components/ModeMenuSelector/Options.jsx/Options.jsx', () => ({
  default: ({ onBack }) => (
    <div data-testid="options">
      <button onClick={onBack}>Back</button>
    </div>
  ),
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

    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'joinRoom' && typeof callback === 'function') {
        callback({ ok: true })
      }
    })

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 12, name: 'Solo Room', game_mode: 'classic' }),
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('renders buttons for solo, multiplayer, and options', () => {
    render(<ModeMenuSelector {...defaultProps} />)

    expect(screen.getByRole('heading', { name: /select game mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /multiplayer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument()
  })

  it('applies dark theme class', () => {
    const { container } = render(<ModeMenuSelector {...defaultProps} theme="dark" />)

    expect(container.querySelector('.mode-card.dark')).toBeInTheDocument()
  })

  it('opens options view and returns to menu', () => {
    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /options/i }))
    expect(screen.getByTestId('options')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument()
  })

  it('notifies parent to open rooms on multiplayer', () => {
    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))

    expect(defaultProps.onShowRooms).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument()
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
      expect.objectContaining({ roomId: '12' })
    )

    expect(defaultProps.onStartSolo).toHaveBeenCalledWith(12)
    expect(defaultProps.onShowGame).toHaveBeenCalledWith(true)
  })

  it('logs an error when room creation fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Room API failed' }),
    })

    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /solo/i }))

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Solo start failed:',
        expect.any(Error)
      )
    })

    expect(defaultProps.onStartSolo).not.toHaveBeenCalled()
    expect(defaultProps.onShowGame).not.toHaveBeenCalled()
  })

  it('uses the default error message when room creation response has no error body', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    })

    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /solo/i }))

    await waitFor(() => {
      const error = consoleError.mock.calls.at(-1)?.[1]
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Failed to create solo room')
    })
  })

  it('logs an error when joining the solo room fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'joinRoom' && typeof callback === 'function') {
        callback({ ok: false, error: 'Join failed' })
      }
    })

    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /solo/i }))

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Solo start failed:',
        expect.any(Error)
      )
    })

    expect(defaultProps.onStartSolo).not.toHaveBeenCalled()
    expect(defaultProps.onShowGame).not.toHaveBeenCalled()
  })

  it('uses the default error message when joinRoom fails without an error string', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'joinRoom' && typeof callback === 'function') {
        callback({ ok: false })
      }
    })

    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /solo/i }))

    await waitFor(() => {
      const error = consoleError.mock.calls.at(-1)?.[1]
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Failed to join solo room')
    })
  })

  it('falls back to a relative API path when VITE_API_URL is not set', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_URL', '')

    const { default: ModeMenuSelectorWithoutEnv } = await import('../../../../components/ModeMenuSelector/ModeMenuSelector.jsx')

    render(<ModeMenuSelectorWithoutEnv {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /solo/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/rooms',
        expect.any(Object)
      )
    })
  })

  it('uses VITE_API_URL when provided', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_URL', 'http://api.example.test')

    const { default: ModeMenuSelectorWithEnv } = await import('../../../../components/ModeMenuSelector/ModeMenuSelector.jsx')

    render(<ModeMenuSelectorWithEnv {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /solo/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://api.example.test/api/rooms'),
        expect.any(Object)
      )
    })
  })
})
