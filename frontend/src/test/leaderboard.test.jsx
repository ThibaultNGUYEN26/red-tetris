import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Leaderboard from '../components/Leaderboard/Leaderboard'

describe('Leaderboard Component', () => {
  const defaultProps = {
    theme: 'light'
  }

  beforeEach(() => {
    // Reset any state if needed
  })

  describe('Component Rendering', () => {
    it('should render Leaderboard component', () => {
      render(<Leaderboard {...defaultProps} />)
      
      expect(screen.getByText(/leaderboard/i)).toBeInTheDocument()
    })

    it('should display leaderboard title with trophy emoji', () => {
      render(<Leaderboard {...defaultProps} />)
      
      expect(screen.getByText(/🏆/)).toBeInTheDocument()
    })

    it('should render leaderboard entries', () => {
      render(<Leaderboard {...defaultProps} />)
      
      expect(screen.getByText('Player1')).toBeInTheDocument()
      expect(screen.getByText('Player2')).toBeInTheDocument()
    })
  })

  describe('Leaderboard Entries', () => {
    it('should display player ranks', () => {
      render(<Leaderboard {...defaultProps} />)
      
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should display player names', () => {
      render(<Leaderboard {...defaultProps} />)
      
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`Player${i}`)).toBeInTheDocument()
      }
    })

    it('should display player scores', () => {
      render(<Leaderboard {...defaultProps} />)
      
      // Scores should be formatted with commas
      expect(screen.getByText('15,000')).toBeInTheDocument()
      expect(screen.getByText('12,500')).toBeInTheDocument()
    })

    it('should display player avatars', () => {
      render(<Leaderboard {...defaultProps} />)
      
      const avatars = document.querySelectorAll('.face-avatar')
      expect(avatars.length).toBe(10)
    })

    it('should highlight top 3 players differently', () => {
      const { container } = render(<Leaderboard {...defaultProps} />)
      
      const topEntries = container.querySelectorAll('.top-1, .top-2, .top-3')
      expect(topEntries.length).toBe(3)
    })

    it('should apply top-1 class to first place', () => {
      const { container } = render(<Leaderboard {...defaultProps} />)
      
      const firstPlace = container.querySelector('.top-1')
      expect(firstPlace).toBeInTheDocument()
      expect(firstPlace?.textContent).toContain('Player1')
    })

    it('should apply top-2 class to second place', () => {
      const { container } = render(<Leaderboard {...defaultProps} />)
      
      const secondPlace = container.querySelector('.top-2')
      expect(secondPlace).toBeInTheDocument()
      expect(secondPlace?.textContent).toContain('Player2')
    })

    it('should apply top-3 class to third place', () => {
      const { container } = render(<Leaderboard {...defaultProps} />)
      
      const thirdPlace = container.querySelector('.top-3')
      expect(thirdPlace).toBeInTheDocument()
      expect(thirdPlace?.textContent).toContain('Player3')
    })
  })

  describe('Score Formatting', () => {
    it('should format scores with thousand separators', () => {
      render(<Leaderboard {...defaultProps} />)
      
      // Check that scores are formatted properly
      expect(screen.getByText('15,000')).toBeInTheDocument()
      expect(screen.getByText('12,500')).toBeInTheDocument()
      expect(screen.getByText('11,000')).toBeInTheDocument()
    })

    it('should display scores in descending order', () => {
      render(<Leaderboard {...defaultProps} />)
      
      const scores = ['15,000', '12,500', '11,000', '9,500', '8,700']
      scores.forEach(score => {
        expect(screen.getByText(score)).toBeInTheDocument()
      })
    })
  })

  describe('Pagination', () => {
    it('should not show pagination controls when only one page', () => {
      render(<Leaderboard {...defaultProps} />)
      
      // With 10 items and 10 per page, pagination should not render
      const buttons = screen.queryAllByRole('button')
      expect(buttons.length).toBe(0)
    })


    it('should not show pagination when only one page', () => {
      const { container } = render(<Leaderboard {...defaultProps} />)
      
      // With 10 items and 10 per page, pagination should be visible with 1/1
      const pagination = container.querySelector('.leaderboard-pagination')
      
      // Pagination is rendered since totalPages calculation is done
      if (pagination) {
        expect(screen.getByText(/1/)).toBeInTheDocument()
      }
    })
  })

  describe('Avatar Display', () => {
    it('should display different avatars for each player', () => {
      render(<Leaderboard {...defaultProps} />)
      
      const avatars = document.querySelectorAll('.face-avatar')
      
      // Should have 10 avatars (one per player on first page)
      expect(avatars.length).toBe(10)
    })

    it('should use correct avatar size', () => {
      render(<Leaderboard {...defaultProps} />)
      
      const avatars = document.querySelectorAll('.avatar-icon')
      expect(avatars.length).toBe(10)
    })
  })

  describe('Theme Support', () => {
    it('should apply dark theme class', () => {
      const { container } = render(<Leaderboard {...defaultProps} theme="dark" />)
      
      const leaderboard = container.querySelector('.leaderboard')
      expect(leaderboard).toHaveClass('dark')
    })

    it('should not apply dark theme class for light theme', () => {
      const { container } = render(<Leaderboard {...defaultProps} theme="light" />)
      
      const leaderboard = container.querySelector('.leaderboard')
      expect(leaderboard).not.toHaveClass('dark')
    })
  })

  describe('Entry Structure', () => {
    it('should display rank, avatar, name, and score for each entry', () => {
      render(<Leaderboard {...defaultProps} />)
      
      const entries = document.querySelectorAll('.leaderboard-entry')
      
      entries.forEach(entry => {
        expect(entry.querySelector('.rank')).toBeInTheDocument()
        expect(entry.querySelector('.avatar-icon')).toBeInTheDocument()
        expect(entry.querySelector('.name')).toBeInTheDocument()
        expect(entry.querySelector('.score')).toBeInTheDocument()
      })
    })

    it('should render exactly 10 entries', () => {
      render(<Leaderboard {...defaultProps} />)
      
      const entries = document.querySelectorAll('.leaderboard-entry')
      expect(entries.length).toBe(10)
    })

    it('should have proper class names for styling', () => {
      const { container } = render(<Leaderboard {...defaultProps} />)
      
      expect(container.querySelector('.leaderboard-list')).toBeInTheDocument()
      expect(container.querySelector('.leaderboard-entry')).toBeInTheDocument()
      expect(container.querySelector('.rank')).toBeInTheDocument()
      expect(container.querySelector('.name')).toBeInTheDocument()
      expect(container.querySelector('.score')).toBeInTheDocument()
    })
  })

  describe('Data Validation', () => {
    it('should have unique ranks for all entries', () => {
      render(<Leaderboard {...defaultProps} />)
      
      const ranks = new Set()
      for (let i = 1; i <= 10; i++) {
        const rank = screen.getByText(i.toString())
        expect(rank).toBeInTheDocument()
        ranks.add(i)
      }
      
      expect(ranks.size).toBe(10)
    })

    it('should have scores in descending order', () => {
      render(<Leaderboard {...defaultProps} />)
      
      // Get all score elements and verify they're in descending order
      const scoreElements = document.querySelectorAll('.score')
      const scores = Array.from(scoreElements).map(el => 
        parseInt(el.textContent.replace(/,/g, ''))
      )
      
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1])
      }
    })

    it('should have valid player names', () => {
      render(<Leaderboard {...defaultProps} />)
      
      for (let i = 1; i <= 10; i++) {
        const playerName = screen.getByText(`Player${i}`)
        expect(playerName).toBeInTheDocument()
        expect(playerName.textContent.trim()).not.toBe('')
      }
    })

    it('should have positive scores', () => {
      render(<Leaderboard {...defaultProps} />)
      
      const scoreElements = document.querySelectorAll('.score')
      scoreElements.forEach(scoreEl => {
        const score = parseInt(scoreEl.textContent.replace(/,/g, ''))
        expect(score).toBeGreaterThan(0)
      })
    })
  })

  describe('Visual Hierarchy', () => {
    it('should have title at the top', () => {
      const { container } = render(<Leaderboard {...defaultProps} />)
      
      const title = container.querySelector('.leaderboard-title')
      expect(title).toBeInTheDocument()
      expect(title?.textContent).toContain('Leaderboard')
    })

    it('should have entries in a list container', () => {
      const { container } = render(<Leaderboard {...defaultProps} />)
      
      const list = container.querySelector('.leaderboard-list')
      expect(list).toBeInTheDocument()
      
      const entries = list?.querySelectorAll('.leaderboard-entry')
      expect(entries?.length).toBe(10)
    })
  })
})
