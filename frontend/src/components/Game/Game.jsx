import './Game.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { unstable_batchedUpdates } from 'react-dom'
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
const SHARED_BOARD_MODES = ['cooperative', 'cooperative_roles']

const SHAPES = {
  i: [
    [[1, 0], [1, 1], [1, 2], [1, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 1], [1, 1], [2, 1], [3, 1]],
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

const getBoardSize = (mode) =>
  mode === 'giant' ? { width: 15, height: 30 } : DEFAULT_BOARD

const makeEmptyBoard = (size = DEFAULT_BOARD) =>
  Array.from({ length: size.height }, () =>
    Array.from({ length: size.width }, () => 'empty')
  )

const cloneBoard = (source, size) => {
  if (!source?.length) return makeEmptyBoard(size)
  return source.map((row) => row.slice())
}

const canPlacePiece = (piece, x, y, lockedBoard, size) => {
  if (!piece || !lockedBoard?.length) return false
  const shape = SHAPES[piece.type]?.[piece.rotation]
  if (!shape) return false

  return shape.every(([row, col]) => {
    const boardX = x + col
    const boardY = y + row
    if (boardX < 0 || boardX >= size.width || boardY >= size.height) return false
    if (boardY < 0) return true
    return lockedBoard[boardY]?.[boardX] === 'empty'
  })
}

const getGhostY = (piece, lockedBoard, size) => {
  let ghostY = piece.y
  while (canPlacePiece(piece, piece.x, ghostY + 1, lockedBoard, size)) {
    ghostY += 1
  }
  return ghostY
}

const renderPredictedBoard = ({ lockedBoard, currentPiece, size }) => {
  const grid = cloneBoard(lockedBoard, size)
  const shape = SHAPES[currentPiece?.type]?.[currentPiece?.rotation]
  if (!currentPiece || !shape) return grid

  const ghostY = getGhostY(currentPiece, lockedBoard, size)
  shape.forEach(([row, col]) => {
    const boardY = ghostY + row
    const boardX = currentPiece.x + col
    if (boardY >= 0 && boardY < size.height && boardX >= 0 && boardX < size.width) {
      if (grid[boardY][boardX] === 'empty') {
        grid[boardY][boardX] = 'ghost'
      }
    }
  })

  shape.forEach(([row, col]) => {
    const boardY = currentPiece.y + row
    const boardX = currentPiece.x + col
    if (boardY >= 0 && boardY < size.height && boardX >= 0 && boardX < size.width) {
      if (grid[boardY][boardX] === 'empty' || grid[boardY][boardX] === 'ghost') {
        grid[boardY][boardX] = currentPiece.type
      }
    }
  })

  return grid
}

const getRotatedPiece = (piece, lockedBoard, size) => {
  const rotations = SHAPES[piece.type]
  if (!rotations?.length) return null
  const from = piece.rotation
  const to = (from + 1) % rotations.length
  const key = `${from}>${to}`
  const kicksJLSTZ = {
    '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  }
  const kicksI = {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  }
  const kickTable = piece.type === 'i'
    ? kicksI[key]
    : piece.type === 'o'
      ? [[0, 0]]
      : kicksJLSTZ[key]

  for (const [dx, dy] of kickTable || []) {
    const x = piece.x + dx
    const y = piece.y + dy
    if (canPlacePiece({ ...piece, rotation: to }, x, y, lockedBoard, size)) {
      return { ...piece, rotation: to, x, y }
    }
  }

  return null
}

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
  const [cooperativeRole, setCooperativeRole] = useState(null)

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
  const roomModeRef = useRef(null)
  const predictionRef = useRef(null)

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

  const setAuthoritativePlayerView = (player, mode) => {
    const size = getBoardSize(mode)
    const lockedBoard = player?.boardLocked
    const currentPiece = player?.currentPiece
    predictionRef.current = lockedBoard && currentPiece
      ? {
          lockedBoard: cloneBoard(lockedBoard, size),
          currentPiece: { ...currentPiece },
          size,
        }
      : null
    setBoard(player?.board || makeEmptyBoard(size))
  }

  const applyOptimisticMove = (action) => {
    const prediction = predictionRef.current
    if (!prediction || !action) return

    const { lockedBoard, size } = prediction
    const piece = { ...prediction.currentPiece }
    let nextPiece = null

    if (action === 'left' || action === 'right') {
      const x = piece.x + (action === 'left' ? -1 : 1)
      if (canPlacePiece(piece, x, piece.y, lockedBoard, size)) {
        nextPiece = { ...piece, x }
      }
    } else if (action === 'drop') {
      const y = piece.y + 1
      if (canPlacePiece(piece, piece.x, y, lockedBoard, size)) {
        nextPiece = { ...piece, y }
      }
    } else if (action === 'rotate') {
      nextPiece = getRotatedPiece(piece, lockedBoard, size)
    } else if (action === 'hardDrop') {
      nextPiece = { ...piece, y: getGhostY(piece, lockedBoard, size) }
    }

    if (!nextPiece) return

    predictionRef.current = { ...prediction, currentPiece: nextPiece }
    setBoard(renderPredictedBoard(predictionRef.current))
  }

  const emitMove = (action) => {
    if (!action || !roomId || !username) return false
    if (isPaused || isEliminated) return false
    if (
      isMultiplayer &&
      gameMode === 'cooperative' &&
      activePlayerUsername &&
      activePlayerUsername !== username
    ) {
      return false
    }
    if (isMultiplayer && gameMode === 'cooperative_roles') {
      if (cooperativeRole === 'rotate' && action !== 'rotate') {
        return false
      }
      if (cooperativeRole === 'place' && action === 'rotate') {
        return false
      }
    }

    applyOptimisticMove(action)
    socket.emit('movePiece', { roomId: String(roomId), action })
    return true
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
    exitingRef.current = true
    stopSoftDrop()
    stopHorizontalAutoMove()
    setShowMenu(false)
    setIsPaused(false)

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

    const handleRoomState = (room) => {
      if (exitingRef.current) return
      if (String(room?.id) !== String(roomId)) return
      const mode = room?.game_mode || null
      roomModeRef.current = mode
      setGameMode(mode)
      setBoardSize(getBoardSize(mode))
    }

    const handleGameStarted = () => {
      if (exitingRef.current) return
      const mode = roomModeRef.current
      const size = getBoardSize(mode)
      setGameMode(mode)
      setBoardSize(size)
      setBoard(makeEmptyBoard(size))
      predictionRef.current = null
      setIsPaused(false)
      setShowMenu(false)
      setStats({ score: 0, lines: 0, level: 1 })
      setNextType(null)
      setOpponentBoards([])
      setWinner(null)
      setIsEliminated(false)
      setShowSpectator(false)
      setIsGameOver(false)
      setActivePlayerUsername(null)
      setCooperativeRole(null)
      lastLevelRef.current = 1
      lastLinesRef.current = 0
      wasBoardEmptyRef.current = true
      startMusic()
    }

    const handleGameState = (gameState) => {
      if (exitingRef.current) return
      const mode = gameState?.mode || null
      const me = gameState?.players?.find((p) => p.username === username)
      const isLeavingSolo = !isMultiplayer && exitingRef.current

      unstable_batchedUpdates(() => {
        setGameMode(mode)
        setBoardSize(getBoardSize(mode))
        setActivePlayerUsername(gameState?.currentTurnUsername || null)
        setGamePlayers(gameState?.players || [])

        if (me) {
          setCooperativeRole(me.cooperativeRole || null)
          setAuthoritativePlayerView(me, mode)
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
          if (SHARED_BOARD_MODES.includes(gameState?.mode)) {
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
      })
    }

    const handlePlayerState = (playerState) => {
      if (exitingRef.current) return
      if (String(playerState?.roomId) !== String(roomId)) return
      const mode = playerState?.mode || null
      const me = playerState?.player
      if (!me || me.username !== username) return
      const isLeavingSolo = !isMultiplayer && exitingRef.current

      unstable_batchedUpdates(() => {
        setGameMode(mode)
        setBoardSize(getBoardSize(mode))
        setActivePlayerUsername(playerState?.currentTurnUsername || null)
        setCooperativeRole(me.cooperativeRole || null)
        setAuthoritativePlayerView(me, mode)
        setStats({
          score: me.score ?? 0,
          lines: me.lines ?? 0,
          level: me.level ?? 1,
        })
        setNextType(me.nextType || null)

        if (me.isAlive === false && !isLeavingSolo) {
          setIsEliminated(true)
        }
      })
    }

    const handleGameOver = ({ winner }) => {
      if (exitingRef.current) return
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

    socket.on('roomState', handleRoomState)
    socket.on('gameStarted', handleGameStarted)
    socket.on('gameState', handleGameState)
    socket.on('playerState', handlePlayerState)
    socket.on('gameOver', handleGameOver)

    socket.emit('joinRoom', { roomId: String(roomId), username })
    socket.emit('getRoomState', { roomId: String(roomId) })

    return () => {
      socket.off('roomState', handleRoomState)
      socket.off('gameStarted', handleGameStarted)
      socket.off('gameState', handleGameState)
      socket.off('playerState', handlePlayerState)
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
      const isMirrorMode = gameMode === 'mirror'
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
      const isMirrorMode = gameMode === 'mirror'
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

  const isAlternatingCooperativeMode = isMultiplayer && gameMode === 'cooperative'
  const isRoleSplitCooperativeMode = isMultiplayer && gameMode === 'cooperative_roles'
  const isYourTurn =
    isAlternatingCooperativeMode && activePlayerUsername && activePlayerUsername === username
  const cooperativeStatusLabel = isAlternatingCooperativeMode
    ? isYourTurn
      ? 'YOUR TURN'
      : activePlayerUsername
        ? `Playing: ${activePlayerUsername}`
        : 'Playing: ...'
    : isRoleSplitCooperativeMode
      ? cooperativeRole === 'rotate'
        ? 'YOU ROTATE'
        : cooperativeRole === 'place'
          ? 'YOU PLACE'
          : 'ASSIGNING ROLE...'
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
              {cooperativeStatusLabel && (
                <div
                  className={`turn-indicator${isYourTurn ? ' is-your-turn' : ''}`}
                >
                  {cooperativeStatusLabel}
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
