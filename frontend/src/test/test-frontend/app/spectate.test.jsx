import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => {
  const navigate = vi.fn()
  const socket = {
    emit: vi.fn((event, payload, callback) => {
      if (event === 'joinSpectator') {
        callback?.({ ok: true })
      }
    }),
    on: vi.fn(),
    off: vi.fn(),
  }
  const apiFetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ id: 42 }),
  }))

  return {
    navigate,
    socket,
    apiFetch,
    params: { current: { roomName: 'Room-1', username: 'Titi' } },
  }
})

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => mocks.params.current,
}))

vi.mock('../../../socket', () => ({
  socket: mocks.socket,
}))

vi.mock('../../../api', () => ({
  apiFetch: mocks.apiFetch,
}))

vi.mock('../../../components/TetriminosClouds/TetriminosClouds.jsx', () => ({
  default: () => <div data-testid="tetriminos-clouds" />,
}))

vi.mock('../../../components/ConfettiOverlay/ConfettiOverlay.jsx', () => ({
  default: ({ onDone }) => (
    <div data-testid="confetti-overlay">
      <button type="button" onClick={onDone}>Done</button>
    </div>
  ),
}))

vi.mock('../../../components/SpectatorView/SpectatorView.jsx', () => ({
  default: ({ onBack, username, language, onSendConfetti }) => (
    <div data-testid="spectator-view">
      <span data-testid="spectator-username">{username}</span>
      <span data-testid="spectator-language">{language}</span>
      <button type="button" onClick={onBack}>Back</button>
      {onSendConfetti && (
        <button type="button" onClick={() => onSendConfetti('Test')}>Send confetti</button>
      )}
    </div>
  ),
}))

import Spectate, { leaveSpectator } from '../../../Spectate.jsx'

describe('Spectate page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    localStorage.clear()
    mocks.params.current = { roomName: 'Room-1', username: 'Titi' }
    mocks.apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 42 }),
    })
    mocks.socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'unregisterUser') {
        callback?.({ ok: true })
      }
      if (event === 'joinSpectator') {
        callback?.({ ok: true })
      }
      if (event === 'playerLeave') {
        callback?.({ ok: true })
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the full game shell around spectator view', async () => {
    render(<Spectate />)

    expect(screen.getByTestId('tetriminos-clouds')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
    })

    expect(document.querySelector('.sky-background')).toBeInTheDocument()
    expect(document.querySelector('.game-card')).toBeInTheDocument()
    expect(screen.getByTestId('spectator-username')).toHaveTextContent('Titi')
    expect(screen.getByTestId('spectator-language')).toHaveTextContent('en')
    expect(mocks.socket.on.mock.calls[0][0]).toBe('gameState')
    expect(mocks.socket.on.mock.calls[1][0]).toBe('gameOver')
    expect(mocks.socket.emit).toHaveBeenCalledWith(
      'unregisterUser',
      { username: 'Titi' },
      expect.any(Function)
    )
    expect(mocks.socket.emit).toHaveBeenCalledWith(
      'joinSpectator',
      { roomId: '42', username: 'Titi' },
      expect.any(Function)
    )
    const unregisterCallOrder = mocks.socket.emit.mock.invocationCallOrder[
      mocks.socket.emit.mock.calls.findIndex(([event]) => event === 'unregisterUser')
    ]
    const joinSpectatorCallOrder = mocks.socket.emit.mock.invocationCallOrder[
      mocks.socket.emit.mock.calls.findIndex(([event]) => event === 'joinSpectator')
    ]
    expect(unregisterCallOrder).toBeLessThan(joinSpectatorCallOrder)
  })

  it('uses the saved French language while spectating', async () => {
    localStorage.setItem('red-tetris-language', 'fr')

    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
    })

    expect(screen.getByTestId('spectator-language')).toHaveTextContent('fr')
  })

  it('uses the saved username when the spectate URL omits it', async () => {
    mocks.params.current = { roomName: 'Room-1', username: undefined }
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'SavedUser' }))

    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
    })

    expect(screen.getByTestId('spectator-username')).toHaveTextContent('SavedUser')
    expect(mocks.socket.emit).toHaveBeenCalledWith(
      'joinSpectator',
      { roomId: '42', username: 'SavedUser' },
      expect.any(Function)
    )
  })

  it('skips spectator leave when cleanup has no room or username', async () => {
    await expect(leaveSpectator(null, 'Titi')).resolves.toBeUndefined()
    await expect(leaveSpectator('42', '')).resolves.toBeUndefined()

    expect(mocks.socket.emit).not.toHaveBeenCalledWith(
      'playerLeave',
      expect.any(Object),
      expect.any(Function)
    )
  })

  it('ignores late spectator leave acknowledgements after the timeout resolves', async () => {
    vi.useFakeTimers()
    let leaveCallback
    mocks.socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'playerLeave') {
        leaveCallback = callback
      }
    })

    const done = leaveSpectator('42', 'Titi')

    await vi.advanceTimersByTimeAsync(500)
    await expect(done).resolves.toBeUndefined()

    expect(leaveCallback).toEqual(expect.any(Function))
    expect(() => leaveCallback()).not.toThrow()
  })

  it('renders missing username errors and navigates back', async () => {
    mocks.params.current = { roomName: 'Room-1', username: undefined }
    localStorage.setItem('red-tetris-auth-user', '{bad json')
    localStorage.setItem('red-tetris-theme', 'dark')

    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByText('Missing username in spectator URL.')).toBeInTheDocument()
    })

    expect(document.querySelector('.sky-background.dark')).toBeInTheDocument()
    expect(document.querySelector('.stars')).toBeInTheDocument()
    expect(mocks.apiFetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })

  it('treats saved auth without a username as missing spectator identity', async () => {
    mocks.params.current = { roomName: 'Room-1', username: undefined }
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: null }))

    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByText('Missing username in spectator URL.')).toBeInTheDocument()
    })
  })

  it('treats an absent saved auth record as missing spectator identity', async () => {
    mocks.params.current = { roomName: 'Room-1', username: undefined }

    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByText('Missing username in spectator URL.')).toBeInTheDocument()
    })
  })

  it('renders room lookup failures', async () => {
    mocks.apiFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })

    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByText('Room not found')).toBeInTheDocument()
    })
  })

  it('renders spectator join failures', async () => {
    mocks.socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'unregisterUser') {
        callback?.({ ok: true })
      }
      if (event === 'joinSpectator') {
        callback?.({ ok: false })
      }
    })

    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByText('Spectator not authorized')).toBeInTheDocument()
    })
  })

  it('stops joining when unmounted while unregistering the spectator username', async () => {
    let unregisterCallback
    mocks.socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'unregisterUser') {
        unregisterCallback = callback
      }
      if (event === 'joinSpectator') {
        callback?.({ ok: true })
      }
    })

    const { unmount } = render(<Spectate />)

    await waitFor(() => {
      expect(unregisterCallback).toEqual(expect.any(Function))
    })

    unmount()

    await act(async () => {
      unregisterCallback?.({ ok: true })
    })

    expect(mocks.socket.emit).not.toHaveBeenCalledWith(
      'joinSpectator',
      expect.any(Object),
      expect.any(Function)
    )
  })

  it('ignores a spectator join acknowledgement after unmount', async () => {
    let joinSpectatorCallback
    mocks.socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'unregisterUser') {
        callback?.({ ok: true })
      }
      if (event === 'joinSpectator') {
        joinSpectatorCallback = callback
      }
    })

    const { unmount } = render(<Spectate />)

    await waitFor(() => {
      expect(joinSpectatorCallback).toEqual(expect.any(Function))
    })

    unmount()

    await act(async () => {
      joinSpectatorCallback?.({ ok: true })
    })

    expect(screen.queryByTestId('spectator-view')).not.toBeInTheDocument()
    expect(mocks.socket.emit).not.toHaveBeenCalledWith(
      'getRoomState',
      expect.any(Object)
    )
  })

  it('updates players from gameState, cleans up the listener, and uses spectator back', async () => {
    localStorage.setItem('red-tetris-theme', 'dark')
    const { unmount } = render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
    })

    expect(document.querySelector('.game-screen.dark')).toBeInTheDocument()
    expect(document.querySelector('.stars')).toBeInTheDocument()

    const gameStateHandler = mocks.socket.on.mock.calls.find(
      ([event]) => event === 'gameState'
    )?.[1]
    const gameOverHandler = mocks.socket.on.mock.calls.find(
      ([event]) => event === 'gameOver'
    )?.[1]

    await act(async () => {
      gameStateHandler?.(null)
      gameStateHandler?.({
        players: [{ username: 'A' }],
      })
    })

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(mocks.navigate).toHaveBeenCalledWith('/')

    unmount()
    expect(mocks.socket.emit).toHaveBeenCalledWith(
      'playerLeave',
      { roomId: '42', username: 'Titi' }
    )
    expect(mocks.socket.off).toHaveBeenCalledWith('gameState', gameStateHandler)
    expect(mocks.socket.off).toHaveBeenCalledWith('gameOver', gameOverHandler)
  })

  it('shows game over and the winner while spectating', async () => {
    mocks.params.current = { roomName: 'Room-1', roomType: 'multi', username: 'Titi' }
    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
    })

    const gameOverHandler = mocks.socket.on.mock.calls.find(
      ([event]) => event === 'gameOver'
    )?.[1]

    await act(async () => {
      gameOverHandler?.({ winner: 'Riri' })
    })

    expect(screen.getByRole('dialog')).toHaveTextContent('Game over')
    expect(screen.getByText('Winner: Riri')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /play again/i }))

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/Room-1/multi/Titi')
    })
    expect(mocks.socket.emit).toHaveBeenCalledWith(
      'playerLeave',
      { roomId: '42', username: 'Titi' },
      expect.any(Function)
    )
    const leaveCallOrder = mocks.socket.emit.mock.invocationCallOrder[
      mocks.socket.emit.mock.calls.findIndex(([event]) => event === 'playerLeave')
    ]
    const navigateCallOrder = mocks.navigate.mock.invocationCallOrder[0]
    expect(leaveCallOrder).toBeLessThan(navigateCallOrder)

    fireEvent.click(screen.getByRole('button', { name: /back to menu/i }))
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })

  it('uses the short room URL when play again is clicked from a spectator route without room type', async () => {
    mocks.params.current = { roomName: 'SoloRoom', roomType: undefined, username: 'Titi' }

    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
    })

    const gameOverHandler = mocks.socket.on.mock.calls.find(
      ([event]) => event === 'gameOver'
    )?.[1]

    await act(async () => {
      gameOverHandler?.({ winner: 'Titi' })
    })

    fireEvent.click(screen.getByRole('button', { name: /play again/i }))
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/SoloRoom/Titi')
    })
  })

  it('does not send duplicate spectator leave events when play again is clicked twice while leaving', async () => {
    let leaveCallback
    mocks.socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'unregisterUser') {
        callback?.({ ok: true })
      }
      if (event === 'joinSpectator') {
        callback?.({ ok: true })
      }
      if (event === 'playerLeave') {
        leaveCallback = callback
      }
    })

    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
    })

    const gameOverHandler = mocks.socket.on.mock.calls.find(
      ([event]) => event === 'gameOver'
    )?.[1]

    await act(async () => {
      gameOverHandler?.({ winner: 'Titi' })
    })

    const playAgainButton = screen.getByRole('button', { name: /play again/i })
    fireEvent.click(playAgainButton)
    fireEvent.click(playAgainButton)

    expect(mocks.socket.emit.mock.calls.filter(([event]) => event === 'playerLeave')).toHaveLength(1)

    await act(async () => {
      leaveCallback?.({ ok: true })
    })

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/Room-1/Titi')
    })
  })

  it('shows a no-winner game over message while spectating', async () => {
    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
    })

    const gameOverHandler = mocks.socket.on.mock.calls.find(
      ([event]) => event === 'gameOver'
    )?.[1]

    await act(async () => {
      gameOverHandler?.({})
    })

      expect(screen.getByText('No winner')).toBeInTheDocument()
  })

  it('renders the dark loading state while room lookup is pending', () => {
    localStorage.setItem('red-tetris-theme', 'dark')
    mocks.apiFetch.mockReturnValue(new Promise(() => {}))

    render(<Spectate />)

    expect(screen.getByText(/loading spectator mode/i)).toBeInTheDocument()
    expect(document.querySelector('.sky-background.dark')).toBeInTheDocument()
    expect(document.querySelector('.game-screen.dark')).toBeInTheDocument()
    expect(document.querySelector('.stars')).toBeInTheDocument()
  })

  it('does nothing when the spectate route has no room name', () => {
    mocks.params.current = { roomName: undefined, username: 'Titi' }

    render(<Spectate />)

    expect(screen.getByText(/loading spectator mode/i)).toBeInTheDocument()
    expect(mocks.apiFetch).not.toHaveBeenCalled()
    expect(mocks.socket.emit).not.toHaveBeenCalled()
  })

  it('shows confetti overlay when confetti socket event fires and hides it on done', async () => {
    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
    })

    const confettiHandler = mocks.socket.on.mock.calls.find(
      ([event]) => event === 'confetti'
    )?.[1]

    await act(async () => { confettiHandler?.() })

    expect(screen.getByTestId('confetti-overlay')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(screen.queryByTestId('confetti-overlay')).not.toBeInTheDocument()
  })

  it('emits sendConfetti when onSendConfetti is triggered', async () => {
    render(<Spectate />)

    await waitFor(() => {
      expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /send confetti/i }))

    expect(mocks.socket.emit).toHaveBeenCalledWith(
      'sendConfetti',
      { roomId: '42', targetUsername: 'Test' }
    )
  })
})
