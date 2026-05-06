import App from './App.jsx'
import { createRoot } from 'react-dom/client'
import './index.css'
import { enablePerfFromUrl, perfLog } from './perf'

enablePerfFromUrl()

if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        perfLog('longtask', {
          durationMs: Math.round(entry.duration),
          startMs: Math.round(entry.startTime),
        })
      })
    })
    observer.observe({ type: 'longtask', buffered: true })
  } catch {
    // Long task observation is diagnostic only.
  }
}

createRoot(document.getElementById('root')).render(
  <App />
)
