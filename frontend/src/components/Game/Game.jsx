import './Game.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import TetriminosClouds from '../TetriminosClouds/TetriminosClouds'
import ShadowBoards from '../ShadowBoards/ShadowBoards'
import SpectatorView from '../SpectatorView/SpectatorView.jsx'
import GameOver from '../GameOver/GameOver'
import { socket } from '../../socket'
import tetrisRemix from '../../res/sounds/tetris_remix.mp3'
import levelUpSound from '../../res/sounds/level_up.mp3'
import tetrisSound from '../../res/sounds/tetris.mp3'
import pauseSound from '../../res/sounds/pause.mp3'
import clearSound from '../../res/sounds/clear.mp3'
import winnerSound from '../../res/sounds/winner.mp3'
import loserSound from '../../res/sounds/loser.mp3'

const DEFAULT_BOARD = { width: 10, height: 20 }
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

const getBoardSize = (mode) =>
  mode === 'giant' ? { width: 15, height: 30 } : DEFAULT_BOARD

const makeEmptyBoard = (size = DEFAULT_BOARD) =>
  Array.from({ length: size.height }, () =>
    Array.from({ length: size.width }, () => 'empty')
  )

function Game({
  theme,
  onBack,
  onPlayAgain,
  onSpectate,
  roomId,
  username,
  isMultiplayer: isMultiplayerProp,
  soundEnabled = true,
  onSoundChange,
}) {
  const isMultiplayer = isMultiplayerProp ?? Boolean(roomId)

  const [board, setBoard] = useState(() => makeEmptyBoard(DEFAULT_BOARD))
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD)
  const [nextType, setNextType] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [stats, setStats] = useState({ score: 0, lines: 0, level: 1 })
  const [opponentBoards, setOpponentBoards] = useState([])
  const [gamePlayers, setGamePlayers] = useState([])
  const [winner, setWinner] = useState(null)
  const [isEliminated, setIsEliminated] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [showSpectator, setShowSpectator] = useState(false)
  const [gameMode, setGameMode] = useState(null)
  const [activePlayerUsername, setActivePlayerUsername] = useState(null)

  const softDropTimerRef = useRef(null)
  const dasTimerRef = useRef(null)
  const arrTimerRef = useRef(null)
  const heldDirectionRef = useRef(null)
  const joinedRef = useRef(false)
  const exitingRef = useRef(false)
  const musicRef = useRef(null)
  const levelUpRef = useRef(null)
  const lastLevelRef = useRef(1)
  const tetrisRef = useRef(null)
  const lastLinesRef = useRef(0)
  const pauseRef = useRef(null)
  const clearRef = useRef(null)
  const wasBoardEmptyRef = useRef(true)
  const winnerRef = useRef(null)
  const loserRef = useRef(null)

  const startMusic = () => {
    if (!soundEnabled) return
    const audio = musicRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  const pauseMusic = () => {
    const audio = musicRef.current
    if (!audio) return
    audio.pause()
  }

  const resumeMusic = () => {
    if (!soundEnabled) return
    const audio = musicRef.current
    if (!audio) return
    audio.play().catch(() => {})
  }

  const stopMusic = () => {
    const audio = musicRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
  }

  const stopAllSfx = () => {
    const refs = [levelUpRef, tetrisRef, pauseRef, clearRef, winnerRef, loserRef]
    refs.forEach((ref) => {
      if (!ref?.current) return
      ref.current.pause()
      ref.current.currentTime = 0
    })
  }

  const emitMove = (action) => {
    if (!action || !roomId || !username) return
    if (isPaused || isEliminated) return
    if (
      isMultiplayer &&
      gameMode === 'cooperative' &&
      activePlayerUsername &&
      activePlayerUsername !== username
    ) {
      return
    }
    socket.emit('movePiece', { roomId: String(roomId), action })
  }

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

  const startHorizontalAutoMove = (direction) => {
    if (isPaused) return
    if (heldDirectionRef.current === direction) return
    stopHorizontalAutoMove()
    heldDirectionRef.current = direction

    const action = direction < 0 ? 'left' : 'right'
    emitMove(action)

    dasTimerRef.current = setTimeout(() => {
      if (heldDirectionRef.current !== direction) return
      arrTimerRef.current = setInterval(() => {
        if (heldDirectionRef.current !== direction) return
        emitMove(action)
      }, ARR_MS)
    }, DAS_MS)
  }

  const startSoftDrop = () => {
    if (softDropTimerRef.current) return
    softDropTimerRef.current = setInterval(() => {
      if (isPaused) return
      emitMove('drop')
    }, SOFT_DROP_MS)
  }

  const handleLeaveGame = () => {
    if (!roomId) {
      stopMusic();
      onBack?.();
      return;
    }

    socket.emit(
      "playerLeave",
      { roomId: String(roomId) },
      () => {
        stopMusic();
        onBack?.();
      }
    );
  };

  useEffect(() => {
    if (!musicRef.current) {
      musicRef.current = new Audio(tetrisRemix)
      musicRef.current.loop = true
      musicRef.current.preload = 'auto'
      musicRef.current.volume = 0.1
    }
    if (!levelUpRef.current) {
      levelUpRef.current = new Audio(levelUpSound)
      levelUpRef.current.preload = 'auto'
      levelUpRef.current.volume = 0.1
    }
    if (!tetrisRef.current) {
      tetrisRef.current = new Audio(tetrisSound)
      tetrisRef.current.preload = 'auto'
      tetrisRef.current.volume = 0.1
    }
    if (!pauseRef.current) {
      pauseRef.current = new Audio(pauseSound)
      pauseRef.current.preload = 'auto'
      pauseRef.current.volume = 0.1
    }
    if (!clearRef.current) {
      clearRef.current = new Audio(clearSound)
      clearRef.current.preload = 'auto'
      clearRef.current.volume = 0.1
    }
    if (!winnerRef.current) {
      winnerRef.current = new Audio(winnerSound)
      winnerRef.current.preload = 'auto'
      winnerRef.current.volume = 0.1
    }
    if (!loserRef.current) {
      loserRef.current = new Audio(loserSound)
      loserRef.current.preload = 'auto'
      loserRef.current.volume = 0.1
    }

    if (joinedRef.current) return
    joinedRef.current = true

    const handleGameStarted = () => {
      setBoard(makeEmptyBoard(boardSize))
      setIsPaused(false)
      setShowMenu(false)
      setStats({ score: 0, lines: 0, level: 1 })
      setWinner(null)
      setIsEliminated(false)
      setShowSpectator(false)
      setIsGameOver(false)
      setActivePlayerUsername(null)
      lastLevelRef.current = 1
      lastLinesRef.current = 0
      wasBoardEmptyRef.current = true
      startMusic()
    }

    const handleGameState = (gameState) => {
      const mode = gameState?.mode || null
      setGameMode(mode)
      setBoardSize(getBoardSize(mode))
      setActivePlayerUsername(gameState?.currentTurnUsername || null)
      setGamePlayers(gameState?.players || [])
      const me = gameState?.players?.find((p) => p.username === username)
      const isLeavingSolo = !isMultiplayer && exitingRef.current
      if (me) {
        setBoard(me.board || makeEmptyBoard(getBoardSize(mode)))
        setStats({
          score: me.score ?? 0,
          lines: me.lines ?? 0,
          level: me.level ?? 1,
        })
        setNextType(me.nextType || null)

        if (me.isAlive === false && !isLeavingSolo) {
          setIsEliminated(true)
        }
      }

      if (isMultiplayer) {
        if (gameState?.mode === 'cooperative') {
          setOpponentBoards([])
        } else {
          const others = (gameState?.players || [])
            .filter((p) => p.username !== username)
            .map((p) => ({
              username: p.username,
              board: p.boardLocked || makeEmptyBoard(getBoardSize(mode)),
            }))
          setOpponentBoards(others)
        }
      }
    }

    const handleGameOver = ({ winner }) => {
      if (!isMultiplayer && exitingRef.current) return
      console.log('Game over! Winner:', winner)
      setWinner(winner || null)
      setIsEliminated(true)
      setIsGameOver(true)
      stopMusic()
      if (soundEnabled && isMultiplayer && winner && username) {
        if (winner === username) {
          winnerRef.current?.play().catch(() => {})
        } else {
          loserRef.current?.play().catch(() => {})
        }
      }
    }

    socket.on('gameStarted', handleGameStarted)
    socket.on('gameState', handleGameState)
    socket.on('gameOver', handleGameOver)

    socket.emit('joinRoom', { roomId: String(roomId), username })
    socket.emit('getRoomState', { roomId: String(roomId) })

    return () => {
      socket.off('gameStarted', handleGameStarted)
      socket.off('gameState', handleGameState)
      socket.off('gameOver', handleGameOver)
      stopMusic()
    }
  }, [roomId, username, isMultiplayer])

  useEffect(() => {
    if (!levelUpRef.current) return
    if (!soundEnabled) return
    if (stats.level > lastLevelRef.current) {
      levelUpRef.current.currentTime = 0
      levelUpRef.current.play().catch(() => {})
    }
    lastLevelRef.current = stats.level
  }, [stats.level])

  useEffect(() => {
    if (!tetrisRef.current) return
    if (!soundEnabled) return
    const delta = stats.lines - lastLinesRef.current
    if (delta === 4) {
      tetrisRef.current.currentTime = 0
      tetrisRef.current.play().catch(() => {})
    }
    lastLinesRef.current = stats.lines
  }, [stats.lines])

  useEffect(() => {
    if (!clearRef.current) return
    if (!soundEnabled) return
    const isEmpty = board.every((row) => row.every((cell) => cell === 'empty'))
    if (!wasBoardEmptyRef.current && isEmpty) {
      clearRef.current.currentTime = 0
      clearRef.current.play().catch(() => {})
    }
    wasBoardEmptyRef.current = isEmpty
  }, [board])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return
      const isMirrorMode = gameMode === 'speed'
      if (event.key === 'Escape' && !isMultiplayer) {
        setIsPaused(true)
        stopSoftDrop()
        return
      }
      if (event.key === 'Escape' && isMultiplayer) {
        setShowMenu(true)
        return
      }

      if (event.key === 'ArrowLeft') {
        startHorizontalAutoMove(isMirrorMode ? 1 : -1)
      } else if (event.key === 'ArrowRight') {
        startHorizontalAutoMove(isMirrorMode ? -1 : 1)
      } else if (event.key === 'ArrowDown') {
        if (isMirrorMode) {
          emitMove('hardDrop')
        } else {
          startSoftDrop()
          emitMove('drop')
        }
      } else if (event.key === 'ArrowUp') {
        emitMove('rotate')
      } else if (event.key === ' ') {
        if (isMirrorMode) {
          startSoftDrop()
          emitMove('drop')
        } else {
          emitMove('hardDrop')
        }
      }
    }

    const handleKeyUp = (event) => {
      const isMirrorMode = gameMode === 'speed'
      if ((!isMirrorMode && event.key === 'ArrowDown') || (isMirrorMode && event.key === ' ')) {
        stopSoftDrop()
      }
      if (
        (event.key === 'ArrowLeft' && heldDirectionRef.current === (isMirrorMode ? 1 : -1)) ||
        (event.key === 'ArrowRight' && heldDirectionRef.current === (isMirrorMode ? -1 : 1))
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
  }, [isPaused, isMultiplayer, roomId, username, gameMode, activePlayerUsername, isEliminated])

  useEffect(() => {
    if (isPaused) {
      stopSoftDrop()
    }
    if (!isMultiplayer && roomId) {
      socket.emit('pauseGame', { roomId: String(roomId), paused: isPaused })
    }
  }, [isPaused])

  useEffect(() => {
    if (!soundEnabled) {
      stopMusic()
      stopAllSfx()
      return
    }
    if (isMultiplayer) return
    if (isPaused) {
      if (pauseRef.current) {
        pauseRef.current.currentTime = 0
        pauseRef.current.play().catch(() => {})
      }
      pauseMusic()
      return
    }
    if (!isGameOver) {
      resumeMusic()
    }
  }, [isPaused, isMultiplayer, isGameOver, soundEnabled])

  const nextPreview = useMemo(() => {
    if (!nextType || !SHAPES[nextType]) {
      return { grid: [], width: 0, height: 0 }
    }

    const shape = SHAPES[nextType][0]
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
  }, [nextType])

  const isCooperativeMode = isMultiplayer && gameMode === 'cooperative'
  const isYourTurn =
    isCooperativeMode && activePlayerUsername && activePlayerUsername === username
  const cooperativeTurnLabel = isCooperativeMode
    ? isYourTurn
      ? 'YOUR TURN'
      : activePlayerUsername
        ? `Playing: ${activePlayerUsername}`
        : 'Playing: ...'
    : null

  if (isMultiplayer && isEliminated && !winner && showSpectator && !isGameOver) {
    return (
      <div className={`game-screen ${theme === 'dark' ? 'dark' : ''}`}>
        <TetriminosClouds />
        <div className="game-card">
          <SpectatorView players={gamePlayers} onBack={onBack} username={username} />
        </div>
      </div>
    )
  }

  return (
    <div className={`game-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <TetriminosClouds />

      <div className="game-card">
        <GameOver
          winner={winner}
          isEliminated={isEliminated}
          isGameOver={isGameOver}
          isMultiplayer={isMultiplayer}
          gameMode={gameMode}
          username={username}
          onBack={onBack}
          onPlayAgain={onPlayAgain}
          onSpectate={
            isMultiplayer && isEliminated && !winner && !isGameOver
              ? () => {
                  setShowSpectator(true)
                  onSpectate?.()
                }
              : null
          }
        />
        <div className="game-header">
          <div className="game-title">
            <div className="game-options-stack">
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
              {cooperativeTurnLabel && (
                <div
                  className={`turn-indicator${isYourTurn ? ' is-your-turn' : ''}`}
                >
                  {cooperativeTurnLabel}
                </div>
              )}
            </div>
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
          <div
            className="game-board"
            role="grid"
            aria-label="Tetris board"
            style={{
              gridTemplateColumns: `repeat(${boardSize.width}, var(--cell-size))`,
              gridTemplateRows: `repeat(${boardSize.height}, var(--cell-size))`,
              ['--cell-size']: `clamp(14px, min(calc((100vh - 220px) / ${boardSize.height}), calc((100vw - 420px) / ${boardSize.width})), 48px)`,
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

        {!isMultiplayer && isPaused && (
          <div className="pause-overlay" role="dialog" aria-modal="true">
            <div className="pause-card">
              <h3>Paused</h3>
              <div className="pause-actions">
                <button
                  className={soundEnabled ? 'resume-button' : 'back-button'}
                  onClick={() => onSoundChange?.(!soundEnabled)}
                >
                  {soundEnabled ? 'Sound: On' : 'Sound: Off'}
                </button>
                <button
                  className="resume-button"
                  onClick={() => setIsPaused(false)}
                >
                  Resume
                </button>
                <button className="back-button" onClick={handleLeaveGame}>
                  Leave game
                </button>
              </div>
            </div>
          </div>
        )}

        {isMultiplayer && showMenu && (
          <div className="pause-overlay" role="dialog" aria-modal="true">
            <div className="pause-card">
              <h3>Game Menu</h3>
              <div className="pause-actions">
                <button
                  className={soundEnabled ? 'resume-button' : 'back-button'}
                  onClick={() => onSoundChange?.(!soundEnabled)}
                >
                  {soundEnabled ? 'Sound: On' : 'Sound: Off'}
                </button>
                <button
                  className="resume-button"
                  onClick={() => setShowMenu(false)}
                >
                  Resume
                </button>
                <button className="back-button" onClick={handleLeaveGame}>
                  Leave game
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
