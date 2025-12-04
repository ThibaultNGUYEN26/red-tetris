import './index.css'
import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import UsernameMenu from './components/UsernameMenu/UsernameMenu.jsx'

function Index() {

  return (
    <>
      <div className='sky-background'>
        <GoodClouds />
      </div>
      <div className='content-wrapper'>
        <UsernameMenu />
      </div>
    </>
  )
}

export default Index
