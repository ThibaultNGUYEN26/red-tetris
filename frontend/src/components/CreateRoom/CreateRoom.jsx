import './CreateRoom.css'
import { useState, useEffect, useRef } from 'react'
import { socket } from '../../socket'

const API_URL = import.meta.env.VITE_API_URL || ''

function CreateRoom({
  theme,
  onBack,
  existingRooms = [],
  username,
  mode = 'create',
  roomId: joinedRoomId,
  onRoomCreated
}) {
  const [roomName, setRoomName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [selectedMode, setSelectedMode] = useState('classic')
  const [players, setPlayers] = useState(
    mode === 'create'
      ? [{ id: 1, name: username, isHost: true }]
      : []
  )
  const [roomId, setRoomId] = useState(joinedRoomId || null)

  const hasCreatedRoom = useRef(false)
  const hasEditedName = useRef(false)

  const gameModes = ['classic', 'speed', 'cooperative']

  /* ---------------- CREATE ROOM (HOST) ---------------- */

  useEffect(() => {
    if (mode !== 'create') return
    if (hasCreatedRoom.current) return

    const createRoom = async () => {
      try {
        const response = await fetch(`${API_URL}/api/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameMode: selectedMode,
            host: username,
          }),
        })

        const room = await response.json()

        setRoomId(room.id)
        setRoomName(room.name)              // ✅ backend name
        setSelectedMode(room.game_mode)     // ✅ backend mode

        localStorage.setItem('currentRoomId', room.id)
        onRoomCreated?.(room.id)

        hasCreatedRoom.current = true
      } catch (err) {
        console.error('Failed to create room:', err)
      }
    }

    createRoom()
  }, [mode, selectedMode, username])

  /* ---------------- JOIN SOCKET ROOM ---------------- */

  // Only joinRoom via socket if mode is 'create' (host), not for join mode
  useEffect(() => {
    if (!roomId || !username) return
    if (mode !== 'create') return
    socket.emit('joinRoom', {
      roomId: String(roomId),
      username,
    })
  }, [roomId, username, mode])

  /* ---------------- SOCKET ROOM STATE (SOURCE OF TRUTH) ---------------- */

  useEffect(() => {
    if (!roomId) return

    const handleRoomState = (room) => {
      console.log('🟢 Room updated:', room)

      setRoomName(room.name)
      setSelectedMode(room.game_mode)
      setPlayers(
        room.players.map((name, index) => ({
          id: index + 1,
          name,
          isHost: name === room.host,
        }))
      )
    }

    socket.on('roomState', handleRoomState)

    // initial sync
    socket.emit('getRoomState', { roomId: String(roomId) })

    return () => {
      socket.off('roomState', handleRoomState)
    }
  }, [roomId])

  /* ---------------- UPDATE ROOM NAME (ONLY AFTER USER EDIT) ---------------- */

  useEffect(() => {
    if (!roomId || mode !== 'create') return
    if (!hasEditedName.current) return

    const timeoutId = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/api/rooms/${roomId}/name`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roomName.trim(),
          }),
        })
      } catch (err) {
        console.error('Failed to update room name:', err)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [roomName, roomId, mode])

  /* ---------------- UI HANDLERS ---------------- */

  const handleRoomNameChange = (e) => {
    if (e.target.value.length <= 15) {
      setRoomName(e.target.value)
    }
  }

  const handleModeChange = (e) => setSelectedMode(e.target.value)

  const handleEditClick = () => {
    hasEditedName.current = true
    setIsEditingName(true)
  }

  const handleNameBlur = () => {
    setIsEditingName(false)
    if (roomName.trim().length === 0) {
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
        body: JSON.stringify({ username }),
      })
    } catch (err) {
      console.error('Failed to start game:', err)
    }
  }

  const handleBack = async () => {
    if (roomId) {
      try {
        await fetch(`${API_URL}/api/rooms/${roomId}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        })
      } catch (err) {
        console.error('Failed to leave room:', err)
      }
    }

    localStorage.removeItem('currentRoomId')
    onBack()
  }

  /* ---------------- RENDER ---------------- */

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
            {gameModes.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Players */}
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
                <span
                  key={players.length}
                  className="player-name waiting-text"
                >
                  Waiting for players...
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          className="start-button"
          onClick={handleStartGame}
          disabled={players.length < 2 || mode !== 'create'}
        >
          🎮 Start Game
        </button>

        <button className="back-button" onClick={handleBack}>
          ← Back
        </button>

      </div>
    </div>
  )
}

export default CreateRoom
