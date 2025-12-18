import './Options.css'
import { useState } from 'react'

function Options({ onBack, theme, onThemeChange }) {
  const [soundEnabled, setSoundEnabled] = useState(true)

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    onThemeChange(newTheme)
    console.log('Theme changed to:', newTheme)
  }

  const handleSoundToggle = () => {
    const newSound = !soundEnabled
    setSoundEnabled(newSound)
    console.log('Sound:', newSound ? 'enabled' : 'disabled')
    // Add your sound logic here
  }

  return (
    <div className={`mode-card ${theme === 'dark' ? 'dark' : ''}`}>
      <h2>Options</h2>

      <div className="options-buttons">
        <button
          className="option-button"
          onClick={handleThemeToggle}
        >
          <span className="option-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
          <span className="option-title">{theme === 'dark' ? 'Dark' : 'Light'} Theme</span>
          <span className="option-description">Switch to {theme === 'dark' ? 'light' : 'dark'} mode</span>
        </button>

        <button
          className="option-button"
          onClick={handleSoundToggle}
        >
          <span className="option-icon">{soundEnabled ? '🔊' : '🔈'}</span>
          <span className="option-title">Sound</span>
          <span className="option-description">{soundEnabled ? 'Enabled' : 'Disabled'}</span>
        </button>
      </div>

      <button
        className="back-button"
        onClick={onBack}
      >
        ← Back
      </button>
    </div>
  )
}

export default Options
