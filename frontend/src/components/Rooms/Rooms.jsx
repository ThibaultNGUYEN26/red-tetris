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
      const response = await fetch(`${API_URL}/api/rooms/available`)
      const data = await response.json()
      setRooms(data)
      // Log after state update (async, so use effect below for actual state)
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

  const handleCreateRoom = () => {
    setShowCreateRoom(true)
  }

  /* ---------------- JOIN ROOM ---------------- */

  const handleJoinRoom = async (roomId) => {
    try {
      const response = await fetch(`${API_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, username }),
      })

      if (!response.ok) throw new Error('Join failed')

      await response.json()

      localStorage.setItem('currentRoomId', roomId)
      setCurrentRoomId(roomId)
    } catch (error) {
      console.error('Failed to join room:', error.message)
    }
  }

  /* ---------------- LEAVE ROOM ---------------- */

  const handleLeaveRoom = async () => {
    const roomId = localStorage.getItem('currentRoomId')

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
        roomId={currentRoomId}
        existingRooms={rooms}
        onBack={handleLeaveRoom}
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
            const isInRoom =
              room.players &&
              Array.isArray(room.players) &&
              room.players.includes(username)

            return (
              <div key={room.id} className="room-entry">
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
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={
                    room.player_count >= (room.maxPlayers || 6) || isInRoom
                  }
                >
                  {room.player_count >= (room.maxPlayers || 6)
                    ? 'Full'
                    : isInRoom
                    ? 'Joined'
                    : 'Join'}
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
