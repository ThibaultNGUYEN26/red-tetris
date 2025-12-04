import './index.css'
import { useState, useEffect, useRef } from 'react'
import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import UsernameMenu from './components/UsernameMenu/UsernameMenu.jsx'
import ModeMenuSelector from './components/ModeMenuSelector/ModeMenuSelector.jsx'

function Index() {
  const [username, setUsername] = useState(null)
  const [theme, setTheme] = useState('light')

  const handleUsernameSubmit = (submittedUsername) => {
    setUsername(submittedUsername)
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
  }

  const starsRef = useRef(null)

  useEffect(() => {
    if (theme !== 'dark' || !starsRef.current) return

    const updateStarPositions = () => {
      if (!starsRef.current) return

      const positions = Array.from({ length: 15 }, () =>
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
      <div className='content-wrapper'>
        {!username ? (
          <UsernameMenu onSubmit={handleUsernameSubmit} theme={theme} />
        ) : (
          <ModeMenuSelector theme={theme} onThemeChange={handleThemeChange} />
        )}
      </div>
    </>
  )
}

export default Index
