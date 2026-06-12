import './ModeMenuSelector.css'
import { useState } from 'react'
import Options from './Options.jsx/Options.jsx'

function ModeMenuSelector({
  theme,
  onThemeChange,
  onShowRooms,
  onShowSoloRoom,
  soundEnabled,
  onSoundChange,
  selectedLanguage,
  onLanguageChange,
}) {
  const [showOptions, setShowOptions] = useState(false)

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
        selectedLanguage={selectedLanguage}
        onLanguageChange={onLanguageChange}
      />
    )
  }

  return (
    <div className={`mode-card ${theme === 'dark' ? 'dark' : ''}`}>
      <h2>Sélection du mode de jeu</h2>

      <div className="mode-buttons">
        <button
          className="mode-button"
          onClick={handleSolo}
        >
          <span className="mode-icon">🕹️</span>
          <span className="mode-title">Solo</span>
          <span className="mode-description">Jouez seul et battez votre meilleur score</span>
        </button>

        <button
          className="mode-button"
          onClick={handleMultiplayer}
        >
          <span className="mode-icon">🎮</span>
          <span className="mode-title">Multijoueur</span>
          <span className="mode-description">Affrontez d'autres joueurs</span>
        </button>
      </div>

      <button
        className="options-button"
        onClick={handleOptions}
      >
        ⚙️ Paramètres
      </button>
    </div>
  )
}

export default ModeMenuSelector
