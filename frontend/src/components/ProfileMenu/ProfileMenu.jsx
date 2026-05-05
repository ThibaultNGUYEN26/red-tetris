import './ProfileMenu.css'
import { useState, useEffect, useRef } from 'react'
import FaceAvatar from '../FaceAvatar/FaceAvatar'
import { socket } from '../../socket'

const USERNAME_PATTERN = /^[a-zA-Z0-9]{1,15}$/

function ProfileMenu({
  onSubmit,
  theme,
  initialProfile = null,
  title = 'Create Your Profile',
  submitLabel = "Let's Play!",
  onLogout,
  onDeleteAccount,
}) {
  const [username, setUsername] = useState(initialProfile?.username || '')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef(null)

  // Available options - Tetris piece colors
  const skinColors = [
    '#70d4d4', // I-piece (Muted Cyan)
    '#d4d470', // O-piece (Muted Yellow)
    '#9966cc', // T-piece (Muted Purple)
    '#70d470', // S-piece (Muted Green)
    '#d47070', // Z-piece (Muted Red)
    '#7070d4', // J-piece (Muted Blue)
    '#d49e70', // L-piece (Muted Orange)
  ]

  const eyeTypes = ['normal', 'happy', 'joy', 'sad', 'very_sad', 'crying', 'uwu', 'cute', 'love', 'blink', 'close', 'soft', 'dizzy', 'fear', 'cold_fear', 'panic', 'dead']
  const mouthTypes = ['uwu', 'neutral', 'smile', 'not_smile', 'laugth', 'sad', 'open', 'kiss', 'scared', 'scream', 'horrified']

  // Individual feature selections - initialize with random values
  const getInitialIndex = (items, value) => {
    const index = items.indexOf(value)
    return index >= 0 ? index : Math.floor(Math.random() * items.length)
  }

  const [selectedSkin, setSelectedSkin] = useState(() =>
    getInitialIndex(skinColors, initialProfile?.avatar?.skinColor)
  )
  const [selectedEyes, setSelectedEyes] = useState(() =>
    getInitialIndex(eyeTypes, initialProfile?.avatar?.eyeType)
  )
  const [selectedMouth, setSelectedMouth] = useState(() =>
    getInitialIndex(mouthTypes, initialProfile?.avatar?.mouthType)
  )

  // Build current avatar config
  const currentAvatar = {
    skinColor: skinColors[selectedSkin],
    eyeType: eyeTypes[selectedEyes],
    mouthType: mouthTypes[selectedMouth],
    hairType: 'bald',
    hairColor: '',
  }

  useEffect(() => {
    // Auto focus on the input when component mounts
    inputRef.current?.focus()
  }, [])

  const handleUsernameChange = (e) => {
    const sanitizedValue = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 15)
    setUsername(sanitizedValue)

    if (errorMessage) {
      setErrorMessage('')
    }
  }

  const handleSubmit = async () => {
    const trimmedUsername = username.trim()

    if (!trimmedUsername) {
      setErrorMessage('Missing data')
      return
    }

    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setErrorMessage('Invalid username')
      return
    }

    setErrorMessage('')
    const profileData = {
      username: trimmedUsername,
      avatar: {
        skinColor: currentAvatar.skinColor,
        eyeType: currentAvatar.eyeType,
        mouthType: currentAvatar.mouthType,
      },
    }

    const updateResult = await new Promise((resolve) => {
      if (!socket?.timeout) {
        resolve({ ok: false, error: 'Server unavailable' })
        return
      }

      socket.timeout(2000).emit('updateProfile', profileData, (err, res) => {
        if (err) {
          resolve({ ok: false, error: 'Server not responding' })
          return
        }
        resolve(res || { ok: false, error: 'Unknown error' })
      })
    })

    if (!updateResult?.ok) {
      setErrorMessage(updateResult?.error || 'Profile update failed')
      return
    }

    onSubmit(updateResult.profile || profileData)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const handleRandomize = () => {
    setSelectedSkin(Math.floor(Math.random() * skinColors.length))
    setSelectedEyes(Math.floor(Math.random() * eyeTypes.length))
    setSelectedMouth(Math.floor(Math.random() * mouthTypes.length))
  }

  return (
    <div className={`username-card profile-card ${theme === 'dark' ? 'dark' : ''}`}>
      <h2>{title}</h2>

      {/* Avatar Customization */}
      <div className="avatar-section">

        {/* Avatar Preview */}
        <div className="avatar-preview">
          <FaceAvatar faceConfig={currentAvatar} size="large" />
        </div>

        {/* Random Button */}
        <button className="random-button" onClick={handleRandomize}>
          🎲 Random
        </button>

        {/* Feature Selectors */}
        <div className="feature-selectors">

          {/* Skin Color */}
          <div className="feature-row">
            <label>Skin</label>
            <div className="feature-carousel">
              <button className="feature-arrow" onClick={() => setSelectedSkin((prev) => (prev - 1 + skinColors.length) % skinColors.length)}>
                ◀
              </button>
              <div className="color-preview" style={{ backgroundColor: skinColors[selectedSkin] }}></div>
              <button className="feature-arrow" onClick={() => setSelectedSkin((prev) => (prev + 1) % skinColors.length)}>
                ▶
              </button>
            </div>
          </div>

          {/* Eyes */}
          <div className="feature-row">
            <label>Eyes</label>
            <div className="feature-carousel">
              <button className="feature-arrow" onClick={() => setSelectedEyes((prev) => (prev - 1 + eyeTypes.length) % eyeTypes.length)}>
                ◀
              </button>
              <span className="feature-name">{eyeTypes[selectedEyes]}</span>
              <button className="feature-arrow" onClick={() => setSelectedEyes((prev) => (prev + 1) % eyeTypes.length)}>
                ▶
              </button>
            </div>
          </div>

          {/* Mouth */}
          <div className="feature-row">
            <label>Mouth</label>
            <div className="feature-carousel">
              <button className="feature-arrow" onClick={() => setSelectedMouth((prev) => (prev - 1 + mouthTypes.length) % mouthTypes.length)}>
                ◀
              </button>
              <span className="feature-name">{mouthTypes[selectedMouth]}</span>
              <button className="feature-arrow" onClick={() => setSelectedMouth((prev) => (prev + 1) % mouthTypes.length)}>
                ▶
              </button>
            </div>
          </div>

        </div>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={username}
        onChange={handleUsernameChange}
        onKeyPress={handleKeyPress}
        placeholder="Username"
        maxLength={15}
        pattern="[A-Za-z0-9]{1,15}"
        className="username-input"
      />
      {errorMessage && <p className="username-error">{errorMessage}</p>}
      <p className="character-count">{username.length}/15</p>
      <button
        className="submit-button"
        onClick={handleSubmit}
        disabled={username.length === 0}
      >
        {submitLabel}
      </button>
      {onLogout && (
        <button
          className="logout-button"
          onClick={onLogout}
          type="button"
        >
          Disconnect
        </button>
      )}
      {onDeleteAccount && (
        <button
          className="delete-account-button"
          onClick={onDeleteAccount}
          type="button"
        >
          Delete account
        </button>
      )}
    </div>
  )
}

export default ProfileMenu
