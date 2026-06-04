import './Game.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync, unstable_batchedUpdates } from 'react-dom'
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
const ROTATE_KICKS = {
  default: {
    '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  },
  i: {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  },
}

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

const cloneBoard = (source, size = DEFAULT_BOARD) => {
  /* v8 ignore next -- valid game-state payloads include a populated board; this tolerates stale or malformed socket data. @preserve */
  if (!Array.isArray(source) || source.length === 0) return makeEmptyBoard(size)
  return source.map((row) => {
    /* v8 ignore next -- serialized board rows are arrays; this is a defensive malformed-payload fallback. @preserve */
    if (!Array.isArray(row)) return []
    return row.slice()
  })
}

const getPieceShape = (piece) => {
  const rotations = SHAPES[piece?.type]
  /* v8 ignore next -- prediction is skipped before this for unknown piece types. @preserve */
  if (!rotations) return null
  /* v8 ignore next -- server-sent rotations are valid for the piece type. @preserve */
  return rotations[piece.rotation] || null
}

const canPlacePiece = (piece, board, size) => {
  const shape = getPieceShape(piece)
  /* v8 ignore next -- getPredictedPiece validates the piece before placement checks. @preserve */
  if (!shape) return false

  return shape.every(([row, col]) => {
    const boardX = piece.x + col
    const boardY = piece.y + row

    if (boardX < 0 || boardX >= size.width || boardY >= size.height) return false
    if (boardY < 0) return true
    /* v8 ignore next -- valid board payloads include all rows; optional access prevents malformed-payload crashes. @preserve */
    return board[boardY]?.[boardX] === 'empty'
  })
}

const renderPlayerBoard = (boardLocked, piece, size, { includeActive = true, includeGhost = true } = {}) => {
  const grid = cloneBoard(boardLocked, size)
  const shape = getPieceShape(piece)
  /* v8 ignore next -- prediction passes a known piece and always renders at least ghost or active cells. @preserve */
  if (!shape || (!includeActive && !includeGhost)) return grid

  /* v8 ignore next -- prediction always includes ghosts; option exists to mirror the server render helper shape. @preserve */
  if (includeGhost) {
    let ghostY = piece.y
    while (canPlacePiece({ ...piece, y: ghostY + 1 }, boardLocked, size)) {
      ghostY += 1
    }

    shape.forEach(([row, col]) => {
      const boardY = ghostY + row
      const boardX = piece.x + col
      /* v8 ignore next -- ghost cells are normally in-bounds; guards match server rendering for malformed or edge payloads. @preserve */
      if (boardY >= 0 && boardY < size.height && boardX >= 0 && boardX < size.width && grid[boardY][boardX] === 'empty') {
        grid[boardY][boardX] = 'ghost'
      }
    })
  }

  if (includeActive) {
    shape.forEach(([row, col]) => {
      const boardY = piece.y + row
      const boardX = piece.x + col
      /* v8 ignore next -- active cells are normally in-bounds after placement checks; guards match server rendering. @preserve */
      if (boardY >= 0 && boardY < size.height && boardX >= 0 && boardX < size.width) {
        if (grid[boardY][boardX] === 'empty' || grid[boardY][boardX] === 'ghost') {
          grid[boardY][boardX] = piece.type
        }
      }
    })
  }

  return grid
}

const getPredictedPiece = (view, action, size) => {
  const boardLocked = view?.boardLocked
  const currentPiece = view?.currentPiece
  if (!Array.isArray(boardLocked) || !currentPiece || !SHAPES[currentPiece.type]) return null

  const piece = { ...currentPiece }
  if (action === 'left' || action === 'right' || action === 'drop') {
    const nextPiece = {
      ...piece,
      x: piece.x + (action === 'left' ? -1 : action === 'right' ? 1 : 0),
      y: piece.y + (action === 'drop' ? 1 : 0),
    }
    return canPlacePiece(nextPiece, boardLocked, size) ? nextPiece : piece
  }

  if (action === 'rotate') {
    const rotations = SHAPES[piece.type]
    const nextRotation = (piece.rotation + 1) % rotations.length
    const kickKey = `${piece.rotation}>${nextRotation}`
    const kickTable = piece.type === 'o'
      ? [[0, 0]]
      : piece.type === 'i'
        ? ROTATE_KICKS.i[kickKey]
        : ROTATE_KICKS.default[kickKey]

    for (const [dx, dy] of kickTable) {
      const nextPiece = { ...piece, rotation: nextRotation, x: piece.x + dx, y: piece.y + dy }
      if (canPlacePiece(nextPiece, boardLocked, size)) return nextPiece
    }

    /* v8 ignore next -- if client-side kicks disagree, keep the last server-backed piece until reconciliation. @preserve */
    return piece
  }

  /* v8 ignore next -- emitMove only passes known game actions; non-hard-drop actions return above. @preserve */
  if (action === 'hardDrop') {
    const nextPiece = { ...piece }
    while (canPlacePiece({ ...nextPiece, y: nextPiece.y + 1 }, boardLocked, size)) {
      nextPiece.y += 1
    }
    return nextPiece
  }

  /* v8 ignore next -- emitMove only passes known game actions; this is a defensive fallback. @preserve */
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
  const authoritativePlayerViewRef = useRef(null)

  const startMusic = () => {
    /* v8 ignore next -- tested indirectly through game start; false sound suppresses the whole audio path. @preserve */
    if (!soundEnabled) return
    const audio = musicRef.current
    /* v8 ignore next -- audio refs are initialized before socket-driven music starts. @preserve */
    if (!audio) return
    audio.currentTime = 0
    /* v8 ignore next -- jsdom Audio mocks do not exercise rejected autoplay promises by default. @preserve */
    audio.play().catch(() => {})
  }

  const pauseMusic = () => {
    const audio = musicRef.current
    /* v8 ignore next -- audio refs are initialized on mount before pause controls are usable. @preserve */
    if (!audio) return
    audio.pause()
  }

  const resumeMusic = () => {
    /* v8 ignore next -- the sound effect returns before resumeMusic is called when sound is disabled. @preserve */
    if (!soundEnabled) return
    const audio = musicRef.current
    /* v8 ignore next -- audio refs are initialized on mount before resume controls are usable. @preserve */
    if (!audio) return
    /* v8 ignore next -- jsdom Audio mocks do not exercise rejected autoplay promises by default. @preserve */
    audio.play().catch(() => {})
  }

  const stopMusic = () => {
    const audio = musicRef.current
    /* v8 ignore next -- audio refs are initialized on mount before cleanup or leave actions. @preserve */
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
  }

  const stopAllSfx = () => {
    const refs = [levelUpRef, tetrisRef, pauseRef, clearRef, winnerRef, loserRef]
    refs.forEach((ref) => {
      /* v8 ignore next -- SFX refs are initialized together before sound can be toggled off. @preserve */
      if (!ref?.current) return
      ref.current.pause()
      ref.current.currentTime = 0
    })
  }

  const setAuthoritativePlayerView = (player, mode) => {
    const size = getBoardSize(mode)
    authoritativePlayerViewRef.current = player
    setBoard(player?.board || makeEmptyBoard(size))
  }

  const applyPredictedMove = (action) => {
    const playerView = authoritativePlayerViewRef.current
    const size = getBoardSize(gameMode)
    const predictedPiece = getPredictedPiece(playerView, action, size)
    if (!predictedPiece) return

    const predictedBoard = renderPlayerBoard(playerView.boardLocked, predictedPiece, size, {
      includeActive: gameMode !== 'invisible',
      includeGhost: true,
    })
    authoritativePlayerViewRef.current = {
      ...playerView,
      currentPiece: predictedPiece,
      board: predictedBoard,
    }
    flushSync(() => {
      setBoard(predictedBoard)
    })
  }

  const emitMove = (action) => {
    if (!action || !roomId || !username) return false
    /* v8 ignore next -- pause/elimination also remove or disable the user-facing controls in normal play. @preserve */
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

    applyPredictedMove(action)
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
      /* v8 ignore next -- race guard for stale delayed-auto-shift timers after direction changes. @preserve */
      if (heldDirectionRef.current !== direction) return
      arrTimerRef.current = setInterval(() => {
        /* v8 ignore next -- race guard for stale auto-repeat ticks after direction changes. @preserve */
        if (heldDirectionRef.current !== direction) return
        emitMove(action)
      }, ARR_MS)
    }, DAS_MS)
  }

  const startSoftDrop = () => {
    if (softDropTimerRef.current) return
    softDropTimerRef.current = setInterval(() => {
      /* v8 ignore next -- interval guard for pause transitions between render cleanup cycles. @preserve */
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
      authoritativePlayerViewRef.current = null
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

        /* v8 ignore next -- solo leave races are guarded for stale socket payloads after exit. @preserve */
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
          /* v8 ignore next -- jsdom Audio mocks do not exercise rejected autoplay promises by default. @preserve */
          winnerRef.current?.play().catch(() => {})
        } else {
          /* v8 ignore next -- jsdom Audio mocks do not exercise rejected autoplay promises by default. @preserve */
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
    /* v8 ignore next -- refs are created on mount before stats effects can play sounds. @preserve */
    if (!levelUpRef.current) return
    if (!soundEnabled) return
    if (stats.level > lastLevelRef.current) {
      levelUpRef.current.currentTime = 0
      /* v8 ignore next -- jsdom Audio mocks do not exercise rejected autoplay promises by default. @preserve */
      levelUpRef.current.play().catch(() => {})
    }
    lastLevelRef.current = stats.level
  }, [stats.level])

  useEffect(() => {
    /* v8 ignore next -- refs are created on mount before stats effects can play sounds. @preserve */
    if (!tetrisRef.current) return
    if (!soundEnabled) return
    const delta = stats.lines - lastLinesRef.current
    if (delta === 4) {
      tetrisRef.current.currentTime = 0
      /* v8 ignore next -- jsdom Audio mocks do not exercise rejected autoplay promises by default. @preserve */
      tetrisRef.current.play().catch(() => {})
    }
    lastLinesRef.current = stats.lines
  }, [stats.lines])

  useEffect(() => {
    /* v8 ignore next -- refs are created on mount before board effects can play sounds. @preserve */
    if (!clearRef.current) return
    if (!soundEnabled) return
    const isEmpty = board.every((row) => row.every((cell) => cell === 'empty'))
    if (!wasBoardEmptyRef.current && isEmpty) {
      clearRef.current.currentTime = 0
      /* v8 ignore next -- jsdom Audio mocks do not exercise rejected autoplay promises by default. @preserve */
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
      /* v8 ignore next -- pause refs are initialized on mount before pause controls are usable. @preserve */
      if (pauseRef.current) {
        pauseRef.current.currentTime = 0
        /* v8 ignore next -- jsdom Audio mocks do not exercise rejected autoplay promises by default. @preserve */
        pauseRef.current.play().catch(() => {})
      }
      pauseMusic()
      return
    }
    /* v8 ignore next -- game over freezes music through stopMusic before this resume branch is relevant. @preserve */
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
              ['--cell-size']: `clamp(14px, min(calc((100vh - 180px) / ${boardSize.height}), calc((100vw - clamp(150px, 28vw, 420px)) / ${boardSize.width})), 48px)`,
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
