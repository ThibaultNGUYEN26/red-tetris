import './Leaderboard.css'
import { useEffect, useState } from 'react'
import FaceAvatar from '../FaceAvatar/FaceAvatar'
import { socket } from '../../socket'

const DEFAULT_AVATAR = {
  skinColor: '#cccccc',
  eyeType: 'normal',
  mouthType: 'neutral',
}

const hasScoreEntries = (data) =>
  Array.isArray(data) && data.some((entry) => Number(entry?.score || 0) > 0)

const LEADERBOARD_CACHE_KEY = 'red-tetris-leaderboards'

const readCachedLeaderboards = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(LEADERBOARD_CACHE_KEY) || '{}')
    return {
      solo: Array.isArray(cached.solo) ? cached.solo : [],
      coop: Array.isArray(cached.coop) ? cached.coop : [],
    }
  } catch {
    return { solo: [], coop: [] }
  }
}

const writeCachedLeaderboards = (nextCache) => {
  try {
    localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(nextCache))
  } catch {
    // Cache is a display optimization; ignore storage failures.
  }
}

function Leaderboard({ theme }) {
  const [leaderboards, setLeaderboards] = useState(() => readCachedLeaderboards())
  const [soloLoaded, setSoloLoaded] = useState(() => leaderboards.solo.length > 0)
  const [coopLoaded, setCoopLoaded] = useState(() => leaderboards.coop.length > 0)
  const [mode, setMode] = useState('solo')

  const [currentPage, setCurrentPage] = useState(0)
  const soloData = leaderboards.solo
  const coopData = leaderboards.coop
  const leaderboardData = mode === 'coop' ? coopData : soloData
  const loading = mode === 'coop' ? !coopLoaded : !soloLoaded
  const hasSoloScores = hasScoreEntries(soloData)
  const hasCoopScores = hasScoreEntries(coopData)
  const allLeaderboardsLoaded = soloLoaded && coopLoaded
  const shouldHideLeaderboard = allLeaderboardsLoaded && !hasSoloScores && !hasCoopScores
  const totalPages = Math.ceil(leaderboardData.length / 10)

  const displayedData = leaderboardData.slice(currentPage * 10, (currentPage + 1) * 10)

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  useEffect(() => {
    const handleSoloLeaderboard = (data) => {
      const solo = Array.isArray(data) ? data : []
      setLeaderboards((current) => {
        const next = { ...current, solo }
        writeCachedLeaderboards(next)
        return next
      })
      setSoloLoaded(true)
    }

    const handleCoopLeaderboard = (data) => {
      const coop = Array.isArray(data) ? data : []
      setLeaderboards((current) => {
        const next = { ...current, coop }
        writeCachedLeaderboards(next)
        return next
      })
      setCoopLoaded(true)
    }

    socket.on('leaderboardSolo', handleSoloLeaderboard)
    socket.on('leaderboardCoop', handleCoopLeaderboard)
    socket.emit('getLeaderboardSolo')
    socket.emit('getLeaderboardCoop')

    return () => {
      socket.off('leaderboardSolo', handleSoloLeaderboard)
      socket.off('leaderboardCoop', handleCoopLeaderboard)
    }
  }, [])

  useEffect(() => {
    setCurrentPage(0)
  }, [mode])

  useEffect(() => {
    if (mode === 'coop' && coopLoaded && !hasCoopScores) {
      setMode('solo')
      return
    }

    if (mode === 'solo' && soloLoaded && !hasSoloScores && hasCoopScores) {
      setMode('coop')
    }
  }, [mode, soloLoaded, coopLoaded, hasSoloScores, hasCoopScores])

  if (shouldHideLeaderboard) {
    return null
  }

  const renderSoloEntry = (entry) => (
    <div key={entry.rank} className={`leaderboard-entry ${entry.rank <= 3 ? `top-${entry.rank}` : ''}`}>
      <span className="rank">{entry.rank}</span>
      <span className="avatar-icon">
        <FaceAvatar faceConfig={entry.avatar || DEFAULT_AVATAR} size="leaderboard" />
      </span>
      <span className="name">{entry.name}</span>
      <span className="score">{entry.score.toLocaleString()}</span>
    </div>
  )

  const renderCoopEntry = (entry) => {
    const [playerOne = {}, playerTwo = {}] = entry.players || []
    const playerOneName = playerOne.name || 'Joueur 1'
    const playerTwoName = playerTwo.name || 'Joueur 2'

    return (
      <div key={entry.rank} className={`leaderboard-entry coop-entry ${entry.rank <= 3 ? `top-${entry.rank}` : ''}`}>
        <span className="rank">{entry.rank}</span>
        <div className="coop-identity">
          <span className="avatar-icon avatar-duo">
            <FaceAvatar faceConfig={playerOne.avatar || DEFAULT_AVATAR} size="leaderboard" />
            <FaceAvatar faceConfig={playerTwo.avatar || DEFAULT_AVATAR} size="leaderboard" />
          </span>
          <span className="name">{`${playerOneName} + ${playerTwoName}`}</span>
        </div>
        <span className="score">{entry.score.toLocaleString()}</span>
      </div>
    )
  }

  return (
    <div
      className={`leaderboard ${theme === 'dark' ? 'dark' : ''} ${
        mode === 'coop' ? 'leaderboard-mode-coop' : ''
      }`}
    >
      <div className="leaderboard-header">
        <h3 className="leaderboard-title">🏆 Classement</h3>
        <div className="leaderboard-tabs">
          {(!allLeaderboardsLoaded || hasSoloScores) && (
            <button
              type="button"
              onClick={() => setMode('solo')}
              className={`leaderboard-tab ${mode === 'solo' ? 'active' : ''}`}
            >
              Solo
            </button>
          )}
          {hasCoopScores && (
            <button
              type="button"
              onClick={() => setMode('coop')}
              className={`leaderboard-tab ${mode === 'coop' ? 'active' : ''}`}
            >
              Duo coop
            </button>
          )}
        </div>
      </div>

      <div className="leaderboard-list">
        {loading && <div className="leaderboard-entry">Chargement…</div>}

        {!loading &&
          displayedData.map((entry) =>
            mode === 'coop' ? renderCoopEntry(entry) : renderSoloEntry(entry)
          )}
      </div>

      {totalPages > 1 && (
        <div className="leaderboard-pagination">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="pagination-btn"
          >
            ←
          </button>
          <span className="page-info">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            className="pagination-btn"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}

export default Leaderboard
