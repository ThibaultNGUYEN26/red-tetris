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
      <h2>Paramètres</h2>

      <div className="options-buttons">
        <button
          className="option-button"
          onClick={handleThemeToggle}
        >
          <span className="option-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
          <span className="option-title">Thème {theme === 'dark' ? 'sombre' : 'clair'}</span>
          <span className="option-description">Passer au mode {theme === 'dark' ? 'clair' : 'sombre'}</span>
        </button>

        <button
          className="option-button"
          onClick={handleSoundToggle}
        >
          <span className="option-icon">{soundEnabled ? '🔊' : '🔈'}</span>
          <span className="option-title">Son</span>
          <span className="option-description">{soundEnabled ? 'Activé' : 'Désactivé'}</span>
        </button>

        <Link
          className="option-button"
          to="/tutorial"
        >
          <span className="option-icon">?</span>
          <span className="option-title">Guide</span>
          <span className="option-description">Contrôles et modes</span>
        </Link>

        <button
          className="option-button"
          onClick={() => setShowLanguages((current) => !current)}
          aria-expanded={showLanguages}
          aria-controls="language-options"
        >
          <span className="option-icon">Aa</span>
          <span className="option-title">Langue</span>
          <span className="option-description">Choisir la langue d'affichage</span>
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
            aria-label="Options de langue"
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
        ← Retour
      </button>
    </div>
  )
}

export default Options
