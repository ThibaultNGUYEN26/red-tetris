import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Title from '../components/Title/Title.jsx'

describe('Title Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  afterEach(() => {
    vi.useRealTimers()
    Math.random.mockRestore()
  })

  it('renders the title and applies animation styles', () => {
    render(<Title />)

    const heading = screen.getByRole('heading', { name: /red-tetris/i })
    expect(heading).toBeInTheDocument()

    vi.advanceTimersByTime(10)
    expect(heading.style.transform).toMatch(/translate\(/)
    expect(heading.style.transition).toMatch(/transform/)
  })
})
