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
  const [players, setPlayers] = useState(mode === 'create'
    ? [{ id: 1, name: username, isHost: true }]
    : []
  )
  const [roomId, setRoomId] = useState(joinedRoomId || null)

  const hasCreatedRoom = useRef(false)

  const gameModes = ['classic', 'speed', 'cooperative']

  /* ---------------- DEFAULT ROOM NAME (CREATE ONLY) ---------------- */

  useEffect(() => {
    if (mode !== 'create') return
    setRoomName('Room 1')
  }, [mode])

  /* ---------------- CREATE ROOM (ONLY ON CREATE) ---------------- */

  useEffect(() => {
    if (mode !== 'create') return
    if (!roomName || hasCreatedRoom.current) return

    const createRoomOnBackend = async () => {
      const roomData = {
        gameMode: selectedMode,
        host: username
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

        if (onRoomCreated) onRoomCreated(data.roomId)
      } catch (error) {
        console.error('Failed to create room:', error.message)
      }
    }

    createRoomOnBackend()
    hasCreatedRoom.current = true
  }, [roomName, selectedMode, mode, username])

  /* ---------------- JOIN SOCKET ROOM (AFTER CREATION) ---------------- */

  useEffect(() => {
    if (roomId && mode === 'create' && username) {
      socket.emit('joinRoom', { roomId, username });
    }
  }, [roomId, mode, username]);

  /* ---------------- FETCH ROOM DATA (SOURCE OF TRUTH) ---------------- */

  useEffect(() => {
    if (!roomId) return

    const fetchRoom = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rooms/${roomId}`)
        const room = await res.json()

        setRoomName(room.name)
        setSelectedMode(room.game_mode)

        setPlayers(
          room.players.map((name, index) => ({
            id: index + 1,
            name,
            isHost: name === room.host, // ✅ ONLY REAL HOST
          }))
        )
      } catch (err) {
        console.error('Failed to fetch room:', err)
      }
    }

    fetchRoom()
  }, [roomId])

  /* ---------------- FETCH ROOM STATE VIA SOCKET.IO ---------------- */

  useEffect(() => {
    if (!roomId) return
    socket.emit('getRoomState', { roomId })
    const handleRoomState = (room) => {
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
    return () => {
      socket.off('roomState', handleRoomState)
    }
  }, [roomId])

  // Always request latest room state when players change
  useEffect(() => {
    if (!roomId) return;
    socket.emit('getRoomState', { roomId });
  }, [roomId, players.length]);

  /* ---------------- UPDATE ROOM NAME (HOST ONLY) ---------------- */

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
          }),
        })
      } catch (error) {
        console.error('Failed to update room name:', error.message)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [roomName, selectedMode, roomId, mode])

  /* ---------------- LOG ROOM STATE ON JOIN ---------------- */

  // Log to console when a new player joins (roomState changes)
  useEffect(() => {
    if (!roomId) return;
    const handleRoomStateLog = (room) => {
      console.log('Room state updated:', room);
    };
    socket.on('roomState', handleRoomStateLog);
    return () => {
      socket.off('roomState', handleRoomStateLog);
    };
  }, [roomId]);

  /* ---------------- ENSURE SOCKET JOINS ROOM ---------------- */

  // Ensure socket always joins the room (host or joiner) on mount and reconnect
  useEffect(() => {
    if (!roomId || !username) return;
    const join = () => socket.emit('joinRoom', { roomId, username });
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
    };
  }, [roomId, username]);

  /* ---------------- ALWAYS KEEP PLAYER LIST UPDATED VIA SOCKETS ---------------- */

  useEffect(() => {
    if (!roomId) return;
    const handleRoomStateUpdate = (room) => {
      setRoomName(room.name);
      setSelectedMode(room.game_mode);
      setPlayers(
        room.players.map((name, index) => ({
          id: index + 1,
          name,
          isHost: name === room.host,
        }))
      );
      console.log('Room state updated:', room);
    };
    socket.on('roomState', handleRoomStateUpdate);
    // Request latest state every 2s
    const interval = setInterval(() => {
      socket.emit('getRoomState', { roomId });
    }, 2000);
    return () => {
      socket.off('roomState', handleRoomStateUpdate);
      clearInterval(interval);
    };
  }, [roomId]);

  /* ---------------- UI HANDLERS (UNCHANGED) ---------------- */

  const handleRoomNameChange = (e) => {
    if (e.target.value.length <= 15) setRoomName(e.target.value)
  }

  const handleModeChange = (e) => setSelectedMode(e.target.value)

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
                  Waiting for players...
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
