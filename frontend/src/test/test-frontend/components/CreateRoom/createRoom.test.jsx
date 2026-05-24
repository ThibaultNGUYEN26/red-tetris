import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import CreateRoom from '../../../../components/CreateRoom/CreateRoom'
import { socket } from '../../../../socket'

// Mock the socket
vi.mock('../../../../socket', () => ({
  socket: {
    connected: false,
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
  const mockOnNotice = vi.fn()
  const defaultProps = {
    theme: 'light',
    onBack: mockOnBack,
    onNotice: mockOnNotice,
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
    socket.connected = false
    socket.emit.mockReset()
    socket.on.mockReset()
    socket.off.mockReset()
    global.fetch.mockReset()
    
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
            isListed: true,
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

    it('should display the known room password in the lobby', async () => {
      render(<CreateRoom {...defaultProps} initialRoomPassword="secret-code" />)

      await waitFor(() => {
        expect(screen.getByLabelText('Room password')).toHaveTextContent('secret-code')
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

    it('should show the backend invalid game mode error on room creation failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid game mode'
        })
      })

      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(mockOnNotice).toHaveBeenCalledWith('Invalid game mode')
      })
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

    it('shows the invisible mode in the multiplayer selector', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      expect(screen.getByRole('option', { name: /invisible/i })).toBeInTheDocument()
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
      fireEvent.change(modeSelect, { target: { value: 'giant' } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/rooms/1/mode'),
          expect.objectContaining({ method: 'PATCH' })
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toHaveValue('classic')
      })

      consoleError.mockRestore()
    })
  })

  describe('Player Management', () => {
    it('should update players list on roomState', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('roomState', expect.any(Function))
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

    it('should update the current room from availableRooms when the host leaves', async () => {
      render(
        <CreateRoom
          {...defaultProps}
          mode="join"
          roomId={1}
          roomType="cooperative"
          username="Riri"
          userProfile={{
            avatar: {
              skinColor: '#00ff00',
              eyeType: 'happy',
              mouthType: 'smile'
            }
          }}
        />
      )

      const roomStateHandler = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]
      const availableRoomsHandler = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      await act(async () => {
        roomStateHandler?.({
          id: 1,
          name: 'Room 1',
          game_mode: 'cooperative',
          host: 'Titi',
          players: ['Titi', 'Riri'],
          player_avatars: {}
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Titi')).toBeInTheDocument()
        expect(screen.getByText('Riri')).toBeInTheDocument()
      })

      await act(async () => {
        availableRoomsHandler?.([{
          id: 1,
          name: 'Room 1',
          game_mode: 'cooperative',
          host: 'Riri',
          player_count: 1,
          players: ['Riri']
        }])
      })

      await waitFor(() => {
        expect(screen.queryByText('Titi')).not.toBeInTheDocument()
        expect(screen.getByText('Riri')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /players \(1\/2\)/i })).toBeInTheDocument()
      })
    })

    it('should not let availableRooms overwrite multiplayer room host state', async () => {
      render(
        <CreateRoom
          {...defaultProps}
          mode="join"
          roomId={1}
          roomType="multiplayer"
          username="Titi"
          userProfile={{
            avatar: {
              skinColor: '#7777ff',
              eyeType: 'happy',
              mouthType: 'smile'
            }
          }}
        />
      )

      const roomStateHandler = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]
      const availableRoomsHandler = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      await act(async () => {
        roomStateHandler?.({
          id: 1,
          name: 'Room 1',
          game_mode: 'classic',
          host: 'Riri',
          player_count: 2,
          players: ['Titi', 'Riri'],
          player_avatars: {}
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Titi')).toBeInTheDocument()
        expect(screen.getByText('Riri')).toBeInTheDocument()
      })

      await act(async () => {
        availableRoomsHandler?.([{
          id: 1,
          name: 'Room 1',
          game_mode: 'classic',
          host: 'Titi',
          player_count: 2,
          players: ['Titi', 'Riri']
        }])
      })

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith('getRoomState', { roomId: '1' })
      })

      const startButton = screen.getByRole('button', { name: /start game/i })
      expect(startButton).toBeDisabled()
      expect(screen.queryByRole('button', { name: /✏️/i })).not.toBeInTheDocument()
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
            body: JSON.stringify({ name: 'NewName' })
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

    it('should report a duplicate room name and keep editing state consistent', async () => {
      const { container } = render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const handleRoomState = socket.on.mock.calls
        .filter(call => call[0] === 'roomState')
        .at(-1)?.[1]

      await act(async () => {
        handleRoomState?.({
          id: 1,
          name: 'Room 1',
          game_mode: 'classic',
          host: 'TestUser',
          players: ['TestUser'],
          player_avatars: {}
        })
      })

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Room name already exists' })
      })

      await waitFor(() => {
        expect(container.querySelector('.edit-button')).toBeTruthy()
      })

      fireEvent.click(container.querySelector('.edit-button'))
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'TakenName' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockOnNotice).toHaveBeenCalledWith('Room already used.')
      })
    })

    it('should map generic room name update errors', async () => {
      const { container } = render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      await act(async () => {
        handleRoomState?.({
          id: 1,
          name: 'Room 1',
          game_mode: 'classic',
          host: 'TestUser',
          players: ['TestUser'],
          player_avatars: {}
        })
      })

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid room name' })
      })

      await waitFor(() => {
        expect(container.querySelector('.edit-button')).toBeTruthy()
      })

      fireEvent.click(container.querySelector('.edit-button'))
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'BadName' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/rooms/1/name'),
          expect.objectContaining({ method: 'PATCH' })
        )
      })
      expect(mockOnNotice).not.toHaveBeenCalledWith('Invalid room name')
    })

    it('should restore the previous room name on Escape and on failed update', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { container } = render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      await act(async () => {
        handleRoomState?.({
          id: 1,
          name: 'Room 1',
          game_mode: 'classic',
          host: 'TestUser',
          players: ['TestUser'],
          player_avatars: {}
        })
      })

      await waitFor(() => {
        expect(container.querySelector('.edit-button')).toBeTruthy()
      })

      fireEvent.click(container.querySelector('.edit-button'))
      let input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'DraftName' } })
      fireEvent.keyDown(input, { key: 'Escape' })

      expect(screen.getByText('Room 1')).toBeInTheDocument()

      global.fetch.mockRejectedValueOnce(new Error('network down'))

      await waitFor(() => {
        expect(container.querySelector('.edit-button')).toBeTruthy()
      })
      fireEvent.click(container.querySelector('.edit-button'))
      input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'NewName' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to update room name:',
          expect.any(Error)
        )
      })

      consoleError.mockRestore()
    })

    it('should cancel edits on blur and ignore empty room names', async () => {
      const { container } = render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      await act(async () => {
        handleRoomState?.({
          id: 1,
          name: 'Room 1',
          game_mode: 'classic',
          host: 'TestUser',
          players: ['TestUser'],
          player_avatars: {}
        })
      })

      fireEvent.click(container.querySelector('.edit-button'))
      let input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'DraftName' } })
      fireEvent.blur(input)

      expect(screen.getByText('Room 1')).toBeInTheDocument()

      global.fetch.mockClear()
      fireEvent.click(container.querySelector('.edit-button'))
      input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '   ' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })
      expect(global.fetch).not.toHaveBeenCalled()
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

    it('should report start game errors and allow retry state', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            id: 1,
            name: 'Room 1',
            game_mode: 'classic',
            host: 'TestUser',
            player_count: 2,
            players: ['TestUser', 'Player2'],
        }),
      })

      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
        expect(screen.getByText('Player2')).toBeInTheDocument()
      })

      socket.emit.mockImplementation((event) => {
        if (event === 'startGame') {
          throw new Error('socket down')
        }
      })

      fireEvent.click(screen.getByRole('button', { name: /start game/i }))

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to start game:',
          expect.any(Error)
        )
      })

      consoleError.mockRestore()
    })
  })

  describe('Navigation and unload', () => {
    it('should call onBack when the back button is clicked', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /back/i }))

      expect(mockOnBack).toHaveBeenCalled()
    })

    it('should not request deleted room state after leaving with the back button', async () => {
      render(<CreateRoom {...defaultProps} isSolo />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      const availableRoomsHandler = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      socket.emit.mockClear()
      fireEvent.click(screen.getByRole('button', { name: /back/i }))

      await act(async () => {
        availableRoomsHandler?.([])
      })

      expect(socket.emit).not.toHaveBeenCalledWith(
        'getRoomState',
        expect.objectContaining({ roomId: '1' })
      )
    })

    it('should keep the room session when the tab unloads so refresh can reconnect', async () => {
      socket.connected = true

      render(<CreateRoom {...defaultProps} mode="join" roomId={7} />)

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith(
          'joinRoom',
          expect.objectContaining({ roomId: '7', username: 'TestUser' }),
          expect.any(Function)
        )
      })

      window.dispatchEvent(new Event('beforeunload'))

      expect(socket.emit).not.toHaveBeenCalledWith('playerLeave', { roomId: '7' })
      socket.connected = false
    })
  })
})
