import './CreateRoom.css'
import { useState, useEffect, useRef } from 'react'
import FaceAvatar from '../FaceAvatar/FaceAvatar'
import { socket } from '../../socket'

const API_URL = import.meta.env.VITE_API_URL || ''

function CreateRoom({
  theme,
  onBack,
  existingRooms = [],
  username,
  userProfile,
  mode = 'create',
  roomId: joinedRoomId,
  onRoomCreated
}) {
  const defaultAvatar = {
    skinColor: '#cccccc',
    eyeType: 'normal',
    mouthType: 'neutral',
  }

  const [roomName, setRoomName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [selectedMode, setSelectedMode] = useState('classic')
  const [players, setPlayers] = useState(
    mode === 'create'
      ? [{
        id: 1,
        name: username,
        isHost: true,
        avatar: userProfile?.avatar || defaultAvatar,
      }]
      : []
  )
  const [roomId, setRoomId] = useState(joinedRoomId || null)
  const [hostName, setHostName] = useState('')

  const hasCreatedRoom = useRef(false)
  const hasEditedName = useRef(false)
  const hasStartedGame = useRef(false)

  // Define available game modes
  const availableGameModes = [
    { value: 'classic', label: 'Classic', maxPlayers: 6 },
    { value: 'speed', label: 'Speed', maxPlayers: 6 },
    { value: 'cooperative', label: 'Cooperative', maxPlayers: 2 }
  ]

  // Filter modes based on current player count
  const getAvailableModes = () => {
    return availableGameModes.filter(mode => {
      // If we're in this mode already, keep it available (even if over limit)
      if (mode.value === selectedMode) return true
      // Otherwise, check if adding players would exceed limit
      return players.length <= mode.maxPlayers
    })
  }

  const isModeDisabled = (mode) => {
    // If we're already in this mode, never disable it
    if (mode.value === selectedMode) return false
    // Disable if current player count exceeds the mode's max
    return players.length > mode.maxPlayers
  }

  /* ---------------- CREATE ROOM (HOST) ---------------- */

  useEffect(() => {
    if (mode !== 'create') return
    if (hasCreatedRoom.current) return

    const createRoom = async () => {
      try {
        console.log('[CreateRoom] Creating room', { username, gameMode: selectedMode })
        const response = await fetch(`${API_URL}/api/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameMode: selectedMode,
            host: username,
          }),
        })

        const room = await response.json()
        console.log('[CreateRoom] Room created', { roomId: room.id, name: room.name })

        setRoomId(room.id)
        setRoomName(room.name)              // ✅ backend name
        setSelectedMode(room.game_mode)     // ✅ backend mode

        localStorage.setItem('currentRoomId', room.id)
        onRoomCreated?.(room.id, room.name)

        hasCreatedRoom.current = true
      } catch (err) {
        console.error('Failed to create room:', err)
      }
    }

    createRoom()
  }, [])

  /* ---------------- SOCKET ROOM STATE (SOURCE OF TRUTH) ---------------- */

  useEffect(() => {
    if (!roomId) return

    socket.emit("joinRoom", { roomId: String(roomId), username });
    console.log('Emitting getRoomState', roomId);

    const handleRoomState = (room) => {
      console.log('🟢 Room updated:', room)

      const avatars = room.player_avatars || {}

      setRoomName(room.name)
      setSelectedMode(room.game_mode)
      setHostName(room.host)
      setPlayers(
        room.players.map((name, index) => ({
          id: index + 1,
          name,
          isHost: name === room.host,
          avatar: avatars[name] || resolveAvatar(name),
        }))
      )
    }

    socket.on('roomState', handleRoomState)

    // initial sync
    socket.emit('getRoomState', { roomId: String(roomId) })

    return () => {
      socket.off('roomState', handleRoomState);
    }
  }, [roomId])

    /* ---------------- UPDATE ROOM NAME (ONLY AFTER USER EDIT) ---------------- */

  useEffect(() => {
    if (!roomId || mode !== 'create') return;
    if (!hasEditedName.current) return;
    if (roomName.trim().length === 0) return; // Prevent PATCH if name is empty

    const timeoutId = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/api/rooms/${roomId}/name`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roomName.trim(),
            username: username,
          }),
        });
      } catch (err) {
        console.error('Failed to update room name:', err);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [roomName, roomId, mode, username]);

  // Update game mode (only host)
  useEffect(() => {
    if (!roomId || mode !== 'create') return;
    if (hostName !== username) return; // Only host can change
    if (!selectedMode) return;

    const timeoutId = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/api/rooms/${roomId}/mode`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: selectedMode,
            username: username,
          }),
        });
      } catch (err) {
        console.error('Failed to update game mode:', err);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedMode, roomId, mode, username, hostName]);

  /* ---------------- UI HANDLERS ---------------- */

  const handleRoomNameChange = (e) => {
    if (e.target.value.length <= 15) {
      setRoomName(e.target.value)
    }
  }

  const handleModeChange = (e) => {
    const newMode = e.target.value
    const modeConfig = availableGameModes.find(m => m.value === newMode)
    
    // Check if the new mode supports current player count
    if (modeConfig && players.length > modeConfig.maxPlayers) {
      alert(`${modeConfig.label} mode supports a maximum of ${modeConfig.maxPlayers} players. Current players: ${players.length}`)
      return
    }
    
    setSelectedMode(newMode)
  }

  const resolveAvatar = (name) => {
    if (name === username && userProfile?.avatar) return userProfile.avatar
    return defaultAvatar
  }

  const handleEditClick = () => {
    hasEditedName.current = true
    setIsEditingName(true)
  }

  const handleNameBlur = () => {
    setIsEditingName(false)
    if (roomName.trim().length === 0) {
      setRoomName('Room')
    }
    // Do NOT send PATCH on blur
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Only send PATCH if not empty
      if (roomName.trim().length > 0 && mode === 'create' && hasEditedName.current) {
        fetch(`${API_URL}/api/rooms/${roomId}/name`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: roomName.trim() }),
        }).catch(err => console.error('Failed to update room name:', err));
      }
      e.target.blur(); // Triggers handleNameBlur, but does NOT send PATCH
    }
  }

  const handleStartGame = async () => {
    if (players.length < 2) return
    if (hostName && hostName !== username) return
    if (hasStartedGame.current) return // Prevent duplicate submissions

    try {
      hasStartedGame.current = true
      console.log('🎮 Emitting startGame event:', { roomId: String(roomId), username });
      socket.emit('startGame', { roomId: String(roomId), username })
    } catch (err) {
      console.error('Failed to start game:', err)
      hasStartedGame.current = false
    }
  }

  const handleBack = async () => {
    onBack()
  }

  /* ---------------- LEAVE ROOM ON TAB CLOSE/REFRESH ---------------- */

  useEffect(() => {
    if (!roomId || !username) return;

    const handleBeforeUnload = (e) => {
      // Use sendBeacon for reliable leave on refresh/close
      const url = `${API_URL}/api/rooms/${roomId}/leave`;
      const data = JSON.stringify({ roomId, username });
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      localStorage.removeItem("currentRoomId");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [roomId, username]);

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
            {availableGameModes.map((m) => (
              <option 
                key={m.value} 
                value={m.value}
                disabled={isModeDisabled(m)}
              >
                {m.label} {isModeDisabled(m) ? `(Max ${m.maxPlayers} players)` : ''}
              </option>
            ))}
          </select>
          {mode === 'create' && players.length > 2 && selectedMode === 'cooperative' && (
            <p className="mode-warning">⚠️ Cooperative mode supports max 2 players</p>
          )}
        </div>

        {/* Players */}
        <div className="players-section">
          <h3>Players ({players.length}/{availableGameModes.find(m => m.value === selectedMode)?.maxPlayers || 6})</h3>

          <div className="players-list">
            {players.map((player) => (
              <div key={player.id} className="player-item has-avatar">
                <FaceAvatar faceConfig={player.avatar} size="small" />
                <span className="player-name">
                  {player.name}
                  {player.isHost && <span className="host-crown">{'\u{1F451}'}</span>}
                </span>
              </div>
            ))}

            {players.length < (availableGameModes.find(m => m.value === selectedMode)?.maxPlayers || 6) && (
              <div className="player-item waiting">
                {/* Animated waiting text */}
                {Array.from('Waiting for players...').map((char, i) => (
                  <span key={i} className="wave-text">{char}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          className="start-button"
          onClick={handleStartGame}
          disabled={players.length < 2 || (hostName && hostName !== username)}
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
