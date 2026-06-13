import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}))

vi.mock('../../../components/GoodClouds/GoodClouds.jsx', () => ({
  default: () => <div data-testid="good-clouds" />,
}))

vi.mock('../../../components/TetriminosClouds/TetriminosClouds.jsx', () => ({
  default: () => <div data-testid="tetriminos-clouds" />,
}))

import InfoPage from '../../../InfoPage.jsx'
import { apiUrl } from '../../../api.js'

describe('InfoPage language binding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    localStorage.clear()
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ question: '2 + 2 ?', token: 'captcha-token' }),
    }))
    URL.createObjectURL = vi.fn(() => 'blob:account-export')
    URL.revokeObjectURL = vi.fn()
    HTMLAnchorElement.prototype.click = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the about page in English by default', () => {
    render(<InfoPage type="about" />)

    expect(screen.getByRole('heading', { name: 'About Red Tetris' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Game Modes' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'À propos de Red Tetris' })).not.toBeInTheDocument()
  })

  it('renders the about page in French when the saved language is French', () => {
    localStorage.setItem('red-tetris-language', 'fr')

    render(<InfoPage type="about" />)

    expect(screen.getByRole('heading', { name: 'À propos de Red Tetris' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Modes de jeu' })).toBeInTheDocument()
  })

  it('renders the contact form in French when the saved language is French', () => {
    localStorage.setItem('red-tetris-language', 'fr')

    render(<InfoPage type="contact" />)

    expect(screen.getByText(/Envoyez vos signalements de bugs/)).toBeInTheDocument()
    expect(screen.getByLabelText('Objet')).toHaveAttribute(
      'placeholder',
      'Signalement de bug ou suggestion'
    )
    expect(screen.getByPlaceholderText('Décrivez le problème ou l’idée...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Envoyer le message' })).toBeInTheDocument()
  })

  it('renders the terms page in French when the saved language is French', () => {
    localStorage.setItem('red-tetris-language', 'fr')

    render(<InfoPage type="terms" />)

    expect(screen.getByRole('heading', { name: 'Conditions d\u2019utilisation' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Utilisation du service' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conditions' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Terms' })).not.toBeInTheDocument()
  })

  it('renders the privacy page in French when the saved language is French', () => {
    localStorage.setItem('red-tetris-language', 'fr')

    render(<InfoPage type="privacy" />)

    expect(screen.getByRole('heading', { name: 'Politique de confidentialite' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Responsable du traitement' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Outils du compte' })).toBeInTheDocument()
    expect(screen.getByText(/Connectez-vous pour exporter vos donnees/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Confidentialite' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Privacy Policy' })).not.toBeInTheDocument()
  })

  it('falls back to English contact text when a supported language has no contact copy', async () => {
    vi.resetModules()
    vi.doMock('../../../i18n/playerStats', () => ({
      DEFAULT_LANGUAGE: 'en',
      isSupportedLanguage: (language) => language === 'zz',
    }))

    try {
      const { default: InfoPageWithMissingContactTranslation } = await import('../../../InfoPage.jsx')
      localStorage.setItem('red-tetris-language', 'zz')

      render(<InfoPageWithMissingContactTranslation type="contact" />)

      expect(screen.getByLabelText('Object')).toHaveAttribute(
        'placeholder',
        'Bug report or suggestion'
      )
      expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument()
    } finally {
      vi.doUnmock('../../../i18n/playerStats')
      vi.resetModules()
    }
  })

  it('falls back to the default page and renders the dark theme background', () => {
    localStorage.setItem('red-tetris-language', 'zz')
    localStorage.setItem('red-tetris-theme', 'dark')

    const { container, unmount } = render(<InfoPage type="missing-page" />)

    expect(screen.getByRole('heading', { name: 'About Red Tetris' })).toBeInTheDocument()
    expect(container.querySelector('.sky-background')).toHaveClass('dark')
    expect(container.querySelector('.stars')).toBeInTheDocument()

    unmount()
  })

  it('renders the tutorial carousel and supports arrows, keyboard, and dots', () => {
    const { container } = render(<InfoPage type="tutorial" />)
    const carousel = container.querySelector('.tutorial-carousel')

    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument()
    expect(container.querySelector('.tutorial-demo.move-left')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /suivant/ }))
    expect(container.querySelector('.tutorial-demo.move-right')).toBeInTheDocument()

    fireEvent.keyDown(carousel, { key: 'ArrowLeft' })
    expect(container.querySelector('.tutorial-demo.move-left')).toBeInTheDocument()

    fireEvent.keyDown(carousel, { key: 'ArrowLeft' })
    expect(container.querySelector('.tutorial-demo.hold')).toBeInTheDocument()

    fireEvent.keyDown(carousel, { key: 'ArrowRight' })
    expect(container.querySelector('.tutorial-demo.move-left')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /droite/ }))
    expect(container.querySelector('.tutorial-demo.move-right')).toBeInTheDocument()
  })

  it('loads captcha and validates contact form input before sending', async () => {
    render(<InfoPage type="contact" />)

    await screen.findByLabelText('Captcha: 2 + 2 ?')

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Object and message are required.')

    fireEvent.change(screen.getByLabelText('Object'), { target: { value: 'Bug' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Something broke' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Email is required.')

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'player@example.com' } })
    fireEvent.change(screen.getByLabelText('Object'), { target: { value: 'x'.repeat(121) } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Object must be 120 characters or fewer.')

    fireEvent.change(screen.getByLabelText('Object'), { target: { value: 'Bug' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'x'.repeat(4001) } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Message must be 4000 characters or fewer.')

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Something broke' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Captcha answer is required.')
  })

  it('submits contact messages and refreshes the captcha', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ question: '2 + 2 ?', token: 'captcha-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ question: '3 + 3 ?', token: 'next-token' }),
      })

    render(<InfoPage type="contact" />)
    await screen.findByLabelText('Captcha: 2 + 2 ?')

    fireEvent.change(screen.getByLabelText('Object'), { target: { value: ' Bug report ' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: ' It broke ' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'PLAYER@EXAMPLE.COM ' } })
    fireEvent.change(screen.getByLabelText(/Captcha:/), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'bot-site' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Send message' }).closest('form'))

    expect(await screen.findByRole('status')).toHaveTextContent('Message sent.')
    expect(global.fetch).toHaveBeenNthCalledWith(2, apiUrl('/api/contact'), expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'Bug report',
        message: 'It broke',
        userEmail: 'player@example.com',
        captchaToken: 'captcha-token',
        captchaAnswer: '4',
        website: 'bot-site',
      }),
    }))
    expect(screen.getByLabelText('Object')).toHaveValue('')
    expect(screen.getByLabelText('Message')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('')
  })

  it('uses saved email for contact messages and handles send failures', async () => {
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({
      username: ' Titi ',
      email: ' PLAYER@EXAMPLE.COM ',
    }))
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ question: '2 + 2 ?', token: 'captcha-token' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Bad captcha' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

    render(<InfoPage type="contact" />)
    await screen.findByLabelText('Captcha: 2 + 2 ?')

    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Object'), { target: { value: 'Bug' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'It broke' } })
    fireEvent.change(screen.getByLabelText(/Captcha:/), { target: { value: '5' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Send message' }).closest('form'))

    expect(await screen.findByRole('status')).toHaveTextContent('Bad captcha')
    expect(global.fetch).toHaveBeenNthCalledWith(2, apiUrl('/api/contact'), expect.objectContaining({
      body: expect.stringContaining('"userEmail":"player@example.com"'),
    }))
  })

  it('uses fallback contact errors when the server response has no message', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ question: '2 + 2 ?', token: 'captcha-token' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ question: '3 + 3 ?', token: 'next-token' }),
      })

    render(<InfoPage type="contact" />)
    await screen.findByLabelText('Captcha: 2 + 2 ?')

    fireEvent.change(screen.getByLabelText('Object'), { target: { value: 'Bug' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'It broke' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'player@example.com' } })
    fireEvent.change(screen.getByLabelText(/Captcha:/), { target: { value: '4' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Send message' }).closest('form'))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to send message')
  })

  it('shows contact timeout errors when sending is aborted', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ question: '2 + 2 ?', token: 'captcha-token' }),
      })
      .mockImplementationOnce((url, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        })
      }))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ question: '3 + 3 ?', token: 'next-token' }),
      })

    render(<InfoPage type="contact" />)
    await screen.findByLabelText('Captcha: 2 + 2 ?')

    fireEvent.change(screen.getByLabelText('Object'), { target: { value: 'Bug' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'It broke' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'player@example.com' } })
    fireEvent.change(screen.getByLabelText(/Captcha:/), { target: { value: '4' } })
    vi.useFakeTimers()
    fireEvent.submit(screen.getByRole('button', { name: 'Send message' }).closest('form'))
    await vi.advanceTimersByTimeAsync(15000)
    vi.useRealTimers()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Mail server timeout. Please try again later.'
    )
  })

  it('falls back when contact captcha or send responses are not JSON', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ question: '2 + 2 ?', token: 'captcha-token' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('bad json')
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('bad json')
        },
      })

    render(<InfoPage type="contact" />)
    await screen.findByLabelText('Captcha: 2 + 2 ?')

    fireEvent.change(screen.getByLabelText('Object'), { target: { value: 'Bug' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'It broke' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'player@example.com' } })
    fireEvent.change(screen.getByLabelText(/Captcha:/), { target: { value: '4' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Send message' }).closest('form'))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to send message')
  })

  it('uses fallback contact errors when the request rejects without a message', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ question: '2 + 2 ?', token: 'captcha-token' }),
      })
      .mockRejectedValueOnce({})
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ question: '3 + 3 ?', token: 'next-token' }),
      })

    render(<InfoPage type="contact" />)
    await screen.findByLabelText('Captcha: 2 + 2 ?')

    fireEvent.change(screen.getByLabelText('Object'), { target: { value: 'Bug' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'It broke' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'player@example.com' } })
    fireEvent.change(screen.getByLabelText(/Captcha:/), { target: { value: '4' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Send message' }).closest('form'))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to send message')
  })

  it('shows captcha load errors', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ question: '', token: '' }),
    }))

    render(<InfoPage type="contact" />)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unable to load captcha. Please refresh the page.'
    )
  })

  it('exports account data from the privacy page', async () => {
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({
      username: 'Titi',
      email: 'titi@example.com',
    }))
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ account: { username: 'Titi' }, scores: { solo: [] } }),
    }))

    render(<InfoPage type="privacy" />)

    expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Export my data' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Account data export downloaded.')
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:account-export')
  })

  it('uses the account filename fallback when export payload has no username', async () => {
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'Titi' }))
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true }),
    }))
    const appendSpy = vi.spyOn(document.body, 'appendChild')

    render(<InfoPage type="privacy" />)
    fireEvent.click(screen.getByRole('button', { name: 'Export my data' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Account data export downloaded.')
    const appendedLink = appendSpy.mock.calls.map(([node]) => node).find((node) => (
      node instanceof HTMLAnchorElement && node.download
    ))
    expect(appendedLink).toHaveProperty('download', 'red-tetris-account-data.json')
  })

  it('shows privacy export errors and handles malformed saved auth data', async () => {
    localStorage.setItem('red-tetris-auth-user', '{bad json')

    const { unmount } = render(<InfoPage type="privacy" />)
    expect(screen.getByText('Sign in to export your account data or delete your account directly.')).toBeInTheDocument()
    unmount()

    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'Titi' }))
    global.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Export failed' }),
    }))

    render(<InfoPage type="privacy" />)
    fireEvent.click(screen.getByRole('button', { name: 'Export my data' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Export failed')
  })

  it('uses fallback export errors when export fails without a message', async () => {
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'Titi' }))
    global.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    }))

    render(<InfoPage type="privacy" />)
    fireEvent.click(screen.getByRole('button', { name: 'Export my data' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to export account data')
  })

  it('uses fallback export errors when export error payload is not JSON', async () => {
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'Titi' }))
    global.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => {
        throw new Error('bad json')
      },
    }))

    render(<InfoPage type="privacy" />)
    fireEvent.click(screen.getByRole('button', { name: 'Export my data' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to export account data')
  })

  it('uses fallback export errors when the export request rejects without a message', async () => {
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'Titi' }))
    global.fetch = vi.fn(async () => {
      throw {}
    })

    render(<InfoPage type="privacy" />)
    fireEvent.click(screen.getByRole('button', { name: 'Export my data' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to export account data')
  })

  it('deletes an account only after confirmation', async () => {
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'Titi' }))
    window.confirm = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true }),
    }))

    render(<InfoPage type="privacy" />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
    expect(global.fetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(apiUrl('/api/account'), expect.objectContaining({
      method: 'DELETE',
      credentials: 'include',
    })))
    expect(await screen.findByRole('status')).toHaveTextContent('Account deleted.')
    expect(localStorage.getItem('red-tetris-auth-user')).toBeNull()
    expect(screen.getByText('Sign in to export your account data or delete your account directly.')).toBeInTheDocument()
  })

  it('uses French privacy account actions when French is selected', async () => {
    localStorage.setItem('red-tetris-language', 'fr')
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'Titi' }))
    window.confirm = vi.fn(() => true)
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true }),
    }))

    render(<InfoPage type="privacy" />)
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte' }))

    expect(window.confirm).toHaveBeenCalledWith(
      'Supprimer le compte Red Tetris "Titi" et ses scores ? Cette action est irreversible.'
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Compte supprime.')
  })

  it('shows account deletion errors', async () => {
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'Titi' }))
    window.confirm = vi.fn(() => true)
    global.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Delete failed' }),
    }))

    render(<InfoPage type="privacy" />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Delete failed')
  })

  it('uses fallback account deletion errors', async () => {
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'Titi' }))
    window.confirm = vi.fn(() => true)
    global.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    }))

    render(<InfoPage type="privacy" />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to delete account')
  })

  it('uses fallback account deletion errors when delete error payload is not JSON', async () => {
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'Titi' }))
    window.confirm = vi.fn(() => true)
    global.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => {
        throw new Error('bad json')
      },
    }))

    render(<InfoPage type="privacy" />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to delete account')
  })

  it('uses fallback account deletion errors when the request rejects without a message', async () => {
    localStorage.setItem('red-tetris-auth-user', JSON.stringify({ username: 'Titi' }))
    window.confirm = vi.fn(() => true)
    global.fetch = vi.fn(async () => {
      throw {}
    })

    render(<InfoPage type="privacy" />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to delete account')
  })

  it('ignores unrelated tutorial keyboard input', () => {
    const { container } = render(<InfoPage type="tutorial" />)
    const carousel = container.querySelector('.tutorial-carousel')

    fireEvent.keyDown(carousel, { key: 'Enter' })

    expect(container.querySelector('.tutorial-demo.move-left')).toBeInTheDocument()
  })
})
