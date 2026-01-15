import './Rooms.css'
import { useState, useEffect } from 'react'
import { socket } from '../../socket'
import CreateRoom from '../CreateRoom/CreateRoom.jsx'

const API_URL = import.meta.env.VITE_API_URL || ''

function Rooms({ theme, onBack, username }) {
  const [rooms, setRooms] = useState([])
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState(
    localStorage.getItem('currentRoomId')
  )

  /* ---------------- FETCH ROOMS ---------------- */

  // --- SOCKET.IO ROOMS FETCH ---
  useEffect(() => {
    // Request available rooms on mount
    socket.emit('getAvailableRooms')

    // Listen for availableRooms event
    const handleAvailableRooms = (data) => {
      setRooms(data)
    }
    socket.on('availableRooms', handleAvailableRooms)

    // Optionally poll every 2s for updates
    const interval = setInterval(() => {
      socket.emit('getAvailableRooms')
    }, 2000)

    return () => {
      socket.off('availableRooms', handleAvailableRooms)
      clearInterval(interval)
    }
  }, [])

  /* ---------------- CREATE ROOM ---------------- */

  const handleCreateRoom = () => {
    // No fetchRooms, just show the create room UI
    setShowCreateRoom(true)
  }

  const handleRoomCreated = async (roomId) => {
    localStorage.setItem('currentRoomId', roomId)
    setCurrentRoomId(roomId)
  }

  /* ---------------- JOIN ROOM ---------------- */

  const handleJoinRoom = async (roomId) => {
    try {
      await fetch(`${API_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, username }),
      })

      localStorage.setItem('currentRoomId', roomId)
      setCurrentRoomId(roomId)
    } catch (err) {
      console.error('Join failed:', err)
    }
  }

  /* ---------------- LEAVE ROOM ---------------- */

  const handleLeaveRoom = async () => {
    const roomId = localStorage.getItem('currentRoomId')

    if (roomId) {
      await fetch(`${API_URL}/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, username }),
      })
    }

    localStorage.removeItem('currentRoomId')
    setCurrentRoomId(null)
    setShowCreateRoom(false)
    onBack()
  }

  /* ---------------- ROOM LOBBY ---------------- */

  if (showCreateRoom || currentRoomId) {
    return (
      <CreateRoom
        theme={theme}
        username={username}
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
          rooms.map((room) => {
            const isInRoom = room.players?.includes(username)

            return (
              <div key={room.id} className="room-entry">
                <div className="room-info">
                  <span className="room-name">{room.name}</span>
                  <span className="room-host">Host: {room.host}</span>
                </div>

                <div className="room-players">
                  {room.player_count}/{room.maxPlayers || 6}
                </div>

                <button
                  className="join-button"
                  disabled={room.player_count >= 6 || isInRoom}
                  onClick={() => handleJoinRoom(room.id)}
                >
                  {isInRoom ? 'Joined' : room.player_count >= 6 ? 'Full' : 'Join'}
                </button>
              </div>
            )
          })
        )}
      </div>

      <button className="back-button" onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}

export default Rooms
