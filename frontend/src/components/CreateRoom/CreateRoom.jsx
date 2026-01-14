import './CreateRoom.css'
import { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''

function CreateRoom({ theme, onBack, onCreateRoom, existingRooms = [], username }) {
  const [roomName, setRoomName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [selectedMode, setSelectedMode] = useState('classic')
  const [players, setPlayers] = useState([
    { id: 1, name: username || 'You', isHost: true }
  ])
  const [roomId, setRoomId] = useState(null)
  const hasCreatedRoom = useRef(false)

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

  // Create room on backend when component mounts and room name is set
  useEffect(() => {
    const createRoomOnBackend = async () => {
      if (!roomName) return

      const roomData = {
        name: roomName,
        gameMode: selectedMode,
        maxPlayers: 6,
        host: username,
        playerCount: players.length
      }

      console.log('Creating room on backend:', JSON.stringify(roomData, null, 2))
      console.log('Frontend: creating room', roomData)
      try {
        let token = null
        if (window.lastBackendToken) token = window.lastBackendToken
        const response = await fetch(`${API_URL}/api/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(roomData),
        })

        console.log('Room created successfully')
        console.log('Response status:', response.status)

        // Store room ID for future updates
        try {
          const data = await response.json()
          if (data.roomId) {
            setRoomId(data.roomId)
            console.log('Room ID:', data.roomId)
          }
        } catch (jsonError) {
          // Backend returned non-JSON response (e.g., 404 with empty body)
          // Use a mock ID for development
          const mockRoomId = `mock-${Date.now()}`
          setRoomId(mockRoomId)
          console.log('Using mock room ID for development:', mockRoomId)
        }

      } catch (error) {
        console.error('Failed to create room on backend:', error.message)
        console.log('This is expected since backend is not running yet')
        // Set a mock room ID so updates can still be logged
        const mockRoomId = `mock-${Date.now()}`
        setRoomId(mockRoomId)
        console.log('Using mock room ID for development:', mockRoomId)
      }
    }

    // Only create room once on mount when roomName is available
    if (roomName && !hasCreatedRoom.current) {
      createRoomOnBackend()
      hasCreatedRoom.current = true
    }
  }, [roomName, selectedMode, players])

  // Send room name updates to backend in real-time (debounced)
  useEffect(() => {
    if (!roomId || !roomName || !hasCreatedRoom.current) {
      console.log('Skipping room name update:', { roomId: !!roomId, roomName: !!roomName, hasCreatedRoom: hasCreatedRoom.current })
      return
    }

    const updateRoomName = async () => {
      const updateData = {
        name: roomName.trim(),
        gameMode: selectedMode,
        maxPlayers: 6,
        host: username,
        playerCount: players.length
      }

      console.log('Updating room name on backend:', JSON.stringify(updateData, null, 2))

      try {
        const response = await fetch(`${API_URL}/api/rooms/${roomId}/name`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })

        const data = await response.json()
        console.log('Room name updated:', JSON.stringify(data, null, 2))

      } catch (error) {
        console.error('Failed to update room name on backend:', error.message)
        console.log('This is expected since backend is not running yet')
      }
    }

    // Debounce room name updates (500ms delay)
    const timeoutId = setTimeout(() => {
      updateRoomName()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [roomName, roomId, selectedMode, players])

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

  const handleStartGame = async () => {
    if (roomName.trim().length > 0 && players.length >= 2) {
      const gameData = {
        roomId,
        roomName: roomName.trim(),
        gameMode: selectedMode,
        players: players
      }

      console.log('Starting game on backend:', JSON.stringify(gameData, null, 2))

      try {
        const response = await fetch(`${API_URL}/api/rooms/${roomId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gameData),
        })

        console.log('Game started successfully')
        console.log('Response status:', response.status)

        const data = await response.json()
        console.log('Backend response:', data)

      } catch (error) {
        console.error('Failed to start game on backend:', error.message)
        console.log('This is expected since backend is not running yet')
      }
    }
  }

  const handleBack = async () => {
    if (!roomId) {
      onBack()
      return
    }

    const leaveData = {
      roomId,
      username,
      isHost: true
    }

    console.log('Leaving room:', JSON.stringify(leaveData, null, 2))

    try {
      const response = await fetch(`${API_URL}/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveData),
      })

      console.log('Left room successfully')
      console.log('Response status:', response.status)

      const data = await response.json()
      console.log('Backend response:', JSON.stringify(data, null, 2))

    } catch (error) {
      console.error('Failed to leave room on backend:', error.message)
      console.log('This is expected since backend is not running yet')
    }

    onBack()
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
        <button className="back-button" onClick={handleBack}>
          ← Back
        </button>
      </div>
    </div>
  )
}

export default CreateRoom
