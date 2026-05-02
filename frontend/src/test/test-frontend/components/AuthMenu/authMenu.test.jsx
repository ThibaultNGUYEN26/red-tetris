import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import AuthMenu from '../../../../components/AuthMenu/AuthMenu'

const navigateMock = vi.fn()
let locationSearch = ''

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ search: locationSearch }),
}))

vi.mock('../../../../components/FaceAvatar/FaceAvatar', () => ({
  default: () => <div className="face-avatar" />,
}))

global.fetch = vi.fn()

const fillLogin = (username = 'Titi', password = 'Secret123!') => {
  fireEvent.change(screen.getByPlaceholderText('Username'), {
    target: { value: username },
  })
  fireEvent.change(screen.getByPlaceholderText('Password'), {
    target: { value: password },
  })
}

const submit = (container) => {
  fireEvent.click(container.querySelector('.submit-button'))
}

describe('AuthMenu', () => {
  const onAuthenticated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    locationSearch = ''
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
  })

  it('logs in and forwards the authenticated profile', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        username: 'Titi',
        avatar: { skinColor: '#70d4d4', eyeType: 'happy', mouthType: 'smile' },
      }),
    })

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="dark" />)

    expect(screen.getByText('Login to Your Account')).toBeInTheDocument()
    fillLogin()
    submit(container)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/login'), expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"username":"Titi"'),
      }))
      expect(onAuthenticated).toHaveBeenCalledWith(expect.objectContaining({
        username: 'Titi',
        avatar: expect.objectContaining({ eyeType: 'happy' }),
      }))
    })
  })

  it('validates login and maps login errors', async () => {
    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" />)

    submit(container)
    expect(screen.getByText('Missing data')).toBeInTheDocument()

    fillLogin('Titi', 'bad')
    submit(container)
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Secret123!' },
    })
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    })
    submit(container)
    expect(await screen.findByText('Invalid password')).toBeInTheDocument()

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'User does not exist' }),
    })
    submit(container)
    expect(await screen.findByText('User does not exist')).toBeInTheDocument()
  })

  it('shows server unavailable when login request throws', async () => {
    global.fetch.mockRejectedValueOnce(new Error('offline'))
    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" />)

    fillLogin()
    submit(container)

    expect(await screen.findByText('Server unavailable')).toBeInTheDocument()
  })

  it('registers an account and returns to login', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    })

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" initialMode="register" />)

    expect(screen.getByText('Create Your Account')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /random/i }))
    fireEvent.click(container.querySelector('.feature-arrow'))
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'NewUser' },
    })
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'NewUser@Example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Secret123!' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), {
      target: { value: 'Secret123!' },
    })
    submit(container)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/register'), expect.objectContaining({
        body: expect.stringContaining('"email":"newuser@example.com"'),
      }))
      expect(screen.getByText('Account created. Please log in.')).toBeInTheDocument()
      expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(screen.getByPlaceholderText('Username')).toHaveValue('')
    expect(screen.getByPlaceholderText('Email')).toHaveValue('')
  })

  it('validates register fields and password toggles', () => {
    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" initialMode="register" />)

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'User' } })
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'bad-email' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Secret123!' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'Different123!' } })

    fireEvent.click(screen.getAllByRole('button', { name: /show password/i })[0])
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getAllByRole('button', { name: /hide password/i })[0])
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')

    submit(container)
    expect(screen.getByText('Invalid email')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'user@example.com' } })
    submit(container)
    expect(screen.getByText("Password doesn't match")).toBeInTheDocument()
  })

  it('handles forgot password success, reset URL navigation, and back to login', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Password reset email sent',
        resetUrl: 'http://localhost:8080/reset-password?token=abc',
      }),
    })

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" />)

    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(navigateMock).toHaveBeenCalledWith('/forgot-password', { replace: true })

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'Titi' } })
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'titi@example.com' } })
    submit(container)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/forgot-password'), expect.any(Object))
      expect(screen.getByText('Password reset email sent')).toBeInTheDocument()
      expect(navigateMock).toHaveBeenCalledWith('/reset-password?token=abc', { replace: true })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Back to login' }))
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('validates forgot password input', () => {
    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" initialMode="forgot" />)

    submit(container)
    expect(screen.getByText('Missing data')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'Titi' } })
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'bad-email' } })
    submit(container)
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })

  it('resets a password with a valid token', async () => {
    locationSearch = '?token=abc'
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Password updated' }),
    })

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" initialMode="reset" />)

    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Secret123!' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'Secret123!' } })
    submit(container)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/reset-password'), expect.objectContaining({
        body: expect.stringContaining('"token":"abc"'),
      }))
      expect(screen.getByText('Password updated')).toBeInTheDocument()
      expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  it('shows reset validation errors without a token', () => {
    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" initialMode="reset" />)

    expect(screen.getByText('Invalid or expired reset link')).toBeInTheDocument()
    submit(container)
    expect(screen.getByText('Missing data')).toBeInTheDocument()
  })
})
