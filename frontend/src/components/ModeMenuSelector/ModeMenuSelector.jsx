import './ModeMenuSelector.css'
import { useState } from 'react'
import Options from './Options.jsx/Options.jsx'

function ModeMenuSelector({ theme, onThemeChange }) {
  const [showOptions, setShowOptions] = useState(false)

  const handleSolo = () => {
    console.log('Solo mode selected')
    // Add your solo game logic here
  }

  const handleMultiplayer = () => {
    console.log('Multiplayer mode selected')
    // Add your multiplayer logic here
  }

  const handleOptions = () => {
    setShowOptions(true)
  }

  const handleBackToMenu = () => {
    setShowOptions(false)
  }

  if (showOptions) {
    return <Options onBack={handleBackToMenu} theme={theme} onThemeChange={onThemeChange} />
  }

  return (
    <div className={`mode-card ${theme === 'dark' ? 'dark' : ''}`}>
      <h2>Select Game Mode</h2>
      
      <div className="mode-buttons">
        <button 
          className="mode-button"
          onClick={handleSolo}
        >
          <span className="mode-icon">👤</span>
          <span className="mode-title">Solo</span>
          <span className="mode-description">Play alone and beat your high score</span>
        </button>
        
        <button 
          className="mode-button"
          onClick={handleMultiplayer}
        >
          <span className="mode-icon">👥</span>
          <span className="mode-title">Multiplayer</span>
          <span className="mode-description">Compete with other players</span>
        </button>
      </div>

      <button 
        className="options-button"
        onClick={handleOptions}
      >
        ⚙️ Options
      </button>
    </div>
  )
}

export default ModeMenuSelector