import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    global.fetch.mockReset()
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('renders login/register controls in French and changes language from the switcher', () => {
    const onLanguageChange = vi.fn()
    render(
      <AuthMenu
        onAuthenticated={onAuthenticated}
        theme="light"
        language="fr"
        onLanguageChange={onLanguageChange}
      />
    )

    expect(screen.getByRole('heading', { name: 'Connectez-vous' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Connexion' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Inscription' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Pseudo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Mot de passe')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /English/i }))

    expect(onLanguageChange).toHaveBeenCalledWith('en')
  })

  it('falls back to English auth labels when language is unsupported', () => {
    render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" language="zz" />)

    expect(screen.getByRole('heading', { name: 'Login to Your Account' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Login' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
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

  it('validates username and password complexity requirements', () => {
    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" />)

    fillLogin('Bad!User', 'Secret123!')
    expect(screen.getByPlaceholderText('Username')).toHaveValue('BadUser')

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'Titi' },
    })

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123!' },
    })
    submit(container)
    expect(screen.getByText('Password must contain at least 1 uppercase letter')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'SECRET123!' },
    })
    submit(container)
    expect(screen.getByText('Password must contain at least 1 lowercase letter')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'SecretPass!' },
    })
    submit(container)
    expect(screen.getByText('Password must contain at least 1 number')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Secret123' },
    })
    submit(container)
    expect(screen.getByText('Password must contain at least 1 special character')).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: /show confirm password/i }))
    expect(screen.getByPlaceholderText('Confirm password')).toHaveAttribute('type', 'text')

    submit(container)
    expect(screen.getByText('Invalid email')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'user@example.com' } })
    submit(container)
    expect(screen.getByText("Password doesn't match")).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'Secret123!' } })
    expect(screen.queryByText("Password doesn't match")).not.toBeInTheDocument()
  })

  it('navigates between auth modes and submits login with Enter', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: 'Titi' }),
    })

    render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" initialMode="unknown" />)

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(navigateMock).toHaveBeenCalledWith('/register', { replace: true })

    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })

    fillLogin()
    fireEvent.keyDown(screen.getByPlaceholderText('Password'), { key: 'Enter' })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/login'), expect.any(Object))
      expect(onAuthenticated).toHaveBeenCalledWith(expect.objectContaining({ username: 'Titi' }))
    })
  })

  it('ignores non-Enter keys in auth inputs', () => {
    render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" />)

    fillLogin()
    fireEvent.keyDown(screen.getByPlaceholderText('Password'), { key: 'Tab' })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(onAuthenticated).not.toHaveBeenCalled()
  })

  it('uses typed login details and avatar fallback when the login response omits them', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" />)

    fillLogin('FallbackUser')
    submit(container)

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledWith(expect.objectContaining({
        username: 'FallbackUser',
        email: '',
        avatar: expect.objectContaining({
          skinColor: expect.any(String),
          eyeType: expect.any(String),
          mouthType: expect.any(String),
        }),
      }))
    })
  })

  it('cycles avatar feature selectors in register mode', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" initialMode="register" />)
    const arrows = container.querySelectorAll('.feature-arrow')

    expect(screen.getByText('normal')).toBeInTheDocument()
    expect(screen.getByText('uwu')).toBeInTheDocument()

    fireEvent.click(arrows[1])
    fireEvent.click(arrows[2])
    fireEvent.click(arrows[3])
    fireEvent.click(arrows[4])
    fireEvent.click(arrows[5])

    expect(screen.getByText('normal')).toBeInTheDocument()
    expect(screen.getByText('uwu')).toBeInTheDocument()
  })

  it('restores a soft-deleted account after login reports it can be restored', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Account deleted', canRestore: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          username: 'Titi',
          email: 'titi@example.com',
          avatar: { skinColor: '#70d4d4', eyeType: 'happy', mouthType: 'smile' },
        }),
      })

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" />)

    fillLogin()
    submit(container)

    expect(await screen.findByText('Account deleted')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /restore account/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/restore'), expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"username":"Titi"'),
      }))
      expect(onAuthenticated).toHaveBeenCalledWith(expect.objectContaining({
        username: 'Titi',
        email: 'titi@example.com',
      }))
    })
  })

  it('uses typed profile details and avatar fallback when restore response omits them', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Account deleted', canRestore: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" />)

    fillLogin('FallbackUser')
    submit(container)
    expect(await screen.findByText('Account deleted')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /restore account/i }))

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledWith(expect.objectContaining({
        username: 'FallbackUser',
        email: '',
        avatar: expect.objectContaining({
          skinColor: expect.any(String),
          eyeType: expect.any(String),
          mouthType: expect.any(String),
        }),
      }))
    })
  })

  it('handles restore backend errors and network failures', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Account deleted', canRestore: true }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unable to restore this account' }),
      })
      .mockRejectedValueOnce(new Error('offline'))

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" />)

    fillLogin()
    submit(container)
    expect(await screen.findByText('Account deleted')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /restore account/i }))
    expect(await screen.findByText('Unable to restore this account')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /restore account/i }))
    expect(await screen.findByText('Server unavailable')).toBeInTheDocument()
  })

  it('uses fallback messages when auth error responses are not JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error('invalid json')
      },
    })

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" />)

    fillLogin()
    submit(container)

    expect(await screen.findByText('Authentication failed')).toBeInTheDocument()
  })

  it('uses a fallback restore error when the response body is not JSON', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Account deleted', canRestore: true }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('invalid json')
        },
      })

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" />)

    fillLogin()
    submit(container)
    expect(await screen.findByText('Account deleted')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /restore account/i }))
    expect(await screen.findByText('Unable to restore account')).toBeInTheDocument()
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

  it('shows the default forgot password success message without a reset URL', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" initialMode="forgot" />)

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'Titi' } })
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'titi@example.com' } })
    submit(container)

    expect(await screen.findByText('Password reset link generated')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalledWith(expect.stringContaining('/reset-password'), expect.any(Object))
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

  it('shows the default reset success message when the response omits one', async () => {
    locationSearch = '?token=abc'
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" initialMode="reset" />)

    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Secret123!' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'Secret123!' } })
    submit(container)

    expect(await screen.findByText('Password updated')).toBeInTheDocument()
  })

  it('validates reset password complexity and confirmation matching', () => {
    locationSearch = '?token=abc'
    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" initialMode="reset" />)

    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'simple' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'simple' } })
    submit(container)
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Secret123!' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'Different123!' } })
    submit(container)
    expect(screen.getByText("Password doesn't match")).toBeInTheDocument()
  })

  it('shows reset validation errors without a token', () => {
    const { container } = render(<AuthMenu onAuthenticated={onAuthenticated} theme="light" initialMode="reset" />)

    expect(screen.getByText('Invalid or expired reset link')).toBeInTheDocument()
    submit(container)
    expect(screen.getByText('Missing data')).toBeInTheDocument()
  })
})
