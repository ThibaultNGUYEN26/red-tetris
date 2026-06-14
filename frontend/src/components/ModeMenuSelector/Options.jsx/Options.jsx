import { Link } from 'react-router-dom'
import { useState } from 'react'
import './Options.css'
import { DEFAULT_LANGUAGE, LANGUAGES, getLanguageName, getTranslation } from '../../../i18n'

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
  const text = getTranslation(selectedLanguage).options
  const themeTitle = theme === 'dark' ? text.darkTheme : text.lightTheme
  const themeDescription = theme === 'dark' ? text.switchToLight : text.switchToDark

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
      <h2>{text.heading}</h2>

      <div className="options-buttons">
        <button
          className="option-button"
          onClick={handleThemeToggle}
        >
          <span className="option-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
          <span className="option-title">{themeTitle}</span>
          <span className="option-description">{themeDescription}</span>
        </button>

        <button
          className="option-button"
          onClick={handleSoundToggle}
        >
          <span className="option-icon">{soundEnabled ? '🔊' : '🔈'}</span>
          <span className="option-title">{text.sound}</span>
          <span className="option-description">{soundEnabled ? text.enabled : text.disabled}</span>
        </button>

        <Link
          className="option-button"
          to="/tutorial"
        >
          <span className="option-icon">📖</span>
          <span className="option-title">{text.guide}</span>
          <span className="option-description">{text.guideDescription}</span>
        </Link>

        <button
          className="option-button"
          onClick={() => setShowLanguages((current) => !current)}
          aria-expanded={showLanguages}
          aria-controls="language-options"
        >
          <span className="option-icon">🌍</span>
          <span className="option-title">{text.language}</span>
          <span className="option-description">{text.languageDescription}</span>
        </button>
      </div>

      {showLanguages && (
        <div
          className="language-options-overlay"
          role="presentation"
          onClick={() => setShowLanguages(false)}
        >
          <div
            className="language-options"
            id="language-options"
            aria-label={text.languageOptions}
            onClick={(event) => event.stopPropagation()}
          >
            {LANGUAGES.map(({ code }) => (
              <button
                className={`language-option${selectedLanguage === code ? ' selected' : ''}`}
                key={code}
                type="button"
                aria-pressed={selectedLanguage === code}
                onClick={() => {
                  onLanguageChange?.(code)
                  setShowLanguages(false)
                }}
              >
                {getLanguageName(code, selectedLanguage)}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        className="back-button"
        onClick={onBack}
      >
        {text.back}
      </button>
    </div>
  )
}

export default Options
