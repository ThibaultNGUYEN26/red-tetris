import './Rooms.css'
import { useState } from 'react'
import CreateRoom from '../CreateRoom/CreateRoom.jsx'

const API_URL = import.meta.env.VITE_API_URL || ''

function Rooms({ theme, onBack, username }) {
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [rooms, setRooms] = useState([])

  const handleCreateRoom = () => {
    console.log('Create room clicked')
    setShowCreateRoom(true)
  }

  const handleBackFromCreate = () => {
    setShowCreateRoom(false)
  }

  const handleJoinRoom = async (roomId) => {
    const joinData = {
      roomId,
      username
    }

    console.log('Joining room:', JSON.stringify(joinData, null, 2))

    try {
      const response = await fetch(`${API_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(joinData),
      })

      console.log('Joined room successfully')
      console.log('Response status:', response.status)

      const data = await response.json()
      console.log('Backend response:', JSON.stringify(data, null, 2))

      // TODO: Navigate to room view or handle successful join

    } catch (error) {
      console.error('Failed to join room on backend:', error.message)
      console.log('This is expected since backend is not running yet')
    }
  }

  if (showCreateRoom) {
    return <CreateRoom theme={theme} onBack={handleBackFromCreate} existingRooms={rooms} username={username} />
  }

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
          rooms.map((room) => (
            <div key={room.id} className="room-entry">
              <div className="room-info">
                <span className="room-name">{room.name}</span>
                <span className="room-host">Host: {room.host}</span>
              </div>
              <div className="room-players">
                <span className="player-count">
                  {room.players}/{room.maxPlayers}
                </span>
              </div>
              <button
                className="join-button"
                onClick={() => handleJoinRoom(room.id)}
                disabled={room.players >= room.maxPlayers}
              >
                {room.players >= room.maxPlayers ? 'Full' : 'Join'}
              </button>
            </div>
          ))
        )}
      </div>

      <button className="back-button" onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}

export default Rooms
