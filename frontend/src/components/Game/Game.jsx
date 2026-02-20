import './Game.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import TetriminosClouds from '../TetriminosClouds/TetriminosClouds'
import ShadowBoards from '../ShadowBoards/ShadowBoards'
import SpectatorView from '../SpectatorView/SpectatorView.jsx'
import GameOver from '../GameOver/GameOver'
import { socket } from '../../socket'

const WIDTH = 10
const HEIGHT = 20
const SOFT_DROP_MS = 60
const DAS_MS = 220
const ARR_MS = 60

const SHAPES = {
  i: [
    [[0, 1], [1, 1], [2, 1], [3, 1]], // vertical - match backend rotation 1
  ],
  o: [
    [[0, 1], [0, 2], [1, 1], [1, 2]],
  ],
  t: [
    [[0, 1], [1, 0], [1, 1], [1, 2]],
  ],
  s: [
    [[0, 1], [0, 2], [1, 0], [1, 1]],
  ],
  z: [
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  l: [
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
  j: [
    [[0, 2], [1, 0], [1, 1], [1, 2]],
  ],
}

const makeEmptyBoard = () =>
  Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => 'empty')
  )

function Game({ theme, onBack, onPlayAgain, onSpectate, roomId, username, isMultiplayer: isMultiplayerProp }) {
  const isMultiplayer = isMultiplayerProp ?? Boolean(roomId)

  const [board, setBoard] = useState(makeEmptyBoard)
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
  const [roomStatus, setRoomStatus] = useState(null)

  const softDropTimerRef = useRef(null)
  const dasTimerRef = useRef(null)
  const arrTimerRef = useRef(null)
  const heldDirectionRef = useRef(null)
  const joinedRef = useRef(false)

  const emitMove = (action) => {
    if (!action || !roomId || !username) return
    if (isPaused || isEliminated) return
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
    if (!roomId || !username) {
      onBack?.()
      return
    }

    socket.emit(
      'leaveGame',
      { roomId: String(roomId), username },
      () => {
        onBack?.()
      }
    )
  }

  useEffect(() => {
    if (joinedRef.current) return
    joinedRef.current = true

    const handleGameStarted = () => {
      setBoard(makeEmptyBoard())
      setIsPaused(false)
      setShowMenu(false)
      setStats({ score: 0, lines: 0, level: 1 })
      setWinner(null)
      setIsEliminated(false)
      setShowSpectator(false)
      setIsGameOver(false)
    }

    const handleGameState = (gameState) => {
      setGamePlayers(gameState?.players || [])
      const me = gameState?.players?.find((p) => p.username === username)
      if (me) {
        setBoard(me.board || makeEmptyBoard())
        setStats({
          score: me.score ?? 0,
          lines: me.lines ?? 0,
          level: me.level ?? 1,
        })
        setNextType(me.nextType || null)

        if (me.isAlive === false) {
          setIsEliminated(true)
        }
      }

      if (isMultiplayer) {
        const others = (gameState?.players || [])
          .filter((p) => p.username !== username)
          .map((p) => ({
            username: p.username,
            board: p.boardLocked || makeEmptyBoard(),
          }))
        setOpponentBoards(others)
      }
    }

    const handleGameOver = ({ winner }) => {
      console.log('Game over! Winner:', winner)
      setWinner(winner || null)
      setIsEliminated(true)
      setIsGameOver(true)
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
    }
  }, [roomId, username, isMultiplayer])

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

      if (event.key === 'ArrowLeft') {
        startHorizontalAutoMove(-1)
      } else if (event.key === 'ArrowRight') {
        startHorizontalAutoMove(1)
      } else if (event.key === 'ArrowDown') {
        startSoftDrop()
        emitMove('drop')
      } else if (event.key === 'ArrowUp') {
        emitMove('rotate')
      } else if (event.key === ' ') {
        emitMove('hardDrop')
      }
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
    if (!isMultiplayer && roomId) {
      socket.emit('pauseGame', { roomId: String(roomId), paused: isPaused })
    }
  }, [isPaused])

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
