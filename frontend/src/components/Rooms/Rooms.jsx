import './Rooms.css'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../../socket'
import CreateRoom from '../CreateRoom/CreateRoom.jsx'
import Game from '../Game/Game.jsx'
import { logDuration, markStart, perfLog } from '../../perf'
import { DEFAULT_LANGUAGE, getTranslation } from '../../i18n'

function Rooms({ theme, onBack, onLeaveRoom, onRoomCreated, onNotice, username, joinRoomName, userProfile, soundEnabled, onSoundChange, language = DEFAULT_LANGUAGE }) {
  const text = getTranslation(language).rooms
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showCreateRoomPicker, setShowCreateRoomPicker] = useState(false)
  const [createRoomType, setCreateRoomType] = useState('multiplayer')
  const [showGame, setShowGame] = useState(false)
  const [currentRoomName, setCurrentRoomName] = useState(joinRoomName || null)
  const [currentRoomId, setCurrentRoomId] = useState(null)
  const [pendingPlayAgain, setPendingPlayAgain] = useState(false)
  const [createRoomPassword, setCreateRoomPassword] = useState('')
  const [currentRoomPassword, setCurrentRoomPassword] = useState('')
  const [joinRoomPasswords, setJoinRoomPasswords] = useState({})
  const [activePasswordRoomId, setActivePasswordRoomId] = useState(null)
  const [showJoinRoomPasswords, setShowJoinRoomPasswords] = useState({})

  const hasJoinedRef = useRef(false)
  const roomsRequestStartRef = useRef(null)
  const joinPasswordInputRefs = useRef({})

  const buildRoomPath = (roomName, gameMode) => {
    if (!roomName) return '/'
    const roomType = ['cooperative', 'cooperative_roles'].includes(gameMode)
      ? 'coop'
      : 'multi'
    return `/${roomName}/${roomType}/${username}`
  }

  const getRoomMaxPlayers = (room) => {
    const gameMode = room?.game_mode || 'classic'
    return ['cooperative', 'cooperative_roles'].includes(gameMode) ? 2 : 8
  }

  /* ---------------- SOCKET: AVAILABLE ROOMS ---------------- */

  useEffect(() => {
    roomsRequestStartRef.current = markStart()
    perfLog('rooms:getAvailableRooms:emit')
    socket.emit('getAvailableRooms')

    const handleAvailableRooms = (data) => {
      if (roomsRequestStartRef.current != null) {
        logDuration('rooms:availableRooms', roomsRequestStartRef.current, {
          count: Array.isArray(data) ? data.length : 0,
        })
        roomsRequestStartRef.current = null
      }
      setRooms(data)
    }

    socket.on('availableRooms', handleAvailableRooms)

    return () => {
      socket.off('availableRooms', handleAvailableRooms)
    }
  }, [])

  /* ---------------- AUTO JOIN VIA URL ---------------- */

  useEffect(() => {
    if (!joinRoomName || !username) return
    if (!rooms.length) return
    if (hasJoinedRef.current) return

    const foundRoom = rooms.find((r) => r.name === joinRoomName)
    if (!foundRoom) return

    hasJoinedRef.current = true
    joinRoom(foundRoom.id, foundRoom)
  }, [joinRoomName, rooms, username])

  useEffect(() => {
    if (!activePasswordRoomId) return
    joinPasswordInputRefs.current[activePasswordRoomId]?.focus()
  }, [activePasswordRoomId])

  /* ---------------- JOIN ROOM (SHARED) ---------------- */

  const joinRoom = async (roomId, roomInfo) => {
    try {
      const roomKey = String(roomId)
      const requiresPassword = roomInfo?.has_password && !roomInfo?.players?.includes(username)
      if (requiresPassword && activePasswordRoomId !== roomKey) {
        setActivePasswordRoomId(roomKey)
        return
      }

      const roomPassword = requiresPassword ? (joinRoomPasswords[roomKey] || '') : ''
      if (requiresPassword && !roomPassword.trim()) {
        onNotice?.(text.passwordRequired)
        return
      }

      // Join room via socket (DB + socket room)
      const joinStart = markStart()
      socket.emit('joinRoom', { roomId: roomKey, username, roomPassword }, (res) => {
        logDuration('rooms:joinRoomAck', joinStart, {
          ok: Boolean(res?.ok),
          roomId: roomKey,
        })
        if (!res?.ok) {
          console.error('Join failed:', res?.error || 'Failed to join room')
          if (res?.error === 'Invalid room password') {
            onNotice?.(text.invalidPassword)
          }
          hasJoinedRef.current = false
          return
        }

        // Sync room state (in case of late listeners)
        socket.emit('getRoomState', { roomId: roomKey })
        setCurrentRoomId(roomId)
        setActivePasswordRoomId(null)
        setCurrentRoomPassword(roomPassword)
        setJoinRoomPasswords((current) => ({ ...current, [roomKey]: '' }))
        if (roomInfo?.name) {
          setCurrentRoomName(roomInfo.name)
          navigate(buildRoomPath(roomInfo.name, roomInfo.game_mode), { replace: true })
        }
      })

    } catch (err) {
      console.error('Join failed:', err)
      hasJoinedRef.current = false
    }
  }

  /* ---------------- ROOM STATE UPDATES ---------------- */

  useEffect(() => {
    const handleRoomState = (room) => {
      if (String(room.id) === String(currentRoomId)) {
        setCurrentRoomName(room.name)
        if (pendingPlayAgain && Array.isArray(room.ready_again) && room.ready_again.includes(username)) {
          setPendingPlayAgain(false)
          setShowGame(false)
        }
      }
      setRooms((prev) => {
        const exists = prev.find((r) => r.id === room.id)
        if (exists) {
          return prev.map((r) => (r.id === room.id ? room : r))
        }
        return [...prev, room]
      })
    }

    socket.on('roomState', handleRoomState)
    return () => socket.off('roomState', handleRoomState)
  }, [currentRoomId, pendingPlayAgain, username])

  /* ---------------- STALE ROOM GUARD ---------------- */

  useEffect(() => {
    if (!currentRoomId) return

    const clearCurrentRoom = () => {
      setCurrentRoomId(null)
      setShowCreateRoom(false)
    }

    const handleRoomState = (room) => {
      if (String(room.id) === String(currentRoomId)) {
        clearTimeout(timeoutId)
      }
    }

    const handleSocketError = (err) => {
      if (err?.message === 'Room not found') {
        clearCurrentRoom()
      }
    }

    socket.on('roomState', handleRoomState)
    socket.on('error', handleSocketError)
    socket.emit('getRoomState', { roomId: String(currentRoomId) })

    const timeoutId = setTimeout(() => {
      clearCurrentRoom()
    }, 1500)

    return () => {
      clearTimeout(timeoutId)
      socket.off('roomState', handleRoomState)
      socket.off('error', handleSocketError)
    }
  }, [currentRoomId])

  /* ---------------- GAME START ---------------- */

  useEffect(() => {
    const handleGameStarted = ({ roomId }) => {
      if (!roomId) return
      if (String(roomId) !== String(currentRoomId)) return
      setShowGame(true)
    }

    socket.on('gameStarted', handleGameStarted)
    return () => socket.off('gameStarted', handleGameStarted)
  }, [currentRoomId])

  /* ---------------- CREATE ROOM ---------------- */

  const handleCreateRoom = () => {
    setShowCreateRoomPicker(true)
    setCreateRoomPassword('')
  }

  const handleChooseRoomType = (type) => {
    setCreateRoomType(type)
    setShowCreateRoomPicker(false)
    setShowCreateRoom(true)
  }

  const handleRoomCreated = (roomId, roomName, roomType) => {
    setCurrentRoomId(roomId)
    setCurrentRoomName(roomName)
    setCurrentRoomPassword(createRoomPassword.trim())
    navigate(
      buildRoomPath(
        roomName,
        roomType === 'cooperative' ? 'cooperative' : 'classic'
      ),
      { replace: true }
    )
    onRoomCreated?.(roomId, roomName, roomType)
  }

  const handleRoomRenamed = (roomName, gameMode) => {
    setCurrentRoomName(roomName)
    setRooms((prev) => prev.map((room) => (
      String(room.id) === String(currentRoomId)
        ? { ...room, name: roomName, game_mode: gameMode || room.game_mode }
        : room
    )))
    navigate(buildRoomPath(roomName, gameMode), { replace: true })
  }

  /* ---------------- LEAVE (LOBBY / IN-GAME) ---------------- */

  const handleLeave = async () => {
    if (!currentRoomId) {
      setCurrentRoomId(null);
      setCurrentRoomPassword('');
      setCreateRoomPassword('');
      setShowCreateRoom(false);
      setShowCreateRoomPicker(false);
      setShowGame(false);
      hasJoinedRef.current = false;
      return;
    }

    try {
      await new Promise((resolve) => {
        socket.emit("playerLeave", { roomId: String(currentRoomId), username }, () => {
          resolve();
        });
      });

      socket.emit("getAvailableRooms");
    }
    catch (err) {
      console.error("Failed to leave room/game:", err);
    }
    finally {
      setCurrentRoomId(null);
      setCurrentRoomPassword('');
      setCreateRoomPassword('');
      setShowCreateRoom(false);
      setShowCreateRoomPicker(false);
      setShowGame(false);
      hasJoinedRef.current = false;
    }
  };

  const handleExitLobby = async () => {
    await handleLeave();
    onLeaveRoom?.();
  };

  const handleExitGame = async () => {
    await handleLeave();
    onLeaveRoom?.();
  };

  const handlePlayAgain = () => {
    /* v8 ignore next -- the Game view is only rendered while currentRoomId is set. @preserve */
    if (!currentRoomId) return;
    setPendingPlayAgain(true);
    socket.emit('playAgain', { roomId: String(currentRoomId), username });
  };

  const handleBackToMenu = () => {
    onBack()
  }

  /* ---------------- ROOM LOBBY ---------------- */

  if (showGame && currentRoomId) {
    return (
      <Game
        theme={theme}
        onBack={handleExitGame}
        onPlayAgain={handlePlayAgain}
        roomId={currentRoomId}
        username={username}
        isMultiplayer={true}
        soundEnabled={soundEnabled}
        onSoundChange={onSoundChange}
        language={language}
      />
    )
  }

  if (showCreateRoom || currentRoomId) {
    return (
      <CreateRoom
        theme={theme}
        username={username}
        userProfile={userProfile}
        existingRooms={rooms}
        roomId={currentRoomId}
        mode={showCreateRoom ? 'create' : 'join'}
        roomType={createRoomType}
        initialRoomPassword={showCreateRoom ? createRoomPassword : currentRoomPassword}
        knownRoomPassword={currentRoomPassword}
        onBack={handleExitLobby}
        onRoomCreated={handleRoomCreated}
        onRoomRenamed={handleRoomRenamed}
        onNotice={onNotice}
        language={language}
      />
    )
  }

  /* ---------------- ROOMS LIST ---------------- */

  return (
    <div className={`rooms-card ${theme === 'dark' ? 'dark' : ''}`}>
      <h2>{text.title}</h2>

      {!showCreateRoomPicker ? (
        <button className="create-room-button" onClick={handleCreateRoom}>
          ➕ {text.createRoom}
        </button>
      ) : (
        <div className="create-room-choice">
          <p className="create-room-choice-title">{text.chooseRoomType}</p>
          <div className="create-room-choice-buttons">
            <button
              className="choice-button"
              onClick={() => handleChooseRoomType('cooperative')}
            >
              {text.cooperative}
            </button>
            <button
              className="choice-button"
              onClick={() => handleChooseRoomType('multiplayer')}
            >
              {text.multiplayer}
            </button>
          </div>
          <label className="room-password-option">
            {text.optionalPassword}
            <input
              type="text"
              value={createRoomPassword}
              onChange={(event) => setCreateRoomPassword(event.target.value)}
              maxLength={64}
              placeholder={text.publicRoomPlaceholder}
              autoComplete="off"
            />
          </label>
        </div>
      )}

      <div className="rooms-list">
        <h3>{text.availableRooms}</h3>

        {rooms.length === 0 ? (
          <p className="no-rooms">{text.emptyRooms}</p>
        ) : (
          rooms.map((room, index) => {
            const isInRoom = room.players?.includes(username)
            const roomKey = String(room.id)
            const showJoinPassword = Boolean(showJoinRoomPasswords[roomKey])
            const isFull = room.player_count >= (room.maxPlayers || getRoomMaxPlayers(room))
            const canEnterPassword = room.has_password && !isInRoom && !isFull
            const isEnteringPassword = activePasswordRoomId === roomKey

            return (
              <div key={`room-${room.id ?? index}`} className="room-entry">
                <div className="room-info">
                  <span className="room-name">{room.name}</span>
                  {room.has_password && <span className="room-lock">{text.password}</span>}
                  <span className="room-host">{text.host}: {room.host}</span>
                  {canEnterPassword && isEnteringPassword && (
                    <div className="room-join-password">
                      <div className="password-input-wrapper">
                        <input
                          ref={(element) => {
                            if (element) {
                              joinPasswordInputRefs.current[roomKey] = element
                            } else {
                              delete joinPasswordInputRefs.current[roomKey]
                            }
                          }}
                          type="text"
                          value={joinRoomPasswords[roomKey] || ''}
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setJoinRoomPasswords((current) => ({
                              ...current,
                              [roomKey]: nextValue,
                            }))
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              joinRoom(room.id, room)
                            }
                          }}
                          maxLength={64}
                          placeholder={text.roomPasswordPlaceholder}
                          className={`password-input ${showJoinPassword ? '' : 'masked-password-input'}`}
                          autoComplete="one-time-code"
                          data-lpignore="true"
                          data-1p-ignore="true"
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowJoinRoomPasswords((current) => ({
                            ...current,
                            [roomKey]: !current[roomKey],
                          }))}
                          aria-label={showJoinPassword ? text.hidePassword : text.showPassword}
                        >
                          {showJoinPassword ? '🙉' : '🙈'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="room-players">
                  <span className="player-count">
                    {room.player_count}/{room.maxPlayers || getRoomMaxPlayers(room)}
                  </span>
                </div>

                <button
                  className="join-button"
                    disabled={isFull || isInRoom}
                  onClick={() => joinRoom(room.id, room)}
                >
                    {isInRoom ? text.joined : isFull ? text.full : isEnteringPassword ? text.enter : text.join}
                </button>
              </div>
            )
          })
        )}
      </div>

      <button className="back-button" onClick={handleBackToMenu}>
        ← {text.back}
      </button>
    </div>
  )
}

export default Rooms
