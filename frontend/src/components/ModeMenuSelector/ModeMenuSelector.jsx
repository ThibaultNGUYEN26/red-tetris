import './ModeMenuSelector.css'
import { useState } from 'react'
import Options from './Options.jsx/Options.jsx'
import Rooms from '../Rooms/Rooms.jsx'
import { socket } from '../../socket'

const API_URL = import.meta.env.VITE_API_URL || ''

function ModeMenuSelector({ theme, onThemeChange, onShowRooms, onShowGame, onStartSolo, username }) {
  const [showOptions, setShowOptions] = useState(false)
  const [showRooms, setShowRooms] = useState(false)

  const handleSolo = async () => {
    console.log('Solo mode selected')
    try {
      // If user is already in a room, leave it before creating a solo room
      const existingRoomId = localStorage.getItem('currentRoomId')
      if (existingRoomId && username) {
        await fetch(`${API_URL}/api/rooms/${existingRoomId}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        })
        localStorage.removeItem('currentRoomId')
      }

      const createResponse = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameMode: 'classic',
          host: username,
        }),
      })

      if (!createResponse.ok) {
        const errBody = await createResponse.json().catch(() => null)
        throw new Error(errBody?.error || 'Failed to create solo room')
      }

      const room = await createResponse.json()

      socket.emit('startGame', { roomId: String(room.id), username })

      console.log('[ModeMenu] Solo game started', { roomId: room.id, username })

      onStartSolo?.(room.id)
      onShowGame(true)
    } catch (err) {
      console.error('Solo start failed:', err)
    }
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
