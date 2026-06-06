import { Link } from 'react-router-dom'
import './Options.css'

function Options({ onBack, theme, onThemeChange, soundEnabled, onSoundChange }) {
  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    onThemeChange(newTheme)
  }

  const handleSoundToggle = () => {
    const newSound = !soundEnabled
    onSoundChange?.(newSound)
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

        <Link
          className="option-button"
          to="/tutorial"
        >
          <span className="option-icon">?</span>
          <span className="option-title">Guide</span>
          <span className="option-description">Controls and modes</span>
        </Link>
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
