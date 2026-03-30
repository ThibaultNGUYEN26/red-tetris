import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mockUseRef = vi.fn(() => ({ current: null }))

vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useRef: () => mockUseRef(),
  }
})

import Title from '../components/Title/Title.jsx'

describe('Title Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const lockedNullRef = {}
    Object.defineProperty(lockedNullRef, 'current', {
      get: () => null,
      set: () => {},
      configurable: true,
    })
    mockUseRef.mockReturnValue(lockedNullRef)
  })

  afterEach(() => {
    vi.useRealTimers()
    Math.random.mockRestore()
  })

  it('renders safely when the title ref is not attached', () => {
    render(<Title />)

    expect(screen.getByRole('heading', { name: /red-tetris/i })).toBeInTheDocument()
    expect(() => vi.advanceTimersByTime(10)).not.toThrow()
  })

  it('renders the title and applies animation styles when the ref exists', async () => {
    const headingRef = { current: null }
    mockUseRef.mockReturnValueOnce(headingRef)

    render(<Title />)

    const heading = screen.getByRole('heading', { name: /red-tetris/i })
    headingRef.current = heading

    vi.advanceTimersByTime(10)

    expect(heading.style.transform).toMatch(/translate\(/)
    expect(heading.style.transition).toMatch(/transform/)
  })
})
