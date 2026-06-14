import { Link } from 'react-router-dom'
import { useState } from 'react'
import './Options.css'
import { DEFAULT_LANGUAGE, PLAYER_STATS_LANGUAGES } from '../../../i18n/playerStats'

const OPTIONS_TRANSLATIONS = {
  en: {
    heading: 'Options',
    lightTheme: 'Light theme',
    darkTheme: 'Dark theme',
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
    sound: 'Sound',
    enabled: 'Enabled',
    disabled: 'Disabled',
    guide: 'Guide',
    guideDescription: 'Controls and modes',
    language: 'Language',
    languageDescription: 'Choose display language',
    languageOptions: 'Language options',
    back: 'Back',
  },
  fr: {
    heading: 'Paramètres',
    lightTheme: 'Thème clair',
    darkTheme: 'Thème sombre',
    switchToLight: 'Passer au mode clair',
    switchToDark: 'Passer au mode sombre',
    sound: 'Son',
    enabled: 'Activé',
    disabled: 'Désactivé',
    guide: 'Guide',
    guideDescription: 'Contrôles et modes',
    language: 'Langue',
    languageDescription: "Choisir la langue d'affichage",
    languageOptions: 'Options de langue',
    back: 'Retour',
  },
}

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
  const text = OPTIONS_TRANSLATIONS[selectedLanguage] || OPTIONS_TRANSLATIONS[DEFAULT_LANGUAGE]
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
            {PLAYER_STATS_LANGUAGES.map(({ code, label }) => (
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
                {label}
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
