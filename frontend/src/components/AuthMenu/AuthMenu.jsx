import './AuthMenu.css'
import '../ProfileMenu/ProfileMenu.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import FaceAvatar from '../FaceAvatar/FaceAvatar'
import { apiFetch } from '../../api'
import { setStoredAuthToken } from '../../authToken'
import { DEFAULT_LANGUAGE, LANGUAGES, getLanguageName, getTranslation } from '../../i18n'

const USERNAME_PATTERN = /^[a-zA-Z0-9]{1,15}$/
const PASSWORD_MIN_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AUTH_MODES = new Set(['login', 'register', 'forgot', 'reset'])
const AUTH_ROUTES = {
  login: '/login',
  register: '/register',
  forgot: '/forgot-password',
  reset: '/reset-password',
}

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
const getPasswordValidationError = (password, text = getTranslation(DEFAULT_LANGUAGE).auth) => {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return text.passwordTooShort
  }
  if (!/[A-Z]/.test(password)) {
    return text.passwordUppercase
  }
  if (!/[a-z]/.test(password)) {
    return text.passwordLowercase
  }
  if (!/\d/.test(password)) {
    return text.passwordNumber
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return text.passwordSpecial
  }
  return null
}

function AuthMenu({
  onAuthenticated,
  theme,
  initialMode = 'login',
  language = DEFAULT_LANGUAGE,
  onLanguageChange,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const text = getTranslation(language).auth
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
  const [canRestoreAccount, setCanRestoreAccount] = useState(false)
  const [showLanguages, setShowLanguages] = useState(false)
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
      setErrorMessage(text.invalidResetLink)
    }
  }, [mode, resetToken, text.invalidResetLink])

  const clearMessages = () => {
    setErrorMessage('')
    setSuccessMessage('')
    setCanRestoreAccount(false)
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
    if (safeMode === 'register') {
      setUsername('')
      setEmail('')
    }
    resetPasswordToggles()
    clearMessages()

    navigate(AUTH_ROUTES[safeMode], { replace: true })
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
      if (!trimmedUsername || !normalizedEmail) return text.missingData
      if (!EMAIL_PATTERN.test(normalizedEmail)) return text.invalidEmail
      return null
    }

    if (mode === 'reset') {
      if (!resetToken || !password || !confirmPassword) return text.missingData
      const passwordError = getPasswordValidationError(password, text)
      if (passwordError) return passwordError
      if (password !== confirmPassword) return text.passwordMismatch
      return null
    }

    if (!trimmedUsername || !password || (mode === 'register' && (!normalizedEmail || !confirmPassword))) {
      return text.missingData
    }

    if (mode === 'register' && !EMAIL_PATTERN.test(normalizedEmail)) {
      return text.invalidEmail
    }

    const passwordError = getPasswordValidationError(password, text)
    if (passwordError) {
      return passwordError
    }

    if (mode === 'register' && password !== confirmPassword) {
      return text.passwordMismatch
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

      const response = await apiFetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (mode === 'login' && data?.canRestore) {
          setCanRestoreAccount(true)
        }
        const nextError = mode === 'login' && data?.error === 'Invalid credentials'
          ? text.invalidPassword
          : data?.error || text.authenticationFailed
        setErrorMessage(nextError)
        return
      }

      if (mode === 'forgot') {
        setSuccessMessage(data?.message || text.passwordResetGenerated)
        if (data?.resetUrl) {
          const url = new URL(data.resetUrl, window.location.origin)
          navigate(`${url.pathname}${url.search}`, { replace: true })
        }
        return
      }

      if (mode === 'register') {
        setSuccessMessage(text.accountCreated)
        setStoredAuthToken(data?.authToken)
        setUsername('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        resetPasswordToggles()
        await onAuthenticated({
          authToken: data.authToken,
          username: data.username || username.trim(),
          email: data.email || email.trim().toLowerCase(),
          avatar: data.avatar || {
            skinColor: currentAvatar.skinColor,
            eyeType: currentAvatar.eyeType,
            mouthType: currentAvatar.mouthType,
          },
          preferences: data.preferences || {},
          isNew: true,
        })
        return
      }

      if (mode === 'reset') {
        setSuccessMessage(data?.message || text.passwordUpdated)
        setPassword('')
        setConfirmPassword('')
        resetPasswordToggles()
        navigate('/login', { replace: true })
        setMode('login')
        return
      }

      setStoredAuthToken(data?.authToken)
      await onAuthenticated({
        authToken: data.authToken,
        username: data.username || username.trim(),
        email: data.email || email.trim().toLowerCase(),
        avatar: data.avatar || {
          skinColor: currentAvatar.skinColor,
          eyeType: currentAvatar.eyeType,
          mouthType: currentAvatar.mouthType,
        },
      })
    } catch {
      setErrorMessage(text.serverUnavailable)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRestoreAccount = async () => {
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await apiFetch('/api/auth/restore', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setErrorMessage(data?.error || text.unableToRestore)
        return
      }

      setCanRestoreAccount(false)
      setStoredAuthToken(data?.authToken)
      await onAuthenticated({
        authToken: data.authToken,
        username: data.username || username.trim(),
        email: data.email || email.trim().toLowerCase(),
        avatar: data.avatar || {
          skinColor: currentAvatar.skinColor,
          eyeType: currentAvatar.eyeType,
          mouthType: currentAvatar.mouthType,
        },
      })
    } catch {
      setErrorMessage(text.serverUnavailable)
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
    ? text.registerTitle
    : mode === 'forgot'
      ? text.forgotTitle
      : mode === 'reset'
        ? text.resetTitle
        : text.loginTitle

  const submitLabel = isSubmitting
    ? text.pleaseWait
    : mode === 'register'
      ? text.register
      : mode === 'forgot'
        ? text.sendResetLink
        : mode === 'reset'
          ? text.updatePassword
          : text.login

  const isRegisterLayout = mode === 'register'

  return (
    <>
      <div className={`auth-language-control ${theme === 'dark' ? 'dark' : ''}`}>
        <button
          type="button"
          className="auth-language-trigger"
          aria-label={text.languageLabel}
          aria-expanded={showLanguages}
          aria-controls="auth-language-options"
          onClick={() => setShowLanguages((current) => !current)}
        >
          🌍
        </button>
      </div>

      {showLanguages && (
        <div
          className={`auth-language-options-overlay ${theme === 'dark' ? 'dark' : ''}`}
          role="presentation"
          onClick={() => setShowLanguages(false)}
        >
          <div
            className="auth-language-options"
            id="auth-language-options"
            aria-label={text.languageLabel}
            onClick={(event) => event.stopPropagation()}
          >
            {LANGUAGES.map(({ code }) => (
              <button
                key={code}
                type="button"
                className={`auth-language-option${language === code ? ' selected' : ''}`}
                aria-pressed={language === code}
                onClick={() => {
                  onLanguageChange?.(code)
                  setShowLanguages(false)
                }}
              >
                {getLanguageName(code, language)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`username-card auth-card ${isRegisterLayout ? 'register-mode' : 'login-mode'} ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="auth-switch-row">
        <button
          type="button"
          className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => onModeChange('login')}
        >
          {text.loginTab}
        </button>
        <button
          type="button"
          className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
          onClick={() => onModeChange('register')}
        >
          {text.registerTab}
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
                {text.randomize}
              </button>

              <div className="feature-selectors">
                <div className="feature-row">
                  <label>{text.skin}</label>
                  <div className="feature-carousel">
                    <button className="feature-arrow" onClick={() => setSelectedSkin((prev) => (prev - 1 + skinColors.length) % skinColors.length)} type="button">◀</button>
                    <div className="color-preview" style={{ backgroundColor: skinColors[selectedSkin] }} />
                    <button className="feature-arrow" onClick={() => setSelectedSkin((prev) => (prev + 1) % skinColors.length)} type="button">▶</button>
                  </div>
                </div>

                <div className="feature-row">
                  <label>{text.eyes}</label>
                  <div className="feature-carousel">
                    <button className="feature-arrow" onClick={() => setSelectedEyes((prev) => (prev - 1 + eyeTypes.length) % eyeTypes.length)} type="button">◀</button>
                    <span className="feature-name">{eyeTypes[selectedEyes]}</span>
                    <button className="feature-arrow" onClick={() => setSelectedEyes((prev) => (prev + 1) % eyeTypes.length)} type="button">▶</button>
                  </div>
                </div>

                <div className="feature-row">
                  <label>{text.mouth}</label>
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
              placeholder={text.username}
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
              placeholder={text.email}
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
                placeholder={text.password}
                className="username-input password-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? text.hidePassword : text.showPassword}
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
                placeholder={text.confirmPassword}
                className="username-input password-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? text.hideConfirmPassword : text.showConfirmPassword}
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
              {text.forgotPassword}
            </button>
          )}

          {successMessage && <p className="auth-success">{successMessage}</p>}
          {errorMessage && <p className="username-error">{errorMessage}</p>}

          <button className="submit-button" onClick={handleSubmit} disabled={isSubmitting}>
            {submitLabel}
          </button>

          {mode === 'login' && canRestoreAccount && (
            <button
              type="button"
              className="auth-secondary-action"
              onClick={handleRestoreAccount}
              disabled={isSubmitting}
            >
              {text.restoreAccount}
            </button>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              type="button"
              className="auth-secondary-action back-to-login"
              onClick={() => onModeChange('login')}
            >
              {text.backToLogin}
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

export default AuthMenu
