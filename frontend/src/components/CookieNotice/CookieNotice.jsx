import { useState } from 'react'
import { Link } from 'react-router-dom'

export const COOKIE_NOTICE_STORAGE_KEY = 'red-tetris-cookie-notice'
export const COOKIE_NOTICE_RENEWAL_MONTHS = 13

const getCookieNoticeExpiry = (now = new Date()) => {
  const expiresAt = new Date(now)
  expiresAt.setMonth(expiresAt.getMonth() + COOKIE_NOTICE_RENEWAL_MONTHS)
  return expiresAt.getTime()
}

const hasActiveCookieNoticeAcknowledgement = () => {
  try {
    const raw = localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return Number.isFinite(parsed?.expiresAt) && parsed.expiresAt > Date.now()
  } catch {
    return false
  }
}

function CookieNotice() {
  const [isVisible, setIsVisible] = useState(
    () => !hasActiveCookieNoticeAcknowledgement()
  )

  const saveChoice = (accepted) => {
    localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, JSON.stringify({
      accepted,
      answeredAt: Date.now(),
      expiresAt: getCookieNoticeExpiry(),
    }))
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <section className="cookie-notice" aria-label="Cookie notice">
      <p>
        Do you accept cookies? Red Tetris uses them to keep you signed in and run the game.
        Your answer is remembered for 13 months.
      </p>
      <div className="cookie-notice-actions">
        <Link to="/privacy-policy">Privacy</Link>
        <button type="button" className="secondary" onClick={() => saveChoice(false)}>
          Decline
        </button>
        <button type="button" onClick={() => saveChoice(true)}>
          Accept
        </button>
      </div>
    </section>
  )
}

export default CookieNotice
