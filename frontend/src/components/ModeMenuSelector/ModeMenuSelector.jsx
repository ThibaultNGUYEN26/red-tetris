import './ModeMenuSelector.css'
import { useState } from 'react'
import Options from './Options.jsx/Options.jsx'
import Rooms from '../Rooms/Rooms.jsx'

function ModeMenuSelector({ theme, onThemeChange, onShowRooms, onShowGame, username }) {
  const [showOptions, setShowOptions] = useState(false)
  const [showRooms, setShowRooms] = useState(false)

  const handleSolo = () => {
    console.log('Solo mode selected')
    onShowGame(true)
  }

  const handleMultiplayer = () => {
    console.log('Multiplayer mode selected')
    setShowRooms(true)
    onShowRooms(true)
  }

  const handleOptions = () => {
    setShowOptions(true)
  }

  const handleBackToMenu = () => {
    setShowOptions(false)
  }

  const handleBackFromRooms = () => {
    setShowRooms(false)
    onShowRooms(false)
  }

  if (showOptions) {
    return <Options onBack={handleBackToMenu} theme={theme} onThemeChange={onThemeChange} />
  }

  if (showRooms) {
    return <Rooms theme={theme} onBack={handleBackFromRooms} username={username} />
  }

  return (
    <div className={`mode-card ${theme === 'dark' ? 'dark' : ''}`}>
      <h2>Select Game Mode</h2>

      <div className="mode-buttons">
        <button
          className="mode-button"
          onClick={handleSolo}
        >
          <span className="mode-icon">🕹️</span>
          <span className="mode-title">Solo</span>
          <span className="mode-description">Play alone and beat your highest score</span>
        </button>

        <button
          className="mode-button"
          onClick={handleMultiplayer}
        >
          <span className="mode-icon">🎮</span>
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
