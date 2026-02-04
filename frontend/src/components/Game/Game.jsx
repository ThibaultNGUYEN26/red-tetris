import './Game.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import TetriminosClouds from '../TetriminosClouds/TetriminosClouds'
import ShadowBoards from '../ShadowBoards/ShadowBoards'
import { socket } from '../../socket'

const WIDTH = 10
const HEIGHT = 20
const DROP_MS = 500
const SOFT_DROP_MS = 60

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

function Game({ theme, onBack, roomId, username, isMultiplayer: isMultiplayerProp }) {
  const isMultiplayer = isMultiplayerProp ?? Boolean(roomId)
  const [pieceQueue, setPieceQueue] = useState([])
  const [queueInitialized, setQueueInitialized] = useState(false)
  const queueIndexRef = useRef(0)
  const nextTypeRef = useRef(null)
  const boardRef = useRef(makeEmptyBoard())
  const softDropTimerRef = useRef(null)
  const piecesPlayedInSequence = useRef(0) // Track pieces in current 7-piece sequence
  const hasSentPing = useRef(false) // Track if we sent ping for current sequence

  const [board, setBoard] = useState(makeEmptyBoard)
  const [activePiece, setActivePiece] = useState(null)
  const [nextType, setNextType] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [opponentBoards, setOpponentBoards] = useState([])
  const lastBoardSentRef = useRef(0)

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

  const finalizePiece = (piece) => {
    const locked = lockPiece(piece, boardRef.current)
    const nextBoard = clearLines(locked)
    boardRef.current = nextBoard
    setBoard(nextBoard)

    // Track pieces played and send ping after 4th piece in each sequence
    piecesPlayedInSequence.current += 1
    console.log(`Pieces played in sequence: ${piecesPlayedInSequence.current}/7`)

    if (piecesPlayedInSequence.current === 4 && !hasSentPing.current) {
      // Send ping to backend after 4th piece
      console.log('Ping sent: requesting next 7-piece batch')
      if (roomId && username) {
        socket.emit('requestNextBatch', { roomId, username })
      }
      hasSentPing.current = true
    }

    // Reset counter and ping flag after 7 pieces
    if (piecesPlayedInSequence.current >= 7) {
      piecesPlayedInSequence.current = 0
      hasSentPing.current = false
      console.log('Sequence reset: starting new 7-piece batch')
    }

    const spawned = spawnPiece()
    if (!isValidPosition(spawned, nextBoard)) {
      const resetBoard = makeEmptyBoard()
      setBoard(resetBoard)
      boardRef.current = resetBoard
      queueIndexRef.current = 0
      nextTypeRef.current = pieceQueue[0]
      setNextType(pieceQueue[1] || pieceQueue[0])
      piecesPlayedInSequence.current = 0
      hasSentPing.current = false
      return {
        type: pieceQueue[0],
        rotation: 0,
        row: 0,
        col: 3,
      }
    }

    return spawned
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
    if (pieceQueue.length === 0 || nextTypeRef.current === null) {
      throw new Error('Backend error: No pieces in queue. Backend sequence generator failed.')
    }

    const type = nextTypeRef.current
    const nextIndex = (queueIndexRef.current + 1) % pieceQueue.length
    const upcoming = pieceQueue[nextIndex]
    queueIndexRef.current = nextIndex
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
    setActivePiece((prev) => {
      if (!prev) return prev
      let next = { ...prev }
      while (isValidPosition({ ...next, row: next.row + 1 })) {
        next = { ...next, row: next.row + 1 }
      }
      return finalizePiece(next)
    })
  }

  useEffect(() => {
    boardRef.current = board
  }, [board])

  /* Socket listeners for multiplayer game events */
  useEffect(() => {
    if (!isMultiplayer) return;

    // Set up listeners FIRST before joining
    const handleGameStarted = ({ roomId: startedRoomId, initialSequence }) => {
      console.log('🎮 Game started from backend for room:', startedRoomId, 'with sequence:', initialSequence);
      // Mark that game has started so CreateRoom doesn't leave on unmount
      sessionStorage.setItem(`gameStarted_${startedRoomId}`, 'true');
      
      if (initialSequence && Array.isArray(initialSequence)) {
        // Map uppercase letters to lowercase for SHAPES lookup
        const mappedSequence = initialSequence.map(p => p.toLowerCase());
        setPieceQueue(mappedSequence);
        setQueueInitialized(true);
        
        if (mappedSequence.length > 0) {
          // Set active piece to first piece
          setActivePiece({
            type: mappedSequence[0],
            rotation: 0,
            row: 0,
            col: 3,
          });
          
          // Initialize refs for spawning:
          // nextTypeRef = what to spawn next (piece 1)
          // queueIndexRef = index of nextTypeRef in the queue
          queueIndexRef.current = 1; // nextTypeRef points to index 1
          nextTypeRef.current = mappedSequence[1] || mappedSequence[0];
          
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
      console.log('📊 Received game state from backend:', gameState);
      // Update game state from backend if needed
    };

    const handleGameOver = ({ winner }) => {
      console.log('🏁 Game over! Winner:', winner);
      // Handle game over
    };

    const handleNextPieceBatch = ({ nextBatch }) => {
      console.log('📦 Received next piece batch from backend:', nextBatch);
      if (nextBatch && Array.isArray(nextBatch)) {
        const mappedBatch = nextBatch.map(p => p.toLowerCase());
        setPieceQueue(prev => [...prev, ...mappedBatch]);
      }
    };

    socket.on('gameStarted', handleGameStarted);
    socket.on('gameState', handleGameState);
    socket.on('gameOver', handleGameOver);
    socket.on('nextPieceBatch', handleNextPieceBatch);

    // NOW join the room since listeners are set up
    socket.emit("joinRoom", { roomId: String(roomId), username });
    console.log(`🎮 Game component joined room: ${roomId}`);

    // Request room state to trigger late-joiner gameStarted event if game already started
    socket.emit('getRoomState', { roomId: String(roomId) });

    return () => {
      socket.off('gameStarted', handleGameStarted);
      socket.off('gameState', handleGameState);
      socket.off('gameOver', handleGameOver);
      socket.off('nextPieceBatch', handleNextPieceBatch);
    };
  }, [isMultiplayer, roomId, username]);

  const stopSoftDrop = () => {
    if (softDropTimerRef.current) {
      clearInterval(softDropTimerRef.current)
      softDropTimerRef.current = null
    }
  }

  const startSoftDrop = () => {
    if (softDropTimerRef.current) return
    softDropTimerRef.current = setInterval(() => {
      setActivePiece((prev) => {
        if (!prev || isPaused) return prev
        const next = { ...prev, row: prev.row + 1 }
        if (isValidPosition(next)) {
          return next
        }
        return finalizePiece(prev)
      })
    }, SOFT_DROP_MS)
  }

  useEffect(() => {
    // Don't start the game loop until pieces are loaded
    if (!queueInitialized || pieceQueue.length === 0) return;

    const timer = setInterval(() => {
      setActivePiece((prev) => {
        if (!prev || isPaused) return prev
        const next = { ...prev, row: prev.row + 1 }
        if (isValidPosition(next)) {
          return next
        }
        return finalizePiece(prev)
      })
    }, DROP_MS)

    return () => clearInterval(timer)
  }, [pieceQueue, isPaused, queueInitialized])

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
      if (isPaused || !queueInitialized) return // Don't allow moves until game is initialized
      
      let action = null;
      
      if (event.key === 'ArrowLeft') {
        tryMove(0, -1)
        action = 'left'
      } else if (event.key === 'ArrowRight') {
        tryMove(0, 1)
        action = 'right'
      } else if (event.key === 'ArrowDown') {
        tryMove(1, 0)
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
    }

    const handleKeyUp = (event) => {
      if (event.key === 'ArrowDown') {
        stopSoftDrop()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      stopSoftDrop()
    }
  }, [isPaused, isMultiplayer, roomId, username, queueInitialized])

  useEffect(() => {
    if (isPaused) {
      stopSoftDrop()
    }
  }, [isPaused])

  const boardWithActive = useMemo(() => {
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
  }, [board, activePiece])

  useEffect(() => {
    if (!isMultiplayer || !roomId || !username) return
    const now = Date.now()
    if (now - lastBoardSentRef.current < 120) return
    lastBoardSentRef.current = now
    socket.emit('playerBoard', { roomId, username, board: boardWithActive })
  }, [boardWithActive, isMultiplayer, roomId, username])

  useEffect(() => {
    if (!isMultiplayer) return

    const handlePlayerBoard = ({ username: sender, board }) => {
      if (!sender || !Array.isArray(board)) return
      if (sender === username) return
      setOpponentBoards((prev) => {
        const filtered = prev.filter((p) => p.username !== sender)
        return [...filtered, { username: sender, board }]
      })
    }

    socket.on('playerBoard', handlePlayerBoard)
    return () => socket.off('playerBoard', handlePlayerBoard)
  }, [isMultiplayer, username])

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
            {isMultiplayer && <ShadowBoards boards={opponentBoards} />}
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
