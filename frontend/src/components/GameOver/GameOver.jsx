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
  ranking = [],
  rewards = {},
}) {
  if (!winner && !isEliminated && !isGameOver) return null

  const text = getTranslation(language).gameOver
  const useGenericTitle =
    !isMultiplayer || ['cooperative', 'cooperative_roles'].includes(gameMode)
  const title = useGenericTitle ? text.gameOver : winner === username ? text.won : text.lost
  const winnerLabel = winner && useGenericTitle ? `${text.winner}: ${winner}` : null
  const canSpectate = Boolean(onSpectate && isEliminated && !winner && !isGameOver)
  const showPlayAgain = Boolean(onPlayAgain && isGameOver)

  const isCoop = ['cooperative', 'cooperative_roles'].includes(gameMode)
  const showRanking = ranking.length > 0 && !isCoop
  const ownCoins = rewards[username] ?? 0

  return (
    <div className="game-over-overlay" role="dialog" aria-modal="true">
      <div className="game-over-card">
        <h3>{title}</h3>
        {winnerLabel && <p className="game-over-winner">{winnerLabel}</p>}

        {showRanking && (
          <div className="game-over-ranking">
            {ranking.map((entry) => {
              const earned = rewards[entry.username] ?? 0
              const isMe = entry.username === username
              return (
                <div
                  key={entry.username}
                  className={`game-over-rank-row${isMe ? ' is-me' : ''}`}
                >
                  <span className="rank-position">#{entry.rank}</span>
                  <span className="rank-name">{entry.username}</span>
                  <span className="rank-score">{entry.score.toLocaleString()}</span>
                  {earned > 0 && (
                    <span className="rank-coins">+{earned} 🪙</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!showRanking && ownCoins > 0 && (
          <p className="game-over-coins">+{ownCoins} 🪙</p>
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
