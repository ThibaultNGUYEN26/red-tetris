import './AdminPage.css'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import { apiFetch } from './api'

const ADMIN_PASSWORD_STORAGE_KEY = 'red-tetris-admin-password'
const ADMIN_USERNAME_STORAGE_KEY = 'red-tetris-admin-username'
const numberFormat = new Intl.NumberFormat()

const formatNumber = (value) => numberFormat.format(Number(value || 0))

const formatDuration = (seconds) => {
  const s = Number(seconds || 0)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

const formatDateTime = (value) => {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatMode = (mode) => {
  switch (mode) {
    case 'cooperative': return 'Co-op Alternate'
    case 'cooperative_roles': return 'Co-op Roles'
    case 'classic': return 'Classic'
    case 'mirror': return 'Mirror'
    case 'giant': return 'Giant'
    case 'chaotic': return 'Chaotic'
    case 'invisible': return 'Invisible'
    default: return mode || 'Unknown'
  }
}

const emptySummary = {
  live: {},
  overview: {},
  currentMonth: {},
  monthlyActivity: [],
  roomModes: [],
  recentRooms: [],
  topSoloScores: [],
  performance: {},
  topPlayers: [],
  multiplayerInsights: [],
}

function KpiCard({ label, value, sub }) {
  return (
    <article className="admin-kpi-card">
      <span className="admin-kpi-label">{label}</span>
      <strong className="admin-kpi-value">{value}</strong>
      {sub && <span className="admin-kpi-sub">{sub}</span>}
    </article>
  )
}

function AdminPage() {
  const [adminUsername, setAdminUsername] = useState(() => (
    sessionStorage.getItem(ADMIN_USERNAME_STORAGE_KEY) || ''
  ))
  const [adminPassword, setAdminPassword] = useState(() => (
    sessionStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || ''
  ))
  const [usernameInput, setUsernameInput] = useState(adminUsername)
  const [passwordInput, setPasswordInput] = useState('')
  const [summary, setSummary] = useState(emptySummary)
  const [status, setStatus] = useState(adminUsername && adminPassword ? 'loading' : 'locked')
  const [error, setError] = useState('')

  const lockAdmin = () => {
    sessionStorage.removeItem(ADMIN_USERNAME_STORAGE_KEY)
    sessionStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY)
    setAdminUsername('')
    setAdminPassword('')
    setUsernameInput('')
    setPasswordInput('')
    setStatus('locked')
  }

  const loadSummary = async (username = adminUsername, password = adminPassword) => {
    if (!username || !password) {
      setStatus('locked')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const response = await apiFetch('/api/admin/summary', {
        cache: 'no-store',
        headers: {
          'X-Admin-Username': username,
          'X-Admin-Password': password,
        },
      })
      if (!response.ok) {
        if (response.status === 401) {
          lockAdmin()
          setError('Wrong admin username or password')
          return
        }
        if (response.status === 503) {
          setStatus('error')
          setError('Admin credentials are not configured on the server')
          return
        }
        throw new Error('Admin stats unavailable')
      }
      const payload = await response.json()
      setSummary({ ...emptySummary, ...payload })
      sessionStorage.setItem(ADMIN_USERNAME_STORAGE_KEY, username)
      sessionStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, password)
      setStatus('ready')
    } catch (err) {
      setError(err?.message || 'Admin stats unavailable')
      if (status !== 'locked') {
        setStatus('error')
      }
    }
  }

  useEffect(() => {
    if (adminUsername && adminPassword) {
      loadSummary(adminUsername, adminPassword)
    }
  }, [])

  const handlePasswordSubmit = (event) => {
    event.preventDefault()
    const nextUsername = usernameInput.trim()
    const nextPassword = passwordInput.trim()
    if (!nextUsername) { setError('Enter the admin username'); return }
    if (!nextPassword) { setError('Enter the admin password'); return }
    setAdminUsername(nextUsername)
    setAdminPassword(nextPassword)
    loadSummary(nextUsername, nextPassword)
  }

  const maxMonthlyTotal = useMemo(() => {
    return Math.max(
      1,
      ...summary.monthlyActivity.map((month) =>
        Number(month.soloGames || 0) +
        Number(month.multiplayerResults || 0) +
        Number(month.coopGames || 0)
      )
    )
  }, [summary.monthlyActivity])

  const totalGames = useMemo(() => (
    Number(summary.overview.soloGames || 0) +
    Number(summary.overview.multiplayerResults || 0) +
    Number(summary.overview.coopGames || 0)
  ), [summary.overview])

  const tetrisRate = useMemo(() => {
    if (totalGames === 0) return '—'
    return `${((Number(summary.overview.totalTetris) / totalGames) * 100).toFixed(1)}%`
  }, [totalGames, summary.overview.totalTetris])

  const linesPerGame = useMemo(() => {
    if (totalGames === 0) return '—'
    return formatNumber(Math.round(Number(summary.overview.totalLines) / totalGames))
  }, [totalGames, summary.overview.totalLines])

  const metricCards = [
    { label: 'Active Players', value: summary.live.activePlayers },
    { label: 'Peak Players', value: summary.live.peakActivePlayers },
    { label: 'Active Games', value: summary.live.activeGames },
    { label: 'Registered Users', value: summary.overview.registeredUsers },
    { label: 'Players In Rooms', value: summary.overview.playersInRooms },
    { label: 'Rooms Waiting', value: summary.overview.waitingRooms },
    { label: 'Rooms Started', value: summary.overview.startedRooms },
    { label: 'Lines Cleared', value: summary.overview.totalLines },
    { label: 'Tetrises', value: summary.overview.totalTetris },
  ]

  const monthCards = [
    { label: 'New Users', value: summary.currentMonth.newUsers },
    { label: 'Rooms Created', value: summary.currentMonth.roomsCreated },
    { label: 'Solo Games', value: summary.currentMonth.soloGames },
    { label: 'Multiplayer Results', value: summary.currentMonth.multiplayerResults },
    { label: 'Co-op Games', value: summary.currentMonth.coopGames },
    { label: 'Lines Cleared', value: summary.currentMonth.linesCleared },
  ]

  const perf = summary.performance

  return (
    <div className="admin-screen">
      <TetriminosClouds />
      <main className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Site Operations</p>
            <h1>Admin</h1>
            {adminUsername && <p className="admin-username">Signed in as {adminUsername}</p>}
          </div>
          <div className="admin-actions">
            <span className={`admin-status admin-status-${status}`}>
              {status === 'ready' ? `Updated ${formatDateTime(summary.generatedAt)}` : status}
            </span>
            <button type="button" onClick={() => loadSummary()}>Refresh</button>
            <Link to="/">Home</Link>
          </div>
        </header>

        {error && <div className="admin-alert">{error}</div>}

        {(!adminUsername || !adminPassword) && (
          <section className="admin-login-panel" aria-labelledby="admin-login-title">
            <h2 id="admin-login-title">Admin Access</h2>
            <form onSubmit={handlePasswordSubmit}>
              <label htmlFor="admin-username">Username</label>
              <input
                id="admin-username"
                type="text"
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                autoComplete="username"
                autoFocus
              />
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                autoComplete="current-password"
              />
              <button type="submit">Unlock</button>
            </form>
          </section>
        )}

        {adminUsername && adminPassword && (
          <>
            {/* Live metrics */}
            <section className="admin-metrics" aria-label="Site metrics">
              {metricCards.map((metric) => (
                <article className="admin-metric" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{formatNumber(metric.value)}</strong>
                </article>
              ))}
            </section>

            {/* KPI strip */}
            <section className="admin-kpi-strip" aria-label="Key performance indicators">
              <div className="admin-kpi-strip-header">
                <h2>KPIs &amp; Performance</h2>
              </div>
              <div className="admin-kpi-grid">
                <KpiCard
                  label="Avg Solo Score"
                  value={formatNumber(perf.avgSoloScore)}
                  sub={`Best: ${formatNumber(perf.maxSoloScore)}`}
                />
                <KpiCard
                  label="Avg Solo Lines"
                  value={formatNumber(perf.avgSoloLines)}
                  sub={`Avg level ${formatNumber(perf.avgSoloLevel)}`}
                />
                <KpiCard
                  label="Avg Solo Duration"
                  value={formatDuration(perf.avgSoloDuration)}
                  sub={`Avg tetrises ${formatNumber(perf.avgSoloTetrises)}`}
                />
                <KpiCard
                  label="Avg MP Score"
                  value={formatNumber(perf.avgMpScore)}
                  sub={`Avg lines sent ${formatNumber(perf.avgLinesSent)}`}
                />
                <KpiCard
                  label="Avg Co-op Score"
                  value={formatNumber(perf.avgCoopScore)}
                  sub={`Avg duration ${formatDuration(perf.avgCoopDuration)}`}
                />
                <KpiCard
                  label="Tetris Rate"
                  value={tetrisRate}
                  sub="Tetrises per game played"
                />
                <KpiCard
                  label="Total Games"
                  value={formatNumber(totalGames)}
                  sub={`Solo · MP · Co-op`}
                />
                <KpiCard
                  label="Lines / Game"
                  value={linesPerGame}
                  sub="Average lines per game"
                />
              </div>
            </section>

            <section className="admin-grid">
              {/* This Month */}
              <article className="admin-panel">
                <div className="admin-panel-header">
                  <h2>This Month</h2>
                </div>
                <div className="admin-compact-grid">
                  {monthCards.map((metric) => (
                    <div className="admin-compact-stat" key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{formatNumber(metric.value)}</strong>
                    </div>
                  ))}
                </div>
              </article>

              {/* Activity Trend — stacked */}
              <article className="admin-panel">
                <div className="admin-panel-header">
                  <h2>Activity Trend</h2>
                  <div className="admin-legend">
                    <span className="admin-legend-dot admin-legend-solo" />Solo
                    <span className="admin-legend-dot admin-legend-mp" />MP
                    <span className="admin-legend-dot admin-legend-coop" />Co-op
                  </div>
                </div>
                <div className="admin-bars">
                  {summary.monthlyActivity.map((month) => {
                    const solo = Number(month.soloGames || 0)
                    const mp = Number(month.multiplayerResults || 0)
                    const coop = Number(month.coopGames || 0)
                    const total = solo + mp + coop
                    const soloPct = (solo / maxMonthlyTotal) * 100
                    const mpPct = (mp / maxMonthlyTotal) * 100
                    const coopPct = (coop / maxMonthlyTotal) * 100
                    return (
                      <div className="admin-bar-row" key={month.month}>
                        <span>{month.month}</span>
                        <div className="admin-bar-track">
                          <div className="admin-bar-solo" style={{ width: `${soloPct}%` }} title={`Solo: ${solo}`} />
                          <div className="admin-bar-mp" style={{ width: `${mpPct}%` }} title={`MP: ${mp}`} />
                          <div className="admin-bar-coop" style={{ width: `${coopPct}%` }} title={`Co-op: ${coop}`} />
                        </div>
                        <strong>{formatNumber(total)}</strong>
                      </div>
                    )
                  })}
                </div>
              </article>

              {/* Room Modes */}
              <article className="admin-panel">
                <div className="admin-panel-header">
                  <h2>Room Modes</h2>
                </div>
                <div className="admin-table" role="table" aria-label="Room mode split">
                  <div className="admin-table-row admin-table-head" role="row">
                    <span>Mode</span>
                    <span>Rooms</span>
                    <span>Players</span>
                  </div>
                  {summary.roomModes.map((mode) => (
                    <div className="admin-table-row" role="row" key={mode.mode}>
                      <span>{formatMode(mode.mode)}</span>
                      <span>{formatNumber(mode.rooms)}</span>
                      <span>{formatNumber(mode.players)}</span>
                    </div>
                  ))}
                  {!summary.roomModes.length && <div className="admin-empty">No rooms yet</div>}
                </div>
              </article>

              {/* Top Solo Scores */}
              <article className="admin-panel">
                <div className="admin-panel-header">
                  <h2>Top Solo Scores</h2>
                </div>
                <div className="admin-table" role="table" aria-label="Top solo scores">
                  <div className="admin-table-row admin-table-head" role="row">
                    <span>Player</span>
                    <span>Score</span>
                    <span>Lines</span>
                  </div>
                  {summary.topSoloScores.map((score) => (
                    <div className="admin-table-row" role="row" key={`${score.username}-${score.createdAt}`}>
                      <span>{score.username}</span>
                      <span>{formatNumber(score.score)}</span>
                      <span>{formatNumber(score.lines)}</span>
                    </div>
                  ))}
                  {!summary.topSoloScores.length && <div className="admin-empty">No scores yet</div>}
                </div>
              </article>
            </section>

            {/* Performance analysis panels */}
            <section className="admin-grid admin-grid-3" aria-label="Performance analysis">
              {/* Top Players */}
              <article className="admin-panel admin-panel-span2">
                <div className="admin-panel-header">
                  <h2>Top Players</h2>
                </div>
                <div className="admin-table admin-table-5col" role="table" aria-label="Top players">
                  <div className="admin-table-row admin-table-head admin-table-row-5col" role="row">
                    <span>Player</span>
                    <span>Solo Games</span>
                    <span>Best Score</span>
                    <span>MP Wins</span>
                    <span>Win Rate</span>
                  </div>
                  {summary.topPlayers.map((player) => (
                    <div className="admin-table-row admin-table-row-5col" role="row" key={player.username}>
                      <span>{player.username}</span>
                      <span>{formatNumber(player.soloGamesPlayed)}</span>
                      <span>{formatNumber(player.highestSoloScore)}</span>
                      <span>{formatNumber(player.multiplayerWins)}</span>
                      <span>
                        <span className={`admin-winrate ${player.winRate >= 50 ? 'admin-winrate-high' : ''}`}>
                          {player.multiplayerGamesPlayed > 0 ? `${player.winRate}%` : '—'}
                        </span>
                      </span>
                    </div>
                  ))}
                  {!summary.topPlayers.length && <div className="admin-empty">No players yet</div>}
                </div>
              </article>

              {/* Multiplayer Insights */}
              <article className="admin-panel">
                <div className="admin-panel-header">
                  <h2>Multiplayer by Mode</h2>
                </div>
                <div className="admin-table" role="table" aria-label="Multiplayer by mode">
                  <div className="admin-table-row admin-table-head admin-table-row-4col" role="row">
                    <span>Mode</span>
                    <span>Results</span>
                    <span>Avg Score</span>
                    <span>Avg Duration</span>
                  </div>
                  {summary.multiplayerInsights.map((insight) => (
                    <div className="admin-table-row admin-table-row-4col" role="row" key={insight.mode}>
                      <span>{formatMode(insight.mode)}</span>
                      <span>{formatNumber(insight.totalResults)}</span>
                      <span>{formatNumber(insight.avgScore)}</span>
                      <span>{formatDuration(insight.avgDuration)}</span>
                    </div>
                  ))}
                  {!summary.multiplayerInsights.length && <div className="admin-empty">No MP games yet</div>}
                </div>
              </article>
            </section>

            {/* Recent Rooms */}
            <section className="admin-panel admin-wide-panel">
              <div className="admin-panel-header">
                <h2>Recent Rooms</h2>
              </div>
              <div className="admin-room-list">
                {summary.recentRooms.map((room) => (
                  <div className="admin-room" key={room.id}>
                    <div>
                      <strong>{room.name}</strong>
                      <span>{formatMode(room.mode)} · {room.listed ? 'Listed' : 'Private'}</span>
                    </div>
                    <span className={`admin-pill admin-pill-${room.status}`}>{room.status}</span>
                    <span>{formatNumber(room.playerCount)} players</span>
                    <span>{formatDateTime(room.createdAt)}</span>
                  </div>
                ))}
                {!summary.recentRooms.length && (
                  <div className="admin-empty">No room activity yet</div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default AdminPage
