import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import { apiFetch } from './api'

const THEME_STORAGE_KEY = 'red-tetris-theme'
const AUTH_STORAGE_KEY = 'red-tetris-auth-user'
const CONTACT_TIMEOUT_MS = 15000

const pages = {
  about: {
    title: 'About Red Tetris',
    intro:
      'Red Tetris is a 42 School project we built as a team of two. The goal was to create a real-time web version of Tetris with solo play, multiplayer rooms, and synchronized gameplay.',
    sections: [
      {
        title: 'Game Modes',
        body:
          'The game includes a solo mode to play at your own pace and improve your score, as well as a multiplayer mode where players join a room and compete in real time. In multiplayer, clearing lines can send penalties to opponents, making each game more strategic and competitive.',
      },
      {
        title: 'Profiles And Scores',
        body:
          'Player profiles keep track of useful statistics such as high scores, games played, lines cleared, levels reached, and multiplayer results, allowing players to follow their progress over time.',
      },
      {
        title: 'Project',
        body:
          'This project was built at 42 by a team of two. We developed the frontend with React and used Socket.IO to handle real-time communication between players. The backend manages rooms, game state, synchronization, scores, and multiplayer events.',
      },
    ],
  },
  contact: {
    title: 'Contact',
    intro: 'Send bug reports, suggestions, account questions, or privacy requests directly to the Red Tetris mailbox.',
    sections: [
      {
        title: 'Bug Reports',
        body: 'Include what happened, what you expected, and the room or page where the issue appeared.',
      },
      {
        title: 'Suggestions',
        body: 'Share ideas for game modes, controls, profile features, scoring, or anything that would improve the site.',
      },
      {
        title: 'Privacy Requests',
        body:
          'For access, correction, deletion, or objection requests, include the username and registered email associated with the account so the request can be verified.',
      },
    ],
  },
  terms: {
    title: 'Terms',
    intro:
      'These terms describe the basic rules for using Red Tetris. By using the site, you agree to play fairly and respect other players.',
    sections: [
      {
        title: 'Use Of The Service',
        body:
          'Red Tetris is provided for personal entertainment. Do not abuse the service, interfere with gameplay, attempt unauthorized access, or use automation to disrupt rooms, scores, or accounts.',
      },
      {
        title: 'Accounts And Profiles',
        body:
          'You are responsible for the activity tied to your username and login details. Use accurate account information and do not impersonate another player.',
      },
      {
        title: 'Gameplay And Scores',
        body:
          'Scores, leaderboards, rooms, and multiplayer results may be reset, corrected, or removed if they are affected by bugs, cheating, abuse, or maintenance.',
      },
      {
        title: 'Availability',
        body:
          'The site is provided as is. Features may change, become unavailable, or be removed without notice while the project evolves.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro:
      'This policy explains what Red Tetris collects, why it is used, how long it is kept, and how you can exercise your RGPD/GDPR rights.',
    sections: [
      {
        title: 'Controller',
        body:
          'The Red Tetris site operator is the data controller for account, profile, contact, and gameplay data processed by this site. Privacy requests can be sent through the contact page.',
      },
      {
        title: 'Information We Collect',
        body:
          'The site may store your username, email address, password hash, avatar settings, solo scores, multiplayer results, leaderboard entries, password reset tokens, contact messages, and technical data such as IP addresses used for security logs and anti-spam rate limiting.',
      },
      {
        title: 'How Information Is Used',
        body:
          'Data is used to create accounts, authenticate players, restore access, show profiles, run rooms, save scores, maintain leaderboards, answer contact requests, protect the service from abuse, and improve reliability.',
      },
      {
        title: 'Legal Bases',
        body:
          'Account, login, profile, and gameplay data are processed to provide the service you request. Security, anti-abuse, and reliability data are processed for legitimate interests in protecting the site. Contact messages are processed to answer your request. Legal obligations may require some records to be kept when applicable.',
      },
      {
        title: 'Retention',
        body:
          'Account, profile, and score data are kept while the account exists or while needed to operate the game. Password reset tokens are temporary and expire after a short period. Contact messages and technical logs are kept only as long as needed for support, security, and abuse prevention, then deleted or anonymized when no longer necessary.',
      },
      {
        title: 'Your Rights',
        body:
          'Under the RGPD/GDPR, you may request access, correction, deletion, restriction, portability, or objection to the processing of your personal data. Requests are answered within one month when required, unless the request is complex or identity verification is needed.',
      },
      {
        title: 'Deletion Requests',
        body:
          'To request account or data deletion, use the contact page and include your username and registered email. Some data may be retained temporarily when needed for security, abuse prevention, legal obligations, or backup integrity.',
      },
      {
        title: 'Recipients And Providers',
        body:
          'Personal data is processed by the site backend, database, hosting environment, and email service used to send password reset and contact messages. Data is not sold.',
      },
      {
        title: 'Cookies And Local Storage',
        body:
          'The app uses browser local storage for necessary features such as keeping you signed in locally and remembering interface preferences. No advertising or analytics cookies are currently required for the core game.',
      },
      {
        title: 'Security',
        body:
          'Passwords are stored as hashes, not plain text. Production deployments should use HTTPS and restrict database, SMTP, and server credentials to authorized maintainers only.',
      },
      {
        title: 'Contact And Requests',
        body:
          'For privacy questions, account data requests, or deletion requests, use the contact page and include the username and registered email for the account. If you believe your rights were not respected, you may contact your local data protection authority, such as the CNIL in France.',
      },
    ],
  },
}

function InfoPage({ type }) {
  const page = pages[type] || pages.about
  const [theme] = useState(() => (
    localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  ))
  const [contactObject, setContactObject] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactStatus, setContactStatus] = useState({ type: '', message: '' })
  const [isContactSending, setIsContactSending] = useState(false)
  const starsRef = useRef(null)

  const getSavedUserEmail = () => {
    try {
      const savedAuth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
      return typeof savedAuth?.email === 'string' ? savedAuth.email.trim().toLowerCase() : ''
    } catch {
      return ''
    }
  }

  const savedUserEmail = getSavedUserEmail()

  useEffect(() => {
    if (theme !== 'dark' || !starsRef.current) return

    const updateStarPositions = () => {
      const positions = Array.from({ length: 25 }, () =>
        `${Math.random() * 100}% ${Math.random() * 100}%`
      ).join(', ')

      starsRef.current.style.animation = 'none'
      starsRef.current.style.backgroundPosition = positions
      starsRef.current.offsetHeight
      starsRef.current.style.animation = 'fadeInOut 3s ease-in-out infinite'
    }

    updateStarPositions()
    const interval = setInterval(updateStarPositions, 3000)
    return () => clearInterval(interval)
  }, [theme])

  const handleContactSubmit = async (event) => {
    event.preventDefault()

    const object = contactObject.trim()
    const message = contactMessage.trim()
    const userEmail = getSavedUserEmail() || contactEmail.trim().toLowerCase()

    if (!object || !message) {
      setContactStatus({ type: 'error', message: 'Object and message are required.' })
      return
    }

    if (!userEmail) {
      setContactStatus({ type: 'error', message: 'Email is required.' })
      return
    }

    setIsContactSending(true)
    setContactStatus({ type: '', message: '' })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONTACT_TIMEOUT_MS)

    try {
      const response = await apiFetch('/api/contact', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object,
          message,
          userEmail,
          website: event.currentTarget.elements.website?.value || '',
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to send message')
      }

      setContactObject('')
      setContactMessage('')
      setContactEmail('')
      setContactStatus({ type: 'success', message: 'Message sent.' })
    } catch (err) {
      setContactStatus({
        type: 'error',
        message: err?.name === 'AbortError'
          ? 'Mail server timeout. Please try again later.'
          : err?.message || 'Unable to send message',
      })
    } finally {
      clearTimeout(timeoutId)
      setIsContactSending(false)
    }
  }

  return (
    <>
      <div className={`sky-background ${theme === 'dark' ? 'dark' : ''}`}>
        {theme === 'dark' && <div ref={starsRef} className="stars" />}
        <GoodClouds />
        <TetriminosClouds />
      </div>

      <div className="content-wrapper info-page-wrapper">
        <main className="info-page-card">
          <nav className="info-page-nav" aria-label="Information pages">
            <Link to="/">Back</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy-policy">Privacy</Link>
          </nav>

          <h1>{page.title}</h1>
          <p className="info-page-intro">{page.intro}</p>

          {type === 'contact' && (
            <form className="contact-form" onSubmit={handleContactSubmit}>
              <label htmlFor="contact-object">Object</label>
              <input
                id="contact-object"
                type="text"
                value={contactObject}
                onChange={(event) => setContactObject(event.target.value)}
                maxLength={120}
                placeholder="Bug report or suggestion"
                disabled={isContactSending}
              />

              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                value={contactMessage}
                onChange={(event) => setContactMessage(event.target.value)}
                maxLength={4000}
                rows={7}
                placeholder="Describe the issue or idea..."
                disabled={isContactSending}
              />

              {!savedUserEmail && (
                <>
                  <label htmlFor="contact-email">Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="Your email"
                    disabled={isContactSending}
                  />
                </>
              )}

              <div className="contact-honeypot" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  disabled={isContactSending}
                />
              </div>

              {contactStatus.message && (
                <p className={`contact-status ${contactStatus.type}`} role="status">
                  {contactStatus.message}
                </p>
              )}

              <button
                className="info-page-action contact-submit"
                type="submit"
                disabled={isContactSending}
              >
                {isContactSending ? 'Sending...' : 'Send message'}
              </button>
            </form>
          )}

          <div className="info-page-sections">
            {page.sections.map((section) => (
              <section key={section.title} className="info-page-section">
                <h2>{section.title}</h2>
                <p>{section.body}</p>
                {section.link && (
                  <a
                    className="info-page-action"
                    href={section.link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {section.link.label}
                  </a>
                )}
              </section>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}

export default InfoPage
