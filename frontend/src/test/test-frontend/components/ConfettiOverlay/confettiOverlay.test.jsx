import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const { mockFire, mockReset, mockCreate } = vi.hoisted(() => {
  const mockReset = vi.fn()
  const mockFire = vi.fn().mockResolvedValue(undefined)
  const mockCreate = vi.fn(() => Object.assign(mockFire, { reset: mockReset }))
  return { mockFire, mockReset, mockCreate }
})

vi.mock('canvas-confetti', () => ({
  default: Object.assign(vi.fn(), { create: mockCreate }),
}))

import ConfettiOverlay from '../../../../components/ConfettiOverlay/ConfettiOverlay.jsx'

describe('ConfettiOverlay', () => {
  let rafCallbacks
  let originalRaf

  beforeEach(() => {
    vi.clearAllMocks()
    rafCallbacks = []
    originalRaf = global.requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })
  })

  afterEach(() => {
    global.requestAnimationFrame = originalRaf
  })

  it('appends a canvas to body and fires confetti on the first frame', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    render(<ConfettiOverlay onDone={vi.fn()} />)

    expect(appendSpy).toHaveBeenCalled()
    expect(mockCreate).toHaveBeenCalled()
    expect(rafCallbacks).toHaveLength(1)

    act(() => { rafCallbacks[0](0) })
    expect(mockFire).toHaveBeenCalledTimes(2)
  })

  it('keeps scheduling frames while within the burst window', () => {
    render(<ConfettiOverlay onDone={vi.fn()} />)

    act(() => { rafCallbacks[0](0) })
    expect(rafCallbacks).toHaveLength(2)

    act(() => { rafCallbacks[1](0) })
    expect(mockFire).toHaveBeenCalledTimes(4)
  })

  it('stops spawning after the burst window and calls onDone after drain', async () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<ConfettiOverlay onDone={onDone} />)

    // Advance past the 500ms burst window so Date.now() >= end
    vi.advanceTimersByTime(600)
    // Fire the next rAF frame — this one will see Date.now() >= end and set the drain timeout
    act(() => {
      const cb = rafCallbacks[rafCallbacks.length - 1]
      if (typeof cb === 'function') cb(Date.now())
    })

    // Advance 2000ms to trigger the drain setTimeout
    await act(async () => { vi.advanceTimersByTime(2000) })

    expect(mockReset).toHaveBeenCalled()
    expect(onDone).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('resets confetti and removes the canvas on unmount', () => {
    const { unmount } = render(<ConfettiOverlay onDone={vi.fn()} />)
    unmount()
    expect(mockReset).toHaveBeenCalled()
  })
})
