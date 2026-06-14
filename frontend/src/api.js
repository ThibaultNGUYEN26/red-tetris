import { logDuration, markStart } from './perf'
import { getStoredAuthToken } from './authToken'

export const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')

export const apiUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export const apiFetch = (path, options = {}) => {
  const { credentials = 'include', headers, ...rest } = options
  const start = markStart()
  const method = rest.method || 'GET'
  const authToken = getStoredAuthToken()
  const requestHeaders = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(headers || {}),
  }
  return fetch(apiUrl(path), {
    credentials,
    ...(Object.keys(requestHeaders).length ? { headers: requestHeaders } : {}),
    ...rest,
  }).finally(() => {
    logDuration('apiFetch', start, { method, path })
  })
}
