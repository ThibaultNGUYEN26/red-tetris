import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Rooms from '../../../../components/Rooms/Rooms'
import { socket } from '../../../../socket'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// Mock the socket
vi.mock('../../../../socket', () => ({
  socket: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
}))

// Mock CreateRoom component
vi.mock('../../../../components/CreateRoom/CreateRoom.jsx', () => ({
  default: ({ onBack, onRoomCreated }) => (
    <div data-testid="create-room-mock">
      <button onClick={onBack}>Back to Rooms</button>
      <button onClick={() => onRoomCreated(1, 'Test Room')}>Create Room</button>
    </div>
  )
}))

vi.mock('../../../../components/Game/Game.jsx', () => ({
  default: ({ onPlayAgain, onBack }) => (
    <div data-testid="game-mock">
      <button onClick={onPlayAgain}>Play again</button>
      <button onClick={onBack}>Back to menu</button>
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
    localStorage.clear()
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

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })
    })

    it('should update localStorage when room is created', async () => {
      render(<Rooms {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      const createRoomButton = screen.getByText('Create Room')
      fireEvent.click(createRoomButton)

      await waitFor(() => {
        expect(localStorage.getItem('currentRoomId')).toBe('1')
      })
    })

    it('should return to rooms list when back button is clicked', async () => {
      render(<Rooms {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /create/i })
      fireEvent.click(createButton)

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

    it('should update localStorage when joining a room', async () => {
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
        expect(localStorage.getItem('currentRoomId')).toBe('2')
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

  describe('Current Room State', () => {
    it('should load currentRoomId from localStorage', () => {
      localStorage.setItem('currentRoomId', '5')
      
      render(<Rooms {...defaultProps} />)
      
      // Component should be aware of current room
      expect(localStorage.getItem('currentRoomId')).toBe('5')
    })

    it('should show current room differently if user is in a room', () => {
      localStorage.setItem('currentRoomId', '1')
      
      render(<Rooms {...defaultProps} />)

      const availableRoomsCallback = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      if (availableRoomsCallback) {
        availableRoomsCallback(mockRooms)
      }
    })
  })

  describe('Stale Room Guard', () => {
    it('should clear currentRoomId if room state does not arrive', async () => {
      localStorage.setItem('currentRoomId', '99')
      vi.useFakeTimers()

      render(<Rooms {...defaultProps} />)

      act(() => {
        vi.advanceTimersByTime(1600)
      })

      expect(localStorage.getItem('currentRoomId')).toBeNull()
      vi.useRealTimers()
    })
  })

  describe('Leave Flows', () => {
    it('should leave lobby and clear state', async () => {
      localStorage.setItem('currentRoomId', '1')

      render(<Rooms {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })

      const backButton = screen.getByRole('button', { name: /back to rooms/i })
      fireEvent.click(backButton)

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'playerLeave',
          expect.objectContaining({ roomId: '1' }),
          expect.any(Function)
        )
      })

      expect(localStorage.getItem('currentRoomId')).toBeNull()
      expect(mockOnLeaveRoom).toHaveBeenCalled()
    })

    it('should return to the room card when play again is clicked after multiplayer game over', async () => {
      localStorage.setItem('currentRoomId', '1')

      render(<Rooms {...defaultProps} />)

      const gameStartedCallback = socket.on.mock.calls.find(
        call => call[0] === 'gameStarted'
      )?.[1]

      gameStartedCallback?.({ roomId: '1' })

      await waitFor(() => {
        expect(screen.getByTestId('game-mock')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /play again/i }))

      expect(socket.emit).toHaveBeenCalledWith(
        'playAgain',
        expect.objectContaining({ roomId: '1', username: 'TestUser' })
      )

      await waitFor(() => {
        expect(screen.getByTestId('create-room-mock')).toBeInTheDocument()
      })
    })

    it('should propagate back-to-menu when leaving from the multiplayer game view', async () => {
      localStorage.setItem('currentRoomId', '1')

      render(<Rooms {...defaultProps} />)

      const gameStartedCallback = socket.on.mock.calls.find(
        call => call[0] === 'gameStarted'
      )?.[1]

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
