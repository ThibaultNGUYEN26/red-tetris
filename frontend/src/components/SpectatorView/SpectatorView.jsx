import '../Game/Game.css'
import './SpectatorView.css'
import { useEffect, useMemo, useState } from 'react'
import ShadowBoards from '../ShadowBoards/ShadowBoards'
import { DEFAULT_LANGUAGE } from '../../i18n/playerStats'

const SPECTATOR_TRANSLATIONS = {
  en: {
    title: 'Spectator mode',
    empty: 'No players to watch.',
    back: 'Back',
    watching: 'Watching',
    previous: 'Previous',
    next: 'Next',
    score: 'Score',
    lines: 'Lines',
    level: 'Level',
    hold: 'Hold',
    nextPiece: 'Next',
    holdPieceLabel: 'Held piece',
    nextPieceLabel: 'Next piece',
    boardLabel: 'Tetris board',
  },
  fr: {
    title: 'Mode spectateur',
    empty: 'Aucun joueur a regarder.',
    back: 'Retour',
    watching: 'Spectateur de',
    previous: 'Precedent',
    next: 'Suivant',
    score: 'Score',
    lines: 'Lignes',
    level: 'Niveau',
    hold: 'Reserve',
    nextPiece: 'Suivante',
    holdPieceLabel: 'Piece en reserve',
    nextPieceLabel: 'Piece suivante',
    boardLabel: 'Plateau de Tetris',
  },
}

const SHAPES = {
  i: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
  ],
  o: [[[0, 1], [0, 2], [1, 1], [1, 2]]],
  t: [
    [[0, 1], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 1]],
    [[0, 1], [1, 0], [1, 1], [2, 1]],
  ],
  s: [
    [[0, 1], [0, 2], [1, 0], [1, 1]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 1], [1, 2], [2, 0], [2, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
  ],
  z: [
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 2], [1, 1], [1, 2], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[0, 1], [1, 0], [1, 1], [2, 0]],
  ],
  l: [
    [[0, 2], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [1, 2], [2, 0]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
  ],
  j: [
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 0], [2, 1]],
  ],
}

const createPiecePreview = (type) => {
  if (!type || !SHAPES[type]) {
    return { grid: [], width: 0, height: 0 }
  }

  const shape = SHAPES[type][0]
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
    preview[r - minRow][c - minCol] = type
  })

  return { grid: preview, width, height }
}

function SpectatorView({ players, onBack, username, language = DEFAULT_LANGUAGE }) {
  const [index, setIndex] = useState(0)
  const text = SPECTATOR_TRANSLATIONS[language] || SPECTATOR_TRANSLATIONS[DEFAULT_LANGUAGE]

  const list = Array.isArray(players)
    ? players.filter((p) => p?.username !== username)
    : []
  const safeIndex = list.length ? Math.min(index, list.length - 1) : 0
  const current = list[safeIndex]

  const board = current?.board || []
  const boardHeight = board.length || 1
  const boardWidth = board[0]?.length || 1
  const opponentBoards = list
    .filter((player) => player?.username && player.username !== current?.username)
    .map((player) => ({
      username: player.username,
      board: player.boardLocked || player.board || [],
    }))

  const nextPreview = useMemo(() => createPiecePreview(current?.nextType), [current?.nextType])
  const holdPreview = useMemo(() => createPiecePreview(current?.holdType), [current?.holdType])

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
        <h3>{text.title}</h3>
        <p>{text.empty}</p>
        <button className="back-button" onClick={onBack}>{text.back}</button>
      </div>
    )
  }

  return (
    <>
      <div className="game-header spectator-header">
        <div className="game-title">
          <div className="spectator-info">
            <div className="spectator-title">
              {text.watching} <span className="spectator-name">{current.username}</span>
            </div>
            <div className="spectator-controls">
              <button
                className="spectator-btn spectator-btn-prev"
                onClick={() => setIndex((prev) => (prev <= 0 ? list.length - 1 : prev - 1))}
                disabled={list.length <= 1}
              >
                <span className="spectator-btn-icon">&larr;</span>
                {text.previous}
              </button>
              <button
                className="spectator-btn spectator-btn-next"
                onClick={() => setIndex((prev) => (prev + 1) % list.length)}
                disabled={list.length <= 1}
              >
                {text.next}
                <span className="spectator-btn-icon">&rarr;</span>
              </button>
            </div>
            <div className="spectator-actions">
              <button className="back-button" onClick={onBack}>{text.back}</button>
            </div>
          </div>
        </div>
        <div className="game-stats">
          <div className="stat">
            <span className="stat-label">{text.score}</span>
            <span className="stat-value">{(current.score ?? 0).toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{text.lines}</span>
            <span className="stat-value">{(current.lines ?? 0).toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{text.level}</span>
            <span className="stat-value">{(current.level ?? 1).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="game-layout spectator-layout">
        <div className="hold-panel">
          <h3>{text.hold}</h3>
          <div className="next-grid piece-preview-grid" role="grid" aria-label={text.holdPieceLabel}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${holdPreview.width}, var(--cell-size))`,
                gridTemplateRows: `repeat(${holdPreview.height}, var(--cell-size))`,
                gap: '2px',
              }}
            >
              {holdPreview.grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`hold-${rowIndex}-${colIndex}`}
                    className={`cell cell-${cell}`}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div
          className="game-board"
          role="grid"
          aria-label={text.boardLabel}
          style={{
            gridTemplateColumns: `repeat(${boardWidth}, var(--cell-size))`,
            gridTemplateRows: `repeat(${boardHeight}, var(--cell-size))`,
            '--cell-size': `clamp(14px, min(calc((100vh - 220px) / ${boardHeight}), calc((100vw - 420px) / ${boardWidth})), 48px)`,
          }}
        >
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
          <h3>{text.nextPiece}</h3>
          <div className="next-grid" role="grid" aria-label={text.nextPieceLabel}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${nextPreview.width}, var(--cell-size))`,
                gridTemplateRows: `repeat(${nextPreview.height}, var(--cell-size))`,
                gap: '2px',
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
    </>
  )
}

export default SpectatorView
