import './Game.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import TetriminosClouds from '../TetriminosClouds/TetriminosClouds'
import ShadowBoards from '../ShadowBoards/ShadowBoards'
import { socket } from '../../socket'

const WIDTH = 10
const HEIGHT = 20
const DROP_MS = 500
const SOFT_DROP_MS = 60
const DAS_MS = 220
const ARR_MS = 60

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
    [[0, 1], [0, 2], [1, 0], [1, 1]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
  ],
  z: [
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 2], [1, 1], [1, 2], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 2], [1, 1], [1, 2], [2, 1]],
  ],
    l: [
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 0], [2, 1]],
  ],
  j: [
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

function Game({ theme, onBack, roomId, username, isMultiplayer: isMultiplayerProp }) {
  const isMultiplayer = isMultiplayerProp ?? Boolean(roomId)
  const useSockets = Boolean(roomId)
  // Server currently only provides piece sequences; client drives gravity/rendering.
  const usesServer = false
  const [pieceQueue, setPieceQueue] = useState([])

  const boardRef = useRef(makeEmptyBoard())
  const softDropTimerRef = useRef(null)
  const dasTimerRef = useRef(null)
  const arrTimerRef = useRef(null)
  const heldDirectionRef = useRef(null)
  const joinedRef = useRef(false)

  const [board, setBoard] = useState(makeEmptyBoard)
  const [activePiece, setActivePiece] = useState(null)
  const [nextType, setNextType] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [stats, setStats] = useState({ score: 0, lines: 0, level: 1 })

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

  const advanceQueue = () => {
    setPieceQueue(prev => {
      const nextQueue = prev.slice(1)

      if (nextQueue.length === 0) {
        console.error('Queue empty — backend desync')
        return prev
      }

      const nextPiece = {
        type: nextQueue[0],
        rotation: 0,
        row: 0,
        col: 3,
      }

      setActivePiece(nextPiece)
      setNextType(nextQueue[1] ?? null)

    if (useSockets && nextQueue.length <= 3) {
      socket.emit('requestNextBatch', { roomId, username })
    }

      return nextQueue
    })
  }

  const finalizePiece = (piece) => {
    const locked = lockPiece(piece, boardRef.current)
    const { board: nextBoard, cleared } = clearLines(locked)
    boardRef.current = nextBoard
    setBoard(nextBoard)

    if (useSockets && cleared > 0) {
      socket.emit('playerBoard', {
        roomId: String(roomId),
        username,
        board: nextBoard,
        clearedLines: cleared,
      })
    }

    advanceQueue()
  }

  const clearLines = (grid) => {
    const remaining = grid.filter((row) => row.some((cell) => cell === 'empty'))
    const cleared = HEIGHT - remaining.length
    if (cleared === 0) return { board: grid, cleared: 0 }
    const newRows = Array.from({ length: cleared }, () =>
      Array.from({ length: WIDTH }, () => 'empty')
    )
    return { board: [...newRows, ...remaining], cleared }
  }

  const tryMove = (deltaRow, deltaCol, rotationDelta = 0) => {
    setActivePiece((prev) => {
      if (!prev) return prev
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
    if (usesServer) {
      emitMove('hardDrop')
      return
    }
    setActivePiece((prev) => {
      if (!prev) return prev
      let next = { ...prev }
      const grid = boardRef.current
      while (isValidPosition({ ...next, row: next.row + 1 }, grid)) {
        next = { ...next, row: next.row + 1 }
      }
      finalizePiece(next)
      return null
    })
  }

  useEffect(() => {
    boardRef.current = board
  }, [board])

  /* Socket listeners for multiplayer game events */
  useEffect(() => {
    if (!useSockets) return;

    if (joinedRef.current) return;
    joinedRef.current = true;

    // Set up listeners FIRST before joining
    const handleGameStarted = ({ roomId: startedRoomId, initialSequence }) => {
      boardRef.current = makeEmptyBoard()
      setBoard(makeEmptyBoard())
      setIsPaused(false)
      setShowMenu(false)
      setStats({ score: 0, lines: 0, level: 1 })

      console.log('Game started from backend for room:', startedRoomId, 'with sequence:', initialSequence);
      // Mark that game has started so CreateRoom doesn't leave on unmount
      sessionStorage.setItem(`gameStarted_${startedRoomId}`, 'true');

      if (initialSequence && Array.isArray(initialSequence)) {
        // Map uppercase letters to lowercase for SHAPES lookup
        const mappedSequence = initialSequence.map(p => p.toLowerCase());
        setPieceQueue(mappedSequence);

        if (mappedSequence.length > 0) {
          // Set active piece to first piece in sequence
          setActivePiece({
            type: mappedSequence[0],
            rotation: 0,
            row: 0,
            col: 3,
          });

          // Set next piece display
          if (mappedSequence.length > 1) {
            setNextType(mappedSequence[1]);
          } else {
            setNextType(mappedSequence[0]);
          }
        }
      }
    };

    const handleGameState = (gameState) => {
      console.log('Received game state from backend:', gameState);
      const me = gameState?.players?.find((p) => p.username === username)
      if (me) {
        setStats({
          score: me.score ?? 0,
          lines: me.lines ?? 0,
          level: me.level ?? 1,
        })
      }
    };

    const handleGameOver = ({ winner }) => {
      console.log('Game over! Winner:', winner);
    };

    const handleNextPieceBatch = ({ nextBatch }) => {
      console.log('Received next piece batch from backend:', nextBatch);

      if (nextBatch && Array.isArray(nextBatch)) {
        const mappedBatch = nextBatch.map(p => p.toLowerCase());

        setPieceQueue(prev => {
          const newQueue = [...prev, ...mappedBatch];
          console.log(`   New queue length: ${newQueue.length}, mapped batch: ${mappedBatch.join(',')}`);
          return newQueue;
        });
      }
    };

    socket.on('gameStarted', handleGameStarted);
    socket.on('gameState', handleGameState);
    socket.on('gameOver', handleGameOver);
    socket.on('nextPieceBatch', handleNextPieceBatch);

    // Join the room since listeners are set up
    socket.emit("joinRoom", { roomId: String(roomId), username });
    console.log(`Game component joined room: ${roomId}`);

    // Request room state to trigger late-joiner gameStarted event if game already started
    socket.emit('getRoomState', { roomId: String(roomId) });

    return () => {
      socket.off('gameStarted', handleGameStarted);
      socket.off('gameState', handleGameState);
      socket.off('gameOver', handleGameOver);
      socket.off('nextPieceBatch', handleNextPieceBatch);
    };
  }, [useSockets, roomId, username]);

  const stopSoftDrop = () => {
    if (softDropTimerRef.current) {
      clearInterval(softDropTimerRef.current)
      softDropTimerRef.current = null
    }
  }

  const stopHorizontalAutoMove = () => {
    if (dasTimerRef.current) {
      clearTimeout(dasTimerRef.current)
      dasTimerRef.current = null
    }
    if (arrTimerRef.current) {
      clearInterval(arrTimerRef.current)
      arrTimerRef.current = null
    }
    heldDirectionRef.current = null
  }

  const emitMove = (action) => {
    if (!action || !usesServer || !roomId || !username) return
    socket.emit('movePiece', { roomId: String(roomId), username, action })
  }

  const startHorizontalAutoMove = (direction) => {
    if (isPaused) return
    if (heldDirectionRef.current === direction) return
    stopHorizontalAutoMove()
    heldDirectionRef.current = direction

    const action = direction < 0 ? 'left' : 'right'
    if (!usesServer) {
      tryMove(0, direction)
    }
    emitMove(action)

    dasTimerRef.current = setTimeout(() => {
      if (heldDirectionRef.current !== direction) return
      arrTimerRef.current = setInterval(() => {
        if (heldDirectionRef.current !== direction) return
        if (!usesServer) {
          tryMove(0, direction)
        }
        emitMove(action)
      }, ARR_MS)
    }, DAS_MS)
  }

  const startSoftDrop = () => {
    if (softDropTimerRef.current) return
    if (usesServer) {
      softDropTimerRef.current = setInterval(() => {
        if (isPaused) return
        emitMove('drop')
      }, SOFT_DROP_MS)
      return
    }
    softDropTimerRef.current = setInterval(() => {
      setActivePiece((prev) => {
        if (!prev || isPaused) return prev
        const next = { ...prev, row: prev.row + 1 }
        if (isValidPosition(next)) return next
        finalizePiece(prev)
        return null
      })
    }, SOFT_DROP_MS)
  }

  useEffect(() => {
    if (usesServer) return
    const timer = setInterval(() => {
      setActivePiece((prev) => {
        if (!prev || isPaused) return prev
        const next = { ...prev, row: prev.row + 1 }
        if (isValidPosition(next)) {
          return next
        }
        finalizePiece(prev)
        return null
      })
    }, DROP_MS)

    return () => clearInterval(timer)
  }, [isPaused])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return
      if (event.key === 'Escape' && !isMultiplayer) {
        setIsPaused(true)
        stopSoftDrop()
        return
      }
      if (event.key === 'Escape' && isMultiplayer) {
        setShowMenu(true)
        return
      }

      let action = null;

      if (event.key === 'ArrowLeft') {
        tryMove(0, -1)
        action = 'left'
      } else if (event.key === 'ArrowRight') {
        tryMove(0, 1)
        action = 'right'
      } else if (event.key === 'ArrowDown') {
        startSoftDrop()
        action = 'drop'
      } else if (event.key === 'ArrowUp') {
        tryMove(0, 0, 1)
        action = 'rotate'
      } else if (event.key === ' ') {
        hardDrop()
        action = 'hardDrop'
      }

      // Emit move to backend for multiplayer
      if (action && isMultiplayer && roomId && username) {
        socket.emit('movePiece', { roomId: String(roomId), username, action })
      }

      // Emit move to backend for multiplayer
      emitMove(action)
    }

    const handleKeyUp = (event) => {
      if (event.key === 'ArrowDown') {
        stopSoftDrop()
      }
      if (
        (event.key === 'ArrowLeft' && heldDirectionRef.current === -1) ||
        (event.key === 'ArrowRight' && heldDirectionRef.current === 1)
      ) {
        stopHorizontalAutoMove()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      stopSoftDrop()
      stopHorizontalAutoMove()
    }
  }, [isPaused, isMultiplayer, roomId, username])

  useEffect(() => {
    if (isPaused) {
      stopSoftDrop()
    }
  }, [isPaused])

  const boardWithActive = useMemo(() => {
    if (usesServer) return board
    const grid = board.map((row) => row.slice())

    if (!activePiece) {
      return grid
    }

    const ghost = (() => {
      let next = { ...activePiece }
      while (isValidPosition({ ...next, row: next.row + 1 })) {
        next = { ...next, row: next.row + 1 }
      }
      return next
    })()

    getCells(ghost).forEach(([r, c]) => {
      if (r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH) {
        if (grid[r][c] === 'empty') {
          grid[r][c] = 'ghost'
        }
      }
    })

    getCells(activePiece).forEach(([r, c]) => {
      if (r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH) {
        grid[r][c] = activePiece.type
      }
    })
    return grid
  }, [board, activePiece, usesServer])

  const nextPreview = useMemo(() => {
    if (!nextType) {
      return { grid: [], width: 0, height: 0 }
    }

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
    <div className={`game-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <TetriminosClouds />

      <div className="game-card">
        <div className="game-header">
          <div className="game-title">
            <button
              className="game-options"
              onClick={() => {
                if (isMultiplayer) {
                  setShowMenu(true)
                  return
                }
                setIsPaused(true)
              }}
              disabled={isPaused}
            >
              Options
            </button>
          </div>
          <div className="game-stats">
            <div className="stat">
              <span className="stat-label">Score</span>
              <span className="stat-value">{stats.score.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Lines</span>
              <span className="stat-value">{stats.lines.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Level</span>
              <span className="stat-value">{stats.level.toLocaleString()}</span>
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
            <ShadowBoards
              board={board}
              isMultiplayer={isMultiplayer}
              roomId={roomId}
              username={username}
            />
          </div>
        </div>

        {!isMultiplayer && isPaused && (
          <div className="pause-overlay" role="dialog" aria-modal="true">
            <div className="pause-card">
              <h3>Paused</h3>
              <div className="pause-actions">
                <button
                  className="resume-button"
                  onClick={() => setIsPaused(false)}
                >
                  Resume
                </button>
                <button className="back-button" onClick={onBack}>
                  Back to menu
                </button>
              </div>
            </div>
          </div>
        )}

        {isMultiplayer && showMenu && (
          <div className="pause-overlay" role="dialog" aria-modal="true">
            <div className="pause-card">
              <h3>Leave game?</h3>
              <div className="pause-actions">
                <button
                  className="resume-button"
                  onClick={() => setShowMenu(false)}
                >
                  Continue
                </button>
                <button className="back-button" onClick={onBack}>
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Game
