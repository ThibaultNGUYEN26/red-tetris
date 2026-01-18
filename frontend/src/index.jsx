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

function Index() {
  const { roomName: urlRoomName, username: urlUsername } = useParams()
  const navigate = useNavigate()

  const [username, setUsername] = useState(urlUsername || null)
  const [theme, setTheme] = useState('light')
  const [showRooms, setShowRooms] = useState(false)
  const [showGame, setShowGame] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [joinedRoomName, setJoinedRoomName] = useState(urlRoomName || null)

  /* ---------------- SYNC URL PARAMS ---------------- */

  useEffect(() => {
    if (urlUsername && !username) setUsername(urlUsername)
    if (urlRoomName && !joinedRoomName) setJoinedRoomName(urlRoomName)
  }, [urlUsername, urlRoomName])

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

  const handleThemeChange = (newTheme) => setTheme(newTheme)

  const handleReturnToProfile = () => {
    setUsername(null)
    setShowRooms(false)
    setShowGame(false)
    setUserProfile(null)
    setJoinedRoomName(null)
    navigate('/')
  }

  /* ---------------- UPDATE URL WHEN ROOM IS CREATED ---------------- */

  const handleRoomCreated = (roomId, roomName) => {
    setJoinedRoomName(roomName)

    // 🔥 Update URL without reload
    navigate(`/${roomName}/${username}`, { replace: true })
  }

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
        {joinedRoomName && username ? (
          <Rooms
            theme={theme}
            username={username}
            userProfile={userProfile}
            joinRoomName={joinedRoomName}
            onBack={handleReturnToProfile}
            onRoomCreated={handleRoomCreated}
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
                <PlayerStats theme={theme} userProfile={userProfile} />
                <Leaderboard theme={theme} />
              </>
            )}

            {!username ? (
              <ProfileMenu onSubmit={handleUsernameSubmit} theme={theme} />
            ) : (
              showGame ? (
                <Game onBack={() => setShowGame(false)} />
              ) : (
                <ModeMenuSelector
                  theme={theme}
                  onThemeChange={handleThemeChange}
                  onShowRooms={setShowRooms}
                  onShowGame={setShowGame}
                  username={username}
                />
              )
            )}
          </>
        )}
      </div>
    </>
  )
}

export default Index
