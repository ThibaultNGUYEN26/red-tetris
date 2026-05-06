import { logDuration, markStart } from './perf'

export const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')

export const apiUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export const apiFetch = (path, options = {}) => {
  const { credentials = 'include', ...rest } = options
  const start = markStart()
  const method = rest.method || 'GET'
  return fetch(apiUrl(path), {
    credentials,
    ...rest,
  }).finally(() => {
    logDuration('apiFetch', start, { method, path })
  })
}
