import './Title.css'
import { useEffect, useRef } from 'react'

function Title() {
  const titleRef = useRef(null)

  useEffect(() => {
    const title = titleRef.current
    if (!title) return

    let animationFrame

    const randomFloat = () => {
      const x = (Math.random() - 0.5) * 60 // -30px to 30px
      const y = (Math.random() - 0.5) * 60 // -30px to 30px
      const duration = Math.random() * 3 + 5 // 5-8 seconds
      
      title.style.transition = `transform ${duration}s ease-in-out`
      title.style.transform = `translate(${x}px, ${y}px)`
      
      // Start next movement immediately when current one ends
      animationFrame = setTimeout(randomFloat, duration * 1000)
    }

    // Start the continuous animation
    randomFloat()

    return () => clearTimeout(animationFrame)
  }, [])

  return (
    <div className="red-tetris-title">
      <h1 ref={titleRef}>Red-Tetris</h1>
    </div>
  )
}

export default Title
