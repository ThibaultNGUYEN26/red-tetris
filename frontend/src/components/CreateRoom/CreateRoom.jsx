import './CreateRoom.css'
import { useState, useEffect } from 'react'

function CreateRoom({ theme, onBack, onCreateRoom, existingRooms = [] }) {
  const [roomName, setRoomName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [selectedMode, setSelectedMode] = useState('classic')
  const [players, setPlayers] = useState([
    { id: 1, name: 'You', isHost: true }
  ])

  const gameModes = [
    'classic',
    'speed',
    'cooperative',
  ]

  // Generate default room name on mount
  useEffect(() => {
    const generateDefaultRoomName = () => {
      const existingRoomNames = existingRooms.map(room => room.name)
      let roomNumber = 1
      let defaultName = `Room ${roomNumber}`

      // Find the lowest available room number
      while (existingRoomNames.includes(defaultName)) {
        roomNumber++
        defaultName = `Room ${roomNumber}`
      }

      return defaultName
    }

    setRoomName(generateDefaultRoomName())
  }, [existingRooms])

  const handleRoomNameChange = (e) => {
    const value = e.target.value
    if (value.length <= 15) {
      setRoomName(value)
    }
  }

  const handleModeChange = (e) => {
    setSelectedMode(e.target.value)
  }

  const handleEditClick = () => {
    setIsEditingName(true)
  }

  const handleNameBlur = () => {
    setIsEditingName(false)
    if (roomName.trim().length === 0) {
      // Reset to default if empty
      const existingRoomNames = existingRooms.map(room => room.name)
      let roomNumber = 1
      let defaultName = `Room ${roomNumber}`
      while (existingRoomNames.includes(defaultName)) {
        roomNumber++
        defaultName = `Room ${roomNumber}`
      }
      setRoomName(defaultName)
    }
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    }
  }

  const handleStartGame = () => {
    if (roomName.trim().length > 0 && players.length >= 2) {
      console.log('Starting game:', {
        roomName: roomName.trim(),
        gameMode: selectedMode,
        players: players
      })
      // TODO: Add start game logic
    }
  }

  return (
    <div className={`create-room-card ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="create-room-form">
        {/* Room Name */}
        <div className="form-group room-name-section">
          {isEditingName ? (
            <div className="room-name-container">
              <input
                type="text"
                value={roomName}
                onChange={handleRoomNameChange}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                maxLength={15}
                className="room-name-input editing"
                autoFocus
              />
              <span className="char-count">{roomName.length}/15</span>
            </div>
          ) : (
            <div className="room-name-display">
              <span className="room-name-text">{roomName}</span>
              <button className="edit-button" onClick={handleEditClick} title="Rename room">
                ✏️
              </button>
            </div>
          )}
        </div>

        {/* Game Mode */}
        <div className="form-group">
          <label>Game Mode</label>
          <select
            value={selectedMode}
            onChange={handleModeChange}
            className="mode-select"
          >
            {gameModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Players List */}
        <div className="players-section">
          <h3>Players ({players.length}/6)</h3>
          <div className="players-list">
            {players.map((player) => (
              <div key={player.id} className="player-item">
                <span className="player-name">
                  {player.name} {player.isHost && '👑'}
                </span>
                <span className="player-status">Ready</span>
              </div>
            ))}
            {players.length < 6 && (
              <div className="player-item waiting">
                <span className="player-name waiting-text">
                  <span className="wave-text">W</span>
                  <span className="wave-text">a</span>
                  <span className="wave-text">i</span>
                  <span className="wave-text">t</span>
                  <span className="wave-text">i</span>
                  <span className="wave-text">n</span>
                  <span className="wave-text">g</span>
                  <span className="wave-text"> </span>
                  <span className="wave-text"> </span>
                  <span className="wave-text">f</span>
                  <span className="wave-text">o</span>
                  <span className="wave-text">r</span>
                  <span className="wave-text"> </span>
                  <span className="wave-text"> </span>
                  <span className="wave-text">p</span>
                  <span className="wave-text">l</span>
                  <span className="wave-text">a</span>
                  <span className="wave-text">y</span>
                  <span className="wave-text">e</span>
                  <span className="wave-text">r</span>
                  <span className="wave-text">s</span>
                  <span className="wave-text">.</span>
                  <span className="wave-text">.</span>
                  <span className="wave-text">.</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Start Button */}
        <button
          className="start-button"
          onClick={handleStartGame}
          disabled={roomName.trim().length === 0 || players.length < 2}
        >
          🎮 Start Game
        </button>

        {/* Back Button */}
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  )
}

export default CreateRoom
