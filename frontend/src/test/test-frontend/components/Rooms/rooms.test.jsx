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
  default: ({ onBack, onRoomCreated, onRoomRenamed }) => (
    <div data-testid="create-room-mock">
      <button onClick={onBack}>Back to Rooms</button>
      <button onClick={() => onRoomCreated(1, 'Test Room', 'cooperative')}>Create Room</button>
      <button onClick={() => onRoomRenamed('Renamed Room', 'mirror')}>Rename Room</button>
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
      player_count: 6,
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
        expect(screen.getByText('2/6')).toBeInTheDocument()
        expect(screen.getByText('1/6')).toBeInTheDocument()
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
        expect(screen.getByText('6/6')).toBeInTheDocument()
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
  })

  describe('Room Creation', () => {
    it('should show create room button', () => {
      render(<Rooms {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /create/i })
      expect(createButton).toBeInTheDocument()
    })

    it('should open CreateRoom view when create button is clicked', async () => {
      render(<Rooms {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /create/i })
      fireEvent.click(createButton)

      const coopButton = screen.getByRole('button', { name: /cooperative/i })
      fireEvent.click(coopButton)

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })
    })

    it('should switch to the created room when room is created', async () => {
      render(<Rooms {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /create/i })
      fireEvent.click(createButton)

      const coopButton = screen.getByRole('button', { name: /cooperative/i })
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

      fireEvent.click(screen.getByRole('button', { name: /create/i }))
      fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Create Room'))

      expect(mockOnRoomCreated).toHaveBeenCalledWith(1, 'Test Room', 'cooperative')
      expect(navigateMock).toHaveBeenCalledWith(
        '/Test Room/coop/TestUser',
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

      fireEvent.click(screen.getByRole('button', { name: /join/i }))

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Rename Room'))

      expect(navigateMock).toHaveBeenCalledWith(
        '/Renamed Room/multi/TestUser',
        { replace: true }
      )
    })

    it('should return to rooms list when back button is clicked', async () => {
      render(<Rooms {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /create/i })
      fireEvent.click(createButton)

      const coopButton = screen.getByRole('button', { name: /cooperative/i })
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

      const joinButtons = screen.getAllByRole('button', { name: /join/i })
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

      const joinButtons = screen.getAllByRole('button', { name: /join/i })
      fireEvent.click(joinButtons[0])

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'getRoomState',
          expect.objectContaining({ roomId: '1' })
        )
      })
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

      const joinButtons = screen.getAllByRole('button', { name: /join/i })
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

      const joinButtons = screen.getAllByRole('button', { name: /join/i })
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

      fireEvent.click(screen.getAllByRole('button', { name: /join/i })[0])

      await act(async () => {
        await Promise.resolve()
      })

      expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600)
      })

      expect(screen.queryByTestId('create-room-mock')).not.toBeInTheDocument()
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

      fireEvent.click(screen.getAllByRole('button', { name: /join/i })[0])

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
          expect(joinButton.textContent).toMatch(/full/i)
        }
      }
    })
  })

  describe('Navigation', () => {
    it('should call onBack when back button is clicked', () => {
      render(<Rooms {...defaultProps} />)
      
      const backButton = screen.getByRole('button', { name: /back|←/i })
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

      fireEvent.click(screen.getAllByRole('button', { name: /join/i })[0])

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      window.dispatchEvent(new Event('beforeunload'))

      expect(socket.emit).not.toHaveBeenCalledWith('playerLeave', { roomId: '1' })
    })

    it('should log leave errors and still clear local room state', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      render(<Rooms {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /create/i }))
      fireEvent.click(screen.getByRole('button', { name: /cooperative/i }))

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

      fireEvent.click(screen.getByRole('button', { name: /create/i }))
      fireEvent.click(screen.getByRole('button', { name: /cooperative/i }))

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

    it('should navigate to spectator mode from game view', async () => {
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]
      availableRoomsCallback?.([mockRooms[1]])

      await waitFor(() => {
        expect(screen.getByText('Room 2')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /join/i }))

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

      fireEvent.click(screen.getByRole('button', { name: /spectate/i }))

      expect(navigateMock).toHaveBeenCalledWith('/Room 2/multi/spectate/TestUser')
    })

    it('should return to the room card when play again is clicked after multiplayer game over', async () => {
      render(<Rooms {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /create/i }))
      fireEvent.click(screen.getByRole('button', { name: /cooperative/i }))

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

    it('should propagate back-to-menu when leaving from the multiplayer game view', async () => {
      render(<Rooms {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /create/i }))
      fireEvent.click(screen.getByRole('button', { name: /cooperative/i }))

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
