import './AuthMenu.css'
import '../ProfileMenu/ProfileMenu.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import FaceAvatar from '../FaceAvatar/FaceAvatar'

const USERNAME_PATTERN = /^[a-zA-Z0-9]{1,15}$/
const PASSWORD_MIN_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AUTH_MODES = new Set(['login', 'register', 'forgot', 'reset'])

const skinColors = [
  '#70d4d4',
  '#d4d470',
  '#9966cc',
  '#70d470',
  '#d47070',
  '#7070d4',
  '#d49e70',
]

const eyeTypes = ['normal', 'happy', 'joy', 'sad', 'very_sad', 'crying', 'uwu', 'cute', 'love', 'blink', 'close', 'soft', 'dizzy', 'fear', 'cold_fear', 'panic', 'dead']
const mouthTypes = ['uwu', 'neutral', 'smile', 'not_smile', 'laugth', 'sad', 'open', 'kiss', 'scared', 'scream', 'horrified']

const getSafeMode = (mode) => (AUTH_MODES.has(mode) ? mode : 'login')
const getPasswordValidationError = (password) => {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 8 characters'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least 1 uppercase letter'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least 1 lowercase letter'
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least 1 number'
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least 1 special character'
  }
  return null
}

function AuthMenu({ onAuthenticated, theme, initialMode = 'login' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState(getSafeMode(initialMode))
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef(null)

  const resetToken = useMemo(
    () => new URLSearchParams(location.search).get('token') || '',
    [location.search]
  )

  const [selectedSkin, setSelectedSkin] = useState(() => Math.floor(Math.random() * skinColors.length))
  const [selectedEyes, setSelectedEyes] = useState(() => Math.floor(Math.random() * eyeTypes.length))
  const [selectedMouth, setSelectedMouth] = useState(() => Math.floor(Math.random() * mouthTypes.length))

  const currentAvatar = useMemo(() => ({
    skinColor: skinColors[selectedSkin],
    eyeType: eyeTypes[selectedEyes],
    mouthType: mouthTypes[selectedMouth],
    hairType: 'bald',
    hairColor: '',
  }), [selectedSkin, selectedEyes, selectedMouth])

  useEffect(() => {
    setMode(getSafeMode(initialMode))
  }, [initialMode])

  useEffect(() => {
    inputRef.current?.focus()
  }, [mode])

  useEffect(() => {
    if (mode === 'reset' && !resetToken) {
      setErrorMessage('Invalid or expired reset link')
    }
  }, [mode, resetToken])

  const clearMessages = () => {
    setErrorMessage('')
    setSuccessMessage('')
  }

  const resetPasswordToggles = () => {
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const onModeChange = (nextMode) => {
    const safeMode = getSafeMode(nextMode)
    setMode(safeMode)
    setPassword('')
    setConfirmPassword('')
    resetPasswordToggles()
    clearMessages()

    if (safeMode === 'login') {
      navigate('/login', { replace: true })
      return
    }

    if (safeMode === 'register') {
      navigate('/register', { replace: true })
      return
    }

    if (safeMode === 'forgot') {
      navigate('/forgot-password', { replace: true })
      return
    }

    navigate('/reset-password', { replace: true })
  }

  const handleUsernameChange = (event) => {
    const sanitizedValue = event.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 15)
    setUsername(sanitizedValue)
    if (errorMessage || successMessage) clearMessages()
  }

  const handleEmailChange = (event) => {
    setEmail(event.target.value.trim())
    if (errorMessage || successMessage) clearMessages()
  }

  const handlePasswordChange = (event) => {
    setPassword(event.target.value)
    if (errorMessage || successMessage) clearMessages()
  }

  const handleConfirmPasswordChange = (event) => {
    setConfirmPassword(event.target.value)
    if (errorMessage || successMessage) clearMessages()
  }

  const handleRandomize = () => {
    setSelectedSkin(Math.floor(Math.random() * skinColors.length))
    setSelectedEyes(Math.floor(Math.random() * eyeTypes.length))
    setSelectedMouth(Math.floor(Math.random() * mouthTypes.length))
  }

  const validate = () => {
    const trimmedUsername = username.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (mode === 'forgot') {
      if (!trimmedUsername || !normalizedEmail) return 'Missing data'
      if (!USERNAME_PATTERN.test(trimmedUsername)) return 'Invalid username'
      if (!EMAIL_PATTERN.test(normalizedEmail)) return 'Invalid email'
      return null
    }

    if (mode === 'reset') {
      if (!resetToken || !password || !confirmPassword) return 'Missing data'
      const passwordError = getPasswordValidationError(password)
      if (passwordError) return passwordError
      if (password !== confirmPassword) return "Password doesn't match"
      return null
    }

    if (!trimmedUsername || !password || (mode === 'register' && (!normalizedEmail || !confirmPassword))) {
      return 'Missing data'
    }

    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      return 'Invalid username'
    }

    if (mode === 'register' && !EMAIL_PATTERN.test(normalizedEmail)) {
      return 'Invalid email'
    }

    const passwordError = getPasswordValidationError(password)
    if (passwordError) {
      return passwordError
    }

    if (mode === 'register' && password !== confirmPassword) {
      return "Password doesn't match"
    }

    return null
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setErrorMessage(validationError)
      setSuccessMessage('')
      return
    }

    setIsSubmitting(true)
    clearMessages()

    try {
      let endpoint = '/api/auth/login'
      let payload = {
        username: username.trim(),
        password,
      }

      if (mode === 'register') {
        endpoint = '/api/auth/register'
        payload = {
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          avatar: {
            skinColor: currentAvatar.skinColor,
            eyeType: currentAvatar.eyeType,
            mouthType: currentAvatar.mouthType,
          },
        }
      } else if (mode === 'forgot') {
        endpoint = '/api/auth/forgot-password'
        payload = {
          username: username.trim(),
          email: email.trim().toLowerCase(),
        }
      } else if (mode === 'reset') {
        endpoint = '/api/auth/reset-password'
        payload = {
          token: resetToken,
          password,
          confirmPassword,
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const nextError = data?.error === 'Invalid credentials'
          ? 'Invalid password'
          : data?.error || 'Authentication failed'
        setErrorMessage(nextError)
        return
      }

      if (mode === 'forgot') {
        setSuccessMessage(data?.message || 'Password reset link generated')
        if (data?.resetUrl) {
          const url = new URL(data.resetUrl, window.location.origin)
          navigate(`${url.pathname}${url.search}`, { replace: true })
        }
        return
      }

      if (mode === 'register') {
        setSuccessMessage('Account created. Please log in.')
        setPassword('')
        setConfirmPassword('')
        resetPasswordToggles()
        setMode('login')
        navigate('/login', { replace: true })
        return
      }

      if (mode === 'reset') {
        setSuccessMessage(data?.message || 'Password updated')
        setPassword('')
        setConfirmPassword('')
        resetPasswordToggles()
        navigate('/login', { replace: true })
        setMode('login')
        return
      }

      await onAuthenticated({
        username: data.username || username.trim(),
        avatar: data.avatar || {
          skinColor: currentAvatar.skinColor,
          eyeType: currentAvatar.eyeType,
          mouthType: currentAvatar.mouthType,
        },
      })
    } catch {
      setErrorMessage('Server unavailable')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSubmit()
    }
  }

  const title = mode === 'register'
    ? 'Create Your Account'
    : mode === 'forgot'
      ? 'Reset Your Password'
      : mode === 'reset'
        ? 'Choose a New Password'
        : 'Login to Your Account'

  const submitLabel = isSubmitting
    ? 'Please wait...'
    : mode === 'register'
      ? 'Register'
      : mode === 'forgot'
        ? 'Send Reset Link'
        : mode === 'reset'
          ? 'Update Password'
          : 'Login'

  const isRegisterLayout = mode === 'register'

  return (
    <div className={`username-card auth-card ${isRegisterLayout ? 'register-mode' : 'login-mode'} ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="auth-switch-row">
        <button
          type="button"
          className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => onModeChange('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
          onClick={() => onModeChange('register')}
        >
          Register
        </button>
      </div>

      <h2>{title}</h2>

      <div className={`auth-content ${isRegisterLayout ? 'register-layout' : 'login-layout'}`}>
        {isRegisterLayout && (
          <div className="auth-avatar-column">
            <div className="avatar-section">
              <div className="avatar-preview">
                <FaceAvatar faceConfig={currentAvatar} size="large" />
              </div>

              <button className="random-button" onClick={handleRandomize} type="button">
                🎲 Random
              </button>

              <div className="feature-selectors">
                <div className="feature-row">
                  <label>Skin</label>
                  <div className="feature-carousel">
                    <button className="feature-arrow" onClick={() => setSelectedSkin((prev) => (prev - 1 + skinColors.length) % skinColors.length)} type="button">◀</button>
                    <div className="color-preview" style={{ backgroundColor: skinColors[selectedSkin] }} />
                    <button className="feature-arrow" onClick={() => setSelectedSkin((prev) => (prev + 1) % skinColors.length)} type="button">▶</button>
                  </div>
                </div>

                <div className="feature-row">
                  <label>Eyes</label>
                  <div className="feature-carousel">
                    <button className="feature-arrow" onClick={() => setSelectedEyes((prev) => (prev - 1 + eyeTypes.length) % eyeTypes.length)} type="button">◀</button>
                    <span className="feature-name">{eyeTypes[selectedEyes]}</span>
                    <button className="feature-arrow" onClick={() => setSelectedEyes((prev) => (prev + 1) % eyeTypes.length)} type="button">▶</button>
                  </div>
                </div>

                <div className="feature-row">
                  <label>Mouth</label>
                  <div className="feature-carousel">
                    <button className="feature-arrow" onClick={() => setSelectedMouth((prev) => (prev - 1 + mouthTypes.length) % mouthTypes.length)} type="button">◀</button>
                    <span className="feature-name">{mouthTypes[selectedMouth]}</span>
                    <button className="feature-arrow" onClick={() => setSelectedMouth((prev) => (prev + 1) % mouthTypes.length)} type="button">▶</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="auth-form-column">
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <input
              ref={mode === 'login' || mode === 'forgot' ? inputRef : null}
              type="text"
              value={username}
              onChange={handleUsernameChange}
              onKeyDown={handleKeyPress}
              placeholder="Username"
              maxLength={15}
              pattern="[A-Za-z0-9]{1,15}"
              className="username-input"
            />
          )}

          {(mode === 'register' || mode === 'forgot') && (
            <input
              ref={mode !== 'login' && mode !== 'register' ? inputRef : null}
              type="email"
              value={email}
              onChange={handleEmailChange}
              onKeyDown={handleKeyPress}
              placeholder="Email"
              className="username-input"
            />
          )}

          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <div className="password-input-wrapper">
              <input
                ref={mode === 'reset' ? inputRef : null}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={handleKeyPress}
                placeholder="Password"
                className="username-input password-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙉' : '🙈'}
              </button>
            </div>
          )}

          {(mode === 'register' || mode === 'reset') && (
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                onKeyDown={handleKeyPress}
                placeholder="Confirm password"
                className="username-input password-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? '🙉' : '🙈'}
              </button>
            </div>
          )}

          {mode === 'login' && (
            <button
              type="button"
              className="auth-secondary-action"
              onClick={() => onModeChange('forgot')}
            >
              Forgot password?
            </button>
          )}

          {successMessage && <p className="auth-success">{successMessage}</p>}
          {errorMessage && <p className="username-error">{errorMessage}</p>}

          <button className="submit-button" onClick={handleSubmit} disabled={isSubmitting}>
            {submitLabel}
          </button>

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              type="button"
              className="auth-secondary-action back-to-login"
              onClick={() => onModeChange('login')}
            >
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthMenu
