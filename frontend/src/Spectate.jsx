import './index.css'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { socket } from './socket'
import SpectatorView from './components/SpectatorView/SpectatorView.jsx'

const API_URL = import.meta.env.VITE_API_URL || ''

function Spectate() {
  const { roomName } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [roomId, setRoomId] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme] = useState(localStorage.getItem('theme') || 'light')

  const username = localStorage.getItem('username')

  useEffect(() => {
    if (!roomName) return
    if (!username) {
      setError('Set a profile before spectating.')
      setLoading(false)
      return
    }

    const fetchRoom = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rooms/by-name/${encodeURIComponent(roomName)}`)
        if (!res.ok) throw new Error('Room not found')
        const room = await res.json()
        setRoomId(room.id)
      } catch (err) {
        setError('Room not found')
        setLoading(false)
      }
    }

    fetchRoom()
  }, [roomName, username])

  useEffect(() => {
    if (!roomId || !username) return

    socket.emit('joinSpectator', { roomId: String(roomId), username }, (res) => {
      if (!res?.ok) {
        setError(res?.error || 'Spectator not allowed')
        setLoading(false)
        return
      }
      setLoading(false)
      socket.emit('getRoomState', { roomId: String(roomId) })
    })

    const handleGameState = (state) => {
      setPlayers(state?.players || [])
    }

    socket.on('gameState', handleGameState)
    return () => {
      socket.off('gameState', handleGameState)
    }
  }, [roomId, username])

  if (loading) {
    return (
      <div className="content-wrapper">
        <p>Loading spectator view…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="content-wrapper">
        <p>{error}</p>
        <button className="back-button" onClick={() => navigate('/')}>Back</button>
      </div>
    )
  }

  return (
    <div className="content-wrapper">
      <div className={`game-screen ${theme === 'dark' ? 'dark' : ''}`}>
        <SpectatorView players={players} onBack={() => navigate('/')} />
      </div>
    </div>
  )
}

export default Spectate
