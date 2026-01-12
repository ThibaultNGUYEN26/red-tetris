import './ProfileMenu.css'
import { useState, useEffect, useRef } from 'react'
import FaceAvatar from '../FaceAvatar/FaceAvatar'

const API_URL = import.meta.env.VITE_API_URL || ''

function ProfileMenu({ onSubmit, theme }) {
  const [username, setUsername] = useState('')
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
  const [selectedSkin, setSelectedSkin] = useState(() => Math.floor(Math.random() * skinColors.length))
  const [selectedEyes, setSelectedEyes] = useState(() => Math.floor(Math.random() * eyeTypes.length))
  const [selectedMouth, setSelectedMouth] = useState(() => Math.floor(Math.random() * mouthTypes.length))

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
    const value = e.target.value
    if (value.length <= 15) {
      setUsername(value)
    }
  }

  const handleSubmit = async () => {
    if (username.trim().length > 0) {
      const profileData = {
        username: username.trim(),
        avatar: {
          skinColor: currentAvatar.skinColor,
          eyeType: currentAvatar.eyeType,
          mouthType: currentAvatar.mouthType,
        },
      }

      console.log('Sending profile to backend:', JSON.stringify(profileData, null, 2))

      try {
        // TODO: Replace with actual backend endpoint
        const response = await fetch('${API_URL}/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profileData),
        })

        console.log('Profile sent successfully')
        console.log('Response status:', response.status)

        // Uncomment when backend exists:
        // const data = await response.json()
        // console.log('Backend response:', data)

      } catch (error) {
        console.error('Failed to send profile to backend:', error.message)
        console.log('This is expected since backend is not running yet')
      }

      onSubmit(username, currentAvatar)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && username.trim().length > 0) {
      handleSubmit()
    }
  }

  const handleRandomize = () => {
    setSelectedSkin(Math.floor(Math.random() * skinColors.length))
    setSelectedEyes(Math.floor(Math.random() * eyeTypes.length))
    setSelectedMouth(Math.floor(Math.random() * mouthTypes.length))
  }

  return (
    <div className={`username-card ${theme === 'dark' ? 'dark' : ''}`}>
      <h2>Create Your Profile</h2>

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
        className="username-input"
      />
      <p className="character-count">{username.length}/15</p>
      <button
        className="submit-button"
        onClick={handleSubmit}
        disabled={username.trim().length === 0}
      >
        Let's Play!
      </button>
    </div>
  )
}

export default ProfileMenu
