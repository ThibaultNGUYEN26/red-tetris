import './Leaderboard.css'
import { useState } from 'react'

function Leaderboard({ theme }) {
  // Mock data - replace with real data later
  const [leaderboardData] = useState([
    { rank: 1, name: 'Player1', score: 15000 },
    { rank: 2, name: 'Player2', score: 12500 },
    { rank: 3, name: 'Player3', score: 11000 },
    { rank: 4, name: 'Player4', score: 9500 },
    { rank: 5, name: 'Player5', score: 8700 },
    { rank: 6, name: 'Player6', score: 7800 },
    { rank: 7, name: 'Player7', score: 7200 },
    { rank: 8, name: 'Player8', score: 6500 },
    { rank: 9, name: 'Player9', score: 5900 },
    { rank: 10, name: 'Player10', score: 5200 },
  ])

  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = Math.ceil(leaderboardData.length / 10)

  const displayedData = leaderboardData.slice(currentPage * 10, (currentPage + 1) * 10)

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  return (
    <div className={`leaderboard ${theme === 'dark' ? 'dark' : ''}`}>
      <h3 className="leaderboard-title">🏆 Leaderboard</h3>

      <div className="leaderboard-list">
        {displayedData.map((entry) => (
          <div key={entry.rank} className={`leaderboard-entry ${entry.rank <= 3 ? `top-${entry.rank}` : ''}`}>
            <span className="rank">{entry.rank}</span>
            <span className="name">{entry.name}</span>
            <span className="score">{entry.score.toLocaleString()}</span>
          </div>
        ))}
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
