import './index.css'
import { useState } from 'react'
import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import UsernameMenu from './components/UsernameMenu/UsernameMenu.jsx'
import ModeMenuSelector from './components/ModeMenuSelector/ModeMenuSelector.jsx'

function Index() {
  const [username, setUsername] = useState(null)

  const handleUsernameSubmit = (submittedUsername) => {
    setUsername(submittedUsername)
  }

  return (
    <>
      <div className='sky-background'>
        <GoodClouds />
        <TetriminosClouds />
      </div>
      <div className='content-wrapper'>
        {!username ? (
          <UsernameMenu onSubmit={handleUsernameSubmit} />
        ) : (
          <ModeMenuSelector />
        )}
      </div>
    </>
  )
}

export default Index
