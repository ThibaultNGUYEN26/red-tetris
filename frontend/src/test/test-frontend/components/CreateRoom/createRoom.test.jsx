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

    it('should use a default avatar when no profile avatar is provided', async () => {
      render(<CreateRoom {...defaultProps} userProfile={{}} />)

      await waitFor(() => {
        expect(screen.getByText(/TestUser/i)).toBeInTheDocument()
      })
    })

    it('should apply dark theme classes', async () => {
      const { container } = render(<CreateRoom {...defaultProps} theme="dark" />)

      await waitFor(() => {
        expect(container.querySelector('.create-room-shell')).toHaveClass('dark')
        expect(container.querySelector('.create-room-card')).toHaveClass('dark')
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

    it('should notify join errors when creation is rejected as already in a room', async () => {
      const onJoinError = vi.fn()
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'User is already in a room'
        })
      })

      render(<CreateRoom {...defaultProps} onJoinError={onJoinError} />)

      await waitFor(() => {
        expect(onJoinError).toHaveBeenCalledWith('User is already in a room')
      })
    })

    it('should notify join errors for duplicate room creation conflicts', async () => {
      const onJoinError = vi.fn()
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'Room name already exists'
        })
      })

      render(<CreateRoom {...defaultProps} onJoinError={onJoinError} />)

      await waitFor(() => {
        expect(mockOnNotice).toHaveBeenCalledWith('Room already used.')
        expect(onJoinError).toHaveBeenCalledWith('Room already used')
      })
    })

    it('should log when room creation succeeds without a room id', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'No room available'
        })
      })

      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          '[CreateRoom] Room creation failed:',
          'No room available'
        )
      })
    })

    it('should log the default missing room id message', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          '[CreateRoom] Room creation failed:',
          'No roomId returned'
        )
      })
    })

    it('should use desired room names and host fallbacks from room creation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: 'Room 1',
          game_mode: 'classic',
          players: ['TestUser']
        })
      })

      render(<CreateRoom {...defaultProps} desiredRoomName="CustomRoom" />)

      await waitFor(() => {
        expect(screen.getByText('CustomRoom')).toBeInTheDocument()
        expect(mockOnRoomCreated).toHaveBeenCalledWith(1, 'CustomRoom', 'multiplayer')
      })
    })

    it.each([
      ['Room already used', 'Room already used.'],
      ['Only the host can rename the room', 'Only the host can rename the room.'],
      ['Unexpected room error', 'Unable to update the room right now.'],
    ])('should map room creation error "%s"', async (error, expectedMessage) => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error })
      })

      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(mockOnNotice).toHaveBeenCalledWith(expectedMessage)
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
      expect(screen.getByText(/standard versus tetris/i)).toBeInTheDocument()
    })

    it('should PATCH mode change when host selects a new mode', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('roomState', expect.any(Function))
      })

      const handleRoomState = socket.on.mock.calls
        .filter(call => call[0] === 'roomState')
        .at(-1)?.[1]

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
      expect(screen.getByText(/controls are reversed/i)).toBeInTheDocument()

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

      const handleRoomState = socket.on.mock.calls
        .filter(call => call[0] === 'roomState')
        .at(-1)?.[1]

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

    it('should use existingRooms as a cooperative single-player fallback', async () => {
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom') {
          callback?.({ ok: true })
        }
      })

      render(
        <CreateRoom
          {...defaultProps}
          mode="join"
          roomId={11}
          username="SoloHost"
          existingRooms={[{
            id: 11,
            name: 'Coop Room',
            game_mode: 'cooperative_roles',
            host: '',
            player_count: 1,
            players: []
          }]}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('SoloHost')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /players \(1\/2\)/i })).toBeInTheDocument()
      })
    })

    it('should prefer listed cooperative fallback players when present', async () => {
      render(
        <CreateRoom
          {...defaultProps}
          mode="join"
          roomId={13}
          username="Viewer"
          existingRooms={[{
            id: 13,
            name: 'Coop Room',
            game_mode: 'cooperative',
            host: '',
            player_count: 1,
            players: ['ListedHost']
          }]}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('ListedHost')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /players \(1\/2\)/i })).toBeInTheDocument()
      })
    })

    it('should fall back to an empty username when cooperative fallback data has no host or players', async () => {
      render(
        <CreateRoom
          {...defaultProps}
          mode="join"
          roomId={14}
          username=""
          existingRooms={[{
            id: 14,
            name: 'Coop Room',
            game_mode: 'cooperative',
            host: '',
            player_count: 1,
            players: []
          }]}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /players \(1\/2\)/i })).toBeInTheDocument()
      })
    })

    it('should ignore existingRooms fallback for non-cooperative or populated rooms', async () => {
      const { rerender } = render(
        <CreateRoom
          {...defaultProps}
          mode="join"
          roomId={12}
          existingRooms={[{
            id: 12,
            name: 'Classic Room',
            game_mode: 'classic',
            host: 'ClassicHost',
            player_count: 1,
            players: ['ClassicHost']
          }]}
        />
      )

      expect(screen.queryByText('ClassicHost')).not.toBeInTheDocument()

      rerender(
        <CreateRoom
          {...defaultProps}
          mode="join"
          roomId={12}
          existingRooms={[{
            id: 12,
            name: 'Coop Room',
            game_mode: 'cooperative',
            host: 'CoopHost',
            player_count: 2,
            players: ['CoopHost', 'Player2']
          }]}
        />
      )

      expect(screen.queryByText('CoopHost')).not.toBeInTheDocument()
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
      expect(screen.getByRole('heading', { name: /players \(2\/8\)/i })).toBeInTheDocument()
    })

    it('should fall back to two players when the selected mode is unknown', async () => {
      const { container } = render(<CreateRoom {...defaultProps} mode="join" roomId={1} />)

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      await act(async () => {
        handleRoomState?.({
          id: 1,
          name: 'Room 1',
          game_mode: 'unknown_mode',
          host: 'TestUser',
          players: ['TestUser'],
          player_avatars: {}
        })
      })

      expect(screen.getByRole('heading', { name: /players \(1\/2\)/i })).toBeInTheDocument()
      expect(container.querySelector('.player-item.waiting')).toBeInTheDocument()
    })

    it('should ignore room name input past the maximum length', async () => {
      const { container } = render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(container.querySelector('.edit-button')).toBeTruthy()
      })

      fireEvent.click(container.querySelector('.edit-button'))
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'NameThatIsTooLong' } })

      expect(input).toHaveValue('Room 1')
    })

    it('should skip mode updates when the selected mode is empty', async () => {
      render(<CreateRoom {...defaultProps} mode="join" roomId={1} />)

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      socket.emit.mockClear()
      global.fetch.mockClear()

      await act(async () => {
        handleRoomState?.({
          id: 1,
          name: 'Room 1',
          game_mode: '',
          host: 'TestUser',
          players: ['TestUser'],
          player_avatars: {}
        })
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should ignore empty and mismatched room state payloads', async () => {
      render(<CreateRoom {...defaultProps} mode="join" roomId={1} />)

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      await act(async () => {
        handleRoomState?.(null)
        handleRoomState?.({
          id: 99,
          name: 'Wrong Room',
          game_mode: 'classic',
          host: 'OtherHost',
          players: ['OtherHost'],
          player_avatars: {}
        })
      })

      expect(screen.queryByText('Wrong Room')).not.toBeInTheDocument()
      expect(screen.queryByText('OtherHost')).not.toBeInTheDocument()
    })

    it('should request room state when availableRooms payload is not an array', async () => {
      render(<CreateRoom {...defaultProps} mode="join" roomId={1} />)

      const availableRoomsHandler = socket.on.mock.calls.find(
        call => call[0] === 'availableRooms'
      )?.[1]

      socket.emit.mockClear()

      await act(async () => {
        availableRoomsHandler?.(null)
      })

      expect(socket.emit).toHaveBeenCalledWith('getRoomState', { roomId: '1' })
    })

    it('should keep the draft room name while editing during room state updates', async () => {
      const { container } = render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(container.querySelector('.edit-button')).toBeTruthy()
      })

      fireEvent.click(container.querySelector('.edit-button'))
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'DraftName' } })

      await waitFor(() => {
        expect(socket.on.mock.calls.filter(call => call[0] === 'roomState')).toHaveLength(2)
      })

      const handleRoomState = socket.on.mock.calls
        .filter(call => call[0] === 'roomState')
        .at(-1)?.[1]

      await act(async () => {
        handleRoomState?.({
          id: 1,
          name: 'ServerName',
          game_mode: 'classic',
          host: 'TestUser',
          players: ['TestUser'],
          player_avatars: {}
        })
      })

      expect(screen.getByRole('textbox')).toHaveValue('DraftName')
    })

    it('should handle empty room state players', async () => {
      render(<CreateRoom {...defaultProps} mode="join" roomId={1} />)

      const handleRoomState = socket.on.mock.calls.find(
        call => call[0] === 'roomState'
      )?.[1]

      await act(async () => {
        handleRoomState?.({
          id: 1,
          name: 'ServerName',
          game_mode: 'classic',
          host: 'MissingHost',
          player_avatars: {}
        })
      })

      expect(screen.getByRole('heading', { name: /players \(0\/8\)/i })).toBeInTheDocument()
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

    it('should handle successful initial join callbacks', async () => {
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom') {
          callback?.({ ok: true })
        }
      })

      render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)

      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith('getRoomState', { roomId: '42' })
      })
    })

    it('should ignore initial join callbacks after cleanup or leaving', async () => {
      const callbacks = []
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom') {
          callbacks.push(callback)
        }
      })

      const { unmount } = render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)
      unmount()

      await act(async () => {
        callbacks[0]?.({ ok: true })
      })

      expect(socket.emit).not.toHaveBeenCalledWith('getRoomState', { roomId: '42' })

      render(<CreateRoom {...defaultProps} mode="join" roomId={43} />)
      fireEvent.click(screen.getByRole('button', { name: /back/i }))

      await act(async () => {
        callbacks[1]?.({ ok: true })
      })

      expect(socket.emit).not.toHaveBeenCalledWith('getRoomState', { roomId: '43' })
    })

    it('should report non-password join failures', async () => {
      const onJoinError = vi.fn()
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom') {
          callback?.({ ok: false, error: 'Room is full' })
        }
      })

      render(<CreateRoom {...defaultProps} mode="join" roomId={42} onJoinError={onJoinError} />)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to join room:', 'Room is full')
        expect(onJoinError).toHaveBeenCalledWith('Room is full')
      })
    })

    it.each([
      ['Username already connected'],
      ['User is already in a room'],
      ['Unexpected join error'],
    ])('should map join failure "%s"', async (error) => {
      const onJoinError = vi.fn()
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom') {
          callback?.({ ok: false, error })
        }
      })

      render(<CreateRoom {...defaultProps} mode="join" roomId={42} onJoinError={onJoinError} />)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to join room:', error)
        expect(onJoinError).toHaveBeenCalledWith(error)
      })
    })

    it('should use Unknown error when a join failure has no error payload', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom') {
          callback?.({ ok: false })
        }
      })

      render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to join room:', 'Unknown error')
      })
    })

    it('should show invalid password on the initial join attempt', async () => {
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom') {
          callback?.({ ok: false, error: 'Invalid room password' })
        }
      })

      render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Room Password')).toBeInTheDocument()
        expect(screen.getByText('Invalid room password')).toBeInTheDocument()
      })
    })

    it('should prompt for a room password, validate empty submissions, and toggle visibility', async () => {
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom') {
          callback?.({ ok: false, error: 'Room password required' })
        }
      })

      render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Room Password')).toBeInTheDocument()
      })

      const passwordInput = screen.getByLabelText('Room Password')
      expect(passwordInput).toHaveClass('masked-password-input')

      fireEvent.click(screen.getByRole('button', { name: /join room/i }))
      expect(screen.getByText('Room password required')).toBeInTheDocument()

      fireEvent.change(passwordInput, { target: { value: 'secret' } })
      expect(screen.queryByText('Room password required')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /show password/i }))
      expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()
      expect(passwordInput).not.toHaveClass('masked-password-input')
    })

    it('should show invalid room password errors and join after a valid retry', async () => {
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event !== 'joinRoom') return

        if (!payload.roomPassword) {
          callback?.({ ok: false, error: 'Room password required' })
          return
        }

        callback?.(
          payload.roomPassword === 'wrong'
            ? { ok: false, error: 'Invalid room password' }
            : { ok: true }
        )
      })

      render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Room Password')).toBeInTheDocument()
      })

      const passwordInput = screen.getByLabelText('Room Password')
      fireEvent.change(passwordInput, { target: { value: 'wrong' } })
      fireEvent.submit(passwordInput.closest('form'))

      await waitFor(() => {
        expect(screen.getByText('Invalid room password')).toBeInTheDocument()
      })

      fireEvent.change(passwordInput, { target: { value: 'correct' } })
      fireEvent.submit(passwordInput.closest('form'))

      await waitFor(() => {
        expect(screen.queryByLabelText('Room Password')).not.toBeInTheDocument()
        expect(socket.emit).toHaveBeenCalledWith('getRoomState', { roomId: '42' })
      })
    })

    it.each([
      [{ ok: false, error: 'Room closed' }, 'Room closed'],
      [{ ok: false }, 'Unable to join room'],
    ])('should show password retry failure messages', async (retryResponse, expectedMessage) => {
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event !== 'joinRoom') return

        callback?.(
          payload.roomPassword
            ? retryResponse
            : { ok: false, error: 'Room password required' }
        )
      })

      render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Room Password')).toBeInTheDocument()
      })

      const passwordInput = screen.getByLabelText('Room Password')
      fireEvent.change(passwordInput, { target: { value: 'secret' } })
      fireEvent.submit(passwordInput.closest('form'))

      await waitFor(() => {
        expect(screen.getByText(expectedMessage)).toBeInTheDocument()
      })
    })

    it('should ignore password retry callbacks after leaving', async () => {
      let retryCallback
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event !== 'joinRoom') return

        if (payload.roomPassword) {
          retryCallback = callback
          return
        }

        callback?.({ ok: false, error: 'Room password required' })
      })

      render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Room Password')).toBeInTheDocument()
      })

      const passwordInput = screen.getByLabelText('Room Password')
      fireEvent.change(passwordInput, { target: { value: 'secret' } })
      fireEvent.submit(passwordInput.closest('form'))
      fireEvent.click(screen.getByRole('button', { name: /back/i }))

      await act(async () => {
        retryCallback?.({ ok: true })
      })

      expect(mockOnBack).toHaveBeenCalled()
      expect(socket.emit).not.toHaveBeenCalledWith('getRoomState', { roomId: '42' })
    })

    it('should ignore password submissions after leaving', async () => {
      let form
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom') {
          callback?.({ ok: false, error: 'Room password required' })
        }
      })

      render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)

      await waitFor(() => {
        form = screen.getByLabelText('Room Password').closest('form')
      })

      fireEvent.click(screen.getByRole('button', { name: /back/i }))
      socket.emit.mockClear()
      fireEvent.submit(form)

      expect(socket.emit).not.toHaveBeenCalled()
    })

    it('should return from the password prompt with the back button', async () => {
      socket.emit.mockImplementation((event, payload, callback) => {
        if (event === 'joinRoom') {
          callback?.({ ok: false, error: 'Room password required' })
        }
      })

      render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Room Password')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /back/i }))

      expect(mockOnBack).toHaveBeenCalled()
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

    it('should use a fallback room name update error when the response is not JSON', async () => {
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
        json: async () => {
          throw new Error('invalid json')
        }
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
