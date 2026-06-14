import './PlayerStats.css'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import FaceAvatar from '../FaceAvatar/FaceAvatar'
import { apiFetch } from '../../api'
import { DEFAULT_LANGUAGE, getTranslation } from '../../i18n'

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
    longestGameSeconds: 0,
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
    longestGameSeconds: 0,
  },
  coop: {
    games: 0,
    highestScore: 0,
    highestLevel: 1,
    highestLines: 0,
    totalLines: 0,
    highestTetris: 0,
    totalTetris: 0,
    longestGameSeconds: 0,
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

const STATS_CACHE_MS = 30 * 1000

const mergeAdvancedStats = (advanced = {}) => ({
  timePlayed: { ...DEFAULT_ADVANCED.timePlayed, ...(advanced.timePlayed || {}) },
  solo: { ...DEFAULT_ADVANCED.solo, ...(advanced.solo || {}) },
  multi: { ...DEFAULT_ADVANCED.multi, ...(advanced.multi || {}) },
  coop: { ...DEFAULT_ADVANCED.coop, ...(advanced.coop || {}) },
})

function PlayerStats({ theme, userProfile, username, language = DEFAULT_LANGUAGE }) {
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const t = getTranslation(language).playerStats

  useEffect(() => {
    let cancelled = false
    const profileName = userProfile?.username || username
    const profileAvatar = userProfile?.avatar
    const hasProfileStats =
      userProfile && (userProfile.soloGames != null || userProfile.solo_games_played != null)
    const profileStatsAreFresh =
      hasProfileStats &&
      (
        typeof userProfile?.statsFetchedAt !== 'number' ||
        Date.now() - userProfile.statsFetchedAt < STATS_CACHE_MS
      )

    if (hasProfileStats) {
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

      if (profileStatsAreFresh) {
        return () => {
          cancelled = true
        }
      }
    }

    const fetchStats = async () => {
      if (!profileName) {
        setLoading(false)
        return
      }

      try {
        const res = await apiFetch(
          `/api/player/stats?username=${encodeURIComponent(profileName)}`,
          { credentials: 'include' }
        )
        const data = await res.json()
        if (cancelled) return
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
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchStats()

    return () => {
      cancelled = true
    }
  }, [userProfile, username])

  if (loading) {
    return (
      <div className={`player-stats-panel ${theme === 'dark' ? 'dark' : ''}`}>
        <div className={`player-stats ${theme === 'dark' ? 'dark' : ''}`}>
          <p className="loading">{t.loadingStats}</p>
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
            aria-label={t.closeAdvancedStats}
            onClick={() => setShowAdvanced(false)}
          >
            x
          </button>
          <h3 id="advanced-stats-title" className="player-stats-title">{t.advancedStatsTitle}</h3>
          <section className="advanced-time-section">
            <h4>{t.timePlayed}</h4>
            <div className="advanced-time-grid">
              <Stat label={t.total} value={formatDuration(stats.advanced.timePlayed.total)} />
              <Stat label={t.solo} value={formatDuration(stats.advanced.timePlayed.solo)} />
              <Stat label={t.coop} value={formatDuration(stats.advanced.timePlayed.coop)} />
              <Stat label={t.multi} value={formatDuration(stats.advanced.timePlayed.multi)} />
            </div>
          </section>
          <div className="advanced-sections">
            <AdvancedSection title={t.solo} stats={[
              [t.games, stats.advanced.solo.games],
              [t.highestScore, stats.advanced.solo.highestScore],
              [t.averageScore, stats.advanced.solo.averageScore],
              [t.highestLevel, stats.advanced.solo.highestLevel],
              [t.highestLines, stats.advanced.solo.highestLines],
              [t.totalLines, stats.advanced.solo.totalLines],
              [t.highestTetris, stats.advanced.solo.highestTetris],
              [t.totalTetris, stats.advanced.solo.totalTetris],
              [t.longestGame, formatDuration(stats.advanced.solo.longestGameSeconds)],
            ]} />
            <AdvancedSection title={t.multi} stats={[
              [t.games, stats.advanced.multi.games],
              [t.winLoss, `${stats.advanced.multi.wins} / ${stats.advanced.multi.losses}`],
              [t.winLossRatio, stats.advanced.multi.winLossRatio],
              [t.highestScore, stats.advanced.multi.highestScore],
              [t.averageScore, stats.advanced.multi.averageScore],
              [t.highestLevel, stats.advanced.multi.highestLevel],
              [t.highestLines, stats.advanced.multi.highestLines],
              [t.totalLines, stats.advanced.multi.totalLines],
              [t.highestSent, stats.advanced.multi.highestLinesSent],
              [t.totalSent, stats.advanced.multi.totalLinesSent],
              [t.highestTetris, stats.advanced.multi.highestTetris],
              [t.totalTetris, stats.advanced.multi.totalTetris],
              [t.longestGame, formatDuration(stats.advanced.multi.longestGameSeconds)],
            ]} />
            <AdvancedSection title={t.coop} stats={[
              [t.games, stats.advanced.coop.games],
              [t.highestScore, stats.advanced.coop.highestScore],
              [t.highestLevel, stats.advanced.coop.highestLevel],
              [t.highestLines, stats.advanced.coop.highestLines],
              [t.totalLines, stats.advanced.coop.totalLines],
              [t.highestTetris, stats.advanced.coop.highestTetris],
              [t.totalTetris, stats.advanced.coop.totalTetris],
              [t.longestGame, formatDuration(stats.advanced.coop.longestGameSeconds)],
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
          <h3 className="player-stats-title">{t.playerStatsTitle}</h3>

          <div className="player-header">
            <FaceAvatar faceConfig={stats.avatar} size="medium" />
            <span className="player-name">{stats.name}</span>
          </div>

          <div className="stats-grid">
            <Stat label={t.soloGames} value={stats.soloGames} />
            <Stat label={t.highestSoloScore} value={stats.soloTopScore.toLocaleString()} />
            <Stat label={t.multiplayerGames} value={stats.multiGames} />
            <Stat label={t.multiplayerWins} value={stats.wins} />
            <Stat label={t.multiplayerLosses} value={stats.losses} />
            <Stat label={t.multiplayerWinrate} value={`${ratio}%`} highlight />
          </div>

          <button
            type="button"
            className="advanced-stats-button"
            onClick={() => setShowAdvanced(true)}
          >
            {t.advancedStatsButton}
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
