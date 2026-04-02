import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const originalConsoleError = console.error

// Silence HTMLMediaElement not implemented errors in jsdom
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = vi.fn()
  HTMLMediaElement.prototype.pause = vi.fn()
}

// Keep test output readable: suppress app logs and noisy React act warnings.
console.log = () => {}
console.info = () => {}
console.debug = () => {}
console.error = (...args) => {
  const message = args.map(String).join(' ')
  if (message.includes('not wrapped in act(...)')) {
    return
  }
  if (message.includes('Failed to send profile to backend:')) {
    return
  }
  originalConsoleError(...args)
}

// Cleanup after each test
afterEach(() => {
  cleanup()
})
