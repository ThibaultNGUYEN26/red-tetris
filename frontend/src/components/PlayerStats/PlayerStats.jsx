import './PlayerStats.css'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import FaceAvatar from '../FaceAvatar/FaceAvatar'

const DEFAULT_ADVANCED = {
  timePlayed: {
    total: 0,
    solo: 0,
    multi: 0,
    coop: 0,
  },
  solo: {
    games: 0,
    highestScore: 0,
    averageScore: 0,
    highestLevel: 1,
    highestLines: 0,
    totalLines: 0,
    highestTetris: 0,
    totalTetris: 0,
  },
  multi: {
    games: 0,
    wins: 0,
    losses: 0,
    winLossRatio: 0,
    highestScore: 0,
    averageScore: 0,
    highestLevel: 1,
    highestLines: 0,
    totalLines: 0,
    highestLinesSent: 0,
    totalLinesSent: 0,
    highestTetris: 0,
    totalTetris: 0,
  },
  coop: {
    games: 0,
    highestScore: 0,
    highestLevel: 1,
    highestLines: 0,
    totalLines: 0,
    highestTetris: 0,
    totalTetris: 0,
  },
}

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
  advanced: DEFAULT_ADVANCED,
}

const mergeAdvancedStats = (advanced = {}) => ({
  timePlayed: { ...DEFAULT_ADVANCED.timePlayed, ...(advanced.timePlayed || {}) },
  solo: { ...DEFAULT_ADVANCED.solo, ...(advanced.solo || {}) },
  multi: { ...DEFAULT_ADVANCED.multi, ...(advanced.multi || {}) },
  coop: { ...DEFAULT_ADVANCED.coop, ...(advanced.coop || {}) },
})

function PlayerStats({ theme, userProfile, username }) {
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    const profileName = userProfile?.username || username
    const profileAvatar = userProfile?.avatar

    if (userProfile && (userProfile.soloGames != null || userProfile.solo_games_played != null)) {
      const soloGames =
        userProfile.soloGames ?? userProfile.solo_games_played
      const soloTopScore =
        userProfile.soloTopScore ?? userProfile.highest_solo_score ?? DEFAULT_STATS.soloTopScore

      setStats({
        ...DEFAULT_STATS,
        name: profileName || DEFAULT_STATS.name,
        avatar: profileAvatar || DEFAULT_STATS.avatar,
        soloGames,
        soloTopScore,
        multiGames: userProfile.multiGames ?? userProfile.multiplayer_games_played ?? DEFAULT_STATS.multiGames,
        wins: userProfile.wins ?? userProfile.multiplayer_wins ?? DEFAULT_STATS.wins,
        losses: userProfile.losses ?? userProfile.multiplayer_losses ?? DEFAULT_STATS.losses,
        advanced: mergeAdvancedStats(userProfile.advanced),
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
          `/api/player/stats?username=${encodeURIComponent(profileName)}`,
          { credentials: 'include' }
        )
        const data = await res.json()
        setStats({
          ...DEFAULT_STATS,
          ...data,
          name: data?.name || profileName,
          avatar: data?.avatar || profileAvatar || DEFAULT_STATS.avatar,
          advanced: mergeAdvancedStats(data?.advanced),
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
      <div className={`player-stats-panel ${theme === 'dark' ? 'dark' : ''}`}>
        <div className={`player-stats ${theme === 'dark' ? 'dark' : ''}`}>
          <p className="loading">Loading stats...</p>
        </div>
      </div>
    )
  }

  const ratio =
    stats.wins + stats.losses > 0
      ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
      : '0'

  const advancedDialog = showAdvanced
    ? createPortal(
      <div
        className="advanced-stats-overlay"
        role="presentation"
        onClick={() => setShowAdvanced(false)}
      >
        <div
          className={`advanced-stats-modal ${theme === 'dark' ? 'dark' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="advanced-stats-title"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="advanced-stats-close"
            aria-label="Close advanced stats"
            onClick={() => setShowAdvanced(false)}
          >
            x
          </button>
          <h3 id="advanced-stats-title" className="player-stats-title">Advanced Stats</h3>
          <section className="advanced-time-section">
            <h4>Time played</h4>
            <div className="advanced-time-grid">
              <Stat label="Total" value={formatDuration(stats.advanced.timePlayed.total)} />
              <Stat label="Solo" value={formatDuration(stats.advanced.timePlayed.solo)} />
              <Stat label="Co-op" value={formatDuration(stats.advanced.timePlayed.coop)} />
              <Stat label="Multi" value={formatDuration(stats.advanced.timePlayed.multi)} />
            </div>
          </section>
          <div className="advanced-sections">
            <AdvancedSection title="Solo" stats={[
              ['Games', stats.advanced.solo.games],
              ['Highest score', stats.advanced.solo.highestScore],
              ['Average score', stats.advanced.solo.averageScore],
              ['Highest level', stats.advanced.solo.highestLevel],
              ['Highest lines', stats.advanced.solo.highestLines],
              ['Total lines', stats.advanced.solo.totalLines],
              ['Highest tetris', stats.advanced.solo.highestTetris],
              ['Total tetris', stats.advanced.solo.totalTetris],
            ]} />
            <AdvancedSection title="Multi" stats={[
              ['Games', stats.advanced.multi.games],
              ['Win / Loss', `${stats.advanced.multi.wins} / ${stats.advanced.multi.losses}`],
              ['W/L ratio', stats.advanced.multi.winLossRatio],
              ['Highest score', stats.advanced.multi.highestScore],
              ['Average score', stats.advanced.multi.averageScore],
              ['Highest level', stats.advanced.multi.highestLevel],
              ['Highest lines', stats.advanced.multi.highestLines],
              ['Total lines', stats.advanced.multi.totalLines],
              ['Highest sent', stats.advanced.multi.highestLinesSent],
              ['Total sent', stats.advanced.multi.totalLinesSent],
              ['Highest tetris', stats.advanced.multi.highestTetris],
              ['Total tetris', stats.advanced.multi.totalTetris],
            ]} />
            <AdvancedSection title="Co-op" stats={[
              ['Games', stats.advanced.coop.games],
              ['Highest score', stats.advanced.coop.highestScore],
              ['Highest level', stats.advanced.coop.highestLevel],
              ['Highest lines', stats.advanced.coop.highestLines],
              ['Total lines', stats.advanced.coop.totalLines],
              ['Highest tetris', stats.advanced.coop.highestTetris],
              ['Total tetris', stats.advanced.coop.totalTetris],
            ]} />
          </div>
        </div>
      </div>,
      document.body
    )
    : null

  return (
    <>
      <div className={`player-stats-panel ${theme === 'dark' ? 'dark' : ''}`}>
        <div className={`player-stats ${theme === 'dark' ? 'dark' : ''}`}>
          <h3 className="player-stats-title">Player Stats</h3>

          <div className="player-header">
            <FaceAvatar faceConfig={stats.avatar} size="medium" />
            <span className="player-name">{stats.name}</span>
          </div>

          <div className="stats-grid">
            <Stat label="Solo Games" value={stats.soloGames} />
            <Stat label="Highest Solo Score" value={stats.soloTopScore.toLocaleString()} />
            <Stat label="Multiplayer Games" value={stats.multiGames} />
            <Stat label="Multiplayer Wins" value={stats.wins} />
            <Stat label="Multiplayer Losses" value={stats.losses} />
            <Stat label="Multiplayer Winrate" value={`${ratio}%`} highlight />
          </div>

          <button
            type="button"
            className="advanced-stats-button"
            onClick={() => setShowAdvanced(true)}
          >
            Advanced stats
          </button>
        </div>
      </div>
      {advancedDialog}
    </>
  )
}

function AdvancedSection({ title, stats }) {
  return (
    <section className="advanced-section">
      <h4>{title}</h4>
      <div className="advanced-grid">
        {stats.map(([label, value]) => (
          <Stat key={`${title}-${label}`} label={label} value={formatStatValue(value)} />
        ))}
      </div>
    </section>
  )
}

function formatStatValue(value) {
  if (typeof value === 'number') {
    return value.toLocaleString()
  }
  return value
}

function formatDuration(totalSeconds = 0) {
  const seconds = Math.max(0, Number(totalSeconds) || 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }

  return `${remainingSeconds}s`
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
