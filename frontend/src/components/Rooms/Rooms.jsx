import './Rooms.css'
import { useState, useEffect } from 'react'
import CreateRoom from '../CreateRoom/CreateRoom.jsx'

const API_URL = import.meta.env.VITE_API_URL || ''

function Rooms({ theme, onBack, username }) {
  const [rooms, setRooms] = useState([])
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState(
    localStorage.getItem('currentRoomId')
  )

  /* ---------------- FETCH ROOMS ---------------- */

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rooms/available`)
      const data = await res.json()
      setRooms(data)
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
    }
  }

  useEffect(() => {
    fetchRooms()
    const interval = setInterval(fetchRooms, 2000)
    return () => clearInterval(interval)
  }, [])

  /* ---------------- CREATE ROOM ---------------- */

  const handleCreateRoom = async () => {
    await fetchRooms()
    setShowCreateRoom(true)
  }

  const handleRoomCreated = async (roomId) => {
    localStorage.setItem('currentRoomId', roomId)
    setCurrentRoomId(roomId)
    await fetchRooms() // ✅ NOW IT EXISTS
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
      await fetchRooms()
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
