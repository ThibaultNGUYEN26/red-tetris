import './Leaderboard.css'
import { useEffect, useState } from 'react'
import FaceAvatar from '../FaceAvatar/FaceAvatar'

const API_URL = import.meta.env.VITE_API_URL || ''

function Leaderboard({ theme }) {
  const [leaderboardData, setLeaderboardData] = useState([])
  const [loading, setLoading] = useState(true)

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
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_URL}/api/leaderboard/solo`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to fetch leaderboard')
        const data = await res.json()
        setLeaderboardData(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to fetch leaderboard', err)
        setLeaderboardData([])
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  if (!loading && leaderboardData.length === 0) {
    return null
  }

  return (
    <div className={`leaderboard ${theme === 'dark' ? 'dark' : ''}`}>
      <h3 className="leaderboard-title">🏆 Leaderboard</h3>

      <div className="leaderboard-list">
        {loading && <div className="leaderboard-entry">Loading…</div>}

        {!loading &&
          displayedData.map((entry) => (
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
