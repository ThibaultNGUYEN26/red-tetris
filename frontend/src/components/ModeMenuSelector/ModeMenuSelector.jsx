import './ModeMenuSelector.css'
import { useState } from 'react'
import { socket } from '../../socket'
import Options from './Options.jsx/Options.jsx'

const API_URL = import.meta.env.VITE_API_URL || ''

function ModeMenuSelector({
  theme,
  onThemeChange,
  onShowRooms,
  onShowGame,
  onStartSolo,
  username,
  soundEnabled,
  onSoundChange,
}) {
  const [showOptions, setShowOptions] = useState(false)

  const handleSolo = async () => {
    console.log('Solo mode selected')
    try {
      const existingRoomId = localStorage.getItem('currentRoomId')

      if (existingRoomId) {
        await new Promise((resolve) => {
          socket.emit(
            'playerLeave',
            { roomId: String(existingRoomId) },
            () => resolve()
          )
        })

        localStorage.removeItem('currentRoomId')
      }

      // Create room
      const createResponse = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameMode: 'classic',
          host: username, // this is fine for REST creation
        }),
      })

      if (!createResponse.ok) {
        const errBody = await createResponse.json().catch(() => null)
        throw new Error(errBody?.error || 'Failed to create solo room')
      }

      const room = await createResponse.json()

      // Join via socket
      await new Promise((resolve, reject) => {
        socket.emit(
          'joinRoom',
          { roomId: String(room.id), username },
          (res) => {
            if (!res?.ok) {
              reject(new Error(res?.error || 'Failed to join solo room'))
              return
            }

            socket.emit('startGame', { roomId: String(room.id) })
            resolve()
          }
        )
      })

      console.log('[ModeMenu] Solo game started (socket)', {
        roomId: room.id,
      })

      onStartSolo?.(room.id)
      onShowGame(true)
    } catch (err) {
      console.error('Solo start failed:', err)
    }
  }

  const handleMultiplayer = () => {
    console.log('Multiplayer mode selected')
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
      />
    )
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
