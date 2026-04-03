import './index.css'
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import ProfileMenu from './components/ProfileMenu/ProfileMenu.jsx'
import ModeMenuSelector from './components/ModeMenuSelector/ModeMenuSelector.jsx'
import Leaderboard from './components/Leaderboard/Leaderboard.jsx'
import PlayerStats from './components/PlayerStats/PlayerStats.jsx'
import Rooms from './components/Rooms/Rooms.jsx'
import Game from './components/Game/Game.jsx'
import Title from './components/Title/Title.jsx'
import { socket } from './socket'
import bopSound from './res/sounds/bop.mp3'

const USERNAME_PATTERN = /^[a-zA-Z0-9]{1,15}$/

function Index() {
  const { roomName: urlRoomName, username: urlUsername } = useParams()
  const navigate = useNavigate()
  const hasValidUrlUsername = urlUsername ? USERNAME_PATTERN.test(urlUsername) : false

  const [username, setUsername] = useState(
    hasValidUrlUsername ? urlUsername : null
  )
  const [theme, setTheme] = useState('light')
  const [showRooms, setShowRooms] = useState(false)
  const [showGame, setShowGame] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [joinedRoomName, setJoinedRoomName] = useState(
    urlRoomName && hasValidUrlUsername ? urlRoomName : null
  )
  const [soloRoomId, setSoloRoomId] = useState(null)
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
    if (urlRoomName && !joinedRoomName) setJoinedRoomName(urlRoomName)
  }, [urlUsername, urlRoomName, username, joinedRoomName, navigate])

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
    setUserProfile(null)
    setJoinedRoomName(null)
    setSoloRoomId(null)
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

  const handleRoomCreated = (roomId, roomName) => {
    setJoinedRoomName(roomName)

    // Update URL without reload
    navigate(`/${roomName}/${username}`, { replace: true })
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
  };

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
            {username && !showRooms && !showGame && (
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
                {!showGame && !showRooms && <Title />}
                {showGame ? (
                  <Game
                    theme={theme}
                    onBack={handleExitSolo}
                    roomId={soloRoomId}
                    username={username}
                    isMultiplayer={false}
                    soundEnabled={soundEnabled}
                    onSoundChange={handleSoundChange}
                  />
                ) : (
                  <ModeMenuSelector
                    theme={theme}
                    onThemeChange={handleThemeChange}
                    onShowRooms={setShowRooms}
                    onShowGame={setShowGame}
                    onStartSolo={setSoloRoomId}
                    username={username}
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
