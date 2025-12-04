import './index.css'
import { useState } from 'react'
import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import UsernameMenu from './components/UsernameMenu/UsernameMenu.jsx'
import ModeMenuSelector from './components/ModeMenuSelector/ModeMenuSelector.jsx'

function Index() {
  const [username, setUsername] = useState(null)
  const [theme, setTheme] = useState('dark')

  const handleUsernameSubmit = (submittedUsername) => {
    setUsername(submittedUsername)
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
  }

  return (
    <>
      <div className='sky-background'>
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
