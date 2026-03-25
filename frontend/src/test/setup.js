import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Silence HTMLMediaElement not implemented errors in jsdom
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = vi.fn()
  HTMLMediaElement.prototype.pause = vi.fn()
}

// Cleanup after each test
afterEach(() => {
  cleanup()
})
