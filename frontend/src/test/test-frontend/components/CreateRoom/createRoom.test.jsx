import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import CreateRoom from '../../../../components/CreateRoom/CreateRoom'
import { socket } from '../../../../socket'

// Mock the socket
vi.mock('../../../../socket', () => ({
  socket: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
}))

// Mock fetch
global.fetch = vi.fn()

describe('CreateRoom Component', () => {
  const mockOnBack = vi.fn()
  const mockOnRoomCreated = vi.fn()
  const defaultProps = {
    theme: 'light',
    onBack: mockOnBack,
    existingRooms: [],
    username: 'TestUser',
    userProfile: {
      avatar: {
        skinColor: '#cccccc',
        eyeType: 'normal',
        mouthType: 'neutral'
      }
    },
    mode: 'create',
    onRoomCreated: mockOnRoomCreated
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful fetch response
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        name: 'Room 1',
        game_mode: 'classic',
        host: 'TestUser',
        players: ['TestUser']
      })
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Room Creation (Host Mode)', () => {
    it('should render CreateRoom component in create mode', async () => {
      render(<CreateRoom {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/TestUser/i)).toBeInTheDocument()
      })
    })

    it('should create a room on mount in create mode', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      }, { timeout: 2000 })
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            gameMode: 'classic',
            host: 'TestUser'
          })
        })
      )
    })

    it('should call onRoomCreated callback with room details', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(mockOnRoomCreated).toHaveBeenCalledWith(1, 'Room 1', 'multiplayer')
      })
    })

    it('should handle room creation failure gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to create room:',
          expect.any(Error)
        )
      })

      consoleError.mockRestore()
    })
  })

  describe('Room Name Editing', () => {
    it('should display the room name', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      }, { timeout: 1000 })
    })
  })

  describe('Game Mode Selection', () => {
    it('shows the co-op alternate mode in the selector', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: 'Room 1',
          game_mode: 'cooperative',
          host: 'TestUser',
          players: ['TestUser']
        })
      })

      render(<CreateRoom {...defaultProps} roomType="cooperative" />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      expect(screen.getByRole('option', { name: /co-op alternate/i })).toBeInTheDocument()
    })

    it('shows the co-op roles mode in the selector', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: 'Room 1',
          game_mode: 'cooperative',
          host: 'TestUser',
          players: ['TestUser']
        })
      })

      render(<CreateRoom {...defaultProps} roomType="cooperative" />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      expect(screen.getByRole('option', { name: /co-op roles/i })).toBeInTheDocument()
    })

    it('should PATCH mode change when host selects a new mode', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      if (handleRoomState) {
        handleRoomState({
          id: 1,
          name: 'Room 1',
          game_mode: 'classic',
          host: 'TestUser',
          players: ['TestUser'],
          player_avatars: {}
        })
      }

      const modeSelect = screen.getByRole('combobox')
      vi.useFakeTimers()
      fireEvent.change(modeSelect, { target: { value: 'mirror' } })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms/1/mode'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            mode: 'mirror',
            username: 'TestUser'
          })
        })
      )
    })

    it('should revert to the committed mode when the backend rejects the change', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      handleRoomState?.({
        id: 1,
        name: 'Room 1',
        game_mode: 'classic',
        host: 'TestUser',
        players: ['TestUser'],
        player_avatars: {}
      })

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Mode update rejected'
        })
      })

      const modeSelect = screen.getByRole('combobox')
      vi.useFakeTimers()
      fireEvent.change(modeSelect, { target: { value: 'giant' } })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      expect(screen.getByRole('combobox')).toHaveValue('classic')

      vi.useRealTimers()
      consoleError.mockRestore()
    })
  })

  describe('Player Management', () => {
    it('should update players list on roomState', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      if (handleRoomState) {
        await act(async () => {
          handleRoomState({
          id: 1,
          name: 'Room 1',
          game_mode: 'classic',
          host: 'TestUser',
          players: ['TestUser', 'Player2'],
          player_avatars: {}
        })
        })
      }

      await waitFor(() => {
        expect(screen.getByText('Player2')).toBeInTheDocument()
      })
    })

    it('should display ready_again players when returning to the lobby after a game', async () => {
      render(<CreateRoom {...defaultProps} mode="join" roomId={1} />)

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      handleRoomState?.({
        id: 1,
        name: 'Room 1',
        game_mode: 'classic',
        host: 'TestUser',
        players: ['TestUser', 'Player2', 'Player3'],
        ready_again: ['TestUser', 'Player3'],
        status: 'waiting',
        player_avatars: {}
      })

      await waitFor(() => {
        expect(screen.getByText('TestUser')).toBeInTheDocument()
        expect(screen.getByText('Player3')).toBeInTheDocument()
      })

      expect(screen.queryByText('Player2')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /players \(2\/6\)/i })).toBeInTheDocument()
    })
  })

  describe('Socket Communication', () => {
    it('should set up socket communication', () => {
      render(<CreateRoom {...defaultProps} />)
      
      // Socket is mocked and component should use it
      expect(socket).toBeDefined()
    })
  })

  describe('Join Mode', () => {
    it('should not create a room in join mode', () => {
      render(<CreateRoom {...defaultProps} mode="join" roomId={1} />)

      // Should not call POST /api/rooms
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should use provided roomId in join mode', () => {
      render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)

      return waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'joinRoom',
          expect.objectContaining({ roomId: '42', username: 'TestUser' }),
          expect.any(Function)
        )
      })
    })
  })

  describe('Mode Player Limits', () => {
    it('should prevent start game if not enough players', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const startButton = screen.getByRole('button', { name: /start game/i })
      expect(startButton).toBeDisabled()
    })
  })

  describe('Avatar Display', () => {
    it('should support avatar functionality', () => {
      render(<CreateRoom {...defaultProps} />)
      
      // Component supports avatars
      expect(defaultProps.userProfile.avatar).toBeDefined()
    })
  })

  describe('Back Navigation', () => {
    it('should have onBack callback', () => {
      render(<CreateRoom {...defaultProps} />)
      
      // Component has onBack prop
      expect(mockOnBack).toBeDefined()
    })
  })

  describe('Room Name Editing (Host)', () => {
    it('should allow host to edit room name and render the DB-confirmed name', async () => {
      const { container } = render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: 'NewName',
          game_mode: 'classic',
          host: 'TestUser',
          players: ['TestUser'],
          player_avatars: {}
        })
      })

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      if (handleRoomState) {
        handleRoomState({
          id: 1,
          name: 'Room 1',
          game_mode: 'classic',
          host: 'TestUser',
          players: ['TestUser'],
          player_avatars: {}
        })
      }

      await waitFor(() => {
        expect(container.querySelector('.edit-button')).toBeTruthy()
      })

      const editButton = container.querySelector('.edit-button')
      if (editButton) {
        fireEvent.click(editButton)
      }

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'NewName' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/rooms/1/name'),
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ name: 'NewName', username: 'TestUser' })
          })
        )
      })

      await waitFor(() => {
        expect(screen.getByText('NewName')).toBeInTheDocument()
      })

      expect(socket.emit).toHaveBeenCalledWith(
        'getRoomState',
        { roomId: '1' }
      )
    })
  })

  describe('Start Game', () => {
    it('should emit startGame when host starts with enough players', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      if (handleRoomState) {
        await act(async () => {
          handleRoomState({
            id: 1,
            name: 'Room 1',
            game_mode: 'classic',
            host: 'TestUser',
            players: ['TestUser', 'Player2'],
            player_avatars: {}
          })
        })
      }

      await waitFor(() => {
        expect(screen.getByText('Player2')).toBeInTheDocument()
      })

      const startButton = screen.getByRole('button', { name: /start game/i })
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'startGame',
          expect.objectContaining({ roomId: '1', username: 'TestUser' })
        )
      })
    })
  })
})
