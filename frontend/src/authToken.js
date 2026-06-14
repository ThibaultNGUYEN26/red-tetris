export const AUTH_STORAGE_KEY = 'red-tetris-auth-user'
export const DEV_AUTH_TOKEN_STORAGE_KEY = 'red-tetris-dev-auth-token'

export const getStoredAuthToken = () => {
  try {
    return localStorage.getItem(DEV_AUTH_TOKEN_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export const setStoredAuthToken = (token) => {
  try {
    if (typeof token === 'string' && token) {
      localStorage.setItem(DEV_AUTH_TOKEN_STORAGE_KEY, token)
      return
    }
    localStorage.removeItem(DEV_AUTH_TOKEN_STORAGE_KEY)
  } catch {
    // Ignore storage failures; the HttpOnly cookie remains the primary session.
  }
}

export const clearStoredAuthToken = () => setStoredAuthToken('')

export const authFetchOptions = () => ({
  credentials: 'include',
})
