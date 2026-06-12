import { Link } from 'react-router-dom'
import { useState } from 'react'
import './Options.css'
import { DEFAULT_LANGUAGE, PLAYER_STATS_LANGUAGES } from '../../../i18n/playerStats'

function Options({
  onBack,
  theme,
  onThemeChange,
  soundEnabled,
  onSoundChange,
  selectedLanguage = DEFAULT_LANGUAGE,
  onLanguageChange,
}) {
  const [showLanguages, setShowLanguages] = useState(false)

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

        <button
          className="option-button"
          onClick={() => setShowLanguages((current) => !current)}
          aria-expanded={showLanguages}
          aria-controls="language-options"
        >
          <span className="option-icon">Aa</span>
          <span className="option-title">Language</span>
          <span className="option-description">Choose display language</span>
        </button>
      </div>

      {showLanguages && (
        <div className="language-options" id="language-options" aria-label="Language options">
          {PLAYER_STATS_LANGUAGES.map(({ code, label }) => (
            <button
              className={`language-option${selectedLanguage === code ? ' selected' : ''}`}
              key={code}
              type="button"
              aria-pressed={selectedLanguage === code}
              onClick={() => onLanguageChange?.(code)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

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
