import './ModeMenuSelector.css'
import { useState } from 'react'
import Options from './Options.jsx/Options.jsx'
import { DEFAULT_LANGUAGE, getTranslation } from '../../i18n'

function ModeMenuSelector({
  theme,
  onThemeChange,
  onShowRooms,
  onShowSoloRoom,
  soundEnabled,
  onSoundChange,
  musicEnabled = soundEnabled,
  onMusicChange,
  selectedLanguage = DEFAULT_LANGUAGE,
  onLanguageChange,
}) {
  const [showOptions, setShowOptions] = useState(false)
  const text = getTranslation(selectedLanguage).menu

  const handleSolo = () => {
    onShowSoloRoom?.(true)
  }

  const handleMultiplayer = () => {
    onShowRooms(true)
  }

  const handleOptions = () => {
    setShowOptions(true)
  }

  const handleBackToMenu = () => {
    setShowOptions(false)
  }

  if (showOptions) {
    return (
      <Options
        onBack={handleBackToMenu}
        theme={theme}
        onThemeChange={onThemeChange}
        soundEnabled={soundEnabled}
        onSoundChange={onSoundChange}
        musicEnabled={musicEnabled}
        onMusicChange={onMusicChange}
        selectedLanguage={selectedLanguage}
        onLanguageChange={onLanguageChange}
      />
    )
  }

  return (
    <div className={`mode-card ${theme === 'dark' ? 'dark' : ''}`}>
      <h2>{text.heading}</h2>

      <div className="mode-buttons">
        <button
          className="mode-button"
          onClick={handleSolo}
        >
          <span className="mode-icon">🕹️</span>
          <span className="mode-title">{text.soloTitle}</span>
          <span className="mode-description">{text.soloDescription}</span>
        </button>

        <button
          className="mode-button"
          onClick={handleMultiplayer}
        >
          <span className="mode-icon">🎮</span>
          <span className="mode-title">{text.multiplayerTitle}</span>
          <span className="mode-description">{text.multiplayerDescription}</span>
        </button>
      </div>

      <button
        className="options-button"
        onClick={handleOptions}
      >
        {text.options}
      </button>
    </div>
  )
}

export default ModeMenuSelector
