import './index.css'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import ProfileMenu from './components/ProfileMenu/ProfileMenu.jsx'
import ModeMenuSelector from './components/ModeMenuSelector/ModeMenuSelector.jsx'
import Leaderboard from './components/Leaderboard/Leaderboard.jsx'
import PlayerStats from './components/PlayerStats/PlayerStats.jsx'
import Rooms from './components/Rooms/Rooms.jsx'
import CreateRoom from './components/CreateRoom/CreateRoom.jsx'
import Game from './components/Game/Game.jsx'
import Title from './components/Title/Title.jsx'
import { socket } from './socket'
import bopSound from './res/sounds/bop.mp3'

const USERNAME_PATTERN = /^[a-zA-Z0-9]{1,15}$/
const ROOM_TYPE_SUFFIX = {
  multi: '_multi',
  coop: '_coop',
  legacySolo: '_solo',
}
const DEFAULT_URL_AVATAR = {
  skinColor: '#cccccc',
  eyeType: 'normal',
  mouthType: 'neutral',
}

const parseRoomSlug = (slug) => {
  if (!slug) return { name: null, type: null }
  if (slug.endsWith(ROOM_TYPE_SUFFIX.multi)) {
    return {
      name: slug.slice(0, -ROOM_TYPE_SUFFIX.multi.length),
      type: 'multi'
    }
  }
  if (slug.endsWith(ROOM_TYPE_SUFFIX.coop)) {
    return {
      name: slug.slice(0, -ROOM_TYPE_SUFFIX.coop.length),
      type: 'coop'
    }
  }
  if (slug.endsWith(ROOM_TYPE_SUFFIX.legacySolo)) {
    return {
      name: slug.slice(0, -ROOM_TYPE_SUFFIX.legacySolo.length),
      type: 'solo'
    }
  }
  return { name: slug, type: 'solo' }
}

const buildRoomSlug = (roomName, type) => {
  if (!roomName) return ''
  if (type === 'multi') return `${roomName}${ROOM_TYPE_SUFFIX.multi}`
  if (type === 'coop') return `${roomName}${ROOM_TYPE_SUFFIX.coop}`
  return roomName
}

const getMaxPlayers = (gameMode) =>
  ['cooperative', 'cooperative_roles'].includes(gameMode) ? 2 : 6

function Index() {
  const { roomName: urlRoomName, username: urlUsername } = useParams()
  const navigate = useNavigate()
  const hasValidUrlUsername = urlUsername ? USERNAME_PATTERN.test(urlUsername) : false
  const parsedUrlRoom = useMemo(() => parseRoomSlug(urlRoomName), [urlRoomName])

  const [username, setUsername] = useState(
    hasValidUrlUsername ? urlUsername : null
  )
  const [theme, setTheme] = useState('light')
  const [showRooms, setShowRooms] = useState(false)
  const [showGame, setShowGame] = useState(false)
  const [showSoloRoom, setShowSoloRoom] = useState(false)
  const [showDirectRoom, setShowDirectRoom] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [joinedRoomName, setJoinedRoomName] = useState(null)
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
  const [soundEnabled, setSoundEnabled] = useState(true)
  const bopAudioRef = useRef(null)
  const soundEnabledRef = useRef(soundEnabled)

  const API_URL = import.meta.env.VITE_API_URL || ''

  /* ---------------- SYNC URL PARAMS ---------------- */

  useEffect(() => {
    if (urlUsername && !USERNAME_PATTERN.test(urlUsername)) {
      navigate('/', { replace: true })
      return
    }

    if (urlUsername && !username) setUsername(urlUsername)

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
  }, [urlUsername, urlRoomName, username, soloRoomName, parsedUrlRoom, navigate])

  useEffect(() => {
    if (!username) return
    if (userProfile?.username === username) return

    let cancelled = false

    const ensureUrlUserProfile = async () => {
      try {
        const statsResponse = await fetch(
          `${API_URL}/api/player/stats?username=${encodeURIComponent(username)}`
        )

        if (cancelled) return

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (cancelled) return
          setUserProfile({
            username,
            avatar: statsData.avatar || DEFAULT_URL_AVATAR,
          })
          return
        }

        if (statsResponse.status !== 404) {
          return
        }

        const profileResponse = await fetch(`${API_URL}/api/profile`, {
          method: 'POST',
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
        })
      } catch {
        if (!cancelled) {
          setUserProfile((current) => current || {
            username,
            avatar: DEFAULT_URL_AVATAR,
          })
        }
      }
    }

    ensureUrlUserProfile()

    return () => {
      cancelled = true
    }
  }, [username, userProfile, API_URL])

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

  /* ---------------- PROFILE ---------------- */

  const handleUsernameSubmit = (profileOrUsername, avatar) => {
    if (typeof profileOrUsername === 'object' && profileOrUsername !== null) {
      setUserProfile(profileOrUsername)
      setUsername(profileOrUsername.username)
    } else {
      setUsername(profileOrUsername)
      setUserProfile({ username: profileOrUsername, avatar })
    }

    window.history.pushState({ hasUsername: true }, '', window.location.pathname)
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
  }

  const handleSoundChange = (enabled) => {
    setSoundEnabled(Boolean(enabled))
  }

  const handleReturnToProfile = () => {
    if (username) {
      socket.emit('unregisterUser', { username })
    }
    setUsername(null)
    setShowRooms(false)
    setShowGame(false)
    setShowSoloRoom(false)
    setShowDirectRoom(false)
    setUserProfile(null)
    setJoinedRoomName(null)
    setSoloRoomName(null)
    setDirectRoomName(null)
    setDirectRoomType(null)
    setSoloRoomId(null)
    setDirectRoomId(null)
    setActiveGameType(null)
    navigate('/')
  }

  const handleExitJoinedRoom = () => {
    setShowRooms(false)
    setJoinedRoomName(null)
    navigate('/', { replace: true })
  }

  const handleReturnToRoomsList = () => {
    setJoinedRoomName(null)
    setShowRooms(true)
    navigate('/', { replace: true })
  }

  /* ---------------- UPDATE URL WHEN ROOM IS CREATED ---------------- */

  const handleRoomCreated = (roomId, roomName, roomType) => {
    setJoinedRoomName(roomName)

    // Update URL without reload
    const typeSlug = roomType === 'cooperative' || roomType === 'coop' ? 'coop' : 'multi'
    const slug = buildRoomSlug(roomName, typeSlug)
    navigate(`/${slug}/${username}`, { replace: true })
  }

  const handleExitSolo = async () => {
    if (soloRoomId) {
      try {
        await new Promise((resolve) => {
          socket.emit(
            "playerLeave",
            { roomId: String(soloRoomId) },
            () => resolve()
          );
        });

        console.log("[Index] Left solo room", { roomId: soloRoomId });
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
    setActiveGameType(null)
  }

  const handleExitSoloLobby = async () => {
    if (soloRoomId) {
      try {
        await new Promise((resolve) => {
          socket.emit(
            "playerLeave",
            { roomId: String(soloRoomId) },
            () => resolve()
          );
        });

        console.log("[Index] Left solo lobby", { roomId: soloRoomId });
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
            { roomId: String(directRoomId) },
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
            { roomId: String(directRoomId) },
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
        const res = await fetch(`${API_URL}/api/rooms/by-name/${encodeURIComponent(soloRoomName)}`)
        if (res.status === 404) return
        if (!res.ok) return
        const room = await res.json()
        if (room.name !== soloRoomName) {
          return
        }
        if (room.host && room.host !== username) {
          console.error('Solo room already owned by another player.')
          navigate('/', { replace: true })
          return
        }
        if (getMaxPlayers(room.game_mode) <= room.player_count) {
          console.error('Solo room is full.')
          navigate('/', { replace: true })
          return
        }
        setSoloRoomId(room.id)
      } catch {
        // no-op: fallback to create flow if needed
      }
    }

    fetchSoloRoom()
  }, [showSoloRoom, soloRoomName, soloRoomId, API_URL, username, navigate])

  useEffect(() => {
    if (!showDirectRoom || !directRoomName || directRoomId) return

    const resolveDirectRoom = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rooms/by-name/${encodeURIComponent(directRoomName)}`)
        if (res.status === 404) {
          const defaultMode = directRoomType === 'coop' ? 'cooperative' : 'classic'
          const createRes = await fetch(`${API_URL}/api/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameMode: defaultMode,
              host: username,
              name: directRoomName,
            }),
          })

          if (!createRes.ok) {
            console.error('Failed to create direct room')
            navigate('/', { replace: true })
            return
          }

          const room = await createRes.json()
          setDirectRoomId(room.id)
          return
        }

        if (!res.ok) return
        const room = await res.json()

        if (room.name !== directRoomName) {
          const defaultMode = directRoomType === 'coop' ? 'cooperative' : 'classic'
          const createRes = await fetch(`${API_URL}/api/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameMode: defaultMode,
              host: username,
              name: directRoomName,
            }),
          })

          if (!createRes.ok) {
            console.error('Failed to create direct room')
            navigate('/', { replace: true })
            return
          }

          const room = await createRes.json()
          setDirectRoomId(room.id)
          return
        }

        const isCoopMode = ['cooperative', 'cooperative_roles'].includes(room.game_mode)
        if (directRoomType === 'coop' && !isCoopMode) {
          console.error('Room type mismatch for coop.')
          navigate('/', { replace: true })
          return
        }
        if (directRoomType === 'multi' && isCoopMode) {
          console.error('Room type mismatch for multi.')
          navigate('/', { replace: true })
          return
        }

        const maxPlayers = getMaxPlayers(room.game_mode)
        if (room.player_count >= maxPlayers) {
          console.error('Room is full.')
          navigate('/', { replace: true })
          return
        }

        setDirectRoomId(room.id)
      } catch {
        // no-op
      }
    }

    resolveDirectRoom()
  }, [showDirectRoom, directRoomName, directRoomId, directRoomType, API_URL, username, navigate])

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
      const targetPath = `/${buildRoomSlug(soloRoomName, 'solo')}/${username}`
      if (window.location.pathname !== targetPath) {
        navigate(targetPath, { replace: true })
      }
      return
    }

    if (showDirectRoom && directRoomName) {
      const targetPath = `/${buildRoomSlug(directRoomName, directRoomType || 'multi')}/${username}`
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
        {(joinedRoomName || showRooms) && username ? (
          <Rooms
            theme={theme}
            username={username}
            userProfile={userProfile}
            joinRoomName={joinedRoomName}
            onBack={handleExitJoinedRoom}
            onLeaveRoom={handleReturnToRoomsList}
            onRoomCreated={handleRoomCreated}
            soundEnabled={soundEnabled}
            onSoundChange={handleSoundChange}
          />
        ) : (
          <>
              {username && !showRooms && !showGame && !showSoloRoom && !showDirectRoom && (
              <>
                <button
                  className="return-profile-btn"
                  onClick={handleReturnToProfile}
                >
                  ← Change profile
                </button>
                <PlayerStats
                  theme={theme}
                  userProfile={userProfile}
                  username={username}
                />
                <Leaderboard theme={theme} />
              </>
            )}

            {!username ? (
              <ProfileMenu onSubmit={handleUsernameSubmit} theme={theme} />
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
                      onRoomCreated={(roomId, roomName) => {
                        setSoloRoomId(roomId)
                        setSoloRoomName(roomName)
                        const slug = buildRoomSlug(roomName, 'solo')
                        navigate(`/${slug}/${username}`, { replace: true })
                      }}
                      onStartGame={(roomId) => {
                        if (roomId) setSoloRoomId(roomId)
                        setActiveGameType('solo')
                        setShowSoloRoom(false)
                        setShowGame(true)
                      }}
                    />
                  ) : showDirectRoom && !showGame ? (
                    <CreateRoom
                      theme={theme}
                      username={username}
                      userProfile={userProfile}
                      mode={directRoomId ? 'join' : 'create'}
                      roomId={directRoomId}
                      roomType={directRoomType === 'coop' ? 'cooperative' : 'multiplayer'}
                      desiredRoomName={directRoomName}
                      onBack={handleExitDirectLobby}
                      onRoomCreated={(roomId, roomName) => {
                        setDirectRoomId(roomId)
                        setDirectRoomName(roomName)
                        const slug = buildRoomSlug(roomName, directRoomType)
                        navigate(`/${slug}/${username}`, { replace: true })
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
                      onPlayAgain={activeGameType === 'solo' ? handlePlaySoloAgain : undefined}
                      roomId={activeGameType === 'solo' ? soloRoomId : directRoomId}
                      username={username}
                      isMultiplayer={activeGameType !== 'solo'}
                      soundEnabled={soundEnabled}
                      onSoundChange={handleSoundChange}
                    />
                  ) : (
                    <ModeMenuSelector
                      theme={theme}
                      onThemeChange={handleThemeChange}
                      onShowRooms={setShowRooms}
                      onShowSoloRoom={setShowSoloRoom}
                      soundEnabled={soundEnabled}
                      onSoundChange={handleSoundChange}
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
