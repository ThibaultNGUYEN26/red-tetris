import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ShadowBoards from '../../../../components/ShadowBoards/ShadowBoards.jsx'

describe('ShadowBoards Component', () => {
  it('renders nothing when boards are missing', () => {
    const { container } = render(<ShadowBoards />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when boards are empty', () => {
    const { container } = render(<ShadowBoards boards={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders opponent boards and usernames', () => {
    const boards = [
      {
        username: 'Alice',
        board: [
          ['empty', 'empty'],
          ['i', 'empty'],
        ],
      },
      {
        username: 'Bob',
        board: [
          ['empty', 'o'],
          ['empty', 'empty'],
        ],
      },
    ]

    render(<ShadowBoards boards={boards} />)

    expect(screen.getByText('Opponents')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'Alice board' })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'Bob board' })).toBeInTheDocument()
  })

  it('marks cells as spectrum from the first filled cell downward in each column', () => {
    const boards = [
      {
        username: 'Alice',
        board: [
          ['empty', 'empty', 'empty'],
          ['empty', 't', 'empty'],
          ['i', 'empty', 'empty'],
        ],
      },
    ]

    const { container } = render(<ShadowBoards boards={boards} />)

    const spectrumCells = container.querySelectorAll('.cell-spectrum')
    const emptyCells = container.querySelectorAll('.cell-empty')

    expect(spectrumCells).toHaveLength(3)
    expect(emptyCells).toHaveLength(6)
  })

  it('uses smaller cell size for large boards', () => {
    const bigBoard = Array.from({ length: 21 }, () =>
      Array.from({ length: 10 }, () => 'empty')
    )

    render(<ShadowBoards boards={[{ username: 'Giant', board: bigBoard }]} />)

    const grid = screen.getByRole('grid', { name: 'Giant board' })
    expect(grid).toHaveStyle('--shadow-cell-size: 4px')
  })
})
