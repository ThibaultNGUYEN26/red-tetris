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
  musicEnabled = soundEnabled,
  onMusicChange,
  selectedLanguage = DEFAULT_LANGUAGE,
  onLanguageChange,
}) {
  const [showLanguages, setShowLanguages] = useState(false)
  const text = getTranslation(selectedLanguage).options
  const soundEffectsLabel = text.soundEffects || text.sound || 'Sound effects'
  const musicLabel = text.music || 'Music'

  const optionRows = [
    {
      type: 'button',
      id: 'theme',
      label: theme === 'dark' ? text.darkTheme : text.lightTheme,
      value: theme === 'dark' ? 'Dark' : 'Light',
      valueState: theme === 'dark' ? 'theme-dark' : 'theme-light',
      description: theme === 'dark' ? text.switchToLight : text.switchToDark,
      onClick: () => onThemeChange(theme === 'dark' ? 'light' : 'dark'),
    },
    {
      type: 'button',
      id: 'sound',
      label: soundEffectsLabel,
      value: soundEnabled ? 'On' : 'Off',
      valueState: soundEnabled ? 'is-on' : 'is-off',
      description: soundEnabled ? text.enabled : text.disabled,
      onClick: () => onSoundChange?.(!soundEnabled),
    },
    {
      type: 'button',
      id: 'music',
      label: musicLabel,
      value: musicEnabled ? 'On' : 'Off',
      valueState: musicEnabled ? 'is-on' : 'is-off',
      description: musicEnabled ? text.enabled : text.disabled,
      onClick: () => onMusicChange?.(!musicEnabled),
    },
    {
      type: 'link',
      id: 'guide',
      label: text.guide,
      value: 'Open',
      valueState: 'is-neutral',
      description: text.guideDescription,
      to: '/tutorial',
    },
    {
      type: 'button',
      id: 'language',
      label: text.language,
      value: getLanguageName(selectedLanguage, selectedLanguage),
      valueState: 'is-neutral',
      description: text.languageDescription,
      onClick: () => setShowLanguages((current) => !current),
      ariaExpanded: showLanguages,
      ariaControls: 'language-options',
    },
  ]

  return (
    <>
      <div className="options-modal-overlay" onClick={onBack} />
      <div
        className={`options-modal ${theme === 'dark' ? 'dark' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="options-title"
      >
        <div className="options-modal-header">
          <p className="options-kicker">System</p>
          <h2 id="options-title">{text.heading}</h2>
        </div>

        <div className="options-list">
          {optionRows.map((option) => {
            if (option.type === 'link') {
              return (
                <Link key={option.id} className="option-row" to={option.to}>
                  <span className="option-row-label">{option.label}</span>
                  <span className={`option-row-value ${option.valueState}`}>{option.value}</span>
                  <span className="option-row-description">{option.description}</span>
                </Link>
              )
            }

            return (
              <button
                key={option.id}
                className="option-row"
                type="button"
                onClick={option.onClick}
                aria-expanded={option.ariaExpanded}
                aria-controls={option.ariaControls}
              >
                <span className="option-row-label">{option.label}</span>
                <span className={`option-row-value ${option.valueState}`}>{option.value}</span>
                <span className="option-row-description">{option.description}</span>
              </button>
            )
          })}
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
          type="button"
          onClick={onBack}
        >
          {text.back}
        </button>
      </div>
    </>
  )
}

export default Options
