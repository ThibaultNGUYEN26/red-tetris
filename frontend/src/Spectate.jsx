import './index.css'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { socket } from './socket'
import { apiFetch } from './api'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import SpectatorView from './components/SpectatorView/SpectatorView.jsx'

const THEME_STORAGE_KEY = 'red-tetris-theme'
const AUTH_STORAGE_KEY = 'red-tetris-auth-user'

const getSavedUsername = () => {
  try {
    const savedAuth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
    return typeof savedAuth?.username === 'string' ? savedAuth.username.trim() : ''
  } catch {
    return ''
  }
}

function Spectate() {
  const { roomName, username } = useParams()
  const navigate = useNavigate()
  const spectatorUsername = username || getSavedUsername()
  const [error, setError] = useState('')
  const [roomId, setRoomId] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme] = useState(() => (
    localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  ))

  useEffect(() => {
    if (!roomName) return
    if (!spectatorUsername) {
      setError('Missing username in spectator URL.')
      setLoading(false)
      return
    }

    const fetchRoom = async () => {
      try {
        const res = await apiFetch(`/api/rooms/by-name/${encodeURIComponent(roomName)}`)
        if (!res.ok) throw new Error('Room not found')
        const room = await res.json()
        setRoomId(room.id)
      } catch {
        setError('Room not found')
        setLoading(false)
      }
    }

    fetchRoom()
  }, [roomName, spectatorUsername])

  useEffect(() => {
    if (!roomId || !spectatorUsername) return

    const handleGameState = (state) => {
      setPlayers(state?.players || [])
    }

    socket.on('gameState', handleGameState)
    socket.emit('joinSpectator', { roomId: String(roomId), username: spectatorUsername }, (res) => {
      if (!res?.ok) {
        setError(res?.error || 'Spectator not allowed')
        setLoading(false)
        return
      }
      setLoading(false)
      socket.emit('getRoomState', { roomId: String(roomId) })
    })

    return () => {
      socket.off('gameState', handleGameState)
    }
  }, [roomId, spectatorUsername])

  if (loading) {
    return (
      <>
        <div className={`sky-background ${theme === 'dark' ? 'dark' : ''}`}>
          {theme === 'dark' && <div className="stars" />}
          <TetriminosClouds />
        </div>
        <div className="content-wrapper">
          <div className={`game-screen ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="game-card spectator-empty">
              <p>Loading spectator view…</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <div className={`sky-background ${theme === 'dark' ? 'dark' : ''}`}>
          {theme === 'dark' && <div className="stars" />}
          <TetriminosClouds />
        </div>
        <div className="content-wrapper">
          <div className={`game-screen ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="game-card spectator-empty">
              <p>{error}</p>
              <button className="back-button" onClick={() => navigate('/')}>Back</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className={`sky-background ${theme === 'dark' ? 'dark' : ''}`}>
        {theme === 'dark' && <div className="stars" />}
        <TetriminosClouds />
      </div>
      <div className="content-wrapper">
        <div className={`game-screen ${theme === 'dark' ? 'dark' : ''}`}>
          <div className="game-card">
            <SpectatorView
              players={players}
              onBack={() => navigate('/')}
              username={spectatorUsername}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default Spectate
