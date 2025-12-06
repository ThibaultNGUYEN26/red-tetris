import './CreateRoom.css'
import { useState } from 'react'

function CreateRoom({ theme, onBack, onCreateRoom }) {
  const [roomName, setRoomName] = useState('')
  const [selectedMode, setSelectedMode] = useState('classic')
  const [players, setPlayers] = useState([
    { id: 1, name: 'You', isHost: true }
  ])

  const gameModes = [
    'classic',
    'speed',
    'cooperative',
  ]

  const handleRoomNameChange = (e) => {
    const value = e.target.value
    if (value.length <= 20) {
      setRoomName(value)
    }
  }

  const handleModeChange = (e) => {
    setSelectedMode(e.target.value)
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
      <h2>Create Room</h2>

      <div className="create-room-form">
        {/* Room Name */}
        <div className="form-group">
          <label>Room Name</label>
          <input
            type="text"
            value={roomName}
            onChange={handleRoomNameChange}
            placeholder="Enter room name..."
            maxLength={20}
            className="room-name-input"
          />
          <span className="char-count">{roomName.length}/20</span>
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
