import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

function ConfettiOverlay({ onDone }) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;'
    document.body.appendChild(canvas)

    const fire = confetti.create(canvas, { resize: true, useWorker: true })
    const end = Date.now() + 500
    let drainTimeout = null

    const frame = () => {
      fire({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 } })
      fire({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 } })
      if (Date.now() < end) {
        requestAnimationFrame(frame)
      } else {
        drainTimeout = setTimeout(() => {
          fire.reset()
          canvas.remove()
          onDoneRef.current?.()
        }, 2000)
      }
    }

    requestAnimationFrame(frame)

    return () => {
      if (drainTimeout) clearTimeout(drainTimeout)
      fire.reset()
      canvas.remove()
    }
  }, [])

  return null
}

export default ConfettiOverlay
