import './index.css'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import AuthMenu from './components/AuthMenu/AuthMenu.jsx'
import ProfileMenu from './components/ProfileMenu/ProfileMenu.jsx'
import FaceAvatar from './components/FaceAvatar/FaceAvatar.jsx'
import ModeMenuSelector from './components/ModeMenuSelector/ModeMenuSelector.jsx'
import Leaderboard from './components/Leaderboard/Leaderboard.jsx'
import PlayerStats from './components/PlayerStats/PlayerStats.jsx'
import Rooms from './components/Rooms/Rooms.jsx'
import CreateRoom from './components/CreateRoom/CreateRoom.jsx'
import Game from './components/Game/Game.jsx'
import Title from './components/Title/Title.jsx'
import { socket } from './socket'
import { AUTH_STORAGE_KEY, authFetchOptions } from './authToken'
import { apiFetch } from './api'
import { DEFAULT_LANGUAGE, isSupportedLanguage } from './i18n/playerStats'
import bopSound from './res/sounds/bop.mp3'

const USERNAME_PATTERN = /^[a-zA-Z0-9]{1,15}$/
const THEME_STORAGE_KEY = 'red-tetris-theme'
const LANGUAGE_STORAGE_KEY = 'red-tetris-language'
const LANGUAGE_CHANGE_EVENT = 'red-tetris-language-change'
const DEFAULT_PREFERENCES = {
  theme: 'light',
  soundEnabled: true,
  language: DEFAULT_LANGUAGE,
}
const ROOM_NOTICE_TRANSLATIONS = {
  en: {
    roomUsed: 'Room already used',
    userConnected: 'User already connected',
  },
  fr: {
    roomUsed: 'Salle déjà utilisée',
    userConnected: 'Utilisateur déjà connecté',
  },
}
const DEFAULT_URL_AVATAR = {
  skinColor: '#cccccc',
  eyeType: 'normal',
  mouthType: 'neutral',
}

const normalizePreferences = (preferences = {}) => ({
  theme: preferences.theme === 'dark' ? 'dark' : 'light',
  soundEnabled: typeof preferences.soundEnabled === 'boolean'
    ? preferences.soundEnabled
    : DEFAULT_PREFERENCES.soundEnabled,
  language: isSupportedLanguage(preferences.language)
    ? preferences.language
    : DEFAULT_PREFERENCES.language,
})

const parseRoomParams = (roomName, roomType) => {
  if (!roomName) return { name: null, type: null }
  if (roomType === 'coop') return { name: roomName, type: 'coop' }
  if (roomType === 'multi') return { name: roomName, type: 'multi' }
  return { name: roomName, type: 'solo' }
}

const buildRoomPath = (roomName, type, username) => {
  if (!roomName || !username) return '/'
  if (type === 'coop') return `/${roomName}/coop/${username}`
  if (type === 'multi') return `/${roomName}/multi/${username}`
  return `/${roomName}/${username}`
}

const getMaxPlayers = (gameMode) =>
  ['cooperative', 'cooperative_roles'].includes(gameMode) ? 2 : 8

const reconnectSocketWithSession = () =>
  new Promise((resolve) => {
    if (!socket?.connect) {
      resolve()
      return
    }

    const finish = () => {
      clearTimeout(timeoutId)
      socket.off?.('connect', finish)
      socket.off?.('connect_error', finish)
      resolve()
    }

    const timeoutId = setTimeout(finish, 2000)
    socket.once?.('connect', finish)
    socket.once?.('connect_error', finish)

    if (socket.connected) {
      socket.disconnect()
    }
    socket.connect()
  })

const unregisterUserBeforeDisconnect = (username) =>
  new Promise((resolve) => {
    if (!username || !socket?.emit) {
      resolve()
      return
    }

    let settled = false
    let timeoutId
    const finish = () => {
      if (settled) return
      settled = true
      if (timeoutId) clearTimeout(timeoutId)
      resolve()
    }
    timeoutId = setTimeout(finish, 500)
    socket.emit('unregisterUser', { username }, finish)
  })

function Index({ authMode = 'login' }) {
  const { roomName: urlRoomName, roomType: urlRoomType, username: urlUsername } = useParams()
  const navigate = useNavigate()
  const savedAuth = useMemo(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed?.username || !USERNAME_PATTERN.test(parsed.username)) return null
      return parsed
    } catch {
      return null
    }
  }, [])
  const hasValidUrlUsername = urlUsername ? USERNAME_PATTERN.test(urlUsername) : false
  const parsedUrlRoom = useMemo(
    () => parseRoomParams(urlRoomName, urlRoomType),
    [urlRoomName, urlRoomType]
  )

  const [username, setUsername] = useState(
    savedAuth?.username || null
  )
  const [theme, setTheme] = useState(() => {
    const savedTheme = savedAuth?.preferences?.theme || localStorage.getItem(THEME_STORAGE_KEY)
    return savedTheme === 'dark' ? 'dark' : 'light'
  })
  const [language, setLanguage] = useState(() => {
    const savedLanguage = savedAuth?.preferences?.language || localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isSupportedLanguage(savedLanguage) ? savedLanguage : DEFAULT_LANGUAGE
  })
  const [showRooms, setShowRooms] = useState(false)
  const [showGame, setShowGame] = useState(false)
  const [showSoloRoom, setShowSoloRoom] = useState(false)
  const [showDirectRoom, setShowDirectRoom] = useState(false)
  const [userProfile, setUserProfile] = useState(savedAuth || null)
  const [soloRoomName, setSoloRoomName] = useState(
    parsedUrlRoom.type === 'solo' && hasValidUrlUsername ? parsedUrlRoom.name : null
  )
  const [directRoomName, setDirectRoomName] = useState(
    parsedUrlRoom.type && parsedUrlRoom.type !== 'solo' && hasValidUrlUsername
      ? parsedUrlRoom.name
      : null
  )
  const [directRoomType, setDirectRoomType] = useState(
    parsedUrlRoom.type && parsedUrlRoom.type !== 'solo' && hasValidUrlUsername
      ? parsedUrlRoom.type
      : null
  )
  const [soloRoomId, setSoloRoomId] = useState(null)
  const [directRoomId, setDirectRoomId] = useState(null)
  const [activeGameType, setActiveGameType] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(() => (
    typeof savedAuth?.preferences?.soundEnabled === 'boolean'
      ? savedAuth.preferences.soundEnabled
      : true
  ))
  const [routeNotice, setRouteNotice] = useState('')
  const [socketNotice, setSocketNotice] = useState(null)
  const [showProfileCard, setShowProfileCard] = useState(false)
  const bopAudioRef = useRef(null)
  const profileMenuRef = useRef(null)
  const soundEnabledRef = useRef(soundEnabled)
  const hadSocketIssueRef = useRef(false)
  const hasValidatedSavedSessionRef = useRef(false)
  const socketNoticeTimeoutRef = useRef(null)
  const lastMenuCleanupUsernameRef = useRef(null)

  const isUsernameAlreadyConnected = async (name) => {
    if (!name) return false

    const params = new URLSearchParams({ username: name })
    if (socket.id) {
      params.set('socketId', socket.id)
    }

    const response = await apiFetch(`/api/player/connection?${params.toString()}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Failed to resolve connection status')
    }

    const payload = await response.json()
    return Boolean(payload?.connected)
  }

  const getRoomNoticeMessage = (error) => {
    const noticeText = ROOM_NOTICE_TRANSLATIONS[language] || ROOM_NOTICE_TRANSLATIONS[DEFAULT_LANGUAGE]
    if (!error) return noticeText.roomUsed
    if (error === 'User is already in a room') return noticeText.userConnected
    return error
  }

  const applyPreferences = (preferences) => {
    const normalized = normalizePreferences(preferences)
    localStorage.setItem(THEME_STORAGE_KEY, normalized.theme)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized.language)
    setTheme(normalized.theme)
    setSoundEnabled(normalized.soundEnabled)
    setLanguage(normalized.language)
    return normalized
  }

  const savePreferences = (preferences) => {
    if (!username) return
    const normalized = normalizePreferences(preferences)

    apiFetch('/api/profile', {
      method: 'POST',
      ...authFetchOptions(),
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ preferences: normalized }),
    })
      .then(async (response) => {
        if (!response.ok) return
        const profile = await response.json()
        setUserProfile((current) => ({
          ...(current || {}),
          ...profile,
          preferences: normalizePreferences(profile.preferences),
        }))
      })
      .catch(() => {})
  }

  /* ---------------- SYNC URL PARAMS ---------------- */

  useEffect(() => {
    if (urlUsername && !USERNAME_PATTERN.test(urlUsername)) {
      navigate('/', { replace: true })
      return
    }

    // Rooms opened from the regular multiplayer lobby also update the URL,
    // but they should stay in the lobby flow instead of switching to direct-room mode.
    if (showRooms) {
      return
    }

    if (urlRoomName) {
      if (parsedUrlRoom.type === 'solo') {
        if (!soloRoomName) setSoloRoomName(parsedUrlRoom.name)
        setShowSoloRoom(true)
        setShowDirectRoom(false)
        setShowRooms(false)
      } else {
        setDirectRoomName(parsedUrlRoom.name)
        setDirectRoomType(parsedUrlRoom.type || 'multi')
        setShowDirectRoom(true)
        setShowSoloRoom(false)
        setShowRooms(false)
      }
    }
  }, [urlUsername, urlRoomName, username, soloRoomName, parsedUrlRoom, navigate, showRooms])

  useEffect(() => {
    if (username && userProfile?.avatar) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        ...userProfile,
        username,
        email: userProfile.email,
        avatar: userProfile.avatar,
        preferences: normalizePreferences(userProfile.preferences),
      }))
      return
    }

    if (!username) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [username, userProfile])

  useEffect(() => {
    if (!savedAuth?.username) return
    if (hasValidatedSavedSessionRef.current) return
    hasValidatedSavedSessionRef.current = true

    let cancelled = false

    const validateSavedSession = async () => {
      try {
        const response = await apiFetch('/api/auth/me', { cache: 'no-store' })
        if (cancelled) return

        if (!response.ok) {
          localStorage.removeItem(AUTH_STORAGE_KEY)
          setUsername((current) => (
            current === savedAuth.username ? null : current
          ))
          setUserProfile((current) => (
            current?.username === savedAuth.username ? null : current
          ))
          return
        }

        const profile = await response.json()
        if (cancelled) return
        setUserProfile({
          ...profile,
          name: profile.name || profile.username,
          avatar: profile.avatar || DEFAULT_URL_AVATAR,
          preferences: normalizePreferences(profile.preferences),
        })
        setUsername(profile.username)
        applyPreferences(profile.preferences)
      } catch {
        // Keep the optimistic local session during transient network failures.
      }
    }

    validateSavedSession()

    return () => {
      cancelled = true
    }
  }, [savedAuth])

  useEffect(() => {
    if (!username) return
    if (userProfile?.username === username) return

    let cancelled = false

    const ensureUrlUserProfile = async () => {
      try {
        const statsResponse = await apiFetch(
          `/api/player/stats?username=${encodeURIComponent(username)}`
        )

        if (cancelled) return

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (cancelled) return
        setUserProfile({
          ...statsData,
          username,
          name: statsData.name || username,
          avatar: statsData.avatar || DEFAULT_URL_AVATAR,
          preferences: normalizePreferences(userProfile?.preferences),
          statsFetchedAt: Date.now(),
        })
          return
        }

        if (statsResponse.status !== 404) {
          return
        }

        const profileResponse = await apiFetch(`/api/profile`, {
          method: 'POST',
          ...authFetchOptions(),
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            avatar: DEFAULT_URL_AVATAR,
          }),
        })

        if (!profileResponse.ok || cancelled) {
          return
        }

        const profileData = await profileResponse.json()
        if (cancelled) return
        setUserProfile({
          username: profileData.username || username,
          avatar: profileData.avatar || DEFAULT_URL_AVATAR,
          preferences: normalizePreferences(userProfile?.preferences),
        })
      } catch {
        if (!cancelled) {
          setUserProfile((current) => current || {
            username,
            avatar: DEFAULT_URL_AVATAR,
            preferences: DEFAULT_PREFERENCES,
          })
        }
      }
    }

    ensureUrlUserProfile()

    return () => {
      cancelled = true
    }
  }, [username, userProfile])

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
    if (!soundEnabled && bopAudioRef.current) {
      bopAudioRef.current.pause()
      bopAudioRef.current.currentTime = 0
    }
  }, [soundEnabled])

  useEffect(() => {
    const audio = new Audio(bopSound)
    audio.volume = 0.1
    audio.preload = 'auto'
    bopAudioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
      bopAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    const handleButtonHover = (event) => {
      const button = event.target.closest('button')
      if (!button) return
      if (button.disabled) return
      if (event.relatedTarget && button.contains(event.relatedTarget)) return
      if (!soundEnabledRef.current) return

      const audio = bopAudioRef.current
      if (!audio) return
      audio.currentTime = 0
      audio.play().catch(() => {})
    }

    document.addEventListener('mouseover', handleButtonHover)
    return () => document.removeEventListener('mouseover', handleButtonHover)
  }, [])

  useEffect(() => {
    if (!routeNotice) return
    const timeoutId = setTimeout(() => {
      setRouteNotice('')
    }, 3500)
    return () => clearTimeout(timeoutId)
  }, [routeNotice])

  useEffect(() => {
    const isIdleMenu =
      username &&
      !showRooms &&
      !showGame &&
      !showSoloRoom &&
      !showDirectRoom &&
      !urlRoomName

    if (!isIdleMenu) {
      lastMenuCleanupUsernameRef.current = null
      return
    }

    if (lastMenuCleanupUsernameRef.current === username) return
    lastMenuCleanupUsernameRef.current = username

    socket.emit('enterMenu', { username }, (res) => {
      if (!res?.ok) {
        lastMenuCleanupUsernameRef.current = null
      }
    })
  }, [username, showRooms, showGame, showSoloRoom, showDirectRoom, urlRoomName])

  useEffect(() => {
    const clearSocketNoticeTimeout = () => {
      if (!socketNoticeTimeoutRef.current) return
      clearTimeout(socketNoticeTimeoutRef.current)
      socketNoticeTimeoutRef.current = null
    }

    const clearSocketNoticeAfter = (message, delay) => {
      clearSocketNoticeTimeout()
      socketNoticeTimeoutRef.current = setTimeout(() => {
        socketNoticeTimeoutRef.current = null
        setSocketNotice((current) => (
          current?.message === message ? null : current
        ))
      }, delay)
    }

    const showSocketIssue = (message) => {
      hadSocketIssueRef.current = true
      clearSocketNoticeTimeout()
      setSocketNotice({ type: 'warning', message })
    }

    const handleDisconnect = (reason) => {
      if (reason === 'io client disconnect') return
      showSocketIssue('Connection lost. Reconnecting...')
    }

    const handleConnectError = () => {
      showSocketIssue('Server unavailable. Retrying...')
    }

    const handleBackendError = (error) => {
      const message = typeof error?.message === 'string' ? error.message : 'Server error'
      setSocketNotice({ type: 'error', message })
      clearSocketNoticeAfter(message, 4500)
    }

    const handleConnect = () => {
      if (!hadSocketIssueRef.current) return
      hadSocketIssueRef.current = false
      setSocketNotice({ type: 'success', message: 'Reconnected.' })
      clearSocketNoticeAfter('Reconnected.', 2500)
    }

    const handleReconnectAttempt = () => {
      showSocketIssue('Reconnecting...')
    }

    const handleReconnectFailed = () => {
      showSocketIssue('Unable to reconnect. Please refresh.')
    }

    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('error', handleBackendError)
    socket.on('connect', handleConnect)
    socket.io?.on('reconnect_attempt', handleReconnectAttempt)
    socket.io?.on('reconnect_failed', handleReconnectFailed)

    return () => {
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.off('error', handleBackendError)
      socket.off('connect', handleConnect)
      socket.io?.off('reconnect_attempt', handleReconnectAttempt)
      socket.io?.off('reconnect_failed', handleReconnectFailed)
      clearSocketNoticeTimeout()
    }
  }, [])

  /* ---------------- PROFILE ---------------- */

  const handleAuthSubmit = async (profile) => {
    await reconnectSocketWithSession()

    const regResult = await new Promise((resolve) => {
      if (!socket?.emit) {
        resolve({ ok: true })
        return
      }
      socket.timeout(2000).emit('registerUser', { username: profile.username }, (err, res) => {
        if (err) {
          resolve({ ok: false, error: 'Server not responding' })
          return
        }
        resolve(res || { ok: false, error: 'Unknown error' })
      })
    })

    if (!regResult?.ok) {
      setRouteNotice(regResult?.error || 'Username already connected')
      return
    }

    setUserProfile(profile)
    setUsername(profile.username)
    applyPreferences(profile.preferences)

    window.history.pushState({ hasUsername: true }, '', window.location.pathname)
  }

  const handleThemeChange = (newTheme) => {
    const nextTheme = newTheme === 'dark' ? 'dark' : 'light'
    const nextPreferences = normalizePreferences({
      ...(userProfile?.preferences || {}),
      theme: nextTheme,
      soundEnabled,
      language,
    })
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    setTheme(nextTheme)
    setUserProfile((current) => ({
      ...(current || {}),
      preferences: nextPreferences,
    }))
    savePreferences(nextPreferences)
  }

  const handleSoundChange = (enabled) => {
    const nextSoundEnabled = Boolean(enabled)
    const nextPreferences = normalizePreferences({
      ...(userProfile?.preferences || {}),
      theme,
      soundEnabled: nextSoundEnabled,
      language,
    })
    setSoundEnabled(nextSoundEnabled)
    setUserProfile((current) => ({
      ...(current || {}),
      preferences: nextPreferences,
    }))
    savePreferences(nextPreferences)
  }

  const handleLanguageChange = (nextLanguage) => {
    const languageCode = isSupportedLanguage(nextLanguage) ? nextLanguage : DEFAULT_LANGUAGE
    const nextPreferences = normalizePreferences({
      ...(userProfile?.preferences || {}),
      theme,
      soundEnabled,
      language: languageCode,
    })
    localStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode)
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT))
    setLanguage(languageCode)
    if (username) {
      setUserProfile((current) => ({
        ...(current || {}),
        preferences: nextPreferences,
      }))
    }
    savePreferences(nextPreferences)
  }

  const handleReturnToProfile = async () => {
    if (username) {
      await unregisterUserBeforeDisconnect(username)
    }
    socket.disconnect?.()
    apiFetch('/api/auth/logout', {
      method: 'POST',
      ...authFetchOptions(),
    }).catch(() => {})
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setUsername(null)
    setShowRooms(false)
    setShowGame(false)
    setShowSoloRoom(false)
    setShowDirectRoom(false)
    setUserProfile(null)
    setSoloRoomName(null)
    setDirectRoomName(null)
    setDirectRoomType(null)
    setSoloRoomId(null)
    setDirectRoomId(null)
    setActiveGameType(null)
    setShowProfileCard(false)
    navigate('/login', { replace: true })
  }

  const handleProfileUpdate = (profile) => {
    setUserProfile((current) => ({
      ...(current || {}),
      ...profile,
      preferences: normalizePreferences(profile.preferences || current?.preferences),
    }))
    setUsername(profile.username)
    setShowProfileCard(false)
  }

  const handleExitJoinedRoom = () => {
    setShowRooms(false)
    setShowDirectRoom(false)
    setDirectRoomName(null)
    setDirectRoomType(null)
    setDirectRoomId(null)
    setShowSoloRoom(false)
    setSoloRoomName(null)
    setSoloRoomId(null)
    setShowGame(false)
    setActiveGameType(null)
    navigate('/', { replace: true })
  }

  const handleReturnToRoomsList = () => {
    setShowRooms(true)
    setShowDirectRoom(false)
    setDirectRoomName(null)
    setDirectRoomType(null)
    setDirectRoomId(null)
    setShowSoloRoom(false)
    setSoloRoomName(null)
    setSoloRoomId(null)
    setShowGame(false)
    setActiveGameType(null)
    navigate('/', { replace: true })
  }

  const returnHomeWithNotice = (message) => {
    setShowRooms(false)
    setShowGame(false)
    setShowSoloRoom(false)
    setShowDirectRoom(false)
    setSoloRoomName(null)
    setDirectRoomName(null)
    setDirectRoomType(null)
    setSoloRoomId(null)
    setDirectRoomId(null)
    setActiveGameType(null)
    setRouteNotice(message)
    navigate('/', { replace: true })
  }

  const returnToProfileWithNotice = (message) => {
    setUsername(null)
    setUserProfile(null)
    setShowRooms(false)
    setShowGame(false)
    setShowSoloRoom(false)
    setShowDirectRoom(false)
    setSoloRoomName(null)
    setDirectRoomName(null)
    setDirectRoomType(null)
    setSoloRoomId(null)
    setDirectRoomId(null)
    setActiveGameType(null)
    setRouteNotice(message)
    navigate('/', { replace: true })
  }

  /* ---------------- UPDATE URL WHEN ROOM IS CREATED ---------------- */

  const handleRoomCreated = (roomId, roomName, roomType) => {
    const typeSlug = roomType === 'cooperative' || roomType === 'coop' ? 'coop' : 'multi'
    navigate(buildRoomPath(roomName, typeSlug, username), { replace: true })
  }

  const handleExitSolo = async () => {
    if (soloRoomId) {
      try {
        await new Promise((resolve) => {
          socket.emit(
            "playerLeave",
            { roomId: String(soloRoomId), username },
            () => resolve()
          );
        });

      } catch (err) {
        console.error("Failed to leave solo room:", err);
      }
    }

    setSoloRoomId(null);
    setShowGame(false);
    setShowSoloRoom(false);
    setSoloRoomName(null);
    setActiveGameType(null);
    navigate('/', { replace: true });
  };

  const handlePlaySoloAgain = () => {
    setShowGame(false)
    setShowSoloRoom(true)
    setSoloRoomId(null)
    setSoloRoomName(null)
    setActiveGameType(null)
    navigate('/', { replace: true })
  }

  const handlePlayDirectAgain = () => {
    if (!directRoomId) return
    socket.emit('playAgain', { roomId: String(directRoomId), username })
    setShowGame(false)
    setShowDirectRoom(true)
  }

  const handleExitSoloLobby = async () => {
    if (soloRoomId) {
      try {
        await new Promise((resolve) => {
          socket.emit(
            "playerLeave",
            { roomId: String(soloRoomId), username },
            () => resolve()
          );
        });

      } catch (err) {
        console.error("Failed to leave solo lobby:", err);
      }
    }

    setSoloRoomId(null);
    setShowSoloRoom(false);
    setSoloRoomName(null);
    navigate('/', { replace: true });
  };

  const handleExitDirectLobby = async () => {
    if (directRoomId) {
      try {
        await new Promise((resolve) => {
          socket.emit(
            "playerLeave",
            { roomId: String(directRoomId), username },
            () => resolve()
          );
        });
      } catch (err) {
        console.error("Failed to leave direct lobby:", err);
      }
    }

    setDirectRoomId(null);
    setDirectRoomName(null);
    setDirectRoomType(null);
    setShowDirectRoom(false);
    navigate('/', { replace: true });
  };

  const handleExitDirectGame = async () => {
    if (directRoomId) {
      try {
        await new Promise((resolve) => {
          socket.emit(
            "playerLeave",
            { roomId: String(directRoomId), username },
            () => resolve()
          );
        });
      } catch (err) {
        console.error("Failed to leave direct game:", err);
      }
    }

    setDirectRoomId(null);
    setDirectRoomName(null);
    setDirectRoomType(null);
    setShowDirectRoom(false);
    setShowGame(false);
    setActiveGameType(null);
    navigate('/', { replace: true });
  };

  useEffect(() => {
    if (!showSoloRoom || !soloRoomName || soloRoomId) return

    const fetchSoloRoom = async () => {
      try {
        const res = await apiFetch(`/api/rooms/by-name/${encodeURIComponent(soloRoomName)}`, {
          cache: 'no-store',
        })
        if (res.status === 404) return
        if (!res.ok) {
          const errorPayload = await res.json().catch(() => ({}))
          returnHomeWithNotice(getRoomNoticeMessage(errorPayload?.error))
          return
        }
        const room = await res.json()
        if (room.name !== soloRoomName) {
          return
        }
        if (room.host && room.host !== username) {
          console.error('Solo room already owned by another player.')
          returnHomeWithNotice(getRoomNoticeMessage())
          return
        }
        if (room.status === 'started' && room.players?.includes(username)) {
          setSoloRoomId(room.id)
          setActiveGameType('solo')
          setShowSoloRoom(false)
          setShowGame(true)
          return
        }
        if (getMaxPlayers(room.game_mode) <= room.player_count) {
          console.error('Solo room is full.')
          returnHomeWithNotice(getRoomNoticeMessage())
          return
        }
        setSoloRoomId(room.id)
      } catch {
        returnHomeWithNotice(getRoomNoticeMessage())
      }
    }

    fetchSoloRoom()
  }, [showSoloRoom, soloRoomName, soloRoomId, username, navigate])

  useEffect(() => {
    if (!showDirectRoom || !directRoomName || directRoomId) return

    const resolveDirectRoom = async () => {
      const isSameDirectRoom = (room) =>
        room &&
        room.name === directRoomName &&
        ((directRoomType === 'coop' &&
          ['cooperative', 'cooperative_roles'].includes(room.game_mode)) ||
          (directRoomType !== 'coop' &&
            !['cooperative', 'cooperative_roles'].includes(room.game_mode)))

      const isUserAlreadyInFetchedRoom = (room) =>
        room &&
        Array.isArray(room.players) &&
        room.players.includes(username)

      const hasConflictingExistingRoom = async () => {
        if (!username) return false

        if (await isUsernameAlreadyConnected(username)) {
          return true
        }

        const userRoomRes = await apiFetch(`/api/rooms/by-player/${encodeURIComponent(username)}`, {
          cache: 'no-store',
        })

        if (userRoomRes.status === 404) return false

        if (!userRoomRes.ok) {
          throw new Error('Failed to resolve current user room')
        }

        const userRoom = await userRoomRes.json()
        return !isSameDirectRoom(userRoom)
      }

      const createDirectRoom = async () => {
        const defaultMode = directRoomType === 'coop' ? 'cooperative' : 'classic'
        const createRes = await apiFetch(`/api/rooms`, {
          method: 'POST',
          ...authFetchOptions(),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameMode: defaultMode,
            host: username,
            name: directRoomName,
          }),
        })

        if (createRes.ok) {
          const room = await createRes.json()
          setDirectRoomId(room.id)
          return true
        }

        if (await hasConflictingExistingRoom()) {
          returnToProfileWithNotice(getRoomNoticeMessage('User is already in a room'))
          return false
        }

        if (createRes.status !== 409) {
          const errorPayload = await createRes.json().catch(() => ({}))
          console.error('Failed to create direct room')
          ;(errorPayload?.error === 'User is already in a room'
            ? returnToProfileWithNotice
            : returnHomeWithNotice)(
            getRoomNoticeMessage(errorPayload?.error)
          )
          return false
        }

        // Another player may have created the room between lookup and create.
        // Reload it and join if it is still waiting.
        const existingRes = await apiFetch(`/api/rooms/by-name/${encodeURIComponent(directRoomName)}`, {
          cache: 'no-store',
        })

        if (!existingRes.ok) {
          const errorPayload = await existingRes.json().catch(() => ({}))
          returnHomeWithNotice(getRoomNoticeMessage(errorPayload?.error))
          return false
        }

        const existingRoom = await existingRes.json()
        if (isUserAlreadyInFetchedRoom(existingRoom)) {
          returnToProfileWithNotice(getRoomNoticeMessage('User is already in a room'))
          return false
        }

        const isExistingCoopMode = ['cooperative', 'cooperative_roles'].includes(existingRoom.game_mode)
        if (directRoomType === 'coop' && !isExistingCoopMode) {
          returnHomeWithNotice(getRoomNoticeMessage())
          return false
        }
        if (directRoomType === 'multi' && isExistingCoopMode) {
          returnHomeWithNotice(getRoomNoticeMessage())
          return false
        }
        if (existingRoom.status === 'started') {
          returnHomeWithNotice(getRoomNoticeMessage())
          return false
        }

        const existingMaxPlayers = getMaxPlayers(existingRoom.game_mode)
        if (existingRoom.player_count >= existingMaxPlayers) {
          returnHomeWithNotice(getRoomNoticeMessage())
          return false
        }

        setDirectRoomId(existingRoom.id)
        return true
      }

      try {
        if (await hasConflictingExistingRoom()) {
          returnToProfileWithNotice(getRoomNoticeMessage('User is already in a room'))
          return
        }

        const res = await apiFetch(`/api/rooms/by-name/${encodeURIComponent(directRoomName)}`, {
          cache: 'no-store',
        })
        if (res.status === 404) {
          await createDirectRoom()
          return
        }

        if (!res.ok) {
          const errorPayload = await res.json().catch(() => ({}))
          returnHomeWithNotice(getRoomNoticeMessage(errorPayload?.error))
          return
        }
        const room = await res.json()

        if (room.name !== directRoomName) {
          await createDirectRoom()
          return
        }

        if (isUserAlreadyInFetchedRoom(room) && room.status !== 'started') {
          returnToProfileWithNotice(getRoomNoticeMessage('User is already in a room'))
          return
        }

        const isCoopMode = ['cooperative', 'cooperative_roles'].includes(room.game_mode)
        if (directRoomType === 'coop' && !isCoopMode) {
          console.error('Room type mismatch for coop.')
          returnHomeWithNotice(getRoomNoticeMessage())
          return
        }
        if (directRoomType === 'multi' && isCoopMode) {
          console.error('Room type mismatch for multi.')
          returnHomeWithNotice(getRoomNoticeMessage())
          return
        }
        if (room.status === 'started') {
          if (isUserAlreadyInFetchedRoom(room)) {
            setDirectRoomId(room.id)
            setActiveGameType(directRoomType || 'multi')
            setShowDirectRoom(false)
            setShowGame(true)
            return
          }
          console.error('Room already started.')
          returnHomeWithNotice(getRoomNoticeMessage())
          return
        }

        const maxPlayers = getMaxPlayers(room.game_mode)
        if (room.player_count >= maxPlayers) {
          console.error('Room is full.')
          returnHomeWithNotice(getRoomNoticeMessage())
          return
        }

        setDirectRoomId(room.id)
      } catch {
        returnHomeWithNotice(getRoomNoticeMessage())
      }
    }

    resolveDirectRoom()
  }, [showDirectRoom, directRoomName, directRoomId, directRoomType, username, navigate])

  useEffect(() => {
    if (!directRoomId) return

    const handleGameStarted = ({ roomId }) => {
      if (String(roomId) !== String(directRoomId)) return
      setActiveGameType(directRoomType || 'multi')
      setShowGame(true)
      setShowDirectRoom(false)
    }

    socket.on('gameStarted', handleGameStarted)
    return () => socket.off('gameStarted', handleGameStarted)
  }, [directRoomId, directRoomType])

  useEffect(() => {
    if (!username) return

    if (showSoloRoom && soloRoomName) {
      const targetPath = buildRoomPath(soloRoomName, 'solo', username)
      if (window.location.pathname !== targetPath) {
        navigate(targetPath, { replace: true })
      }
      return
    }

    if (showDirectRoom && directRoomName) {
      const targetPath = buildRoomPath(directRoomName, directRoomType || 'multi', username)
      if (window.location.pathname !== targetPath) {
        navigate(targetPath, { replace: true })
      }
    }
  }, [username, showSoloRoom, soloRoomName, showDirectRoom, directRoomName, directRoomType, navigate])

  /* ---------------- BACK BUTTON ---------------- */

  useEffect(() => {
    const handlePopState = (event) => {
      if (username && !event.state?.hasUsername) {
        setUsername(null)
        setShowRooms(false)
      }
    }

    window.addEventListener('popstate', handlePopState)

    if (username) {
      window.history.replaceState(
        { hasUsername: true },
        '',
        window.location.pathname
      )
    }

    return () => window.removeEventListener('popstate', handlePopState)
  }, [username])

  useEffect(() => {
    if (!showProfileCard) return

    const handlePointerDown = (event) => {
      if (profileMenuRef.current?.contains(event.target)) return
      setShowProfileCard(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [showProfileCard])

  /* ---------------- STARS (DARK MODE) ---------------- */

  const starsRef = useRef(null)

  useEffect(() => {
    if (theme !== 'dark' || !starsRef.current) return

    const updateStarPositions = () => {
      const positions = Array.from({ length: 25 }, () =>
        `${Math.random() * 100}% ${Math.random() * 100}%`
      ).join(', ')

      starsRef.current.style.animation = 'none'
      starsRef.current.style.backgroundPosition = positions
      starsRef.current.offsetHeight
      starsRef.current.style.animation = 'fadeInOut 3s ease-in-out infinite'
    }

    updateStarPositions()
    const interval = setInterval(updateStarPositions, 3000)
    return () => clearInterval(interval)
  }, [theme])

  /* ---------------- RENDER ---------------- */

  return (
    <>
      {/* Background always rendered */}
      <div className={`sky-background ${theme === 'dark' ? 'dark' : ''}`}>
        {theme === 'dark' && <div ref={starsRef} className="stars" />}
        <GoodClouds />
        <TetriminosClouds />
      </div>

      {/* Content wrapper always rendered */}
      <div className="content-wrapper">
        {(socketNotice || routeNotice) && (
          <div
            className={`route-notice ${socketNotice?.type || 'error'}`}
            role="alert"
          >
            {socketNotice?.message || routeNotice}
          </div>
        )}
        {showRooms && username ? (
          <Rooms
            theme={theme}
            username={username}
            userProfile={userProfile}
            onBack={handleExitJoinedRoom}
            onLeaveRoom={handleReturnToRoomsList}
            onRoomCreated={handleRoomCreated}
            onNotice={setRouteNotice}
            soundEnabled={soundEnabled}
            onSoundChange={handleSoundChange}
            language={language}
          />
        ) : (
          <>
              {username && !showRooms && !showGame && !showSoloRoom && !showDirectRoom && (
              <>
                <div className="profile-menu-anchor" ref={profileMenuRef}>
                  <button
                    className="profile-avatar-btn"
                    onClick={() => setShowProfileCard((current) => !current)}
                    aria-label="Open profile menu"
                    aria-expanded={showProfileCard}
                    type="button"
                  >
                    <FaceAvatar faceConfig={userProfile?.avatar || DEFAULT_URL_AVATAR} size="small" />
                  </button>
                  {showProfileCard && (
                    <div className="profile-popover">
                      <ProfileMenu
                        theme={theme}
                        initialProfile={userProfile || { username, avatar: DEFAULT_URL_AVATAR }}
                        title="Profile"
                        submitLabel="Save"
                        language={language}
                        onSubmit={handleProfileUpdate}
                        onLogout={handleReturnToProfile}
                      />
                    </div>
                  )}
                </div>
                <PlayerStats
                  theme={theme}
                  userProfile={userProfile}
                  username={username}
                  language={language}
                />
                <Leaderboard theme={theme} language={language} />
              </>
            )}

            {!username ? (
              <AuthMenu
                onAuthenticated={handleAuthSubmit}
                theme={theme}
                initialMode={authMode}
                language={language}
                onLanguageChange={handleLanguageChange}
              />
            ) : (
              <>
                  {!showGame && !showRooms && !showSoloRoom && !showDirectRoom && <Title />}
                  {showSoloRoom && !showGame ? (
                    <CreateRoom
                      theme={theme}
                      username={username}
                      userProfile={userProfile}
                      mode={soloRoomId ? 'join' : 'create'}
                      roomId={soloRoomId}
                      isSolo={true}
                      roomType="multiplayer"
                      desiredRoomName={soloRoomName}
                      onBack={handleExitSoloLobby}
                      onNotice={setRouteNotice}
                      language={language}
                      onJoinError={(error) => {
                        if (error === 'Username already connected' || error === 'User is already in a room') {
                          returnToProfileWithNotice(getRoomNoticeMessage('User is already in a room'))
                          return
                        }
                        returnHomeWithNotice(getRoomNoticeMessage())
                      }}
                      onRoomRenamed={(roomName) => {
                        setSoloRoomName(roomName)
                        navigate(buildRoomPath(roomName, 'solo', username), { replace: true })
                      }}
                      onRoomCreated={(roomId, roomName) => {
                        setSoloRoomId(roomId)
                        setSoloRoomName(roomName)
                        navigate(buildRoomPath(roomName, 'solo', username), { replace: true })
                      }}
                      onStartGame={(roomId) => {
                        if (roomId) setSoloRoomId(roomId)
                        setActiveGameType('solo')
                        setShowSoloRoom(false)
                        setShowGame(true)
                      }}
                    />
                  ) : showDirectRoom && !showGame && directRoomId ? (
                    <CreateRoom
                      theme={theme}
                      username={username}
                      userProfile={userProfile}
                      mode="join"
                      roomId={directRoomId}
                      roomType={directRoomType === 'coop' ? 'cooperative' : 'multiplayer'}
                      desiredRoomName={directRoomName}
                      onBack={handleExitDirectLobby}
                      onNotice={setRouteNotice}
                      language={language}
                      onJoinError={(error) => {
                        if (error === 'Username already connected' || error === 'User is already in a room') {
                          returnToProfileWithNotice(getRoomNoticeMessage('User is already in a room'))
                          return
                        }
                        returnHomeWithNotice(getRoomNoticeMessage())
                      }}
                      onRoomRenamed={(roomName) => {
                        setDirectRoomName(roomName)
                        navigate(buildRoomPath(roomName, directRoomType, username), { replace: true })
                      }}
                      onRoomCreated={(roomId, roomName) => {
                        setDirectRoomId(roomId)
                        setDirectRoomName(roomName)
                        navigate(buildRoomPath(roomName, directRoomType, username), { replace: true })
                      }}
                      onStartGame={(roomId) => {
                        if (roomId) setDirectRoomId(roomId)
                        setActiveGameType(directRoomType || 'multi')
                        setShowDirectRoom(false)
                        setShowGame(true)
                      }}
                    />
                  ) : showGame ? (
                    <Game
                      theme={theme}
                      onBack={activeGameType === 'solo' ? handleExitSolo : handleExitDirectGame}
                      onPlayAgain={activeGameType === 'solo' ? handlePlaySoloAgain : handlePlayDirectAgain}
                      roomId={activeGameType === 'solo' ? soloRoomId : directRoomId}
                      username={username}
                      isMultiplayer={activeGameType !== 'solo'}
                      soundEnabled={soundEnabled}
                      onSoundChange={handleSoundChange}
                      language={language}
                    />
                  ) : (
                    <ModeMenuSelector
                      theme={theme}
                      onThemeChange={handleThemeChange}
                      onShowRooms={setShowRooms}
                      onShowSoloRoom={setShowSoloRoom}
                      soundEnabled={soundEnabled}
                      onSoundChange={handleSoundChange}
                      selectedLanguage={language}
                      onLanguageChange={handleLanguageChange}
                    />
                  )}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

export default Index


