import './index.css'
import './components/GameOver/GameOver.css'
import { useEffect, useRef, useState } from 'react'
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

const unregisterUser = (username) => new Promise((resolve) => {
  socket.emit('unregisterUser', { username }, () => resolve())
})

export const leaveSpectator = (roomId, username) => new Promise((resolve) => {
  if (!roomId || !username) {
    resolve()
    return
  }

  let settled = false
  const finish = () => {
    if (settled) return
    settled = true
    clearTimeout(timeoutId)
    resolve()
  }
  const timeoutId = setTimeout(finish, 500)
  socket.emit('playerLeave', { roomId: String(roomId), username }, finish)
})

function Spectate() {
  const { roomName, roomType, username } = useParams()
  const navigate = useNavigate()
  const spectatorUsername = username || getSavedUsername()
  const joinedSpectatorRef = useRef(false)
  const [error, setError] = useState('')
  const [roomId, setRoomId] = useState(null)
  const [players, setPlayers] = useState([])
  const [winner, setWinner] = useState(null)
  const [isGameOver, setIsGameOver] = useState(false)
  const [loading, setLoading] = useState(true)
  const [theme] = useState(() => (
    localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  ))

  const handlePlayAgain = async () => {
    const roomPath = roomType
      ? `/${roomName}/${roomType}/${spectatorUsername}`
      : `/${roomName}/${spectatorUsername}`
    if (joinedSpectatorRef.current) {
      joinedSpectatorRef.current = false
      await leaveSpectator(roomId, spectatorUsername)
    }
    navigate(roomPath)
  }

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
    const handleGameOver = (payload = {}) => {
      setWinner(payload?.winner || null)
      setIsGameOver(true)
    }

    let cancelled = false

    socket.on('gameState', handleGameState)
    socket.on('gameOver', handleGameOver)

    const joinSpectator = async () => {
      await unregisterUser(spectatorUsername)
      if (cancelled) return

      socket.emit('joinSpectator', { roomId: String(roomId), username: spectatorUsername }, (res) => {
        if (cancelled) return
        if (!res?.ok) {
          joinedSpectatorRef.current = false
          setError(res?.error || 'Spectator not allowed')
          setLoading(false)
          return
        }
        joinedSpectatorRef.current = true
        setLoading(false)
        socket.emit('getRoomState', { roomId: String(roomId) })
      })
    }

    joinSpectator()

    return () => {
      cancelled = true
      if (joinedSpectatorRef.current) {
        socket.emit('playerLeave', { roomId: String(roomId), username: spectatorUsername })
        joinedSpectatorRef.current = false
      }
      socket.off('gameState', handleGameState)
      socket.off('gameOver', handleGameOver)
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
            {isGameOver && (
              <div className="game-over-overlay" role="dialog" aria-modal="true">
                <div className="game-over-card">
                  <h3>Game Over</h3>
                  <p className="game-over-winner">
                    {winner ? `Winner: ${winner}` : 'No winner'}
                  </p>
                  <div className="game-over-actions">
                    <div className="game-over-primary-actions">
                      <button className="resume-button" onClick={handlePlayAgain}>
                        Play again
                      </button>
                    </div>
                    <button className="back-button" onClick={() => navigate('/')}>
                      Back to menu
                    </button>
                  </div>
                </div>
              </div>
            )}
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
