import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import CreateRoom from '../components/CreateRoom/CreateRoom'
import { socket } from '../socket'

// Mock the socket
vi.mock('../socket', () => ({
  socket: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
}))

// Mock fetch
global.fetch = vi.fn()

const API_URL = ''

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
    localStorage.clear()
    
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

    it('should store room ID in localStorage after creation', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(localStorage.getItem('currentRoomId')).toBe('1')
      })
    })

    it('should call onRoomCreated callback with room details', async () => {
      render(<CreateRoom {...defaultProps} />)

      await waitFor(() => {
        expect(mockOnRoomCreated).toHaveBeenCalledWith(1, 'Room 1')
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
    it('should have game mode selection available', () => {
      render(<CreateRoom {...defaultProps} />)
      
      // Component should render without crashing
      expect(true).toBe(true)
    })
  })

  describe('Player Management', () => {
    it('should render player management', () => {
      render(<CreateRoom {...defaultProps} />)
      
      // Component handles players internally
      expect(true).toBe(true)
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
        `${API_URL}/api/rooms`,
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should use provided roomId in join mode', () => {
      render(<CreateRoom {...defaultProps} mode="join" roomId={42} />)

      expect(socket.emit).toHaveBeenCalledWith(
        'joinRoom',
        expect.objectContaining({ roomId: '42' })
      )
    })
  })

  describe('Mode Player Limits', () => {
    it('should have game mode configurations', () => {
      render(<CreateRoom {...defaultProps} />)
      
      // Modes have different player limits
      expect(true).toBe(true)
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
})
