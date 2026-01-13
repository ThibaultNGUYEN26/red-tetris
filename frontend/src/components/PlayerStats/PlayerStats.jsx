import './PlayerStats.css'
import { useEffect, useState } from 'react'
import FaceAvatar from '../FaceAvatar/FaceAvatar'

const API_URL = import.meta.env.VITE_API_URL || ''

const DEFAULT_STATS = {
  name: 'Player',
  avatar: {
    skinColor: '#cccccc',
    eyeType: 'normal',
    mouthType: 'neutral',
  },
  soloGames: 0,
  soloTopScore: 0,
  multiGames: 0,
  wins: 0,
  losses: 0,
}

function PlayerStats({ theme }) {
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/player/stats`, {
          credentials: 'include',
        })
        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch player stats', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className={`player-stats ${theme === 'dark' ? 'dark' : ''}`}>
        <p className="loading">Loading stats…</p>
      </div>
    )
  }

  if (!stats) return null

  const ratio =
    stats.wins + stats.losses > 0
      ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
      : '0'

  return (
    <div className={`player-stats ${theme === 'dark' ? 'dark' : ''}`}>
      <h3 className="player-stats-title">🎮 PLAYER STATS</h3>

      <div className="player-header">
        <FaceAvatar faceConfig={stats.avatar} size="medium" />
        <span className="player-name">{stats.name}</span>
      </div>

      <div className="stats-grid">
        <Stat label="Solo Games " value={stats.soloGames} />
        <Stat label="Highest Solo Score " value={stats.soloTopScore.toLocaleString()} />
        <Stat label="Multiplayer Games " value={stats.multiGames} />
        <Stat label="Multiplayer Wins " value={stats.wins} />
        <Stat label="Multiplayer Losses " value={stats.losses} />
        <Stat label="Multiplayer Winrate " value={`${ratio}%`} highlight />
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div className={`stat-item ${highlight ? 'highlight' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

export default PlayerStats
