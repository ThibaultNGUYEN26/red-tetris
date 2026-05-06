const PERF_STORAGE_KEY = 'red-tetris-perf'

export const isPerfEnabled = () => {
  if (typeof window === 'undefined') return false
  return (
    window.location.search.includes('perf=1') ||
    localStorage.getItem(PERF_STORAGE_KEY) === '1'
  )
}

export const enablePerfFromUrl = () => {
  if (typeof window === 'undefined') return
  if (window.location.search.includes('perf=1')) {
    localStorage.setItem(PERF_STORAGE_KEY, '1')
  }
}

export const perfLog = (label, details = {}) => {
  if (!isPerfEnabled()) return
  console.info(`[perf] ${label}`, details)
}

export const markStart = () => (
  typeof performance !== 'undefined' ? performance.now() : Date.now()
)

export const logDuration = (label, start, details = {}) => {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  perfLog(label, {
    ...details,
    durationMs: Math.round(now - start),
  })
}
