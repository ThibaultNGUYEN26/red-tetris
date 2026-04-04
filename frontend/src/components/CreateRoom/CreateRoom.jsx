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
  isSolo = false,
  roomType: initialRoomType = 'multiplayer',
  desiredRoomName,
  onRoomCreated,
  onStartGame
}) {
  const sharedBoardModes = ['cooperative', 'cooperative_roles']
  const defaultAvatar = {
    skinColor: '#cccccc',
    eyeType: 'normal',
    mouthType: 'neutral',
  }

  const [roomName, setRoomName] = useState('')
  const [roomNameDraft, setRoomNameDraft] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [roomType, setRoomType] = useState(initialRoomType)
  const [selectedMode, setSelectedMode] = useState(
    initialRoomType === 'cooperative' ? 'cooperative' : 'classic'
  )
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
  const [committedMode, setCommittedMode] = useState('classic')
  const [joinError, setJoinError] = useState('')

  const hasCreatedRoom = useRef(false)
  const hasEditedName = useRef(false)
  const hasStartedGame = useRef(false)
  const hasJoinedRoom = useRef(false)

  const resolvedRoomName = (nameFromServer) => {
    if (!desiredRoomName) return nameFromServer
    if (!nameFromServer) return desiredRoomName
    return desiredRoomName
  }

  const getJoinErrorMessage = (error) => {
    switch (error) {
      case 'Username already connected':
        return 'This username is already connected in this room.'
      case 'Room is full':
        return 'This room is already full.'
      case 'User is already in a room':
        return 'This player is already busy in another room.'
      default:
        return 'This room is already busy. Please try another room or username.'
    }
  }

  // Define available game modes
  const multiplayerModes = [
    { value: 'classic', label: 'Classic', maxPlayers: 6 },
    { value: 'mirror', label: 'Mirror', maxPlayers: 6 },
    { value: 'giant', label: 'Giant', maxPlayers: 6 }
  ]
  const cooperativeModes = [
    { value: 'cooperative', label: 'Co-op Alternate', maxPlayers: 2 },
    { value: 'cooperative_roles', label: 'Co-op Roles', maxPlayers: 2 }
  ]

  const availableGameModes =
    roomType === 'cooperative' ? cooperativeModes : multiplayerModes

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
            name: desiredRoomName || undefined,
          }),
        })

        const room = await response.json()
        
        // [Play Again] If user is already in a room, the backend rejects creation.
        if (room.error === 'User is already in a room') {
          console.log('[CreateRoom] User already in a room, retrieving existing room')
          return
        }
        
        if (!room.id) {
          console.error('[CreateRoom] Room creation failed:', room.error || 'No roomId returned')
          return
        }

        console.log('[CreateRoom] Room created', { roomId: room.id, name: room.name, roomObj: room })

        setRoomId(room.id)
        setRoomName(resolvedRoomName(room.name))
        setRoomNameDraft(resolvedRoomName(room.name))
        setSelectedMode(room.game_mode)
        setCommittedMode(room.game_mode)
        setRoomType(
          ['cooperative', 'cooperative_roles'].includes(room.game_mode)
            ? 'cooperative'
            : 'multiplayer'
        )

        onRoomCreated?.(room.id, desiredRoomName || room.name, roomType)

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
    if (hasJoinedRoom.current) return

    let cancelled = false

    const handleRoomState = (room) => {
      console.log('🟢 Room updated:', room)

      const avatars = room.player_avatars || {}
      const readyAgainPlayers =
        room.status !== 'started' && Array.isArray(room.ready_again) && room.ready_again.length
          ? room.ready_again
          : null
      const displayedPlayers = readyAgainPlayers || room.players || []

      setRoomName(resolvedRoomName(room.name))
      if (!isEditingName) {
        setRoomNameDraft(resolvedRoomName(room.name))
      }
      setSelectedMode(room.game_mode)
      setCommittedMode(room.game_mode)
      setRoomType(
        ['cooperative', 'cooperative_roles'].includes(room.game_mode)
          ? 'cooperative'
          : 'multiplayer'
      )
      setHostName(room.host)
      setPlayers(
        displayedPlayers.map((name, index) => ({
          id: index + 1,
          name,
          isHost: name === room.host,
          avatar: avatars[name] || resolveAvatar(name),
        }))
      )
    }

    socket.on('roomState', handleRoomState)

    socket.emit("joinRoom", { roomId: String(roomId), username }, (response) => {
      if (cancelled) return

      if (!response?.ok) {
        console.error('Failed to join room:', response?.error || 'Unknown error')
        setJoinError(getJoinErrorMessage(response?.error))
        setRoomId(null)
        return
      }

      setJoinError('')
      hasJoinedRoom.current = true
      console.log('Emitting getRoomState', roomId)
      socket.emit('getRoomState', { roomId: String(roomId) })
    })

    return () => {
      cancelled = true
      hasJoinedRoom.current = false
      socket.off('roomState', handleRoomState);
    }
  }, [roomId, username, userProfile, isEditingName, onBack])

  // Update game mode (only host)
  useEffect(() => {
    if (!roomId) return;
    if (hostName !== username) return; // Only host can change
    if (!selectedMode) return;

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/api/rooms/${roomId}/mode`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: selectedMode,
            username: username,
          }),
        })

        if (!response.ok) {
          throw new Error(`Mode update failed with status ${response.status}`)
        }

        const updatedRoom = await response.json()
        setSelectedMode(updatedRoom.game_mode)
        setCommittedMode(updatedRoom.game_mode)
      } catch (err) {
        setSelectedMode(committedMode)
        console.error('Failed to update game mode:', err);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedMode, roomId, mode, username, hostName, committedMode]);

  /* ---------------- UI HANDLERS ---------------- */

  const handleRoomNameChange = (e) => {
    if (e.target.value.length <= 15) {
      setRoomNameDraft(e.target.value)
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
    setRoomNameDraft(roomName)
    setIsEditingName(true)
  }

  const handleNameBlur = () => {
    setIsEditingName(false)
    setRoomNameDraft(roomName)
  }

  const submitRoomName = async () => {
    if (!roomId) return

    const trimmedName = roomNameDraft.trim()
    if (!trimmedName || hostName !== username) {
      setRoomNameDraft(roomName)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/rooms/${roomId}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          username,
        }),
      })

      if (!response.ok) {
        throw new Error(`Rename failed with status ${response.status}`)
      }

      const updatedRoom = await response.json()
      setRoomName(updatedRoom.name)
      setRoomNameDraft(updatedRoom.name)
      socket.emit('getRoomState', { roomId: String(roomId) })
    } catch (err) {
      setRoomNameDraft(roomName)
      console.error('Failed to update room name:', err)
    }
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitRoomName().finally(() => {
        setIsEditingName(false)
      })
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setRoomNameDraft(roomName)
      setIsEditingName(false)
    }
  }

  const handleStartGame = async () => {
    if (!roomId) return
    if (!isSolo && players.length < 2) return
    if (sharedBoardModes.includes(selectedMode) && players.length !== 2) return
    if (hostName && hostName !== username) return
    if (hasStartedGame.current) return // Prevent duplicate submissions

    try {
      hasStartedGame.current = true
      console.log('🎮 Emitting startGame event:', { roomId: String(roomId), username });
      socket.emit('startGame', { roomId: String(roomId), username })
      onStartGame?.(roomId)
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
    if (!roomId) return;

    const handleBeforeUnload = () => {
      if (socket.connected) {
        socket.emit("playerLeave", { roomId: String(roomId) });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [roomId]);

  /* ---------------- RENDER ---------------- */

  return (
    <div className={`create-room-card ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="create-room-form">

        {/* Room Name */}
        <div className="form-group room-name-section">
          {isEditingName && hostName === username ? (
            <div className="room-name-container">
              <input
                type="text"
                value={roomNameDraft}
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
              {hostName === username && (
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
            disabled={hostName && hostName !== username}
          >
            {getAvailableModes().map((m) => (
              <option
                key={m.value}
                value={m.value}
                disabled={isModeDisabled(m)}
              >
                {m.label} {isModeDisabled(m) ? `(Max ${m.maxPlayers} players)` : ''}
              </option>
            ))}
          </select>
        </div>

        {joinError && (
          <div className="room-error-banner" role="alert">
            {joinError}
          </div>
        )}

        {/* Players */}
        {!isSolo && (
          <div className="players-section">
            <h3>Players ({players.length}/{availableGameModes.find(m => m.value === selectedMode)?.maxPlayers || 2})</h3>

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

              {players.length < (availableGameModes.find(m => m.value === selectedMode)?.maxPlayers || 2) && (
                <div className="player-item waiting">
                  {/* Animated waiting text */}
                  {Array.from('Waiting for players...').map((char, i) => (
                    <span key={i} className="wave-text">{char}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          className="start-button"
          onClick={handleStartGame}
          disabled={
            !roomId ||
            (!isSolo && players.length < 2) ||
            (sharedBoardModes.includes(selectedMode) && players.length !== 2) ||
            (hostName && hostName !== username)
          }
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
