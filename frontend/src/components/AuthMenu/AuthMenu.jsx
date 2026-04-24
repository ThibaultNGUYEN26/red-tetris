import './AuthMenu.css'
import '../ProfileMenu/ProfileMenu.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FaceAvatar from '../FaceAvatar/FaceAvatar'

const USERNAME_PATTERN = /^[a-zA-Z0-9]{1,15}$/
const PASSWORD_MIN_LENGTH = 6

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

function AuthMenu({ onAuthenticated, theme, initialMode = 'register' }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState(initialMode === 'login' ? 'login' : 'register')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef(null)

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
    setMode(initialMode === 'login' ? 'login' : 'register')
  }, [initialMode])

  useEffect(() => {
    inputRef.current?.focus()
  }, [mode])

  const onModeChange = (nextMode) => {
    setMode(nextMode)
    setErrorMessage('')
    setPassword('')
    setConfirmPassword('')
    navigate(nextMode === 'login' ? '/login' : '/register', { replace: true })
  }

  const handleUsernameChange = (event) => {
    const sanitizedValue = event.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 15)
    setUsername(sanitizedValue)
    if (errorMessage) setErrorMessage('')
  }

  const handleRandomize = () => {
    setSelectedSkin(Math.floor(Math.random() * skinColors.length))
    setSelectedEyes(Math.floor(Math.random() * eyeTypes.length))
    setSelectedMouth(Math.floor(Math.random() * mouthTypes.length))
  }

  const validate = () => {
    const trimmedUsername = username.trim()

    if (!trimmedUsername || !password || (mode === 'register' && !confirmPassword)) {
      return 'Missing data'
    }

    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      return 'Invalid username'
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return 'Password must be at least 6 characters'
    }

    if (mode === 'register' && password !== confirmPassword) {
      return 'Passwords do not match'
    }

    return null
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login'
      const payload = mode === 'register'
        ? {
          username: username.trim(),
          password,
          confirmPassword,
          avatar: {
            skinColor: currentAvatar.skinColor,
            eyeType: currentAvatar.eyeType,
            mouthType: currentAvatar.mouthType,
          },
        }
        : {
          username: username.trim(),
          password,
        }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setErrorMessage(data?.error || 'Authentication failed')
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

  return (
    <div className={`username-card ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="auth-switch-row">
        <button
          type="button"
          className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
          onClick={() => onModeChange('register')}
        >
          Register
        </button>
        <button
          type="button"
          className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => onModeChange('login')}
        >
          Login
        </button>
      </div>

      <h2>{mode === 'register' ? 'Create Your Account' : 'Welcome Back'}</h2>

      {mode === 'register' && (
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
      )}

      <input
        ref={inputRef}
        type="text"
        value={username}
        onChange={handleUsernameChange}
        onKeyDown={handleKeyPress}
        placeholder="Username"
        maxLength={15}
        pattern="[A-Za-z0-9]{1,15}"
        className="username-input"
      />

      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Password"
        className="username-input"
      />

      {mode === 'register' && (
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Confirm password"
          className="username-input"
        />
      )}

      {errorMessage && <p className="username-error">{errorMessage}</p>}

      <button className="submit-button" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting
          ? 'Please wait...'
          : mode === 'register'
            ? 'Register'
            : 'Login'}
      </button>

      <p className="auth-alt-link">
        {mode === 'register' ? 'Already have an account?' : 'Need an account?'}{' '}
        <Link to={mode === 'register' ? '/login' : '/register'} onClick={(event) => {
          event.preventDefault()
          onModeChange(mode === 'register' ? 'login' : 'register')
        }}>
          {mode === 'register' ? 'Login here' : 'Register here'}
        </Link>
      </p>
    </div>
  )
}

export default AuthMenu
