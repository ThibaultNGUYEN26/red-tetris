import './GameOver.css'

function GameOver({ winner, isEliminated, onBack, onPlayAgain, onSpectate, username }) {
  if (!winner && !isEliminated) return null

  const title = winner === username ? 'You won' : 'You lost'
  const canSpectate = Boolean(onSpectate && isEliminated && !winner)

  return (
    <div className="game-over-overlay" role="dialog" aria-modal="true">
      <div className="game-over-card">
        <h3>{title}</h3>
        <div className="game-over-actions">
          {onPlayAgain && (
            <button className="resume-button" onClick={onPlayAgain}>
              Play again
            </button>
          )}
          {canSpectate && (
            <button className="pagination-btn" onClick={onSpectate}>
              Spectate
            </button>
          )}
          <button className="back-button" onClick={onBack}>
            Back to menu
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameOver
