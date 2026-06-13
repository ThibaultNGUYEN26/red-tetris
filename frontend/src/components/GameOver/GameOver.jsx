import './GameOver.css'
import { DEFAULT_LANGUAGE } from '../../i18n/playerStats'

const GAME_OVER_TRANSLATIONS = {
  en: {
    gameOver: 'Game over',
    won: 'You won',
    lost: 'You lost',
    winner: 'Winner',
    playAgain: 'Play again',
    spectate: 'Spectate',
    backToMenu: 'Back to menu',
  },
  fr: {
    gameOver: 'Partie terminée',
    won: 'Vous avez gagné',
    lost: 'Vous avez perdu',
    winner: 'Vainqueur',
    playAgain: 'Rejouer',
    spectate: 'Regarder',
    backToMenu: 'Retour au menu',
  },
}

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

  const text = GAME_OVER_TRANSLATIONS[language] || GAME_OVER_TRANSLATIONS[DEFAULT_LANGUAGE]
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
