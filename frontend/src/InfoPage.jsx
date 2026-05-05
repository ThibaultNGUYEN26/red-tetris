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
      'Red Tetris is a 42 School project we built as a team of two. The goal was to create a real-time web version of Tetris with solo play, cooperative rooms, multiplayer rooms, and synchronized gameplay.',
    sections: [
      {
        title: 'Game Modes',
        body:
          'The game includes solo mode for chasing your best score, cooperative rooms where two players share a challenge, and multiplayer rooms where players compete in real time. In competitive multiplayer, clearing lines can send penalties to opponents, making each game more strategic.',
      },
      {
        title: 'Profiles And Scores',
        body:
          'Player profiles keep track of useful statistics such as high scores, games played, lines cleared, levels reached, solo results, cooperative scores, and multiplayer results, allowing players to follow their progress over time.',
      },
      {
        title: 'Project',
        body:
          'This project was built at 42 by a team of two. We developed the frontend with React and used Socket.IO to handle real-time communication between players. The backend manages rooms, game state, synchronization, scores, and multiplayer events.',
      },
    ],
  },
  tutorial: {
    title: 'Guide',
    intro:
      'Learn the controls and game modes before jumping into a room.',
    sections: [
      {
        title: 'Controls',
        body:
          'Use Left and Right to move the piece, Down for soft drop, Up to rotate, and Space for hard drop. Escape opens the pause/options menu in solo and the in-game menu in multiplayer.',
      },
      {
        title: 'Solo',
        body:
          'Solo mode lets you play alone, clear lines, level up, and chase your best score. Your solo results can appear in your profile and on the solo leaderboard.',
      },
      {
        title: 'Multiplayer',
        body:
          'In multiplayer rooms, players compete on separate boards in real time. Clearing multiple lines sends penalty lines to opponents, and the last surviving player wins.',
      },
      {
        title: 'Classic',
        body:
          'Classic is the standard competitive multiplayer mode. Everyone plays with normal controls, and line clears can send penalties to the other boards.',
      },
      {
        title: 'Mirror',
        body:
          'Mirror reverses part of the control scheme: Left and Right move in opposite directions, Down performs a hard drop, and Space becomes soft drop.',
      },
      {
        title: 'Chaotic',
        body:
          'Chaotic keeps the competitive rules but randomly swaps your current piece with the next piece while you play, forcing quick adaptation.',
      },
      {
        title: 'Giant',
        body:
          'Giant uses a larger board, giving players more space but also more rows and columns to manage during multiplayer pressure.',
      },
      {
        title: 'Co-op Alternate',
        body:
          'Co-op Alternate is a two-player shared-board mode. Players take turns controlling pieces, so communication and timing matter.',
      },
      {
        title: 'Co-op Roles',
        body:
          'Co-op Roles is a two-player shared-board mode where one player handles rotation and the other handles movement and dropping. Both players must coordinate to survive.',
      },
      {
        title: 'Spectate',
        body:
          'In multiplayer, eliminated players can spectate the remaining boards instead of leaving immediately.',
      },
    ],
  },
  contact: {
    title: 'Contact',
    intro: 'Send bug reports, suggestions, account questions, or privacy requests directly to the Red Tetris mailbox. Replies are sent to the email address attached to your account or the address you provide in the form.',
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
          'The Red Tetris project maintainers are the data controller for account, profile, contact, and gameplay data processed by this site. Controller contact is handled through the contact page, or by replying to an email sent from the Red Tetris mailbox.',
      },
      {
        title: 'Information We Collect',
        body:
          'The site may store your username, email address, password hash, avatar settings, solo scores, cooperative scores, multiplayer results, leaderboard entries, password reset tokens, contact messages, and technical data such as IP addresses used for security logs and anti-spam rate limiting.',
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
          'To request account deletion, data deletion, or a copy of your account data, use the contact page and include your username and registered email. Requests are reviewed manually so the account owner can be verified before data is exported or deleted. Some data may be retained temporarily when needed for security, abuse prevention, legal obligations, or backup integrity.',
      },
      {
        title: 'Recipients And Providers',
        body:
          'Personal data is processed by the site backend, the PostgreSQL database, Railway for backend and database hosting, Vercel for frontend hosting, and Resend for transactional emails such as password reset and contact messages. Contact form messages include the email address you provide as the reply-to address. Data is not sold.',
      },
      {
        title: 'International Transfers',
        body:
          'Some providers used by the site, including Railway, Vercel, and Resend, may process or store data outside the European Union. Where this happens, transfers should rely on the safeguards made available by those providers, such as data processing agreements, standard contractual clauses, or equivalent transfer mechanisms.',
      },
      {
        title: 'Processor Agreements',
        body:
          'The site operator should keep appropriate data processing terms or processor agreements in place with hosting, database, and email providers when those providers process personal data on behalf of the site.',
      },
      {
        title: 'Cookies And Local Storage',
        body:
          'The app uses local storage for necessary features such as remembering the signed-in user locally, saved account details needed by the interface, and theme preferences. The backend may use a session cookie to keep you authenticated. These storage items are used for core service functionality, not advertising or cross-site tracking. No advertising or analytics cookies are currently required for the core game.',
      },
      {
        title: 'Security',
        body:
          'Passwords are stored as hashes, not plain text. Production deployments use HTTPS and restrict database, email provider, and server credentials to authorized maintainers only.',
      },
      {
        title: 'Contact And Requests',
        body:
          'For privacy questions, account data requests, or deletion requests, use the contact page and include the username and registered email for the account. If you believe your rights were not respected, you may contact your local data protection authority, such as the CNIL in France.',
      },
    ],
  },
}

const tutorialCells = Array.from({ length: 140 }, (_, index) => index)
const tutorialPieceBlocks = [
  { row: 1, col: 5 },
  { row: 2, col: 4 },
  { row: 2, col: 5 },
  { row: 2, col: 6 },
]
const rotatedPieceBlocks = [
  { row: 1, col: 5 },
  { row: 2, col: 5 },
  { row: 2, col: 6 },
  { row: 3, col: 5 },
]

const translateBlocks = (blocks, rowOffset, colOffset) => blocks.map((block) => ({
  row: block.row + rowOffset,
  col: block.col + colOffset,
}))

const tutorialInputRowOffset = 3

const tutorialControls = [
  {
    action: 'move-left',
    ariaLabel: 'Left movement tutorial',
    key: 'Left',
    title: 'Move Left',
    description: 'Press the left arrow key to slide the falling piece one column to the left.',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 0, -1),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, tutorialInputRowOffset, -1),
  },
  {
    action: 'move-right',
    ariaLabel: 'Right movement tutorial',
    key: 'Right',
    title: 'Move Right',
    description: 'Press the right arrow key to slide the falling piece one column to the right.',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 0, 1),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, tutorialInputRowOffset, 1),
  },
  {
    action: 'soft-drop',
    ariaLabel: 'Soft drop tutorial',
    key: 'Down',
    title: 'Soft Drop',
    description: 'Hold the down arrow key to drop the piece faster while keeping control.',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 1, 0),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, tutorialInputRowOffset + 1, 0),
  },
  {
    action: 'hard-drop',
    ariaLabel: 'Hard drop tutorial',
    key: 'Space',
    title: 'Hard Drop',
    description: 'Press Space to send the piece straight to its landing position.',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 12, 0),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, 12, 0),
  },
  {
    action: 'rotation',
    ariaLabel: 'Rotation tutorial',
    key: 'Up',
    title: 'Rotation',
    description: 'Press Up to rotate the falling piece into the shape you need.',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: rotatedPieceBlocks,
    phantomBlocks: translateBlocks(rotatedPieceBlocks, tutorialInputRowOffset, 0),
  },
]

function TutorialBoardDemo({ demo }) {
  return (
    <section className={`tutorial-demo ${demo.action}`} aria-label={demo.ariaLabel}>
      <div className="tutorial-board" aria-hidden="true">
        <div className="tutorial-board-grid">
          {tutorialCells.map((cell) => (
            <span key={cell} className="tutorial-cell" />
          ))}
        </div>

        <div className={`tutorial-piece active ${demo.action}`}>
          {demo.activeBlocks.map((block) => (
            <span
              key={`${block.row}-${block.col}`}
              className="tutorial-piece-block"
              style={{ gridColumn: block.col, gridRow: block.row }}
            />
          ))}
        </div>

        <div className={`tutorial-piece phantom ${demo.action}`}>
          {demo.phantomBlocks.map((block) => (
            <span
              key={`${block.row}-${block.col}`}
              className="tutorial-piece-block"
              style={{ gridColumn: block.col, gridRow: block.row }}
            />
          ))}
        </div>

        <div className={`tutorial-piece target ${demo.action}`}>
          {demo.targetBlocks.map((block) => (
            <span
              key={`${block.row}-${block.col}`}
              className="tutorial-piece-block"
              style={{ gridColumn: block.col, gridRow: block.row }}
            />
          ))}
        </div>

        <div className={`tutorial-action-cue ${demo.action}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="tutorial-demo-panel">
        <span className="tutorial-key">{demo.key}</span>
        <div>
          <h2>{demo.title}</h2>
          <p>{demo.description}</p>
        </div>
      </div>
    </section>
  )
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
            <Link to="/tutorial">Guide</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy-policy">Privacy</Link>
          </nav>

          <h1>{page.title}</h1>
          <p className="info-page-intro">{page.intro}</p>

          {type === 'tutorial' && (
            <div className="tutorial-controls-list">
              {tutorialControls.map((demo) => (
                <TutorialBoardDemo key={demo.action} demo={demo} />
              ))}
            </div>
          )}

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
