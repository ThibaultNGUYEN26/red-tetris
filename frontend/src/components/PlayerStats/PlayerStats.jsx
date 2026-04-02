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

function PlayerStats({ theme, userProfile, username }) {
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const profileName = userProfile?.username || username
    const profileAvatar = userProfile?.avatar

    if (userProfile && (userProfile.soloGames != null || userProfile.solo_games_played != null)) {
      const soloGames =
        userProfile.soloGames ?? userProfile.solo_games_played ?? DEFAULT_STATS.soloGames
      const soloTopScore =
        userProfile.soloTopScore ?? userProfile.highest_solo_score ?? DEFAULT_STATS.soloTopScore

      setStats({
        ...DEFAULT_STATS,
        name: profileName || DEFAULT_STATS.name,
        avatar: profileAvatar || DEFAULT_STATS.avatar,
        soloGames,
        soloTopScore,
      })
      setLoading(false)
      return
    }

    const fetchStats = async () => {
      if (!profileName) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(
          `${API_URL}/api/player/stats?username=${encodeURIComponent(profileName)}`,
          {
          credentials: 'include',
          }
        )
        const data = await res.json()
        setStats({
          ...DEFAULT_STATS,
          ...data,
          name: data?.name || profileName || DEFAULT_STATS.name,
          avatar: data?.avatar || profileAvatar || DEFAULT_STATS.avatar,
        })
      } catch (err) {
        console.error('Failed to fetch player stats', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userProfile, username])

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
