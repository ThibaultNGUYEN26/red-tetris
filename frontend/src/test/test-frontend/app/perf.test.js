import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  enablePerfFromUrl,
  isPerfEnabled,
  logDuration,
  markStart,
  perfLog,
} from '../../../perf'

const PERF_STORAGE_KEY = 'red-tetris-perf'

describe('perf helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    window.history.pushState({}, '', '/')
    localStorage.clear()
  })

  it('keeps perf disabled when browser globals are unavailable', () => {
    vi.stubGlobal('window', undefined)

    expect(isPerfEnabled()).toBe(false)
    expect(() => enablePerfFromUrl()).not.toThrow()
  })

  it('enables perf logging from persisted storage', () => {
    localStorage.setItem(PERF_STORAGE_KEY, '1')

    expect(isPerfEnabled()).toBe(true)
  })

  it('persists perf logging when requested through the URL', () => {
    window.history.pushState({}, '', '/?perf=1')

    enablePerfFromUrl()

    expect(localStorage.getItem(PERF_STORAGE_KEY)).toBe('1')
    expect(isPerfEnabled()).toBe(true)
  })

  it('does not persist perf logging without the URL flag', () => {
    enablePerfFromUrl()

    expect(localStorage.getItem(PERF_STORAGE_KEY)).toBeNull()
  })

  it('does not log when perf logging is disabled', () => {
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})

    perfLog('rooms:getAvailableRooms:emit')

    expect(consoleInfo).not.toHaveBeenCalled()
  })

  it('logs rounded durations when perf logging is enabled', () => {
    localStorage.setItem(PERF_STORAGE_KEY, '1')
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
    const now = vi.spyOn(performance, 'now')
    now.mockReturnValueOnce(100.2)
    now.mockReturnValueOnce(117.8)

    const start = markStart()
    logDuration('rooms:loaded', start, { roomCount: 3 })

    expect(consoleInfo).toHaveBeenCalledWith('[perf] rooms:loaded', {
      roomCount: 3,
      durationMs: 18,
    })
  })

  it('falls back to Date when the performance API is unavailable', () => {
    localStorage.setItem(PERF_STORAGE_KEY, '1')
    vi.stubGlobal('performance', undefined)
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
    const dateNow = vi.spyOn(Date, 'now')
    dateNow.mockReturnValueOnce(400)
    dateNow.mockReturnValueOnce(433)

    const start = markStart()
    logDuration('rooms:date-fallback', start)

    expect(consoleInfo).toHaveBeenCalledWith('[perf] rooms:date-fallback', {
      durationMs: 33,
    })
  })
})
