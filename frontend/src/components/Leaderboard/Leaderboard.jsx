import './Leaderboard.css'
import { useEffect, useState } from 'react'
import FaceAvatar from '../FaceAvatar/FaceAvatar'
import { socket } from '../../socket'

const DEFAULT_AVATAR = {
  skinColor: '#cccccc',
  eyeType: 'normal',
  mouthType: 'neutral',
}

function Leaderboard({ theme }) {
  const [leaderboardData, setLeaderboardData] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('solo')
  const [hasCoopScores, setHasCoopScores] = useState(false)

  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = Math.ceil(leaderboardData.length / 10)

  const displayedData = leaderboardData.slice(currentPage * 10, (currentPage + 1) * 10)

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  useEffect(() => {
    const isSolo = mode === 'solo'
    const eventName = isSolo ? 'leaderboardSolo' : 'leaderboardCoop'
    const requestName = isSolo ? 'getLeaderboardSolo' : 'getLeaderboardCoop'

    setLoading(true)
    setLeaderboardData([])
    setCurrentPage(0)

    const handleLeaderboard = (data) => {
      setLeaderboardData(Array.isArray(data) ? data : [])
      setLoading(false)
    }

    socket.on(eventName, handleLeaderboard)
    socket.emit(requestName)

    return () => {
      socket.off(eventName, handleLeaderboard)
    }
  }, [mode])

  useEffect(() => {
    const handleCoopLeaderboard = (data) => {
      const hasScores = Array.isArray(data) && data.length > 0
      setHasCoopScores(hasScores)
      if (!hasScores && mode === 'coop') {
        setMode('solo')
      }
    }

    socket.on('leaderboardCoop', handleCoopLeaderboard)
    socket.emit('getLeaderboardCoop')

    return () => {
      socket.off('leaderboardCoop', handleCoopLeaderboard)
    }
  }, [mode])

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
    const playerOneName = playerOne.name || 'Player 1'
    const playerTwoName = playerTwo.name || 'Player 2'

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
        <h3 className="leaderboard-title">🏆 Leaderboard</h3>
        <div className="leaderboard-tabs">
          <button
            type="button"
            onClick={() => setMode('solo')}
            className={`leaderboard-tab ${mode === 'solo' ? 'active' : ''}`}
          >
            Solo
          </button>
          {hasCoopScores && (
            <button
              type="button"
              onClick={() => setMode('coop')}
              className={`leaderboard-tab ${mode === 'coop' ? 'active' : ''}`}
            >
              Co-op Duo
            </button>
          )}
        </div>
      </div>

      <div className="leaderboard-list">
        {loading && <div className="leaderboard-entry">Loading…</div>}

        {!loading && leaderboardData.length === 0 && (
          <div className="leaderboard-entry">No scores yet</div>
        )}

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
