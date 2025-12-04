import './index.css'
import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import UsernameMenu from './components/UsernameMenu/UsernameMenu.jsx'

function Index() {

  return (
    <>
      <div className='sky-background'>
        <GoodClouds />
        <TetriminosClouds />
      </div>
      <div className='content-wrapper'>
        <UsernameMenu />
      </div>
    </>
  )
}

export default Index
