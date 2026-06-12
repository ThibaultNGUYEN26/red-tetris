import './GameOver.css'

function GameOver({
  winner,
  isEliminated,
  isGameOver,
  onBack,
  onPlayAgain,
  onSpectate,
  username,
  isMultiplayer,
  gameMode,
}) {
  if (!winner && !isEliminated && !isGameOver) return null

  const useGenericTitle =
    !isMultiplayer || ['cooperative', 'cooperative_roles'].includes(gameMode)
  const title = useGenericTitle ? 'Partie terminée' : winner === username ? 'Vous avez gagné' : 'Vous avez perdu'
  const winnerLabel = winner ? `Vainqueur : ${winner}` : null
  const canSpectate = Boolean(onSpectate && isEliminated && !winner && !isGameOver)
  const showPlayAgain = Boolean(onPlayAgain && isGameOver)

  return (
    <div className="game-over-overlay" role="dialog" aria-modal="true">
      <div className="game-over-card">
        <h3>{title}</h3>
        {winnerLabel && (
          <p className="game-over-winner">{winnerLabel}</p>
        )}
        <div className="game-over-actions">
          <div className="game-over-primary-actions">
          {showPlayAgain && (
            <button className="resume-button" onClick={onPlayAgain}>
              Rejouer
            </button>
          )}
          {canSpectate && (
              <button className="back-button" onClick={onSpectate}>
              Regarder
            </button>
          )}
          </div>
          <button className="back-button" onClick={onBack}>
            Retour au menu
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameOver
