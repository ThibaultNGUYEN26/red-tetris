import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_LANGUAGE, getTranslation } from '../../i18n'

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

function CookieNotice({ language = DEFAULT_LANGUAGE }) {
  const text = getTranslation(language).cookieNotice
  const [isVisible, setIsVisible] = useState(
    () => !hasActiveCookieNoticeAcknowledgement()
  )

  const acknowledgeNotice = () => {
    localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, JSON.stringify({
      answeredAt: Date.now(),
      expiresAt: getCookieNoticeExpiry(),
    }))
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <section className="cookie-notice" aria-label={text.label}>
      <p>{text.message}</p>
      <div className="cookie-notice-actions">
        <Link to="/privacy-policy">{text.privacy}</Link>
        <button type="button" onClick={acknowledgeNotice}>
          {text.acknowledge}
        </button>
      </div>
    </section>
  )
}

export default CookieNotice
