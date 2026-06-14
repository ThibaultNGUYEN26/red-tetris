import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_LANGUAGE } from '../../i18n/playerStats'

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

const COOKIE_NOTICE_TRANSLATIONS = {
  en: {
    label: 'Cookie notice',
    message:
      'Red Tetris uses only necessary cookies to keep you signed in and run the game. They are required for the service and are not used for advertising or analytics. We remember that this notice was shown for 13 months.',
    privacy: 'Privacy',
    acknowledge: 'Got it',
  },
  fr: {
    label: 'Avis sur les cookies',
    message:
      'Red Tetris utilise uniquement les cookies necessaires pour vous garder connecte et faire fonctionner le jeu. Ils sont requis pour le service et ne sont pas utilises pour la publicite ou les statistiques. Nous memorisons cet avis pendant 13 mois.',
    privacy: 'Confidentialite',
    acknowledge: 'Compris',
  },
}

function CookieNotice({ language = DEFAULT_LANGUAGE }) {
  const text = COOKIE_NOTICE_TRANSLATIONS[language] || COOKIE_NOTICE_TRANSLATIONS[DEFAULT_LANGUAGE]
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
