import './CreateRoom.css'
import { useState, useEffect, useRef } from 'react'
import FaceAvatar from '../FaceAvatar/FaceAvatar'
import { socket } from '../../socket'
import { authFetchOptions } from '../../authToken'
import { apiFetch } from '../../api'
import { DEFAULT_LANGUAGE } from '../../i18n/playerStats'

const CREATE_ROOM_TRANSLATIONS = {
  en: {
    joinErrors: {
      'Username already connected': 'This username is already connected in this room.',
      'Room is full': 'This room is already full.',
      'User is already in a room': 'This player is already busy in another room.',
      default: 'This room is already occupied. Try another room or another username.',
    },
    roomActionErrors: {
      used: 'Room already used.',
      invalidName: 'Invalid room name',
      invalidMode: 'Invalid game mode',
      hostRenameOnly: 'Only the host can rename the room.',
      default: 'Unable to update the room right now.',
    },
    modes: {
      classic: { label: 'Classic', description: 'Standard competitive Tetris where cleared lines send penalties to opponents.' },
      mirror: { label: 'Mirror', description: 'Controls are reversed, so movement and drops behave differently.' },
      chaotic: { label: 'Chaotic', description: 'Your current piece and next piece can be randomly swapped during the game.' },
      invisible: { label: 'Invisible', description: 'The active piece becomes harder to track while it falls.' },
      giant: { label: 'Giant', description: 'Play on a larger board with more space and longer survival.' },
      cooperative: { label: 'Alternating co-op', description: 'Two players share a board and play turn by turn.' },
      cooperative_roles: { label: 'Role co-op', description: 'Two players share a board with separate movement and rotation roles.' },
    },
    invalidPassword: 'Invalid password',
    passwordRequired: 'Password required',
    joinFailed: 'Unable to join the room',
    editRoomName: 'Edit room name',
    currentPassword: 'Current room password',
    password: 'Password',
    roomPassword: 'Room password',
    hidePassword: 'Hide password',
    showPassword: 'Show password',
    joinRoom: 'Join room',
    back: 'Back',
    gameMode: 'Game mode',
    players: 'Players',
    waitingPlayers: 'Waiting for players...',
    startGame: 'Start game',
  },
  fr: {
    joinErrors: {
      'Username already connected': 'Ce pseudo est déjà connecté dans cette salle.',
      'Room is full': 'Cette salle est déjà complète.',
      'User is already in a room': 'Ce joueur est déjà occupé dans une autre salle.',
      default: 'Cette salle est déjà occupée. Essayez une autre salle ou un autre pseudo.',
    },
    roomActionErrors: {
      used: 'Salle déjà utilisée.',
      invalidName: 'Nom de salle invalide',
      invalidMode: 'Mode de jeu invalide',
      hostRenameOnly: 'Seul l’hôte peut renommer la salle.',
      default: 'Impossible de mettre à jour la salle pour le moment.',
    },
    modes: {
      classic: { label: 'Classique', description: 'Tetris compétitif standard où les lignes supprimées envoient des pénalités aux adversaires.' },
      mirror: { label: 'Miroir', description: 'Les contrôles sont inversés, donc les déplacements et les chutes se comportent différemment.' },
      chaotic: { label: 'Chaotique', description: 'Votre pièce actuelle et la pièce suivante peuvent être échangées aléatoirement pendant la partie.' },
      invisible: { label: 'Invisible', description: 'La pièce active devient plus difficile à suivre pendant sa chute.' },
      giant: { label: 'Géant', description: 'Jouez sur un plateau plus grand, avec plus d’espace et une survie plus longue.' },
      cooperative: { label: 'Co-op alternée', description: 'Deux joueurs partagent un plateau et jouent à tour de rôle.' },
      cooperative_roles: { label: 'Co-op rôles', description: 'Deux joueurs partagent un plateau avec des rôles séparés pour les déplacements et la rotation.' },
    },
    invalidPassword: 'Mot de passe invalide',
    passwordRequired: 'Mot de passe requis',
    joinFailed: 'Impossible de rejoindre la salle',
    editRoomName: 'Modifier le nom de la salle',
    currentPassword: 'Mot de passe actuel de la salle',
    password: 'Mot de passe',
    roomPassword: 'Mot de passe de la salle',
    hidePassword: 'Masquer le mot de passe',
    showPassword: 'Afficher le mot de passe',
    joinRoom: 'Rejoindre la salle',
    back: 'Retour',
    gameMode: 'Mode de jeu',
    players: 'Joueurs',
    waitingPlayers: 'En attente de joueurs...',
    startGame: 'Lancer la partie',
  },
}

function CreateRoom({
  theme,
  onBack,
  onJoinError,
  onNotice,
  existingRooms = [],
  username,
  userProfile,
  mode = 'create',
  roomId: joinedRoomId,
  isSolo = false,
  roomType: initialRoomType = 'multiplayer',
  desiredRoomName,
  initialRoomPassword = '',
  knownRoomPassword = '',
  onRoomCreated,
  onRoomRenamed,
  onStartGame,
  language = DEFAULT_LANGUAGE,
}) {
  const text = CREATE_ROOM_TRANSLATIONS[language] || CREATE_ROOM_TRANSLATIONS[DEFAULT_LANGUAGE]
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
  const [preferredRoomName, setPreferredRoomName] = useState(desiredRoomName || null)
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
  const [, setJoinError] = useState('')
  const [roomPassword, setRoomPassword] = useState(initialRoomPassword)
  const [showRoomPassword, setShowRoomPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [needsRoomPassword, setNeedsRoomPassword] = useState(false)

  const hasCreatedRoom = useRef(false)
  const hasEditedName = useRef(false)
  const hasStartedGame = useRef(false)
  const hasJoinedRoom = useRef(false)
  const isLeavingRoom = useRef(false)

  const resolvedRoomName = (nameFromServer) => {
    if (preferredRoomName) return preferredRoomName
    return nameFromServer
  }

  const getJoinErrorMessage = (error) => {
    return text.joinErrors[error] || text.joinErrors.default
  }

  const getRoomActionErrorMessage = (error) => {
    switch (error) {
      case 'Room already used':
      case 'Room name already exists':
        return text.roomActionErrors.used
      case 'Invalid room name':
        return text.roomActionErrors.invalidName
      case 'Invalid game mode':
        return text.roomActionErrors.invalidMode
      case 'Only the host can rename the room':
        return text.roomActionErrors.hostRenameOnly
      default:
        return text.roomActionErrors.default
    }
  }

  // Define available game modes
  const multiplayerModes = [
    { value: 'classic', maxPlayers: 8, ...text.modes.classic },
    { value: 'mirror', maxPlayers: 8, ...text.modes.mirror },
    { value: 'chaotic', maxPlayers: 8, ...text.modes.chaotic },
    { value: 'invisible', maxPlayers: 8, ...text.modes.invisible },
    { value: 'giant', maxPlayers: 8, ...text.modes.giant }
  ]
  const cooperativeModes = [
    { value: 'cooperative', maxPlayers: 2, ...text.modes.cooperative },
    { value: 'cooperative_roles', maxPlayers: 2, ...text.modes.cooperative_roles }
  ]

  const availableGameModes =
    roomType === 'cooperative' ? cooperativeModes : multiplayerModes
  const selectedModeDescription =
    availableGameModes.find((gameMode) => gameMode.value === selectedMode)?.description ||
    text.modes.classic.description

  // Filter modes based on current player count
  const getAvailableModes = () => {
    return availableGameModes.filter(mode => {
      // If we're in this mode already, keep it available (even if over limit)
      if (mode.value === selectedMode) return true
      // Otherwise, check if adding players would exceed limit
      return players.length <= mode.maxPlayers
    })
  }

  /* ---------------- CREATE ROOM (HOST) ---------------- */

  useEffect(() => {
    setPreferredRoomName(desiredRoomName || null)
  }, [desiredRoomName])

  useEffect(() => {
    if (mode !== 'create') return
    /* v8 ignore next -- protects against duplicate effect execution outside normal React mount flow. @preserve */
    if (hasCreatedRoom.current) return

    const createRoom = async () => {
      try {
        const response = await apiFetch(`/api/rooms`, {
          method: 'POST',
          ...authFetchOptions(),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameMode: selectedMode,
            name: desiredRoomName || undefined,
            isListed: !isSolo,
            ...(!isSolo && initialRoomPassword.trim()
              ? { roomPassword: initialRoomPassword.trim() }
              : {}),
          }),
        })

        const room = await response.json()
        
        // [Play Again] If user is already in a room, the backend rejects creation.
        if (room.error === 'User is already in a room') {
          onJoinError?.(room.error)
          return
        }

        if (!response.ok) {
          const message = getRoomActionErrorMessage(room.error)
          setJoinError(message)
          onNotice?.(message)
          if (response.status === 409) {
            onJoinError?.('Room already used')
          }
          return
        }
        
        if (!room.id) {
          console.error('[CreateRoom] Room creation failed:', room.error || 'No roomId returned')
          return
        }

        setRoomId(room.id)
        setRoomName(resolvedRoomName(room.name))
        setRoomNameDraft(resolvedRoomName(room.name))
        setSelectedMode(room.game_mode)
        setCommittedMode(room.game_mode)
        setHostName(room.host || username)
        if (Array.isArray(room.players) && room.players.length > 0) {
          setPlayers(
            room.players.map((name, index) => ({
              id: index + 1,
              name,
              isHost: name === (room.host || username),
              avatar: resolveAvatar(name),
            }))
          )
        }
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

    const handleRoomState = (room) => {
      applyRoomState(room)
    }

    socket.on('roomState', handleRoomState)

    return () => {
      socket.off('roomState', handleRoomState)
    }
  }, [roomId, isEditingName, username, userProfile])

  useEffect(() => {
    if (!roomId) {
      hasJoinedRoom.current = false
      return
    }
    /* v8 ignore next -- cleanup resets this ref before dependency-driven rejoin attempts in the UI. @preserve */
    if (hasJoinedRoom.current) return

    let cancelled = false

    socket.emit("joinRoom", { roomId: String(roomId), username, roomPassword }, (response) => {
      if (cancelled) return
      /* v8 ignore next -- leaving also clears roomId, so the cancellation guard handles UI exits first. @preserve */
      if (isLeavingRoom.current) return

      if (!response?.ok) {
        if (response?.error === 'Room password required' || response?.error === 'Invalid room password') {
          setNeedsRoomPassword(true)
          setPasswordError(response.error === 'Invalid room password' ? text.invalidPassword : '')
          return
        }
        console.error('Failed to join room:', response?.error || 'Unknown error')
        setJoinError(getJoinErrorMessage(response?.error))
        setRoomId(null)
        onJoinError?.(response?.error)
        return
      }

      setJoinError('')
      setPasswordError('')
      setNeedsRoomPassword(false)
      hasJoinedRoom.current = true
      socket.emit('getRoomState', { roomId: String(roomId) })
    })

    return () => {
      cancelled = true
      hasJoinedRoom.current = false
    }
  }, [roomId, username])

  useEffect(() => {
    if (!roomId) return

    const handleAvailableRooms = (rooms = []) => {
      if (isLeavingRoom.current) return

      const currentRoom = Array.isArray(rooms)
        ? rooms.find((room) => String(room.id) === String(roomId))
        : null

      const shouldUseAvailableRoomsAsFallback =
        currentRoom &&
        ['cooperative', 'cooperative_roles'].includes(currentRoom.game_mode) &&
        currentRoom.player_count === 1

      if (shouldUseAvailableRoomsAsFallback) {
        applyRoomState(currentRoom)
        return
      }

      socket.emit('getRoomState', { roomId: String(roomId) })
    }

    socket.on('availableRooms', handleAvailableRooms)

    return () => {
      socket.off('availableRooms', handleAvailableRooms)
    }
  }, [roomId, isEditingName, username, userProfile])

  useEffect(() => {
    if (!roomId) return

    const currentRoom = existingRooms.find(
      (room) => String(room.id) === String(roomId)
    )

    if (!currentRoom) return
    if (!['cooperative', 'cooperative_roles'].includes(currentRoom.game_mode)) return
    if (currentRoom.player_count !== 1) return

    const fallbackPlayers = Array.isArray(currentRoom.players) && currentRoom.players.length
      ? currentRoom.players
      : [username]
    const fallbackHost = currentRoom.host || fallbackPlayers[0] || username

    setSelectedMode(currentRoom.game_mode)
    setCommittedMode(currentRoom.game_mode)
    setRoomType('cooperative')
    setHostName(fallbackHost)
    setPlayers(
      fallbackPlayers.map((name, index) => ({
        id: index + 1,
        name,
        isHost: name === fallbackHost,
        avatar: resolveAvatar(name),
      }))
    )
  }, [existingRooms, roomId, username])

  // Update game mode (only host)
  useEffect(() => {
    if (!roomId) return;
    if (hostName !== username) return; // Only host can change
    if (!selectedMode) return;

    const timeoutId = setTimeout(async () => {
      try {
        const response = await apiFetch(`/api/rooms/${roomId}/mode`, {
          method: 'PATCH',
          ...authFetchOptions(),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: selectedMode,
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
    setSelectedMode(newMode)
  }

  const resolveAvatar = (name) => {
    if (name === username && userProfile?.avatar) return userProfile.avatar
    return defaultAvatar
  }

  const applyRoomState = (room) => {
    if (!room) return
    if (roomId && String(room.id) !== String(roomId)) return

    const avatars = room.player_avatars || {}
    const readyAgainPlayers =
      room.status !== 'started' && Array.isArray(room.ready_again) && room.ready_again.length
        ? room.ready_again
        : null
    const displayedPlayers = readyAgainPlayers || room.players || []
    const effectiveHost =
      displayedPlayers.includes(room.host) ? room.host : (displayedPlayers[0] || '')

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
    setHostName(effectiveHost)
    setPlayers(
      displayedPlayers.map((name, index) => ({
        id: index + 1,
        name,
        isHost: name === effectiveHost,
        avatar: avatars[name] || resolveAvatar(name),
      }))
    )
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
    /* v8 ignore next -- the edit form is only rendered after a room id exists. @preserve */
    if (!roomId) return

    const trimmedName = roomNameDraft.trim()
    if (!trimmedName || hostName !== username) {
      setRoomNameDraft(roomName)
      return
    }

    try {
      const response = await apiFetch(`/api/rooms/${roomId}/name`, {
        method: 'PATCH',
        ...authFetchOptions(),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
        }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        const message =
          response.status === 409
            ? text.roomActionErrors.used
            : getRoomActionErrorMessage(errorPayload?.error)
        setJoinError(message)
        if (response.status === 409) {
          onNotice?.(message)
        }
        return
      }

      const updatedRoom = await response.json()
      setJoinError('')
      setPreferredRoomName(updatedRoom.name)
      setRoomName(updatedRoom.name)
      setRoomNameDraft(updatedRoom.name)
      onRoomRenamed?.(updatedRoom.name, updatedRoom.game_mode)
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
    /* v8 ignore next -- the start button is disabled until a room id exists. @preserve */
    if (!roomId) return
    /* v8 ignore next -- the start button is disabled while multiplayer rooms wait for players. @preserve */
    if (!isSolo && players.length < 2) return
    /* v8 ignore next -- shared-board player count is enforced by the disabled start button. @preserve */
    if (sharedBoardModes.includes(selectedMode) && players.length !== 2) return
    /* v8 ignore next -- non-host users receive a disabled start button. @preserve */
    if (hostName && hostName !== username) return
    if (hasStartedGame.current) return // Prevent duplicate submissions

    try {
      hasStartedGame.current = true
      socket.emit('startGame', { roomId: String(roomId), username })
      onStartGame?.(roomId)
    } catch (err) {
      console.error('Failed to start game:', err)
      hasStartedGame.current = false
    }
  }

  const handleJoinPasswordSubmit = (event) => {
    event.preventDefault()
    if (isLeavingRoom.current) return
    if (!roomPassword.trim()) {
      setPasswordError(text.passwordRequired)
      return
    }

    setPasswordError('')
    socket.emit("joinRoom", { roomId: String(roomId), username, roomPassword }, (response) => {
      if (isLeavingRoom.current) return

      if (!response?.ok) {
        setNeedsRoomPassword(true)
        setPasswordError(
          response?.error === 'Invalid room password'
            ? text.invalidPassword
            : response?.error || text.joinFailed
        )
        return
      }

      setNeedsRoomPassword(false)
      setPasswordError('')
      setJoinError('')
      hasJoinedRoom.current = true
      socket.emit('getRoomState', { roomId: String(roomId) })
    })
  }

  const handleBack = async () => {
    isLeavingRoom.current = true
    setRoomId(null)
    onBack()
  }

  const visibleRoomPassword = (knownRoomPassword || roomPassword || initialRoomPassword).trim()

  /* ---------------- RENDER ---------------- */

  const roomHeader = (
    <div className="room-lobby-header">
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
              <button
                className="edit-button"
                onClick={handleEditClick}
                aria-label={text.editRoomName}
                title={text.editRoomName}
                type="button"
              >
              </button>
            )}
          </div>
        )}
      </div>
      {visibleRoomPassword && (
        <div className="room-password-display" aria-label={text.currentPassword}>
          <span className="room-password-display-label">{text.password}</span>
          <span className="room-password-display-value">{visibleRoomPassword}</span>
        </div>
      )}
    </div>
  )

  return (
    <div className={`create-room-shell ${theme === 'dark' ? 'dark' : ''}`}>
      {!needsRoomPassword && roomHeader}
      <div className={`create-room-card ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="create-room-form">
        {needsRoomPassword ? (
          <form className="room-password-challenge" onSubmit={handleJoinPasswordSubmit}>
            <label htmlFor="room-password">{text.roomPassword}</label>
            <div className="password-input-wrapper">
              <input
                id="room-password"
                type="text"
                value={roomPassword}
                onChange={(event) => {
                  setRoomPassword(event.target.value)
                  if (passwordError) setPasswordError('')
                }}
                className={`room-password-input password-input ${showRoomPassword ? '' : 'masked-password-input'}`}
                autoComplete="one-time-code"
                data-lpignore="true"
                data-1p-ignore="true"
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowRoomPassword((current) => !current)}
                aria-label={showRoomPassword ? text.hidePassword : text.showPassword}
              >
                {showRoomPassword ? '🙉' : '🙈'}
              </button>
            </div>
            {passwordError && <p className="room-password-error">{passwordError}</p>}
            <button className="start-button" type="submit">
              {text.joinRoom}
            </button>
            <button className="back-button" type="button" onClick={handleBack}>
              {text.back}
            </button>
          </form>
        ) : (
        <>

        {/* Game Mode */}
        <div className="form-group">
          <label>{text.gameMode}</label>
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
              >
                {m.label}
              </option>
            ))}
          </select>
          <p className="mode-description">{selectedModeDescription}</p>
        </div>

        {/* Players */}
        {!isSolo && (
          <div className="players-section">
            <h3>{text.players} ({players.length}/{availableGameModes.find(m => m.value === selectedMode)?.maxPlayers || 2})</h3>

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
                  {Array.from(text.waitingPlayers).map((char, i) => (
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
          🎮 {text.startGame}
        </button>

        <button className="back-button" onClick={handleBack}>
          ← {text.back}
        </button>

        </>
        )}
      </div>
    </div>
    </div>
  )
}

export default CreateRoom
