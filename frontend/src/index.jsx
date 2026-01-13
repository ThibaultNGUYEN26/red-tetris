import './index.css'
import { useState, useEffect, useRef } from 'react'
import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import ProfileMenu from './components/ProfileMenu/ProfileMenu.jsx'
import ModeMenuSelector from './components/ModeMenuSelector/ModeMenuSelector.jsx'
import Leaderboard from './components/Leaderboard/Leaderboard.jsx'
import PlayerStats from './components/PlayerStats/PlayerStats.jsx'

function Index() {
  const [username, setUsername] = useState(null)
  const [theme, setTheme] = useState('light')
  const [showRooms, setShowRooms] = useState(false)

  const handleUsernameSubmit = (submittedUsername) => {
    setUsername(submittedUsername)
    // Push a new state to the browser history
    window.history.pushState({ hasUsername: true }, '', window.location.pathname)
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
  }

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event) => {
      if (username && !event.state?.hasUsername) {
        setUsername(null)
        setShowRooms(false)
      }
    }

    window.addEventListener('popstate', handlePopState)

    // Set initial state
    if (username) {
      window.history.replaceState({ hasUsername: true }, '', window.location.pathname)
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [username])

  const starsRef = useRef(null)

  useEffect(() => {
    if (theme !== 'dark' || !starsRef.current) return

    const updateStarPositions = () => {
      if (!starsRef.current) return

      const positions = Array.from({ length: 25 }, () =>
        `${Math.random() * 100}% ${Math.random() * 100}%`
      ).join(', ')

      // Remove animation temporarily
      starsRef.current.style.animation = 'none'
      // Update positions
      starsRef.current.style.backgroundPosition = positions
      // Force reflow
      starsRef.current.offsetHeight
      // Restart animation
      starsRef.current.style.animation = 'fadeInOut 3s ease-in-out infinite'
    }

    // Start with initial positions
    updateStarPositions()

    // Update positions every 3 seconds (synchronized with animation)
    const interval = setInterval(updateStarPositions, 3000)

    return () => clearInterval(interval)
  }, [theme])

  return (
    <>
      <div className={`sky-background ${theme === 'dark' ? 'dark' : ''}`}>
        {theme === 'dark' && <div ref={starsRef} className="stars" />}
        <GoodClouds />
        <TetriminosClouds />
      </div>
      {username && !showRooms && (
        <>
          <PlayerStats theme={theme} />
          <Leaderboard theme={theme} />
        </>
      )}
      <div className='content-wrapper'>
        {!username ? (
          <ProfileMenu onSubmit={handleUsernameSubmit} theme={theme} />
        ) : (
          <ModeMenuSelector theme={theme} onThemeChange={handleThemeChange} onShowRooms={setShowRooms} username={username} />
        )}
      </div>
    </>
  )
}

export default Index
