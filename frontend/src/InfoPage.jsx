import { Link } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import { apiFetch } from './api'
import { DEFAULT_LANGUAGE, getTranslation, isSupportedLanguage } from './i18n'

const THEME_STORAGE_KEY = 'red-tetris-theme'
const AUTH_STORAGE_KEY = 'red-tetris-auth-user'
const LANGUAGE_STORAGE_KEY = 'red-tetris-language'
const LANGUAGE_CHANGE_EVENT = 'red-tetris-language-change'
const CONTACT_TIMEOUT_MS = 15000
const CONTACT_OBJECT_MAX_LENGTH = 120
const CONTACT_MESSAGE_MAX_LENGTH = 4000

const getSavedLanguage = () => {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return isSupportedLanguage(savedLanguage) ? savedLanguage : DEFAULT_LANGUAGE
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
const heldPieceBlocks = [
  { row: 1, col: 4 },
  { row: 1, col: 5 },
  { row: 2, col: 4 },
  { row: 2, col: 5 },
]

const translateBlocks = (blocks, rowOffset, colOffset) => blocks.map((block) => ({
  row: block.row + rowOffset,
  col: block.col + colOffset,
}))

const tutorialInputRowOffset = 3

const tutorialControls = [
  {
    action: 'move-left',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 0, -1),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, tutorialInputRowOffset, -1),
  },
  {
    action: 'move-right',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 0, 1),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, tutorialInputRowOffset, 1),
  },
  {
    action: 'soft-drop',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 1, 0),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, tutorialInputRowOffset + 1, 0),
  },
  {
    action: 'hard-drop',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 12, 0),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, 12, 0),
  },
  {
    action: 'rotation',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: rotatedPieceBlocks,
    phantomBlocks: translateBlocks(rotatedPieceBlocks, tutorialInputRowOffset, 0),
  },
  {
    action: 'hold',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: heldPieceBlocks,
    phantomBlocks: translateBlocks(heldPieceBlocks, tutorialInputRowOffset, 0),
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
  const [language, setLanguage] = useState(getSavedLanguage)
  const translation = getTranslation(language)
  const page = translation.infoPage.pages[type] || getTranslation(DEFAULT_LANGUAGE).infoPage.pages[type] || getTranslation(DEFAULT_LANGUAGE).infoPage.pages.about
  const infoText = translation.infoPage.labels
  const contactText = translation.infoPage.contact
  const isTutorialPage = type === 'tutorial'
  const [theme] = useState(() => (
    localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  ))
  const [contactObject, setContactObject] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactCaptcha, setContactCaptcha] = useState({ question: '', token: '' })
  const [contactCaptchaAnswer, setContactCaptchaAnswer] = useState('')
  const [isContactCaptchaLoading, setIsContactCaptchaLoading] = useState(false)
  const [contactStatus, setContactStatus] = useState({ type: '', message: '' })
  const [isContactSending, setIsContactSending] = useState(false)
  const [privacyStatus, setPrivacyStatus] = useState({ type: '', message: '' })
  const [isExportingData, setIsExportingData] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [savedAuthUser, setSavedAuthUser] = useState(() => getSavedAuthUser())
  const [activeTutorialIndex, setActiveTutorialIndex] = useState(0)
  const starsRef = useRef(null)

  useEffect(() => {
    const syncSavedLanguage = () => {
      setLanguage(getSavedLanguage())
    }

    window.addEventListener('storage', syncSavedLanguage)
    window.addEventListener(LANGUAGE_CHANGE_EVENT, syncSavedLanguage)

    return () => {
      window.removeEventListener('storage', syncSavedLanguage)
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, syncSavedLanguage)
    }
  }, [])

  function getSavedAuthUser() {
    try {
      const savedAuth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
      return {
        username: typeof savedAuth?.username === 'string' ? savedAuth.username.trim() : '',
        email: typeof savedAuth?.email === 'string' ? savedAuth.email.trim().toLowerCase() : '',
      }
    } catch {
      return { username: '', email: '' }
    }
  }

  const getSavedUserEmail = () => getSavedAuthUser().email
  const savedUserEmail = savedAuthUser.email

  const loadContactCaptcha = useCallback(async () => {
    setIsContactCaptchaLoading(true)

    try {
      const response = await apiFetch('/api/contact/captcha')
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.question || !payload?.token) {
        throw new Error(contactText.captchaLoadError)
      }

      setContactCaptcha({
        question: payload.question,
        token: payload.token,
      })
      setContactCaptchaAnswer('')
    } catch {
      setContactCaptcha({ question: '', token: '' })
      setContactStatus({
        type: 'error',
        message: contactText.captchaLoadStatus,
      })
    } finally {
      setIsContactCaptchaLoading(false)
    }
  }, [contactText])

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

  useEffect(() => {
    if (type === 'contact') {
      loadContactCaptcha()
    }
  }, [loadContactCaptcha, type])

  const handleContactSubmit = async (event) => {
    event.preventDefault()

    const object = contactObject.trim()
    const message = contactMessage.trim()
    const userEmail = getSavedUserEmail() || contactEmail.trim().toLowerCase()
    const captchaAnswer = contactCaptchaAnswer.trim()

    if (!object || !message) {
      setContactStatus({ type: 'error', message: contactText.requiredObjectAndMessage })
      return
    }

    if (!userEmail) {
      setContactStatus({ type: 'error', message: contactText.requiredEmail })
      return
    }

    if (object.length > CONTACT_OBJECT_MAX_LENGTH) {
      setContactStatus({ type: 'error', message: contactText.objectTooLong })
      return
    }

    if (message.length > CONTACT_MESSAGE_MAX_LENGTH) {
      setContactStatus({ type: 'error', message: contactText.messageTooLong })
      return
    }

    if (!contactCaptcha.token || !captchaAnswer) {
      setContactStatus({ type: 'error', message: contactText.requiredCaptcha })
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
          captchaToken: contactCaptcha.token,
          captchaAnswer,
          website: event.currentTarget.elements.website?.value || '',
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || contactText.sendError)
      }

      setContactObject('')
      setContactMessage('')
      setContactEmail('')
      await loadContactCaptcha()
      setContactStatus({ type: 'success', message: contactText.sendSuccess })
    } catch (err) {
      await loadContactCaptcha()
      setContactStatus({
        type: 'error',
        message: err?.name === 'AbortError'
          ? contactText.mailTimeout
          : err?.message || contactText.sendError,
      })
    } finally {
      clearTimeout(timeoutId)
      setIsContactSending(false)
    }
  }

  const handleExportAccountData = async () => {
    setIsExportingData(true)
    setPrivacyStatus({ type: '', message: '' })

    try {
      const response = await apiFetch('/api/account/export')
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || infoText.exportError)
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `red-tetris-${payload?.account?.username || 'account'}-data.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)

      setPrivacyStatus({ type: 'success', message: infoText.exportSuccess })
    } catch (err) {
      setPrivacyStatus({
        type: 'error',
        message: err?.message || infoText.exportError,
      })
    } finally {
      setIsExportingData(false)
    }
  }

  const handleDeleteAccount = async () => {
    /* v8 ignore next -- the delete button is only rendered when a saved username exists. @preserve */
    if (!savedAuthUser.username) return

    const confirmed = window.confirm(
      infoText.deleteConfirm(savedAuthUser.username)
    )
    if (!confirmed) return

    setIsDeletingAccount(true)
    setPrivacyStatus({ type: '', message: '' })

    try {
      const response = await apiFetch('/api/account', { method: 'DELETE' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || infoText.deleteError)
      }

      localStorage.removeItem(AUTH_STORAGE_KEY)
      setSavedAuthUser({ username: '', email: '' })
      setPrivacyStatus({ type: 'success', message: infoText.deleteSuccess })
    } catch (err) {
      setPrivacyStatus({
        type: 'error',
        message: err?.message || infoText.deleteError,
      })
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const tutorialText = translation.infoPage.tutorialControls
  const activeTutorialBase = tutorialControls[activeTutorialIndex]
  const activeTutorial = {
    ...activeTutorialBase,
    ...tutorialText[activeTutorialBase.action],
  }
  const showPreviousTutorial = () => {
    setActiveTutorialIndex((currentIndex) => (
      currentIndex === 0 ? tutorialControls.length - 1 : currentIndex - 1
    ))
  }
  const showNextTutorial = () => {
    setActiveTutorialIndex((currentIndex) => (
      currentIndex === tutorialControls.length - 1 ? 0 : currentIndex + 1
    ))
  }
  const handleTutorialCarouselKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      showPreviousTutorial()
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      showNextTutorial()
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
          <nav className="info-page-nav" aria-label={infoText.informationPages}>
            <Link className="info-page-back" to="/">{infoText.back}</Link>
            {!isTutorialPage && (
              <>
                <Link to="/about">{infoText.about}</Link>
                <Link to="/contact">{infoText.contact}</Link>
                <Link to="/terms">{infoText.terms}</Link>
                <Link to="/privacy-policy">{infoText.privacy}</Link>
              </>
            )}
          </nav>

          <h1>{page.title}</h1>
          <p className="info-page-intro">{page.intro}</p>

          {type === 'privacy' && (
            <section className="privacy-account-tools" aria-label={infoText.accountPrivacyTools}>
              <h2>{infoText.accountTools}</h2>
              {savedAuthUser.username ? (
                <>
                  <p>
                    {infoText.signedInAs} <strong>{savedAuthUser.username}</strong>.
                  </p>
                  <div className="privacy-tool-actions">
                    <button
                      className="info-page-action"
                      type="button"
                      onClick={handleExportAccountData}
                      disabled={isExportingData || isDeletingAccount}
                    >
                      {isExportingData ? infoText.exporting : infoText.exportData}
                    </button>
                    <button
                      className="info-page-action danger"
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isExportingData || isDeletingAccount}
                    >
                      {isDeletingAccount ? infoText.deleting : infoText.deleteAccount}
                    </button>
                  </div>
                </>
              ) : (
                <p>{infoText.signInForPrivacyTools}</p>
              )}
              {privacyStatus.message && (
                <p className={`contact-status ${privacyStatus.type}`} role="status">
                  {privacyStatus.message}
                </p>
              )}
            </section>
          )}

          {type === 'tutorial' && (
            <div
              className="tutorial-carousel"
              aria-roledescription="carousel"
              aria-label={infoText.tutorialCarousel}
              tabIndex={0}
              onKeyDown={handleTutorialCarouselKeyDown}
            >
              <button
                className="tutorial-carousel-arrow previous"
                type="button"
                onClick={showPreviousTutorial}
                aria-label={infoText.previousControl}
              >
                ‹
              </button>

              <div className="tutorial-carousel-slide" aria-live="polite">
                <TutorialBoardDemo
                  key={activeTutorial.action}
                  demo={activeTutorial}
                />
              </div>

              <button
                className="tutorial-carousel-arrow next"
                type="button"
                onClick={showNextTutorial}
                aria-label={infoText.nextControl}
              >
                ›
              </button>

              <div
                className="tutorial-carousel-dots"
                aria-label={infoText.tutorialSlides}
              >
                {tutorialControls.map((demo, index) => (
                  <button
                    key={demo.action}
                    className={`tutorial-carousel-dot${index === activeTutorialIndex ? ' active' : ''}`}
                    type="button"
                    onClick={() => setActiveTutorialIndex(index)}
                    aria-label={infoText.showTutorialSlide((tutorialText[demo.action] || demo).title)}
                    aria-current={index === activeTutorialIndex ? 'true' : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {type === 'contact' && (
            <form className="contact-form" onSubmit={handleContactSubmit}>
              <label htmlFor="contact-object">{contactText.objectLabel}</label>
              <input
                id="contact-object"
                type="text"
                value={contactObject}
                onChange={(event) => setContactObject(event.target.value)}
                maxLength={CONTACT_OBJECT_MAX_LENGTH}
                placeholder={contactText.objectPlaceholder}
                disabled={isContactSending}
              />

              <label htmlFor="contact-message">{contactText.messageLabel}</label>
              <textarea
                id="contact-message"
                value={contactMessage}
                onChange={(event) => setContactMessage(event.target.value)}
                maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                rows={7}
                placeholder={contactText.messagePlaceholder}
                disabled={isContactSending}
              />
              <p className="contact-character-count">
                {contactMessage.length.toLocaleString()} / {CONTACT_MESSAGE_MAX_LENGTH.toLocaleString()}
              </p>

              {!savedUserEmail && (
                <>
                  <label htmlFor="contact-email">{contactText.emailLabel}</label>
                  <input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder={contactText.emailPlaceholder}
                    disabled={isContactSending}
                  />
                </>
              )}

              <div className="contact-captcha">
                <label htmlFor="contact-captcha">
                  {contactText.captchaLabel}: {contactCaptcha.question || contactText.captchaLoading}
                </label>
                <div className="contact-captcha-row">
                  <input
                    id="contact-captcha"
                    type="text"
                    inputMode="numeric"
                    value={contactCaptchaAnswer}
                    onChange={(event) => setContactCaptchaAnswer(event.target.value)}
                    placeholder={contactText.captchaPlaceholder}
                    disabled={isContactSending || isContactCaptchaLoading || !contactCaptcha.token}
                  />
                  <button
                    className="contact-captcha-refresh"
                    type="button"
                    onClick={loadContactCaptcha}
                    disabled={isContactSending || isContactCaptchaLoading}
                    aria-label={contactText.refreshCaptcha}
                  >
                    ↻
                  </button>
                </div>
              </div>

              <div className="contact-honeypot" aria-hidden="true">
                <label htmlFor="contact-website">{contactText.honeypotLabel}</label>
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
                {isContactSending ? contactText.sending : contactText.sendMessage}
              </button>
            </form>
          )}

          <div className="info-page-sections">
            {page.sections.map((section) => (
              <section key={section.title} className="info-page-section">
                <h2>{section.title}</h2>
                <p>{section.body}</p>
                {section.links && (
                  <div className="info-page-action-row">
                    {section.links.map((link) => (
                      <a
                        key={link.href}
                        className="info-page-action"
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
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

