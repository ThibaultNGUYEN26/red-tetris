import './Game.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import TetriminosClouds from '../TetriminosClouds/TetriminosClouds'

const WIDTH = 10
const HEIGHT = 20
const DROP_MS = 500

const SHAPES = {
  i: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
  ],
  o: [
    [[0, 1], [0, 2], [1, 1], [1, 2]],
  ],
  t: [
    [[0, 1], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 1]],
    [[0, 1], [1, 0], [1, 1], [2, 1]],
  ],
  s: [
    [[0, 1], [0, 2], [1, 0], [1, 1]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
  ],
  z: [
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 2], [1, 1], [1, 2], [2, 1]],
  ],
  j: [
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 0], [2, 1]],
  ],
  l: [
    [[0, 2], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [1, 2], [2, 0]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
  ],
}

const makeEmptyBoard = () =>
  Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => 'empty')
  )

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function Game({ onBack }) {
  const pieceQueue = useMemo(
    () => 'soiltzjsoiltzjsoiltzjsoiltzjsoiltzj'.split(''),
    []
  )
  const queueIndexRef = useRef(2)
  const nextTypeRef = useRef(pieceQueue[1])
  const boardRef = useRef(makeEmptyBoard())

  const [board, setBoard] = useState(makeEmptyBoard)
  const [activePiece, setActivePiece] = useState(() => ({
    type: pieceQueue[0],
    rotation: 0,
    row: 0,
    col: 3,
  }))
  const [nextType, setNextType] = useState(pieceQueue[1])

  const getCells = (piece) =>
    SHAPES[piece.type][piece.rotation].map(([r, c]) => [
      piece.row + r,
      piece.col + c,
    ])

  const isValidPosition = (piece, grid = boardRef.current) => {
    if (!grid) return false
    return getCells(piece).every(([r, c]) => {
      if (c < 0 || c >= WIDTH || r >= HEIGHT) return false
      if (r < 0) return true
      return grid[r][c] === 'empty'
    })
  }

  const lockPiece = (piece, grid) => {
    const nextGrid = grid.map((row) => row.slice())
    getCells(piece).forEach(([r, c]) => {
      if (r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH) {
        nextGrid[r][c] = piece.type
      }
    })
    return nextGrid
  }

  const clearLines = (grid) => {
    const remaining = grid.filter((row) => row.some((cell) => cell === 'empty'))
    const cleared = HEIGHT - remaining.length
    if (cleared === 0) return grid
    const newRows = Array.from({ length: cleared }, () =>
      Array.from({ length: WIDTH }, () => 'empty')
    )
    return [...newRows, ...remaining]
  }

  const spawnPiece = () => {
    const type = nextTypeRef.current
    const nextIndex = queueIndexRef.current % pieceQueue.length
    const upcoming = pieceQueue[nextIndex]
    queueIndexRef.current = (nextIndex + 1) % pieceQueue.length
    nextTypeRef.current = upcoming
    setNextType(upcoming)
    return {
      type,
      rotation: 0,
      row: -1,
      col: 3,
    }
  }

  const tryMove = (deltaRow, deltaCol, rotationDelta = 0) => {
    setActivePiece((prev) => {
      const rotations = SHAPES[prev.type].length
      const next = {
        ...prev,
        row: prev.row + deltaRow,
        col: clamp(prev.col + deltaCol, -2, WIDTH - 1),
        rotation: (prev.rotation + rotationDelta + rotations) % rotations,
      }
      return isValidPosition(next) ? next : prev
    })
  }

  const hardDrop = () => {
    setActivePiece((prev) => {
      let next = { ...prev }
      while (isValidPosition({ ...next, row: next.row + 1 })) {
        next = { ...next, row: next.row + 1 }
      }
      return next
    })
  }

  useEffect(() => {
    boardRef.current = board
  }, [board])

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePiece((prev) => {
        const next = { ...prev, row: prev.row + 1 }
        if (isValidPosition(next)) {
          return next
        }

        const locked = lockPiece(prev, boardRef.current)
        const nextBoard = clearLines(locked)
        boardRef.current = nextBoard
        setBoard(nextBoard)

        const spawned = spawnPiece()
        if (!isValidPosition(spawned, nextBoard)) {
          const resetBoard = makeEmptyBoard()
          setBoard(resetBoard)
          boardRef.current = resetBoard
          queueIndexRef.current = 2
          nextTypeRef.current = pieceQueue[1]
          setNextType(pieceQueue[1])
          return {
            type: pieceQueue[0],
            rotation: 0,
            row: 0,
            col: 3,
          }
        }

        return spawned
      })
    }, DROP_MS)

    return () => clearInterval(timer)
  }, [pieceQueue])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return
      if (event.key === 'ArrowLeft') {
        tryMove(0, -1)
      } else if (event.key === 'ArrowRight') {
        tryMove(0, 1)
      } else if (event.key === 'ArrowDown') {
        tryMove(1, 0)
      } else if (event.key === 'ArrowUp') {
        tryMove(0, 0, 1)
      } else if (event.key === ' ') {
        hardDrop()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const boardWithActive = useMemo(() => {
    const grid = board.map((row) => row.slice())
    getCells(activePiece).forEach(([r, c]) => {
      if (r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH) {
        grid[r][c] = activePiece.type
      }
    })
    return grid
  }, [board, activePiece])

  const nextPreview = useMemo(() => {
    const shape = SHAPES[nextType][0]
    // Find bounding box
    const rows = shape.map(([r]) => r)
    const cols = shape.map(([, c]) => c)
    const minRow = Math.min(...rows)
    const maxRow = Math.max(...rows)
    const minCol = Math.min(...cols)
    const maxCol = Math.max(...cols)
    
    // Create grid with only the needed size
    const height = maxRow - minRow + 1
    const width = maxCol - minCol + 1
    const preview = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => 'empty')
    )
    
    // Fill in the shape, adjusted for the bounding box
    shape.forEach(([r, c]) => {
      preview[r - minRow][c - minCol] = nextType
    })
    
    return { grid: preview, width, height }
  }, [nextType])

  return (
    <div className="game-screen">
      <TetriminosClouds />

      <div className="game-card">
        <div className="game-header">
          <div className="game-title">
            <h2>Game</h2>
            <button className="game-back" onClick={onBack}>
              Back to menu
            </button>
          </div>
          <div className="game-stats">
            <div className="stat">
              <span className="stat-label">Score</span>
              <span className="stat-value">12,480</span>
            </div>
            <div className="stat">
              <span className="stat-label">Lines</span>
              <span className="stat-value">18</span>
            </div>
            <div className="stat">
              <span className="stat-label">Level</span>
              <span className="stat-value">4</span>
            </div>
          </div>
        </div>

        <div className="game-layout">
          <div className="game-board" role="grid" aria-label="Tetris board">
            {boardWithActive.map((row, rowIndex) =>
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default Game
