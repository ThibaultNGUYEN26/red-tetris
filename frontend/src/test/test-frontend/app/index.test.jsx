import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

let mockParams = { username: 'Titi', roomName: undefined, roomType: undefined }
const navigateMock = vi.fn((target) => {
  if (target === '/') {
    mockParams = { username: undefined, roomName: undefined, roomType: undefined }
  }
})

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useParams: () => mockParams,
  useNavigate: () => navigateMock,
  useLocation: () => ({ search: '' }),
}))

vi.mock('../../../socket', () => ({
  socket: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    timeout: vi.fn(() => ({
      emit: vi.fn((event, payload, callback) => callback?.(null, { ok: true })),
    })),
  },
}))

vi.mock('../../../components/GoodClouds/GoodClouds.jsx', () => ({
  default: () => <div data-testid="good-clouds" />,
}))

vi.mock('../../../components/TetriminosClouds/TetriminosClouds.jsx', () => ({
  default: () => <div data-testid="tetriminos-clouds" />,
}))

vi.mock('../../../components/PlayerStats/PlayerStats.jsx', () => ({
  default: ({ language }) => <div data-testid="player-stats">{language}</div>,
}))

vi.mock('../../../components/Leaderboard/Leaderboard.jsx', () => ({
  default: () => <div data-testid="leaderboard" />,
}))

vi.mock('../../../components/Title/Title.jsx', () => ({
  default: () => <div data-testid="title" />,
}))

vi.mock('../../../components/ModeMenuSelector/ModeMenuSelector.jsx', () => ({
  default: ({ onLanguageChange, selectedLanguage }) => (
    <div data-testid="mode-menu">
      <h2>Select Game Mode</h2>
      <button type="button">Solo</button>
      <button type="button">Multiplayer</button>
      <button type="button">Options</button>
      <span data-testid="selected-language">{selectedLanguage}</span>
      <button type="button" onClick={() => onLanguageChange?.('fr')}>French</button>
      <button type="button" onClick={() => onLanguageChange?.('es')}>Spanish</button>
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

vi.mock('../../../components/CreateRoom/CreateRoom.jsx', () => ({
  default: ({ onBack, onStartGame, roomId, desiredRoomName }) => (
    <div data-testid="create-room">
      <span data-testid="desired-room-name">{desiredRoomName || 'none'}</span>
      <button onClick={onBack}>Back</button>
      <button onClick={() => onStartGame?.(roomId || 12)}>Start game</button>
    </div>
  ),
}))

vi.mock('../../../components/Game/Game.jsx', () => ({
  default: ({ onPlayAgain }) => (
    <div data-testid="game">
      {onPlayAgain ? <button onClick={onPlayAgain}>Play again</button> : <span>No play again</span>}
    </div>
  ),
}))

import Index from '../../../index.jsx'
import { socket } from '../../../socket'

global.fetch = vi.fn()
const AUTH_STORAGE_KEY = 'red-tetris-auth-user'
const requestPath = (url) => {
  const parsed = new URL(String(url), 'http://test.local')
  return `${parsed.pathname}${parsed.search}`
}

const setSavedUser = (username = 'Titi', preferences) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    username,
    avatar: {
      skinColor: '#cccccc',
      eyeType: 'happy',
      mouthType: 'neutral',
    },
    ...(preferences ? { preferences } : {}),
  }))
}

describe('Index main page', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    localStorage.clear()
    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url).startsWith('/api/auth/me')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            username: 'Titi',
            avatar: { eyeType: 'happy' },
          }),
        }
      }

      if (requestPath(url).startsWith('/api/player/connection')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ connected: false }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ avatar: { eyeType: 'happy' } }),
        }
      }

      if (requestPath(url).startsWith('/api/rooms/by-player/')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Room not found' }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })
  })

  it('translates the login page when language is changed before signing in', () => {
    mockParams = { username: undefined, roomName: undefined, roomType: undefined }

    render(<Index />)

    expect(screen.getByRole('heading', { name: /login to your account/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /language/i }))
    fireEvent.click(screen.getByRole('button', { name: /french/i }))

    expect(screen.getByRole('heading', { name: 'Connectez-vous' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Connexion' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Inscription' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Pseudo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Mot de passe')).toBeInTheDocument()
    expect(localStorage.getItem('red-tetris-language')).toBe('fr')
  })

  it('keeps the login page language selection after signing in', async () => {
    mockParams = { username: undefined, roomName: undefined, roomType: undefined }
    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url) === '/api/auth/login') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            username: 'Titi',
            avatar: { eyeType: 'happy' },
            preferences: { theme: 'light', soundEnabled: true, language: 'en' },
          }),
        }
      }

      if (requestPath(url) === '/api/profile') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            username: 'Titi',
            avatar: { eyeType: 'happy' },
            preferences: { theme: 'light', soundEnabled: true, language: 'fr' },
          }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    const { container } = render(<Index />)

    fireEvent.click(screen.getByRole('button', { name: /language/i }))
    fireEvent.click(screen.getByRole('button', { name: /french/i }))
    fireEvent.change(screen.getByPlaceholderText('Pseudo'), { target: { value: 'Titi' } })
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), { target: { value: 'Secret123!' } })
    fireEvent.click(container.querySelector('.submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('player-stats')).toHaveTextContent('fr')
    })
    expect(localStorage.getItem('red-tetris-language')).toBe('fr')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          preferences: {
            theme: 'light',
            soundEnabled: true,
            language: 'fr',
          },
        }),
      })
    )
  })

  it('translates the register page when language is changed before signing in', () => {
    mockParams = { username: undefined, roomName: undefined, roomType: undefined }

    render(<Index authMode="register" />)

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /language/i }))
    fireEvent.click(screen.getByRole('button', { name: /french/i }))

    expect(screen.getByRole('heading', { name: 'Creer votre compte' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Inscription' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Connexion' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aleatoire' })).toBeInTheDocument()
    expect(screen.getByText('Peau')).toBeInTheDocument()
    expect(screen.getByText('Yeux')).toBeInTheDocument()
    expect(screen.getByText('Bouche')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Pseudo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Mot de passe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirmer le mot de passe')).toBeInTheDocument()
    expect(localStorage.getItem('red-tetris-language')).toBe('fr')
  })

  it('announces idle menu presence so stale room membership is cleared', async () => {
    mockParams = { username: undefined, roomName: undefined, roomType: undefined }
    setSavedUser('Titi')

    render(<Index />)

    await waitFor(() => {
      expect(socket.emit).toHaveBeenCalledWith(
        'enterMenu',
        { username: 'Titi' },
        expect.any(Function)
      )
    })
  })

  it('clears the direct-room URL flow when leaving a room', async () => {
    mockParams = { username: 'Titi', roomName: 'Room-ABC', roomType: undefined }
    setSavedUser('Titi')

    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url).startsWith('/api/auth/me')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            username: 'Titi',
            avatar: { eyeType: 'happy' },
          }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
        }
      }

      if (requestPath(url) === '/api/rooms/by-name/Room-ABC') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 1, name: 'Room-ABC', game_mode: 'classic' }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    render(<Index />)

    expect(screen.getByTestId('create-room')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))

    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })

    mockParams = { username: 'Titi', roomName: undefined, roomType: undefined }
  })

  it('renders stats, leaderboard, and main menu buttons', () => {
    mockParams = { username: 'Titi', roomName: undefined, roomType: undefined }
    setSavedUser('Titi')
    render(<Index />)

    expect(
      screen.getByRole('button', { name: /open profile menu/i })
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

  it('keeps the saved user when browser back navigation has no auth history state', async () => {
    mockParams = { username: 'Titi', roomName: undefined, roomType: undefined }
    setSavedUser('Titi')

    render(<Index />)

    expect(screen.getByTestId('mode-menu')).toBeInTheDocument()

    window.dispatchEvent(new PopStateEvent('popstate', { state: null }))

    expect(screen.getByTestId('mode-menu')).toBeInTheDocument()
    expect(screen.queryByText(/login to your account/i)).not.toBeInTheDocument()
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull()
  })

  it('passes and saves the selected language from the menu to player stats', async () => {
    mockParams = { username: 'Titi', roomName: undefined, roomType: undefined }
    setSavedUser('Titi')
    render(<Index />)

    expect(screen.getByTestId('player-stats')).toHaveTextContent('en')
    expect(screen.getByTestId('selected-language')).toHaveTextContent('en')

    fireEvent.click(screen.getByRole('button', { name: 'French' }))

    expect(screen.getByTestId('player-stats')).toHaveTextContent('fr')
    expect(screen.getByTestId('selected-language')).toHaveTextContent('fr')
    expect(localStorage.getItem('red-tetris-language')).toBe('fr')
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/profile'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            preferences: {
              theme: 'light',
              soundEnabled: true,
              language: 'fr',
            },
          }),
        })
      )
    })
  })

  it('keeps the locally selected language over a stale saved profile language', async () => {
    mockParams = { username: 'Titi', roomName: undefined, roomType: undefined }
    localStorage.setItem('red-tetris-language', 'es')
    setSavedUser('Titi', { theme: 'light', soundEnabled: true, language: 'fr' })

    render(<Index />)

    expect(screen.getByTestId('selected-language')).toHaveTextContent('es')
    await waitFor(() => {
      expect(screen.getByTestId('player-stats')).toHaveTextContent('es')
    })
    expect(localStorage.getItem('red-tetris-language')).toBe('es')
  })

  it('does not replace a new language with a stale profile save response', async () => {
    mockParams = { username: 'Titi', roomName: undefined, roomType: undefined }
    setSavedUser('Titi')
    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url).startsWith('/api/auth/me')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            username: 'Titi',
            avatar: { eyeType: 'happy' },
          }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ avatar: { eyeType: 'happy' } }),
        }
      }

      if (requestPath(url) === '/api/profile') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            username: 'Titi',
            avatar: { eyeType: 'happy' },
            preferences: { theme: 'light', soundEnabled: true, language: 'fr' },
          }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    render(<Index />)

    fireEvent.click(screen.getByRole('button', { name: 'Spanish' }))

    expect(screen.getByTestId('selected-language')).toHaveTextContent('es')
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/profile'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            preferences: {
              theme: 'light',
              soundEnabled: true,
              language: 'es',
            },
          }),
        })
      )
    })
    expect(screen.getByTestId('selected-language')).toHaveTextContent('es')
    expect(localStorage.getItem('red-tetris-language')).toBe('es')
  })

  it('clears a saved local user when the session cookie is missing', async () => {
    mockParams = { username: 'Titi', roomName: undefined, roomType: undefined }
    setSavedUser('Titi')

    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url).startsWith('/api/auth/me')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: 'Authentication required' }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ avatar: { eyeType: 'happy' } }),
        }
      }

      if (requestPath(url) === '/api/profile') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            username: 'Titi',
            avatar: { eyeType: 'happy' },
            preferences: { theme: 'light', soundEnabled: true, language: 'fr' },
          }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    render(<Index />)

    expect(await screen.findByText(/login to your account/i)).toBeInTheDocument()
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('rejects an invalid username from the room join URL', () => {
    mockParams = { username: 'Bad Name', roomName: 'Room-ABC', roomType: undefined }

    render(<Index />)

    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
    expect(screen.getByText(/login to your account/i)).toBeInTheDocument()
  })

  it('joins an existing waiting multiplayer room after create returns 409', async () => {
    mockParams = { username: 'Titi', roomName: 'test', roomType: 'multi' }
    setSavedUser('Titi')

    let byNameCalls = 0
    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url).startsWith('/api/player/connection')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ connected: false }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ avatar: { eyeType: 'happy' } }),
        }
      }

      if (requestPath(url).startsWith('/api/rooms/by-player/')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Room not found' }),
        }
      }

      if (requestPath(url) === '/api/rooms/by-name/test') {
        byNameCalls += 1
        if (byNameCalls === 1) {
          return {
            ok: false,
            status: 404,
            json: async () => ({ error: 'Room not found' }),
          }
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 12,
            name: 'test',
            game_mode: 'classic',
            player_count: 1,
            status: 'waiting',
          }),
        }
      }

      if (requestPath(url) === '/api/rooms') {
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: 'Room name already exists' }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    render(<Index />)

    expect(await screen.findByTestId('create-room')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalledWith('/', { replace: true })
  })

  it('redirects to the profile page with a connected notice when the URL user is already in another room', async () => {
    mockParams = { username: 'Riri', roomName: 'test', roomType: 'multi' }
    setSavedUser('Riri')

    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url) === '/api/player/connection?username=Riri') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ connected: false }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ avatar: { eyeType: 'happy' } }),
        }
      }

      if (requestPath(url) === '/api/rooms/by-player/Riri') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 99,
            name: 'other-room',
            game_mode: 'classic',
            player_count: 2,
            players: ['Riri', 'Titi'],
            status: 'waiting',
          }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    render(<Index />)

    expect(await screen.findByText('User already connected')).toBeInTheDocument()
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
    expect(screen.getByText(/login to your account/i)).toBeInTheDocument()
  })

  it('resumes the game when the URL user is already in the same started room', async () => {
    mockParams = { username: 'Riri', roomName: 'test', roomType: 'multi' }
    setSavedUser('Riri')

    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url) === '/api/player/connection?username=Riri') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ connected: false }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ avatar: { eyeType: 'happy' } }),
        }
      }

      if (requestPath(url) === '/api/rooms/by-player/Riri') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 12,
            name: 'test',
            game_mode: 'classic',
            player_count: 2,
            players: ['Riri', 'Titi'],
            status: 'started',
          }),
        }
      }

      if (requestPath(url) === '/api/rooms/by-name/test') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 12,
            name: 'test',
            game_mode: 'classic',
            player_count: 2,
            players: ['Riri', 'Titi'],
            status: 'started',
          }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    render(<Index />)

    expect(await screen.findByTestId('game')).toBeInTheDocument()
    expect(screen.queryByText('User already connected')).not.toBeInTheDocument()
  })

  it('resumes a started fetched room that already contains the same user', async () => {
    mockParams = { username: 'Titi', roomName: 'test', roomType: 'multi' }
    setSavedUser('Titi')

    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url) === '/api/player/connection?username=Titi') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ connected: false }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ avatar: { eyeType: 'happy' } }),
        }
      }

      if (requestPath(url) === '/api/rooms/by-player/Titi') {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Room not found' }),
        }
      }

      if (requestPath(url) === '/api/rooms/by-name/test') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 12,
            name: 'test',
            game_mode: 'classic',
            player_count: 2,
            players: ['Titi', 'Riri'],
            status: 'started',
          }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    render(<Index />)

    expect(await screen.findByTestId('game')).toBeInTheDocument()
    expect(screen.queryByText('User already connected')).not.toBeInTheDocument()
  })

  it('checks live connection state first for direct room URLs', async () => {
    mockParams = { username: 'Titi', roomName: 'test', roomType: 'multi' }
    setSavedUser('Titi')

    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url) === '/api/player/connection?username=Titi') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ connected: true }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ avatar: { eyeType: 'happy' } }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    render(<Index />)

    expect(await screen.findByText('User already connected')).toBeInTheDocument()
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
    expect(screen.getByText(/login to your account/i)).toBeInTheDocument()
  })

  it('shows the backend invalid room name error for an oversized direct room URL', async () => {
    mockParams = { username: 'Titi', roomName: 'RoomNameWayTooLong', roomType: 'multi' }
    setSavedUser('Titi')

    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url) === '/api/player/connection?username=Titi') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ connected: false }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ avatar: { eyeType: 'happy' } }),
        }
      }

      if (requestPath(url) === '/api/rooms/by-player/Titi') {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Room not found' }),
        }
      }

      if (requestPath(url) === '/api/rooms/by-name/RoomNameWayTooLong') {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: 'Invalid room name' }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    render(<Index />)

    expect(await screen.findByText('Invalid room name')).toBeInTheDocument()
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
  })

  it('starts solo play again with a fresh room name instead of reusing the finished room', async () => {
    mockParams = { username: 'Titi', roomName: 'oldsolo', roomType: undefined }
    setSavedUser('Titi')

    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url) === '/api/player/connection?username=Titi') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ connected: false }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ avatar: { eyeType: 'happy' } }),
        }
      }

      if (requestPath(url) === '/api/rooms/by-name/oldsolo') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 12,
            name: 'oldsolo',
            game_mode: 'classic',
            host: 'Titi',
            player_count: 1,
            players: ['Titi'],
            status: 'waiting',
          }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    render(<Index />)

    expect(await screen.findByTestId('create-room')).toBeInTheDocument()
    expect(screen.getByTestId('desired-room-name')).toHaveTextContent('oldsolo')

    fireEvent.click(screen.getByRole('button', { name: /start game/i }))
    expect(await screen.findByRole('button', { name: /play again/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /play again/i }))

    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
    expect(await screen.findByTestId('desired-room-name')).toHaveTextContent('none')
  })

  it('keeps play again available for direct-room multiplayer games', async () => {
    mockParams = { username: 'Titi', roomName: 'test', roomType: 'multi' }
    setSavedUser('Titi')

    global.fetch.mockImplementation(async (url) => {
      if (requestPath(url) === '/api/player/connection?username=Titi') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ connected: false }),
        }
      }

      if (requestPath(url).startsWith('/api/player/stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ avatar: { eyeType: 'happy' } }),
        }
      }

      if (requestPath(url) === '/api/rooms/by-player/Titi') {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Room not found' }),
        }
      }

      if (requestPath(url) === '/api/rooms/by-name/test') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 12,
            name: 'test',
            game_mode: 'classic',
            player_count: 2,
            players: ['Riri'],
            status: 'waiting',
          }),
        }
      }

      throw new Error(`Unhandled fetch call: ${url}`)
    })

    const { socket } = await import('../../../socket')

    render(<Index />)

    expect(await screen.findByTestId('create-room')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /start game/i }))

    expect(await screen.findByRole('button', { name: /play again/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /play again/i }))

    expect(socket.emit).toHaveBeenCalledWith(
      'playAgain',
      expect.objectContaining({ roomId: '12', username: 'Titi' })
    )
  })
})
