import './GameOver.css'
import { DEFAULT_LANGUAGE, getTranslation } from '../../i18n'

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
  language = DEFAULT_LANGUAGE,
}) {
  if (!winner && !isEliminated && !isGameOver) return null

  const text = getTranslation(language).gameOver
  const useGenericTitle =
    !isMultiplayer || ['cooperative', 'cooperative_roles'].includes(gameMode)
  const title = useGenericTitle ? text.gameOver : winner === username ? text.won : text.lost
  const winnerLabel = winner ? `${text.winner}: ${winner}` : null
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
              {text.playAgain}
            </button>
          )}
          {canSpectate && (
              <button className="back-button" onClick={onSpectate}>
              {text.spectate}
            </button>
          )}
          </div>
          <button className="back-button" onClick={onBack}>
            {text.backToMenu}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameOver
