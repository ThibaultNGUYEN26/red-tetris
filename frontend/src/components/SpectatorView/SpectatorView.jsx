import '../Game/Game.css'
import './SpectatorView.css'
import { useEffect, useMemo, useState } from 'react'
import ShadowBoards from '../ShadowBoards/ShadowBoards'

function SpectatorView({ players, onBack, username }) {
  const [index, setIndex] = useState(0)

  const list = Array.isArray(players)
    ? players.filter((p) => p?.username !== username)
    : []
  const safeIndex = list.length ? Math.min(index, list.length - 1) : 0
  const current = list[safeIndex]

  const board = current?.board || []
  const opponentBoards = list
    .filter((player) => player?.username && player.username !== current?.username)
    .map((player) => ({
      username: player.username,
      board: player.boardLocked || player.board || [],
    }))

  const nextPreview = useMemo(() => {
    const nextType = current?.nextType
    if (!nextType) {
      return { grid: [], width: 0, height: 0 }
    }
    const SHAPES = {
      i: [[[0, 1], [1, 1], [2, 1], [3, 1]]],
      o: [[[0, 1], [0, 2], [1, 1], [1, 2]]],
      t: [[[0, 1], [1, 0], [1, 1], [1, 2]]],
      s: [[[0, 1], [0, 2], [1, 0], [1, 1]]],
      z: [[[0, 0], [0, 1], [1, 1], [1, 2]]],
      l: [[[0, 0], [1, 0], [1, 1], [1, 2]]],
      j: [[[0, 2], [1, 0], [1, 1], [1, 2]]],
    }

    const shape = SHAPES[nextType]?.[0]
    if (!shape) return { grid: [], width: 0, height: 0 }

    const rows = shape.map(([r]) => r)
    const cols = shape.map(([, c]) => c)
    const minRow = Math.min(...rows)
    const maxRow = Math.max(...rows)
    const minCol = Math.min(...cols)
    const maxCol = Math.max(...cols)

    const height = maxRow - minRow + 1
    const width = maxCol - minCol + 1
    const preview = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => 'empty')
    )

    shape.forEach(([r, c]) => {
      preview[r - minRow][c - minCol] = nextType
    })

    return { grid: preview, width, height }
  }, [current?.nextType])

  useEffect(() => {
    if (!list.length) return
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        setIndex((prev) => (prev <= 0 ? list.length - 1 : prev - 1))
      } else if (event.key === 'ArrowRight') {
        setIndex((prev) => (prev + 1) % list.length)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [list.length])

  if (!current) {
    return (
      <div className="spectator-empty">
        <h3>Spectator Mode</h3>
        <p>No players to watch.</p>
        <button className="back-button" onClick={onBack}>Back</button>
      </div>
    )
  }

  return (
    <>
      <div className="game-header">
        <div className="game-title">
          <div className="spectator-info">
            <div className="spectator-title">
              Spectating <span className="spectator-name">{current.username}</span>
            </div>
            <div className="spectator-controls">
              <button
                className="spectator-btn spectator-btn-prev"
                onClick={() => setIndex((prev) => (prev <= 0 ? list.length - 1 : prev - 1))}
                disabled={list.length <= 1}
              >
                <span className="spectator-btn-icon">←</span>
                Prev
              </button>
              <button
                className="spectator-btn spectator-btn-next"
                onClick={() => setIndex((prev) => (prev + 1) % list.length)}
                disabled={list.length <= 1}
              >
                Next
                <span className="spectator-btn-icon">→</span>
              </button>
            </div>
          </div>
        </div>
        <div className="game-stats">
          <div className="stat">
            <span className="stat-label">Score</span>
            <span className="stat-value">{(current.score ?? 0).toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Lines</span>
            <span className="stat-value">{(current.lines ?? 0).toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Level</span>
            <span className="stat-value">{(current.level ?? 1).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="game-layout">
        <div className="game-board" role="grid" aria-label="Tetris board">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`cell cell-${cell}`}
              />
            ))
          )}
        </div>

        <div className="side-panel">
          <h3>Next</h3>
          <div className="next-grid" role="grid" aria-label="Next piece">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${nextPreview.width}, var(--cell-size))`,
                gridTemplateRows: `repeat(${nextPreview.height}, var(--cell-size))`,
                gap: '2px'
              }}
            >
              {nextPreview.grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`next-${rowIndex}-${colIndex}`}
                    className={`cell cell-${cell}`}
                  />
                ))
              )}
            </div>
          </div>
          <ShadowBoards boards={opponentBoards} />
        </div>
      </div>

      <div className="spectator-actions">
        <button className="back-button" onClick={onBack}>Back</button>
      </div>
    </>
  )
}

export default SpectatorView
