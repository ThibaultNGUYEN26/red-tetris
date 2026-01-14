import './CreateRoom.css'
import { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''

function CreateRoom({
  theme,
  onBack,
  existingRooms = [],
  username,
  mode = 'create',     // 👈 NEW
  roomId: joinedRoomId, // 👈 NEW (when joining)
  onRoomCreated
}) {
  const [roomName, setRoomName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [selectedMode, setSelectedMode] = useState('classic')
  const [players, setPlayers] = useState([
    { id: 1, name: username || 'You', isHost: true }
  ])
  const [roomId, setRoomId] = useState(joinedRoomId || null)

  const hasCreatedRoom = useRef(false)

  const gameModes = ['classic', 'speed', 'cooperative']

  /* ---------------- DEFAULT ROOM NAME (CREATE ONLY) ---------------- */

  useEffect(() => {
    if (mode !== 'create') return

    const existingRoomNames = existingRooms.map(room => room.name)
    let roomNumber = 1
    let defaultName = `Room ${roomNumber}`

    while (existingRoomNames.includes(defaultName)) {
      roomNumber++
      defaultName = `Room ${roomNumber}`
    }

    setRoomName(defaultName)
  }, [existingRooms, mode])

  /* ---------------- CREATE ROOM (ONLY ON CREATE) ---------------- */

  useEffect(() => {
    if (mode !== 'create') return
    if (!roomName || hasCreatedRoom.current) return

    const createRoomOnBackend = async () => {
      const roomData = {
        name: roomName,
        gameMode: selectedMode,
        maxPlayers: 6,
        username, // backend decides host
      }

      try {
        const response = await fetch(`${API_URL}/api/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roomData),
        })

        const data = await response.json()
        setRoomId(data.roomId)
        localStorage.setItem('currentRoomId', data.roomId)

        if (onRoomCreated) {
          onRoomCreated() // 👈 FORCE ROOMS REFRESH
        }
      } catch (error) {
        console.error('Failed to create room:', error.message)
      }
    }

    createRoomOnBackend()
    hasCreatedRoom.current = true
  }, [roomName, selectedMode, mode, username])

  /* ---------------- UPDATE ROOM NAME (SAFE) ---------------- */

  useEffect(() => {
    if (!roomId || mode !== 'create') return

    const timeoutId = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/api/rooms/${roomId}/name`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roomName.trim(),
            gameMode: selectedMode,
            maxPlayers: 6,
          }),
        })
      } catch (error) {
        console.error('Failed to update room name:', error.message)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [roomName, selectedMode, roomId, mode])

  /* ---------------- UI HANDLERS (UNCHANGED) ---------------- */

  const handleRoomNameChange = (e) => {
    if (e.target.value.length <= 15) {
      setRoomName(e.target.value)
    }
  }

  const handleModeChange = (e) => {
    setSelectedMode(e.target.value)
  }

  const handleEditClick = () => setIsEditingName(true)

  const handleNameBlur = () => {
    setIsEditingName(false)
    if (roomName.trim().length === 0 && mode === 'create') {
      setRoomName('Room')
    }
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') e.target.blur()
  }

  const handleStartGame = async () => {
    if (players.length < 2) return

    try {
      await fetch(`${API_URL}/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          roomName,
          gameMode: selectedMode,
        }),
      })
    } catch (error) {
      console.error('Failed to start game:', error.message)
    }
  }

  const handleBack = async () => {
    if (roomId) {
      try {
        await fetch(`${API_URL}/api/rooms/${roomId}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, username }),
        })
      } catch (error) {
        console.error('Failed to leave room:', error.message)
      }
    }

    localStorage.removeItem('currentRoomId')
    onBack()
  }

  /* ---------------- RENDER (UNCHANGED STRUCTURE) ---------------- */

  return (
    <div className={`create-room-card ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="create-room-form">

        {/* Room Name */}
        <div className="form-group room-name-section">
          {isEditingName && mode === 'create' ? (
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
              {mode === 'create' && (
                <button className="edit-button" onClick={handleEditClick}>
                  ✏️
                </button>
              )}
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
            disabled={mode !== 'create'}
          >
            {gameModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Players List (UI KEPT) */}
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
                  <span className="wave-text">f</span>
                  <span className="wave-text">o</span>
                  <span className="wave-text">r</span>
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
          disabled={players.length < 2 || mode !== 'create'}
        >
          🎮 Start Game
        </button>

        {/* Back Button */}
        <button className="back-button" onClick={handleBack}>
          ← Back
        </button>

      </div>
    </div>
  )
}

export default CreateRoom
