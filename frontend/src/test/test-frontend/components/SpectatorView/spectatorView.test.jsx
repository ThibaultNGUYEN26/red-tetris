import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import SpectatorView from '../../../../components/SpectatorView/SpectatorView.jsx'

vi.mock('../../../../components/ShadowBoards/ShadowBoards', () => ({
  default: () => <div data-testid="shadow-boards" />,
}))

describe('SpectatorView Component', () => {
  it('shows empty state when no players to watch', () => {
    render(<SpectatorView players={[]} onBack={vi.fn()} username="Titi" />)

    expect(screen.getByText(/spectator mode/i)).toBeInTheDocument()
    expect(screen.getByText(/no players to watch/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('shows empty state when players is not an array', () => {
    render(<SpectatorView players={null} onBack={vi.fn()} username="Titi" />)

    expect(screen.getByText(/no players to watch/i)).toBeInTheDocument()
  })

  it('renders current player info and stats', () => {
    render(
      <SpectatorView
        username="Titi"
        onBack={vi.fn()}
        players={[
          { username: 'Titi', score: 10, lines: 1, level: 1, board: [['i']] },
          { username: 'Other', score: 1234, lines: 12, level: 3, board: [['o']], nextType: 'i' },
        ]}
      />
    )

    expect(screen.getByText(/spectating/i)).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.getByText(/1\D?234/)).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: /tetris board/i })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: /next piece/i })).toBeInTheDocument()
  })

  it('cycles players with next/prev buttons', () => {
    render(
      <SpectatorView
        username="Titi"
        onBack={vi.fn()}
        players={[
          { username: 'A', score: 1, lines: 1, level: 1, board: [['i']] },
          { username: 'B', score: 2, lines: 2, level: 2, board: [['o']] },
        ]}
      />
    )

    expect(screen.getByText('A')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('B')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /prev/i }))
    expect(screen.getByText('A')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /prev/i }))
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('cycles players with arrow keys and ignores unrelated keys', () => {
    render(
      <SpectatorView
        username="Titi"
        onBack={vi.fn()}
        players={[
          { username: 'A', score: 1, lines: 1, level: 1, board: [['i']] },
          { username: 'B', score: 2, lines: 2, level: 2, board: [['o']] },
        ]}
      />
    )

    expect(screen.getByText('A')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('B')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Tab' })
    expect(screen.getByText('B')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByText('A')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('disables nav buttons when only one opponent', () => {
    render(
      <SpectatorView
        username="Titi"
        onBack={vi.fn()}
        players={[
          { username: 'Titi', score: 10, lines: 1, level: 1, board: [['i']] },
          { username: 'SoloOpp', score: 11, lines: 2, level: 1, board: [['o']] },
        ]}
      />
    )

    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('uses fallback stats, unknown next pieces, and missing opponent boards', () => {
    render(
      <SpectatorView
        username="Titi"
        onBack={vi.fn()}
        players={[
          { username: 'A', board: [['empty']], nextType: 'unknown' },
          { username: 'B' },
        ]}
      />
    )

    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('Score').nextSibling).toHaveTextContent('0')
    expect(screen.getByText('Lines').nextSibling).toHaveTextContent('0')
    expect(screen.getByText('Level').nextSibling).toHaveTextContent('1')
    expect(screen.getByRole('grid', { name: /next piece/i }).querySelector('.cell')).not.toBeInTheDocument()
  })
})
