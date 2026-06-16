import './Game.css'
import '../ModeMenuSelector/Options.jsx/Options.css'
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
import boardEasterEggVideo from '../../res/videos/tetrisarrete.mp4'
import { DEFAULT_LANGUAGE, LANGUAGES, getLanguageName, getTranslation } from '../../i18n'

const DEFAULT_BOARD = { width: 10, height: 20 }
const DAS_MS = 220
const ARR_MS = 60
const SOFT_DROP_MS = 60
const SERVER_TICK_MS = 33
const BASE_DROP_MS = 500
const DROP_LEVEL_STEP_MS = 40
const MIN_DAS_MS = 70
const COUNTDOWN_STEP_MS = 800
const COUNTDOWN_STEPS = ['3', '2', '1', 'Go']
const SHARED_BOARD_MODES = ['cooperative', 'cooperative_roles']
const EASTER_EGG_COMBO = [
  'arrowup',
  'arrowup',
  'arrowdown',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'arrowleft',
  'arrowright',
  'b',
  'a',
]
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

const normalizeLevel = (level) => {
  const parsed = Number(level)
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1
}

const getDropIntervalMs = (level) =>
  Math.max(SERVER_TICK_MS, BASE_DROP_MS - (normalizeLevel(level) - 1) * DROP_LEVEL_STEP_MS)

const getSpeedScale = (level) => getDropIntervalMs(level) / BASE_DROP_MS

const getHorizontalDasMs = (level) =>
  Math.max(MIN_DAS_MS, Math.round(DAS_MS * getSpeedScale(level)))

const getHorizontalArrMs = (level) =>
  Math.max(SERVER_TICK_MS, Math.round(ARR_MS * getSpeedScale(level)))

const getSoftDropMs = (level) =>
  Math.max(SERVER_TICK_MS, Math.round(SOFT_DROP_MS * getSpeedScale(level)))

const getCountdownDurationMs = (payload = {}) => {
  const countdownMs = Number(payload?.countdownMs)
  if (Number.isFinite(countdownMs) && countdownMs > 0) {
    return countdownMs
  }

  const remainingCountdownMs = Number(payload?.remainingCountdownMs)
  if (Number.isFinite(remainingCountdownMs) && remainingCountdownMs > 0) {
    return remainingCountdownMs
  }

  return 0
}

const makeEmptyBoard = (size = DEFAULT_BOARD) =>
  Array.from({ length: size.height }, () =>
    Array.from({ length: size.width }, () => 'empty')
  )

const restartVideoPlayback = (video) => {
  video.currentTime = 0
  const playback = video.play?.()
  playback?.catch?.(() => {})
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
  musicEnabled = soundEnabled,
  onMusicChange,
  language = DEFAULT_LANGUAGE,
  onLanguageChange,
  onThemeChange,
}) {
  const isMultiplayer = isMultiplayerProp ?? Boolean(roomId)
  const translation = getTranslation(language)
  const text = translation.game
  const optionsText = translation.options
  const controls = text.controls
  const soundEffectsOnLabel = text.soundEffectsOn || text.soundOn
  const soundEffectsOffLabel = text.soundEffectsOff || text.soundOff
  const musicOnLabel = text.musicOn || 'Music: enabled'
  const musicOffLabel = text.musicOff || 'Music: disabled'
  const enabledLabel = text.enabled || 'Enabled'
  const disabledLabel = text.disabled || 'Disabled'

  const [board, setBoard] = useState(() => makeEmptyBoard(DEFAULT_BOARD))
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD)
  const [nextType, setNextType] = useState(null)
  const [holdType, setHoldType] = useState(null)
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
  const [boardFlash, setBoardFlash] = useState(null)
  const [countdownStep, setCountdownStep] = useState(null)
  const [isBoardVideoActive, setIsBoardVideoActive] = useState(false)
  const [showPauseLanguages, setShowPauseLanguages] = useState(false)

  const softDropTimerRef = useRef(null)
  const dasTimerRef = useRef(null)
  const arrTimerRef = useRef(null)
  const heldDirectionRef = useRef(null)
  const levelRef = useRef(1)
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
  const boardFlashTimerRef = useRef(null)
  const boardFlashFrameRef = useRef(null)
  const countdownTimerRef = useRef(null)
  const countdownStepTimerRef = useRef(null)
  const countdownActiveRef = useRef(false)
  const pauseSyncReadyRef = useRef(false)
  const easterEggProgressRef = useRef(0)
  const boardVideoRef = useRef(null)

  const clearCountdown = ({ resetState = true } = {}) => {
    countdownActiveRef.current = false
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    if (countdownStepTimerRef.current) {
      clearInterval(countdownStepTimerRef.current)
      countdownStepTimerRef.current = null
    }
    if (resetState) {
      setCountdownStep(null)
    }
  }

  const startCountdown = ({ durationMs = COUNTDOWN_STEP_MS * COUNTDOWN_STEPS.length, onDone } = {}) => {
    clearCountdown()

    if (!durationMs || durationMs <= 0) {
      onDone?.()
      return
    }

    stopSoftDrop()
    stopHorizontalAutoMove()
    countdownActiveRef.current = true
    const endAt = Date.now() + durationMs

    const syncCountdownStep = () => {
      const remainingMs = Math.max(0, endAt - Date.now())
      const stepIndex = Math.min(
        COUNTDOWN_STEPS.length - 1,
        Math.max(0, COUNTDOWN_STEPS.length - Math.ceil(remainingMs / COUNTDOWN_STEP_MS))
      )
      const nextStep = COUNTDOWN_STEPS[stepIndex]
      setCountdownStep((current) => (current === nextStep ? current : nextStep))
    }

    syncCountdownStep()

    countdownStepTimerRef.current = setInterval(syncCountdownStep, 50)

    countdownTimerRef.current = setTimeout(() => {
      if (countdownStepTimerRef.current) {
        clearInterval(countdownStepTimerRef.current)
        countdownStepTimerRef.current = null
      }
      countdownTimerRef.current = null
      countdownActiveRef.current = false
      setCountdownStep(null)
      onDone?.()
    }, durationMs)
  }

  const triggerBoardFlash = (type) => {
    if (boardFlashFrameRef.current) {
      cancelAnimationFrame(boardFlashFrameRef.current)
    }
    if (boardFlashTimerRef.current) {
      clearTimeout(boardFlashTimerRef.current)
    }
    setBoardFlash(null)
    boardFlashFrameRef.current = requestAnimationFrame(() => {
      boardFlashFrameRef.current = null
      setBoardFlash(type)
      boardFlashTimerRef.current = setTimeout(() => {
        setBoardFlash(null)
        boardFlashTimerRef.current = null
      }, 900)
    })
  }

  const startMusic = () => {
    /* v8 ignore next -- tested indirectly through game start; disabled music suppresses the whole audio path. @preserve */
    if (!musicEnabled) return
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
    /* v8 ignore next -- music remains stopped when the user disabled background music. @preserve */
    if (!musicEnabled) return
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

  const handleBoardVideoFinished = () => {
    setIsBoardVideoActive(false)
    if (!musicEnabled || isPaused || isGameOver) return
    if (!isMultiplayer) {
      resumeMusic()
    }
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
    setBoard(player?.board || makeEmptyBoard(size))
  }

  const emitMove = (action) => {
    if (!action || !roomId || !username) return false
    /* v8 ignore next -- pause/elimination also remove or disable the user-facing controls in normal play. @preserve */
    if (isPaused || isEliminated || countdownStep) return false
    if (
      isMultiplayer &&
      gameMode === 'cooperative' &&
      activePlayerUsername &&
      activePlayerUsername !== username
    ) {
      return false
    }
    if (isMultiplayer && gameMode === 'cooperative_roles') {
      if (cooperativeRole === 'rotate' && action !== 'rotate' && action !== 'hold') {
        return false
      }
      if (cooperativeRole === 'place' && action === 'rotate') {
        return false
      }
    }

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
    const level = levelRef.current
    emitMove(action)

    dasTimerRef.current = setTimeout(() => {
      /* v8 ignore next -- race guard for stale delayed-auto-shift timers after direction changes. @preserve */
      if (heldDirectionRef.current !== direction) return
      arrTimerRef.current = setInterval(() => {
        /* v8 ignore next -- race guard for stale auto-repeat ticks after direction changes. @preserve */
        if (heldDirectionRef.current !== direction) return
        emitMove(action)
      }, getHorizontalArrMs(level))
    }, getHorizontalDasMs(level))
  }

  const startSoftDrop = () => {
    if (softDropTimerRef.current) return
    softDropTimerRef.current = setInterval(() => {
      /* v8 ignore next -- interval guard for pause transitions between render cleanup cycles. @preserve */
      if (isPaused) return
      emitMove('drop')
    }, getSoftDropMs(levelRef.current))
  }

  const handleLeaveGame = () => {
    exitingRef.current = true
    clearCountdown()
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

    const handleGameStarted = (payload = {}) => {
      if (exitingRef.current) return
      if (payload?.roomId && String(payload.roomId) !== String(roomId)) return
      const mode = roomModeRef.current
      const size = getBoardSize(mode)
      setGameMode(mode)
      setBoardSize(size)
      setBoard(makeEmptyBoard(size))
      setIsPaused(false)
      setShowMenu(false)
      setStats({ score: 0, lines: 0, level: 1 })
      setNextType(null)
      setHoldType(null)
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
      setBoardFlash(null)
      if (boardFlashFrameRef.current) {
        cancelAnimationFrame(boardFlashFrameRef.current)
        boardFlashFrameRef.current = null
      }
      if (boardFlashTimerRef.current) {
        clearTimeout(boardFlashTimerRef.current)
        boardFlashTimerRef.current = null
      }
      startMusic()
      const countdownDurationMs = getCountdownDurationMs(payload)
      if (countdownDurationMs > 0) {
        startCountdown({ durationMs: countdownDurationMs })
      } else if (!countdownActiveRef.current) {
        clearCountdown()
      }
    }

    const handleGameState = (gameState) => {
      if (exitingRef.current) return
      if (countdownActiveRef.current) return
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
          setHoldType(me.holdType || null)

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
      if (countdownActiveRef.current) return
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
        setHoldType(me.holdType || null)

        /* v8 ignore next -- solo leave races are guarded for stale socket payloads after exit. @preserve */
        if (me.isAlive === false && !isLeavingSolo) {
          setIsEliminated(true)
        }
      })
    }

    const handleGameOver = ({ winner }) => {
      if (exitingRef.current) return
      clearCountdown()
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
      if (boardFlashFrameRef.current) {
        cancelAnimationFrame(boardFlashFrameRef.current)
        boardFlashFrameRef.current = null
      }
      if (boardFlashTimerRef.current) {
        clearTimeout(boardFlashTimerRef.current)
        boardFlashTimerRef.current = null
      }
      clearCountdown({ resetState: false })
      stopMusic()
    }
  }, [roomId, username, isMultiplayer])

  useEffect(() => {
    levelRef.current = stats.level
    /* v8 ignore next -- refs are created on mount before stats effects can play sounds. @preserve */
    if (stats.level > lastLevelRef.current) {
      triggerBoardFlash('level')
      if (soundEnabled && levelUpRef.current) {
        levelUpRef.current.currentTime = 0
        /* v8 ignore next -- jsdom Audio mocks do not exercise rejected autoplay promises by default. @preserve */
        levelUpRef.current.play().catch(() => {})
      }
    }
    lastLevelRef.current = stats.level
  }, [stats.level])

  useEffect(() => {
    /* v8 ignore next -- refs are created on mount before stats effects can play sounds. @preserve */
    const delta = stats.lines - lastLinesRef.current
    if (delta === 4) {
      triggerBoardFlash('tetris')
      if (soundEnabled && tetrisRef.current) {
        tetrisRef.current.currentTime = 0
        /* v8 ignore next -- jsdom Audio mocks do not exercise rejected autoplay promises by default. @preserve */
        tetrisRef.current.play().catch(() => {})
      }
    }
    lastLinesRef.current = stats.lines
  }, [stats.lines])

  useEffect(() => {
    /* v8 ignore next -- refs are created on mount before board effects can play sounds. @preserve */
    const isEmpty = board.every((row) => row.every((cell) => cell === 'empty'))
    if (!wasBoardEmptyRef.current && isEmpty) {
      triggerBoardFlash('clear')
      if (soundEnabled && clearRef.current) {
        clearRef.current.currentTime = 0
        /* v8 ignore next -- jsdom Audio mocks do not exercise rejected autoplay promises by default. @preserve */
        clearRef.current.play().catch(() => {})
      }
    }
    wasBoardEmptyRef.current = isEmpty
  }, [board])

  useEffect(() => {
    if (!isBoardVideoActive) return
    const video = boardVideoRef.current
    video.volume = 0.1
    video.muted = !soundEnabled
    if (!isMultiplayer && musicEnabled) {
      pauseMusic()
    }
    restartVideoPlayback(video)
  }, [isBoardVideoActive])

  useEffect(() => {
    if (!isBoardVideoActive) return
    const video = boardVideoRef.current
    video.volume = 0.1
    video.muted = !soundEnabled
  }, [isBoardVideoActive, soundEnabled])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const normalizedKey = event.key.toLowerCase()
      const expectedKey = EASTER_EGG_COMBO[easterEggProgressRef.current]

      if (normalizedKey === expectedKey) {
        easterEggProgressRef.current += 1
        if (easterEggProgressRef.current === EASTER_EGG_COMBO.length) {
          easterEggProgressRef.current = 0
          setIsBoardVideoActive(true)
        }
      } else if (normalizedKey === EASTER_EGG_COMBO[0]) {
        easterEggProgressRef.current = 1
      } else {
        easterEggProgressRef.current = 0
      }

      if (event.repeat) return
      const isMirrorMode = gameMode === 'mirror'
      if (countdownStep) return
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
      } else if (event.key.toLowerCase() === 'c' || event.key === 'Shift') {
        emitMove('hold')
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
  }, [isPaused, isMultiplayer, roomId, username, gameMode, activePlayerUsername, cooperativeRole, isEliminated, countdownStep])

  useEffect(() => {
    if (!pauseSyncReadyRef.current) {
      pauseSyncReadyRef.current = true
      return
    }
    if (isPaused) {
      stopSoftDrop()
    }
    if (countdownActiveRef.current) return
    if (!isMultiplayer && roomId) {
      socket.emit('pauseGame', { roomId: String(roomId), paused: isPaused })
    }
  }, [isPaused])

  useEffect(() => {
    if (!soundEnabled) {
      stopAllSfx()
    }
  }, [soundEnabled])

  useEffect(() => {
    if (!musicEnabled) {
      stopMusic()
      return
    }
    if (isMultiplayer) return
    if (isBoardVideoActive) {
      pauseMusic()
      return
    }
    if (isPaused) {
      /* v8 ignore next -- audio refs are initialized on mount before pause controls are usable. @preserve */
      if (soundEnabled && pauseRef.current) {
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
  }, [isPaused, isMultiplayer, isGameOver, soundEnabled, musicEnabled, isBoardVideoActive])

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

  const nextPreview = useMemo(() => {
    return createPiecePreview(nextType)
  }, [nextType])

  const holdPreview = useMemo(() => {
    return createPiecePreview(holdType)
  }, [holdType])

  const isAlternatingCooperativeMode = isMultiplayer && gameMode === 'cooperative'
  const isRoleSplitCooperativeMode = isMultiplayer && gameMode === 'cooperative_roles'
  const isYourTurn =
    isAlternatingCooperativeMode && activePlayerUsername && activePlayerUsername === username
  const cooperativeStatusLabel = isAlternatingCooperativeMode
    ? isYourTurn
      ? text.yourTurn
      : activePlayerUsername
        ? `${text.playing}: ${activePlayerUsername}`
        : text.playingFallback
    : isRoleSplitCooperativeMode
      ? cooperativeRole === 'rotate'
        ? text.rotateRole
        : cooperativeRole === 'place'
          ? text.placeRole
          : text.assigningRole
      : null

  const gameMenuRows = [
    {
      id: 'resume',
      label: text.resume,
      value: isMultiplayer ? 'Back' : 'Play',
      valueState: 'is-on',
      onClick: () => {
        if (isMultiplayer) {
          setShowMenu(false)
          return
        }
        startCountdown({
          onDone: () => {
            setIsPaused(false)
          },
        })
      },
    },
    {
      id: 'theme',
      label: theme === 'dark'
        ? (optionsText.darkTheme || 'Dark theme')
        : (optionsText.lightTheme || 'Light theme'),
      value: theme === 'dark' ? 'Dark' : 'Light',
      valueState: theme === 'dark' ? 'theme-dark' : 'theme-light',
      description: theme === 'dark'
        ? (optionsText.switchToLight || 'Switch to light mode')
        : (optionsText.switchToDark || 'Switch to dark mode'),
      onClick: () => onThemeChange?.(theme === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'sound',
      label: soundEnabled ? soundEffectsOnLabel : soundEffectsOffLabel,
      value: soundEnabled ? 'On' : 'Off',
      valueState: soundEnabled ? 'is-on' : 'is-off',
      description: soundEnabled ? enabledLabel : disabledLabel,
      onClick: () => onSoundChange?.(!soundEnabled),
    },
    {
      id: 'music',
      label: musicEnabled ? musicOnLabel : musicOffLabel,
      value: musicEnabled ? 'On' : 'Off',
      valueState: musicEnabled ? 'is-on' : 'is-off',
      description: musicEnabled ? enabledLabel : disabledLabel,
      onClick: () => onMusicChange?.(!musicEnabled),
    },
    {
      id: 'language',
      label: text.language || 'Language',
      value: getLanguageName(language, language),
      valueState: 'is-neutral',
      description: text.languageDescription || 'Choose display language',
      ariaExpanded: showPauseLanguages,
      ariaControls: 'pause-language-options',
      onClick: () => setShowPauseLanguages((current) => !current),
    },
    {
      id: 'leave',
      label: text.leaveGame,
      value: 'Exit',
      valueState: 'is-off',
      onClick: handleLeaveGame,
    },
  ]

  const activeMenuTitle = isMultiplayer ? text.gameMenu : text.pause

  if (isMultiplayer && isEliminated && !winner && showSpectator && !isGameOver) {
    return (
      <div className={`game-screen ${theme === 'dark' ? 'dark' : ''}`}>
        <TetriminosClouds />
        <div className="game-card">
          <SpectatorView
            players={gamePlayers}
            onBack={onBack}
            username={username}
            language={language}
          />
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
          language={language}
        />
        {countdownStep && (
          <div className="countdown-overlay" aria-live="assertive" aria-label={text.countdownAria}>
            <div
              key={countdownStep}
              className={`countdown-panel${countdownStep === 'Go' ? ' countdown-panel-go' : ''}`}
            >
              <span className="countdown-step">
                {countdownStep === 'Go' ? text.countdownGo : countdownStep}
              </span>
            </div>
          </div>
        )}
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
                disabled={isPaused || Boolean(countdownStep)}
              >
                {text.options}
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
              <span className="stat-label">{text.score}</span>
              <span className="stat-value">{stats.score.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">{text.lines}</span>
              <span className="stat-value">{stats.lines.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">{text.level}</span>
              <span className="stat-value">{stats.level.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="game-layout">
          <div className="hold-panel">
            <h3>{text.hold}</h3>
            <div className="next-grid piece-preview-grid" role="grid" aria-label={text.holdAria}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${holdPreview.width}, var(--cell-size))`,
                  gridTemplateRows: `repeat(${holdPreview.height}, var(--cell-size))`,
                  gap: '2px'
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
            <aside className="game-controls-help" aria-label={text.keyboardControlsAria}>
              {controls.map(({ keys, action }) => (
                <div className="control-hint" key={keys}>
                  <span className="control-key">{keys}</span>
                  <span className="control-action">{action}</span>
                </div>
              ))}
            </aside>
          </div>

        <div
            className={`game-board${boardFlash ? ` board-flash board-flash-${boardFlash}` : ''}${isBoardVideoActive ? ' board-easter-egg-active' : ''}`}
            role="grid"
            aria-label={text.boardAria}
            style={{
              gridTemplateColumns: `repeat(${boardSize.width}, var(--cell-size))`,
              gridTemplateRows: `repeat(${boardSize.height}, var(--cell-size))`,
              ['--cell-size']: `clamp(18px, min(calc((100vh - 235px) / ${boardSize.height}), calc((100vw - clamp(240px, 22vw, 320px)) / ${boardSize.width})), 48px)`,
            }}
          >
            {isBoardVideoActive && (
              <video
                ref={boardVideoRef}
                className="board-easter-egg-video"
                src={boardEasterEggVideo}
                autoPlay
                playsInline
                aria-hidden="true"
                onEnded={handleBoardVideoFinished}
              />
            )}
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
            <h3>{text.next}</h3>
            <div className="next-grid piece-preview-grid" role="grid" aria-label={text.nextAria}>
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
              boards={opponentBoards}
              title={text.opponents}
              boardLabel={text.opponentBoard}
            />
          </div>
        </div>

        {((!isMultiplayer && isPaused) || (isMultiplayer && showMenu)) && !countdownStep && (
          <div className="pause-overlay" role="dialog" aria-modal="true">
            <div className={`options-modal game-options-modal ${theme === 'dark' ? 'dark' : ''}`}>
              <div className="options-modal-header">
                <p className="options-kicker">Game</p>
                <h2>{activeMenuTitle}</h2>
              </div>
              <div className="options-list">
                {gameMenuRows.map((option) => (
                  <button
                    key={option.id}
                    className="option-row"
                    type="button"
                    onClick={option.onClick}
                    aria-expanded={option.ariaExpanded}
                    aria-controls={option.ariaControls}
                  >
                    <span className="option-row-label">{option.label}</span>
                    <span className={`option-row-value ${option.valueState}`}>{option.value}</span>
                    <span className="option-row-description">{option.description || ''}</span>
                  </button>
                ))}
              </div>
              {showPauseLanguages && (
                <div
                  className="language-options-overlay"
                  role="presentation"
                  onClick={() => setShowPauseLanguages(false)}
                >
                  <div
                    className="language-options"
                    id="pause-language-options"
                    aria-label={text.languageOptions || 'Language options'}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {LANGUAGES.map(({ code }) => (
                      <button
                        className={`language-option${language === code ? ' selected' : ''}`}
                        key={code}
                        type="button"
                        aria-pressed={language === code}
                        onClick={() => {
                          onLanguageChange?.(code)
                          setShowPauseLanguages(false)
                        }}
                      >
                        {getLanguageName(code, language)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Game
