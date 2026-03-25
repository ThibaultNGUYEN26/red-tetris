import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Leaderboard from '../components/Leaderboard/Leaderboard'
import { socket } from '../socket'

vi.mock('../socket', () => ({
  socket: {
    emit: vi.fn(),  
    on: vi.fn(),
    off: vi.fn(),
  }
}))

vi.mock('../components/FaceAvatar/FaceAvatar', () => ({
  default: () => <div className="face-avatar" />,
}))

const soloLeaderboard = Array.from({ length: 10 }).map((_, index) => ({
  rank: index + 1,
  name: `Player${index + 1}`,
  avatar: {
    skinColor: '#cccccc',
    eyeType: 'normal',
    mouthType: 'neutral'
  },
  score: 15000 - index * 500
}))

const coopLeaderboard = Array.from({ length: 10 }).map((_, index) => ({
  rank: index + 1,
  players: [
    {
      name: `Duo${index + 1}A`,
      avatar: { skinColor: '#cccccc', eyeType: 'normal', mouthType: 'neutral' }
    },
    {
      name: `Duo${index + 1}B`,
      avatar: { skinColor: '#dddddd', eyeType: 'happy', mouthType: 'smile' }
    }
  ],
  score: 18000 - index * 800
}))

const triggerSocketEvent = (eventName, payload) => {
  const handler = socket.on.mock.calls.find(([event]) => event === eventName)?.[1]
  if (handler) {
    handler(payload)
  }
}

describe('Leaderboard Component', () => {
  const defaultProps = {
    theme: 'light'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render Leaderboard component and tabs', async () => {
      render(<Leaderboard {...defaultProps} />)

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('leaderboardSolo', expect.any(Function))
      })
      triggerSocketEvent('leaderboardSolo', soloLeaderboard)

      expect(screen.getByText(/leaderboard/i)).toBeInTheDocument()
      expect(screen.getByText('Solo')).toBeInTheDocument()
      expect(screen.getByText('Co-op Duo')).toBeInTheDocument()
    })

    it('should display leaderboard title with trophy emoji', async () => {
      render(<Leaderboard {...defaultProps} />)

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('leaderboardSolo', expect.any(Function))
      })
      triggerSocketEvent('leaderboardSolo', soloLeaderboard)

      await waitFor(() => { expect(screen.getByText(/leaderboard/i)).toBeInTheDocument() })
    })

    it('should render leaderboard entries', async () => {
      render(<Leaderboard {...defaultProps} />)

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('leaderboardSolo', expect.any(Function))
      })
      triggerSocketEvent('leaderboardSolo', soloLeaderboard)

      await waitFor(() => {
        expect(screen.getByText('Player1')).toBeInTheDocument()
        expect(screen.getByText('Player2')).toBeInTheDocument()
      })
    })
  })

  describe('Solo Entries', () => {
    it('should display player ranks', async () => {
      render(<Leaderboard {...defaultProps} />)

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('leaderboardSolo', expect.any(Function))
      })
      triggerSocketEvent('leaderboardSolo', soloLeaderboard)

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('should display player names and scores', async () => {
      render(<Leaderboard {...defaultProps} />)

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('leaderboardSolo', expect.any(Function))
      })
      triggerSocketEvent('leaderboardSolo', soloLeaderboard)

      await waitFor(() => {
        for (let i = 1; i <= 10; i++) {
          expect(screen.getByText(`Player${i}`)).toBeInTheDocument()
        }
      })

      expect(screen.getByText(/15\D?000/)).toBeInTheDocument()
      expect(screen.getByText(/12\D?500/)).toBeInTheDocument()
    })

    it('should display player avatars', async () => {
      render(<Leaderboard {...defaultProps} />)

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('leaderboardSolo', expect.any(Function))
      })
      triggerSocketEvent('leaderboardSolo', soloLeaderboard)

      await waitFor(() => {
        const avatars = document.querySelectorAll('.face-avatar')
        expect(avatars.length).toBe(10)
      })
    })
  })

  describe('Co-op Entries', () => {
    it('should switch to co-op leaderboard and render duos', async () => {
      render(<Leaderboard {...defaultProps} />)

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('leaderboardSolo', expect.any(Function))
      })
      triggerSocketEvent('leaderboardSolo', soloLeaderboard)

      fireEvent.click(screen.getByText('Co-op Duo'))

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('leaderboardCoop', expect.any(Function))
      })
      triggerSocketEvent('leaderboardCoop', coopLeaderboard)

      await waitFor(() => {
        expect(screen.getByText('Duo1A + Duo1B')).toBeInTheDocument()
        expect(screen.getByText('Duo2A + Duo2B')).toBeInTheDocument()
      })
    })

    it('should display two avatars per duo', async () => {
      render(<Leaderboard {...defaultProps} />)

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('leaderboardSolo', expect.any(Function))
      })
      triggerSocketEvent('leaderboardSolo', soloLeaderboard)

      fireEvent.click(screen.getByText('Co-op Duo'))

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('leaderboardCoop', expect.any(Function))
      })
      triggerSocketEvent('leaderboardCoop', coopLeaderboard)

      await waitFor(() => {
        const avatars = document.querySelectorAll('.face-avatar')
        expect(avatars.length).toBe(20)
      })
    })
  })

  describe('Pagination', () => {
    it('should not show pagination controls when only one page', async () => {
      render(<Leaderboard {...defaultProps} />)

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('leaderboardSolo', expect.any(Function))
      })
      triggerSocketEvent('leaderboardSolo', soloLeaderboard)

      const buttons = screen.queryAllByRole('button')
      const paginationButtons = buttons.filter((button) =>
        button.classList.contains('pagination-btn')
      )
      expect(paginationButtons.length).toBe(0)
    })
  })
})

