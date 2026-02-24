import './GameOver.css'

function GameOver({ winner, isEliminated, isGameOver, onBack, onPlayAgain, onSpectate, username }) {
  if (!winner && !isEliminated && !isGameOver) return null

  const title = winner === username ? 'You won' : 'You lost'
  const canSpectate = Boolean(onSpectate && isEliminated && !winner && !isGameOver)
  const showPlayAgain = Boolean(onPlayAgain && isGameOver)

  return (
    <div className="game-over-overlay" role="dialog" aria-modal="true">
      <div className="game-over-card">
        <h3>{title}</h3>
        <div className="game-over-actions">
          <div className="game-over-primary-actions">
          {showPlayAgain && (
            <button className="resume-button" onClick={onPlayAgain}>
              Play again
            </button>
          )}
          {canSpectate && (
              <button className="back-button" onClick={onSpectate}>
              Spectate
            </button>
          )}
          </div>
          <button className="back-button" onClick={onBack}>
            Back to menu
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameOver
