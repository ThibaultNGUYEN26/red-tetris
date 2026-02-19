import './Rooms.css'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../../socket'
import CreateRoom from '../CreateRoom/CreateRoom.jsx'
import Game from '../Game/Game.jsx'

const API_URL = import.meta.env.VITE_API_URL || ''

function Rooms({ theme, onBack, username, joinRoomName, userProfile }) {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showGame, setShowGame] = useState(false)
  const [currentRoomName, setCurrentRoomName] = useState(joinRoomName || null)
  const [currentRoomId, setCurrentRoomId] = useState(
    localStorage.getItem('currentRoomId')
  )

  const hasJoinedRef = useRef(false)

  /* ---------------- SOCKET: AVAILABLE ROOMS ---------------- */

  useEffect(() => {
    socket.emit('getAvailableRooms')

    const handleAvailableRooms = (data) => {
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
    joinRoom(foundRoom.id)
  }, [joinRoomName, rooms, username])

  /* ---------------- JOIN ROOM (SHARED) ---------------- */

  const joinRoom = async (roomId) => {
    try {
      // Join room via socket (DB + socket room)
      socket.emit('joinRoom', { roomId: String(roomId), username }, (res) => {
        if (!res?.ok) {
          console.error('Join failed:', res?.error || 'Failed to join room')
          hasJoinedRef.current = false
          return
        }

        console.log('[Rooms] Joined room', { roomId, username })

        // Sync room state (in case of late listeners)
        socket.emit('getRoomState', { roomId: String(roomId) })

        localStorage.setItem('currentRoomId', roomId)
        setCurrentRoomId(roomId)
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
  }, [])

  /* ---------------- STALE ROOM GUARD ---------------- */

  useEffect(() => {
    if (!currentRoomId) return

    const clearCurrentRoom = () => {
      localStorage.removeItem('currentRoomId')
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
      console.log('[Rooms] Game started', { roomId, username })
      setShowGame(true)
    }

    socket.on('gameStarted', handleGameStarted)
    return () => socket.off('gameStarted', handleGameStarted)
  }, [currentRoomId])

  /* ---------------- CREATE ROOM ---------------- */

  const handleCreateRoom = () => {
    console.log('[Rooms] Create room clicked', { username })
    setShowCreateRoom(true)
  }

  const handleRoomCreated = (roomId) => {
    console.log('[Rooms] Room created', { roomId, username })
    localStorage.setItem('currentRoomId', roomId)
    setCurrentRoomId(roomId)
  }

  /* ---------------- LEAVE ROOM ---------------- */

  const handleLeaveRoom = async () => {
    const roomId = localStorage.getItem('currentRoomId')

    if (roomId) {
      try {
        socket.emit('leaveRoom', { roomId: String(roomId), username }, (res) => {
          if (!res?.ok) {
            console.error('Failed to leave room:', res?.error || 'Unknown error')
            return
          }
          console.log('[Rooms] Left room', { roomId, username })
          socket.emit('getAvailableRooms')
        })
      } catch (err) {
        console.error('Failed to leave room:', err)
      }
    }

    localStorage.removeItem('currentRoomId')
    setCurrentRoomId(null)
    setShowCreateRoom(false)
    setShowGame(false)
    hasJoinedRef.current = false
  }

  const handleExitGame = async () => {
    console.log('[Rooms] Exiting game', { roomId: currentRoomId, username })
    await handleLeaveRoom()
  }

  const handlePlayAgain = () => {
    if (!currentRoomId) return
    socket.emit('playAgain', { roomId: String(currentRoomId), username })
    setShowGame(false)
  }

  const handleSpectate = () => {
    if (!currentRoomName) return
    setShowGame(false)
    navigate(`/${currentRoomName}/spectate`)
  }

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
        onSpectate={handleSpectate}
        roomId={currentRoomId}
        username={username}
        isMultiplayer={true}
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
        onBack={handleLeaveRoom}
        onRoomCreated={handleRoomCreated}
      />
    )
  }

  /* ---------------- ROOMS LIST ---------------- */

  return (
    <div className={`rooms-card ${theme === 'dark' ? 'dark' : ''}`}>
      <h2>Multiplayer Rooms</h2>

      <button className="create-room-button" onClick={handleCreateRoom}>
        ➕ Create Room
      </button>

      <div className="rooms-list">
        <h3>Available Rooms</h3>

        {rooms.length === 0 ? (
          <p className="no-rooms">No rooms available. Create one!</p>
        ) : (
          rooms.map((room, index) => {
            const isInRoom = room.players?.includes(username)

            return (
              <div key={`room-${room.id ?? index}`} className="room-entry">
                <div className="room-info">
                  <span className="room-name">{room.name}</span>
                  <span className="room-host">Host: {room.host}</span>
                </div>

                <div className="room-players">
                  <span className="player-count">
                    {room.player_count}/{room.maxPlayers || 6}
                  </span>
                </div>

                <button
                  className="join-button"
                  disabled={room.player_count >= 6 || isInRoom}
                  onClick={() => joinRoom(room.id)}
                >
                  {isInRoom ? 'Joined' : room.player_count >= 6 ? 'Full' : 'Join'}
                </button>
              </div>
            )
          })
        )}
      </div>

      <button className="back-button" onClick={handleBackToMenu}>
        ← Back
      </button>
    </div>
  )
}

export default Rooms
