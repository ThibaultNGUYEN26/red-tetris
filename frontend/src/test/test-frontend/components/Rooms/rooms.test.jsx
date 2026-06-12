import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Rooms from '../../../../components/Rooms/Rooms'
import { socket } from '../../../../socket'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

// Mock the socket
vi.mock('../../../../socket', () => ({
  socket: {
    connected: false,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
}))

// Mock CreateRoom component
vi.mock('../../../../components/CreateRoom/CreateRoom.jsx', () => ({
  default: ({ onBack, onRoomCreated, onRoomRenamed, knownRoomPassword, initialRoomPassword }) => (
    <div data-testid="create-room-mock">
      {knownRoomPassword && <span data-testid="known-room-password">{knownRoomPassword}</span>}
      {initialRoomPassword && <span data-testid="initial-room-password">{initialRoomPassword}</span>}
      <button onClick={onBack}>Back to Rooms</button>
      <button onClick={() => onRoomCreated(1, 'Test Room', 'cooperative')}>Create Room</button>
      <button onClick={() => onRoomCreated(2, 'Multi Room', 'multiplayer')}>Create Multiplayer Room</button>
      <button onClick={() => onRoomCreated(3, '', 'multiplayer')}>Create Nameless Room</button>
      <button onClick={() => onRoomRenamed('Renamed Room', 'mirror')}>Rename Room</button>
      <button onClick={() => onRoomRenamed('Fallback Mode Room')}>Rename Without Mode</button>
    </div>
  )
}))

vi.mock('../../../../components/Game/Game.jsx', () => ({
  default: ({ onPlayAgain, onBack, onSpectate }) => (
    <div data-testid="game-mock">
      <button onClick={onPlayAgain}>Play again</button>
      <button onClick={onBack}>Back to menu</button>
      <button onClick={onSpectate}>Spectate</button>
    </div>
  )
}))

describe('Rooms Component', () => {
  const mockOnBack = vi.fn()
  const mockOnLeaveRoom = vi.fn()
  const defaultProps = {
    theme: 'light',
    onBack: mockOnBack,
    onLeaveRoom: mockOnLeaveRoom,
    username: 'TestUser',
    userProfile: {
      avatar: {
        skinColor: '#cccccc',
        eyeType: 'normal',
        mouthType: 'neutral'
      }
    }
  }

  const mockRooms = [
    {
      id: 1,
      name: 'Room 1',
      game_mode: 'classic',
      host: 'Player1',
      player_count: 2,
      players: ['Player1', 'Player2'],
      status: 'waiting'
    },
    {
      id: 2,
      name: 'Room 2',
      game_mode: 'mirror',
      host: 'Player3',
      player_count: 1,
      players: ['Player3'],
      status: 'waiting'
    },
    {
      id: 3,
      name: 'Full Room',
      game_mode: 'classic',
      host: 'Host',
      player_count: 8,
      players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
      status: 'waiting'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    navigateMock.mockClear()
    socket.connected = false
    socket.emit.mockReset()
    socket.on.mockReset()
    socket.off.mockReset()
    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'joinRoom' && typeof callback === 'function') {
        callback({ ok: true })
      }
      if (event === 'playerLeave' && typeof callback === 'function') {
        callback({ ok: true })
      }
      if (event === 'unregisterUser' && typeof callback === 'function') {
        callback({ ok: true })
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Room List Display', () => {
    it('should render Rooms component', () => {
      render(<Rooms {...defaultProps} />)
      
      expect(socket.emit).toHaveBeenCalledWith('getAvailableRooms')
    })

    it('should display available rooms', async () => {
      render(<Rooms {...defaultProps} />)

      // Simulate socket returning rooms
      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
        expect(screen.getByText('Room 2')).toBeInTheDocument()
      })
    })

    it('should display room player counts', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(screen.getByText('2/8')).toBeInTheDocument()
        expect(screen.getByText('1/8')).toBeInTheDocument()
      })
    })

    it('should display player count for each room', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(screen.getByText('8/8')).toBeInTheDocument()
      })
    })

    it('should display host name for each room', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(screen.getByText(/Player1/i)).toBeInTheDocument()
        expect(screen.getByText(/Player3/i)).toBeInTheDocument()
      })
    })

    it('should show empty state when no rooms available', () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback([])
      }
    })

    it('should render dark theme and fallback/cooperative room metadata', async () => {
      render(<Rooms {...defaultProps} theme="dark" />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      availableRoomsCallback?.([
        {
          id: null,
          name: 'Fallback Mode Room',
          host: 'FallbackHost',
          player_count: 1,
          players: [],
          status: 'waiting',
        },
        {
          id: 8,
          name: 'Coop Room',
          game_mode: 'cooperative',
          host: 'CoopHost',
          player_count: 1,
          players: [],
          status: 'waiting',
        },
        {
          id: 9,
          name: 'Already Joined',
          game_mode: 'classic',
          host: 'TestUser',
          player_count: 1,
          players: ['TestUser'],
          status: 'waiting',
        },
      ])

      await waitFor(() => {
        expect(screen.getByText('Fallback Mode Room')).toBeInTheDocument()
      })

      expect(screen.getByText('Salles multijoueur').closest('.rooms-card')).toHaveClass('dark')
      expect(screen.getAllByText('1/8')).toHaveLength(2)
      expect(screen.getByText('1/2')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /rejointe/i })).toBeDisabled()
    })

    it('should log availableRooms payloads without an active request timer on later updates', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      availableRoomsCallback?.([])
      availableRoomsCallback?.([mockRooms[0]])

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })
    })

    it('should tolerate a non-array availableRooms payload after unmount', () => {
      const { unmount } = render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      unmount()
      availableRoomsCallback?.(null)
    })
  })

  describe('Room Creation', () => {
    it('should show create room button', () => {
      render(<Rooms {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /créer/i })
      expect(createButton).toBeInTheDocument()
    })

    it('should open CreateRoom view when create button is clicked', async () => {
      render(<Rooms {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /créer/i })
      fireEvent.click(createButton)

      const coopButton = screen.getByRole('button', { name: /coopérative/i })
      fireEvent.click(coopButton)

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })
    })

    it('should switch to the created room when room is created', async () => {
      render(<Rooms {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /créer/i })
      fireEvent.click(createButton)

      const coopButton = screen.getByRole('button', { name: /coopérative/i })
      fireEvent.click(coopButton)

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      const createRoomButton = screen.getByText('Create Room')
      fireEvent.click(createRoomButton)

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })
    })

    it('should create multiplayer rooms from the picker', async () => {
      const mockOnRoomCreated = vi.fn()
      render(<Rooms {...defaultProps} onRoomCreated={mockOnRoomCreated} />)

      fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      fireEvent.change(screen.getByPlaceholderText('Laisser vide pour une salle publique'), {
        target: { value: 'new-room-password' },
      })
      fireEvent.click(screen.getByRole('button', { name: /multijoueur/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      expect(screen.getByTestId('initial-room-password')).toHaveTextContent('new-room-password')

      fireEvent.click(screen.getByText('Create Room'))

      expect(mockOnRoomCreated).toHaveBeenCalledWith(1, 'Test Room', 'cooperative')
      expect(navigateMock).toHaveBeenCalledWith(
        '/Test Room/coop/TestUser',
        { replace: true }
      )
    })

    it('should route created multiplayer rooms through the multi path', async () => {
      render(<Rooms {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      fireEvent.click(screen.getByRole('button', { name: /^multijoueur$/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Create Multiplayer Room'))

      expect(navigateMock).toHaveBeenCalledWith(
        '/Multi Room/multi/TestUser',
        { replace: true }
      )
    })

    it('should use the root path when a room is created without a name', async () => {
      render(<Rooms {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      fireEvent.click(screen.getByRole('button', { name: /^multijoueur$/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Create Nameless Room'))

      expect(navigateMock).toHaveBeenCalledWith(
        '/',
        { replace: true }
      )
    })

    it('should update route and room list when the current room is renamed', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      availableRoomsCallback?.([mockRooms[0]])

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Rename Room'))

      expect(navigateMock).toHaveBeenCalledWith(
        '/Renamed Room/multi/TestUser',
        { replace: true }
      )
    })

    it('should preserve the current game mode when a room is renamed without a mode', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      availableRoomsCallback?.([mockRooms[0], mockRooms[1]])

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getAllByRole('button', { name: /rejoindre/i })[0])

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Rename Without Mode'))

      expect(navigateMock).toHaveBeenCalledWith(
        '/Fallback Mode Room/multi/TestUser',
        { replace: true }
      )
    })

    it('should return to rooms list when back button is clicked', async () => {
      render(<Rooms {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /créer/i })
      fireEvent.click(createButton)

      const coopButton = screen.getByRole('button', { name: /coopérative/i })
      fireEvent.click(coopButton)

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      const backButton = screen.getByText('Back to Rooms')
      fireEvent.click(backButton)

      await waitFor(() => {
        expect(screen.queryByTestId('create-room-mock')).not.toBeInTheDocument()
      })
    })
  })

  describe('Joining Rooms', () => {
    it('should join a room when clicked', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const joinButtons = screen.getAllByRole('button', { name: /rejoindre/i })
      fireEvent.click(joinButtons[0])

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'joinRoom',
          expect.objectContaining({ roomId: '1', username: 'TestUser' }),
          expect.any(Function)
        )
      })
    })

    it('should sync room state after joining', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const joinButtons = screen.getAllByRole('button', { name: /rejoindre/i })
      fireEvent.click(joinButtons[0])

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'getRoomState',
          expect.objectContaining({ roomId: '1' })
        )
      })
    })

    it('should focus the password input when joining a password-protected room', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback([
          {
            id: 4,
            name: 'Locked Room',
            game_mode: 'classic',
            host: 'Player4',
            player_count: 1,
            players: ['Player4'],
            status: 'waiting',
            has_password: true,
          },
        ])
      }

      await waitFor(() => {
        expect(screen.getByText('Locked Room')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))

      const passwordInput = await screen.findByPlaceholderText('Mot de passe de la salle')
      expect(passwordInput).toHaveFocus()
    })

    it('should pass the entered room password into the joined lobby', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      availableRoomsCallback?.([
        {
          id: 4,
          name: 'Locked Room',
          game_mode: 'classic',
          host: 'Player4',
          player_count: 1,
          players: ['Player4'],
          status: 'waiting',
          has_password: true,
        },
      ])

      await waitFor(() => {
        expect(screen.getByText('Locked Room')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))
      fireEvent.change(await screen.findByPlaceholderText('Mot de passe de la salle'), {
        target: { value: 'secret-code' },
      })
      fireEvent.click(screen.getByRole('button', { name: /entrer/i }))

      await waitFor(() => {
        expect(screen.getByTestId('known-room-password')).toHaveTextContent('secret-code')
      })
    })

    it('should require a password before submitting a protected room join', async () => {
      const onNotice = vi.fn()
      render(<Rooms {...defaultProps} onNotice={onNotice} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      availableRoomsCallback?.([
        {
          id: 4,
          name: 'Locked Room',
          game_mode: 'classic',
          host: 'Player4',
          player_count: 1,
          players: ['Player4'],
          status: 'waiting',
          has_password: true,
        },
      ])

      await waitFor(() => {
        expect(screen.getByText('Locked Room')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))
      fireEvent.click(await screen.findByRole('button', { name: /entrer/i }))

      expect(onNotice).toHaveBeenCalledWith('Mot de passe requis')
      expect(socket.emit).not.toHaveBeenCalledWith(
        'joinRoom',
        expect.anything(),
        expect.any(Function)
      )
    })

    it('should report invalid protected room passwords', async () => {
      const onNotice = vi.fn()
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom' && typeof callback === 'function') {
          callback({ ok: false, error: 'Invalid room password' })
        }
      })

      render(<Rooms {...defaultProps} onNotice={onNotice} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      availableRoomsCallback?.([
        {
          id: 4,
          name: 'Locked Room',
          game_mode: 'classic',
          host: 'Player4',
          player_count: 1,
          players: ['Player4'],
          status: 'waiting',
          has_password: true,
        },
      ])

      await waitFor(() => {
        expect(screen.getByText('Locked Room')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))
      fireEvent.change(await screen.findByPlaceholderText('Mot de passe de la salle'), {
        target: { value: 'bad-password' },
      })
      fireEvent.click(screen.getByRole('button', { name: /entrer/i }))

      expect(onNotice).toHaveBeenCalledWith('Mot de passe invalide')
      consoleError.mockRestore()
    })

    it('should recover when the join emit throws', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      socket.emit.mockImplementation((event) => {
        if (event === 'joinRoom') {
          throw new Error('join socket down')
        }
      })

      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]
      availableRoomsCallback?.([mockRooms[0]])

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))

      expect(consoleError).toHaveBeenCalledWith('Join failed:', expect.any(Error))
      consoleError.mockRestore()
    })

    it('should use the default join failure message when the ack has no error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom' && typeof callback === 'function') {
          callback({ ok: false })
        }
      })

      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]
      availableRoomsCallback?.([mockRooms[0]])

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))

      expect(consoleError).toHaveBeenCalledWith('Join failed:', 'Failed to join room')
      consoleError.mockRestore()
    })

    it('should join unnamed room records without navigating', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]
      availableRoomsCallback?.([
        {
          id: 10,
          game_mode: 'classic',
          host: 'NamelessHost',
          player_count: 1,
          players: ['NamelessHost'],
          status: 'waiting',
        },
      ])

      await waitFor(() => {
        expect(screen.getByText('Hôte : NamelessHost')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      expect(navigateMock).not.toHaveBeenCalled()
    })

    it('should toggle protected room password visibility and submit on Enter', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      availableRoomsCallback?.([
        {
          id: 4,
          name: 'Locked Room',
          game_mode: 'classic',
          host: 'Player4',
          player_count: 1,
          players: ['Player4'],
          status: 'waiting',
          has_password: true,
        },
      ])

      await waitFor(() => {
        expect(screen.getByText('Locked Room')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))

      const passwordInput = await screen.findByPlaceholderText('Mot de passe de la salle')
      expect(passwordInput).toHaveClass('masked-password-input')

      fireEvent.click(screen.getByRole('button', { name: /afficher le mot de passe/i }))
      expect(passwordInput).not.toHaveClass('masked-password-input')

      fireEvent.change(passwordInput, { target: { value: 'secret-code' } })
      fireEvent.keyDown(passwordInput, { key: 'Enter' })

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'joinRoom',
          expect.objectContaining({ roomId: '4', roomPassword: 'secret-code' }),
          expect.any(Function)
        )
      })
    })

    it('should ignore non-Enter keys in protected room password inputs', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      availableRoomsCallback?.([
        {
          id: 4,
          name: 'Locked Room',
          game_mode: 'classic',
          host: 'Player4',
          player_count: 1,
          players: ['Player4'],
          status: 'waiting',
          has_password: true,
        },
      ])

      await waitFor(() => {
        expect(screen.getByText('Locked Room')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))
      fireEvent.change(await screen.findByPlaceholderText('Mot de passe de la salle'), {
        target: { value: 'secret-code' },
      })

      socket.emit.mockClear()
      fireEvent.keyDown(screen.getByPlaceholderText('Mot de passe de la salle'), { key: 'Tab' })

      expect(socket.emit).not.toHaveBeenCalledWith(
        'joinRoom',
        expect.anything(),
        expect.any(Function)
      )
    })

    it('should enter the room view when joining a room', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(screen.getByText('Room 2')).toBeInTheDocument()
      })

      const joinButtons = screen.getAllByRole('button', { name: /rejoindre/i })
      fireEvent.click(joinButtons[1])

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })
    })

    it('should handle join failure gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom' && typeof callback === 'function') {
          callback({ ok: false, error: 'Failed to join' })
        }
      })

      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const joinButtons = screen.getAllByRole('button', { name: /rejoindre/i })
      fireEvent.click(joinButtons[0])

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Join failed:',
          expect.anything()
        )
      })

      consoleError.mockRestore()
    })
  })

  describe('Auto-Join via URL', () => {
    it('should auto-join room when joinRoomName is provided', async () => {
      render(<Rooms {...defaultProps} joinRoomName="Room 1" />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'joinRoom',
          expect.objectContaining({ roomId: '1', username: 'TestUser' }),
          expect.any(Function)
        )
      })
    })

    it('should not auto-join if room name not found', async () => {
      render(<Rooms {...defaultProps} joinRoomName="NonExistentRoom" />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(socket.emit).not.toHaveBeenCalledWith(
          'joinRoom',
          expect.anything(),
          expect.anything()
        )
      })
    })

    it('should not auto-join multiple times', async () => {
      const { rerender } = render(<Rooms {...defaultProps} joinRoomName="Room 1" />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        const joinCalls = socket.emit.mock.calls.filter(call => call[0] === 'joinRoom')
        expect(joinCalls.length).toBe(1)
      })

      // Re-render should not trigger another join
      rerender(<Rooms {...defaultProps} joinRoomName="Room 1" />)

      await waitFor(() => {
        const joinCalls = socket.emit.mock.calls.filter(call => call[0] === 'joinRoom')
        expect(joinCalls.length).toBe(1)
      })
    })

    it('should not auto-join again when rooms update after the first URL join', async () => {
      render(<Rooms {...defaultProps} joinRoomName="Room 1" />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      availableRoomsCallback?.([mockRooms[0]])

      await waitFor(() => {
        const joinCalls = socket.emit.mock.calls.filter(call => call[0] === 'joinRoom')
        expect(joinCalls.length).toBe(1)
      })

      availableRoomsCallback?.([mockRooms[0], mockRooms[1]])

      await waitFor(() => {
        const joinCalls = socket.emit.mock.calls.filter(call => call[0] === 'joinRoom')
        expect(joinCalls.length).toBe(1)
      })
    })
  })

  describe('Socket Communication', () => {
    it('should request available rooms on mount', () => {
      render(<Rooms {...defaultProps} />)
      
      expect(socket.emit).toHaveBeenCalledWith('getAvailableRooms')
    })

    it('should listen for availableRooms events', () => {
      render(<Rooms {...defaultProps} />)
      
      expect(socket.on).toHaveBeenCalledWith(
        'availableRooms',
        expect.any(Function)
      )
    })

    it('should listen for roomState events', () => {
      render(<Rooms {...defaultProps} />)
      
      expect(socket.on).toHaveBeenCalledWith(
        'roomState',
        expect.any(Function)
      )
    })

    it('should update room list when roomState is received', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      // Simulate room state update
      const roomStateCallback = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      if (roomStateCallback) {
        roomStateCallback({
          id: 1,
          name: 'Updated Room 1',
          game_mode: 'classic',
          host: 'Player1',
          players: ['Player1', 'Player2', 'Player3'],
          status: 'waiting'
        })
      }

      await waitFor(() => {
        expect(screen.getByText('Updated Room 1')).toBeInTheDocument()
      })
    })

    it('should add new room when roomState for new room is received', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback([mockRooms[0]])
      }

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const roomStateCallback = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      if (roomStateCallback) {
        roomStateCallback(mockRooms[1])
      }

      await waitFor(() => {
        expect(screen.getByText('Room 2')).toBeInTheDocument()
      })
    })

    it('should clean up socket listeners on unmount', () => {
      const { unmount } = render(<Rooms {...defaultProps} />)
      
      unmount()

      expect(socket.off).toHaveBeenCalledWith(
        'availableRooms',
        expect.any(Function)
      )
      expect(socket.off).toHaveBeenCalledWith(
        'roomState',
        expect.any(Function)
      )
    })

    it('should clear stale current room when no room state arrives', async () => {
      vi.useFakeTimers()
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]
      await act(async () => {
        availableRoomsCallback?.(mockRooms)
      })

      expect(screen.getByText('Room 1')).toBeInTheDocument()

      fireEvent.click(screen.getAllByRole('button', { name: /rejoindre/i })[0])

      await act(async () => {
        await Promise.resolve()
      })

      expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600)
      })

      expect(screen.queryByTestId('create-room-mock')).not.toBeInTheDocument()
    })

    it('should keep the current room when matching room state arrives before the stale timeout', async () => {
      vi.useFakeTimers()
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]
      await act(async () => {
        availableRoomsCallback?.([mockRooms[0]])
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))

      await act(async () => {
        await Promise.resolve()
      })

      expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()

      const staleGuardRoomStateCallback = socket.on.mock.calls
        .filter(call => call[0] === 'roomState')
        .at(-1)?.[1]

      await act(async () => {
        staleGuardRoomStateCallback?.(mockRooms[0])
        vi.advanceTimersByTime(1600)
      })

      expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
    })

    it('should ignore stale guard roomState and socket errors for other rooms', async () => {
      vi.useFakeTimers()
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]
      await act(async () => {
        availableRoomsCallback?.([mockRooms[0]])
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))

      await act(async () => {
        await Promise.resolve()
      })

      expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()

      const staleGuardRoomStateCallback = socket.on.mock.calls
        .filter(call => call[0] === 'roomState')
        .at(-1)?.[1]
      const errorHandler = socket.on.mock.calls
        .filter(call => call[0] === 'error')
        .at(-1)?.[1]

      await act(async () => {
        staleGuardRoomStateCallback?.({ ...mockRooms[1], id: 999 })
        errorHandler?.({ message: 'Transient socket warning' })
        vi.advanceTimersByTime(1600)
      })

      expect(screen.queryByTestId('create-room-mock')).not.toBeInTheDocument()
    })

    it('should ignore gameStarted events without a current room match', async () => {
      render(<Rooms {...defaultProps} />)

      const gameStartedCallback = socket.on.mock.calls
        .filter(call => call[0] === 'gameStarted')
        .at(-1)?.[1]

      gameStartedCallback?.({})
      gameStartedCallback?.({ roomId: 'other-room' })

      expect(screen.queryByTestId('game-mock')).not.toBeInTheDocument()
    })

    it('should clear current room when socket reports room not found', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]
      availableRoomsCallback?.(mockRooms)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getAllByRole('button', { name: /rejoindre/i })[0])

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      const errorHandler = socket.on.mock.calls
        .filter(call => call[0] === 'error')
        .at(-1)?.[1]

      errorHandler?.({ message: 'Room not found' })

      await waitFor(() => {
        expect(screen.queryByTestId('create-room-mock')).not.toBeInTheDocument()
      })
    })
  })

  describe('Room Filtering and Status', () => {
    it('should display room status', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        // Should show waiting/playing/full status
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })
    })

    it('should indicate when a room is full', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }

      await waitFor(() => {
        expect(screen.getByText('Full Room')).toBeInTheDocument()
      })

      // Should show full indicator or disable join for full room
      const fullRoomEntry = screen.getByText('Full Room').closest('.room-entry')
      expect(fullRoomEntry).toBeTruthy()
      if (fullRoomEntry) {
        const joinButton = fullRoomEntry.querySelector('button.join-button')
        expect(joinButton).toBeTruthy()
        if (joinButton) {
          expect(joinButton).toBeDisabled()
          expect(joinButton.textContent).toMatch(/complet/i)
        }
      }
    })
  })

  describe('Navigation', () => {
    it('should call onBack when back button is clicked', () => {
      render(<Rooms {...defaultProps} />)
      
      const backButton = screen.getByRole('button', { name: /retour|←/i })
      if (backButton) {
        fireEvent.click(backButton)
        expect(mockOnBack).toHaveBeenCalled()
      }
    })
  })

  describe('Leave Flows', () => {
    it('should keep the room session on browser unload so refresh can reconnect', async () => {
      socket.connected = true
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]
      availableRoomsCallback?.(mockRooms)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getAllByRole('button', { name: /rejoindre/i })[0])

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      window.dispatchEvent(new Event('beforeunload'))

      expect(socket.emit).not.toHaveBeenCalledWith('playerLeave', { roomId: '1' })
    })

    it('should log leave errors and still clear local room state', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      render(<Rooms {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      fireEvent.click(screen.getByRole('button', { name: /coopérative/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Create Room'))

      socket.emit.mockImplementation((event) => {
        if (event === 'playerLeave') {
          throw new Error('socket down')
        }
      })

      fireEvent.click(screen.getByRole('button', { name: /back to rooms/i }))

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to leave room/game:',
          expect.any(Error)
        )
      })

      await waitFor(() => {
        expect(screen.queryByTestId('create-room-mock')).not.toBeInTheDocument()
      })

      consoleError.mockRestore()
    })

    it('should leave lobby and clear state', async () => {
      render(<Rooms {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      fireEvent.click(screen.getByRole('button', { name: /coopérative/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Create Room'))

      const backButton = screen.getByRole('button', { name: /back to rooms/i })
      fireEvent.click(backButton)

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'playerLeave',
          expect.objectContaining({ roomId: '1' }),
          expect.any(Function)
        )
      })

      expect(mockOnLeaveRoom).toHaveBeenCalled()
    })

    it('should stay in the active game room when spectating from game view', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]
      availableRoomsCallback?.([mockRooms[1]])

      await waitFor(() => {
        expect(screen.getByText('Room 2')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /rejoindre/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      const roomStateCallback = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      await act(async () => {
        roomStateCallback?.(mockRooms[1])
      })

      const gameStartedCallback = socket.on.mock.calls
        .filter(call => call[0] === 'gameStarted')
        .at(-1)?.[1]

      gameStartedCallback?.({ roomId: '2' })

      await waitFor(() => {
        expect(screen.getByTestId('game-mock')).toBeInTheDocument()
      })

      socket.emit.mockClear()
      navigateMock.mockClear()
      fireEvent.click(screen.getByRole('button', { name: /spectate/i }))

      expect(socket.emit).not.toHaveBeenCalledWith(
        'playerLeave',
        expect.any(Object),
        expect.any(Function)
      )
      expect(socket.emit).not.toHaveBeenCalledWith(
        'unregisterUser',
        expect.any(Object),
        expect.any(Function)
      )
      expect(navigateMock).not.toHaveBeenCalled()
    })

    it('should not navigate to spectator mode for a nameless current room', async () => {
      render(<Rooms {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      fireEvent.click(screen.getByRole('button', { name: /^multijoueur$/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Create Nameless Room'))

      const gameStartedCallback = socket.on.mock.calls
        .filter(call => call[0] === 'gameStarted')
        .at(-1)?.[1]

      gameStartedCallback?.({ roomId: '3' })

      await waitFor(() => {
        expect(screen.getByTestId('game-mock')).toBeInTheDocument()
      })

      navigateMock.mockClear()
      fireEvent.click(screen.getByRole('button', { name: /spectate/i }))

      expect(navigateMock).not.toHaveBeenCalled()
    })

    it('should return to the room card when play again is clicked after multiplayer game over', async () => {
      render(<Rooms {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      fireEvent.click(screen.getByRole('button', { name: /coopérative/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Create Room'))

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'getRoomState',
          expect.objectContaining({ roomId: '1' })
        )
      })

      const gameStartedCallback = socket.on.mock.calls
        .filter(call => call[0] === 'gameStarted')
        .at(-1)?.[1]

      gameStartedCallback?.({ roomId: '1' })

      await waitFor(() => {
        expect(screen.getByTestId('game-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /play again/i }))

      expect(socket.emit).toHaveBeenCalledWith(
        'playAgain',
        expect.objectContaining({ roomId: '1', username: 'TestUser' })
      )

      const roomStateCallback = socket.on.mock.calls
        .filter(call => call[0] === 'roomState')
        .at(-1)?.[1]

      roomStateCallback?.({
        id: 1,
        name: 'Room 1',
        game_mode: 'cooperative',
        host: 'TestUser',
        player_count: 2,
        players: ['TestUser', 'Other'],
        ready_again: ['TestUser'],
        status: 'waiting',
      })

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })
    })

    it('should stay in the game view when play-again room state does not include the user', async () => {
      render(<Rooms {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      fireEvent.click(screen.getByRole('button', { name: /coopérative/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Create Room'))

      const gameStartedCallback = socket.on.mock.calls
        .filter(call => call[0] === 'gameStarted')
        .at(-1)?.[1]

      gameStartedCallback?.({ roomId: '1' })

      await waitFor(() => {
        expect(screen.getByTestId('game-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /play again/i }))

      const roomStateCallback = socket.on.mock.calls
        .filter(call => call[0] === 'roomState')
        .at(-1)?.[1]

      roomStateCallback?.({
        id: 1,
        name: 'Room 1',
        game_mode: 'cooperative',
        host: 'TestUser',
        player_count: 2,
        players: ['TestUser', 'Other'],
        ready_again: [],
        status: 'waiting',
      })

      expect(screen.getByTestId('game-mock')).toBeInTheDocument()
    })

    it('should propagate back-to-menu when leaving from the multiplayer game view', async () => {
      render(<Rooms {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      fireEvent.click(screen.getByRole('button', { name: /coopérative/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Create Room'))

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'getRoomState',
          expect.objectContaining({ roomId: '1' })
        )
      })

      const gameStartedCallback = socket.on.mock.calls
        .filter(call => call[0] === 'gameStarted')
        .at(-1)?.[1]

      gameStartedCallback?.({ roomId: '1' })

      await waitFor(() => {
        expect(screen.getByTestId('game-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /back to menu/i }))

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'playerLeave',
          expect.objectContaining({ roomId: '1' }),
          expect.any(Function)
        )
      })

      expect(mockOnLeaveRoom).toHaveBeenCalled()
    })
  })
})
