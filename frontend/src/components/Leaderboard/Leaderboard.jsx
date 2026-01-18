import './Leaderboard.css'
import { useState } from 'react'
import FaceAvatar from '../FaceAvatar/FaceAvatar'

function Leaderboard({ theme }) {
  // Mock data - replace with real data later
  const [leaderboardData] = useState([
    { rank: 1, name: 'Player1', score: 15000, avatar: { skinColor: '#70d4d4', eyeType: 'normal', mouthType: 'uwu' } },
    { rank: 2, name: 'Player2', score: 12500, avatar: { skinColor: '#d4d470', eyeType: 'happy', mouthType: 'smile' } },
    { rank: 3, name: 'Player3', score: 11000, avatar: { skinColor: '#9966cc', eyeType: 'joy', mouthType: 'laugth' } },
    { rank: 4, name: 'Player4', score: 9500, avatar: { skinColor: '#70d470', eyeType: 'cute', mouthType: 'neutral' } },
    { rank: 5, name: 'Player5', score: 8700, avatar: { skinColor: '#d47070', eyeType: 'love', mouthType: 'kiss' } },
    { rank: 6, name: 'Player6', score: 7800, avatar: { skinColor: '#7070d4', eyeType: 'blink', mouthType: 'smile' } },
    { rank: 7, name: 'Player7', score: 7200, avatar: { skinColor: '#d49e70', eyeType: 'soft', mouthType: 'not_smile' } },
    { rank: 8, name: 'Player8', score: 6500, avatar: { skinColor: '#70d4d4', eyeType: 'sad', mouthType: 'sad' } },
    { rank: 9, name: 'Player9', score: 5900, avatar: { skinColor: '#d4d470', eyeType: 'fear', mouthType: 'scared' } },
    { rank: 10, name: 'Player10', score: 5200, avatar: { skinColor: '#9966cc', eyeType: 'panic', mouthType: 'scream' } },
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
            <span className="avatar-icon">
              <FaceAvatar faceConfig={entry.avatar} size="leaderboard" />
            </span>
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
