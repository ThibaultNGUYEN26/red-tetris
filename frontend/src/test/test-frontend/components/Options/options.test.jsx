import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Options from '../../../../components/ModeMenuSelector/Options.jsx/Options.jsx'

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}))

describe('Options Component', () => {
  const defaultProps = {
    onBack: vi.fn(),
    theme: 'light',
    onThemeChange: vi.fn(),
    soundEnabled: true,
    onSoundChange: vi.fn(),
    musicEnabled: true,
    onMusicChange: vi.fn(),
  }

  it('renders theme, sound, and music controls', () => {
    render(<Options {...defaultProps} />)

    expect(screen.getByRole('heading', { name: /options/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /light theme/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sound effects/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /music/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /guide/i })).toHaveAttribute('href', '/tutorial')
    expect(screen.getByRole('button', { name: /language/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/language options/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('toggles theme, sound, and music via callbacks', () => {
    const onThemeChange = vi.fn()
    const onSoundChange = vi.fn()
    const onMusicChange = vi.fn()
    const onBack = vi.fn()

    render(
      <Options
        {...defaultProps}
        onBack={onBack}
        onThemeChange={onThemeChange}
        onSoundChange={onSoundChange}
        onMusicChange={onMusicChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /light theme/i }))
    expect(onThemeChange).toHaveBeenCalledWith('dark')

    fireEvent.click(screen.getByRole('button', { name: /sound effects/i }))
    expect(onSoundChange).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: /music/i }))
    expect(onMusicChange).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalled()
  })

  it('renders disabled labels when sound and music are off', () => {
    const onThemeChange = vi.fn()

    render(
      <Options
        {...defaultProps}
        theme="dark"
        onThemeChange={onThemeChange}
        soundEnabled={false}
        musicEnabled={false}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /dark theme/i }))
    expect(onThemeChange).toHaveBeenCalledWith('light')
    expect(screen.getByRole('button', { name: /sound effects/i })).toHaveTextContent(/disabled/i)
    expect(screen.getByRole('button', { name: /music/i })).toHaveTextContent(/disabled/i)
  })

  it('renders French labels when French is selected', () => {
    render(
      <Options
        {...defaultProps}
        selectedLanguage="fr"
      />
    )

    expect(screen.getByRole('heading', { name: /param/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /th.*me clair/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /effets sonores|son/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /musique|music/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /langue/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retour/i })).toBeInTheDocument()
  })

  it('falls back to English labels when the language is unsupported', () => {
    render(
      <Options
        {...defaultProps}
        selectedLanguage="zz"
      />
    )

    expect(screen.getByRole('heading', { name: /options/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /light theme/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sound effects/i })).toHaveTextContent(/enabled/i)
    expect(screen.getByRole('button', { name: /music/i })).toHaveTextContent(/enabled/i)
    expect(screen.getByRole('button', { name: /language/i })).toBeInTheDocument()
  })

  it('shows language choices after clicking language', () => {
    const onLanguageChange = vi.fn()

    render(
      <Options
        {...defaultProps}
        selectedLanguage="fr"
        onLanguageChange={onLanguageChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /langue/i }))

    expect(screen.getByLabelText(/options de langue/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anglais' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fran/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Espagnol' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Italien' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'German' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fran/i })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /Fran/i }))
    expect(onLanguageChange).toHaveBeenCalledWith('fr')
  })

  it('closes language choices when the overlay is clicked', () => {
    render(<Options {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /language/i }))
    const overlay = screen.getByLabelText(/language options/i).closest('.language-options-overlay')

    expect(screen.getByLabelText(/language options/i)).toBeInTheDocument()
    fireEvent.click(overlay)
    expect(screen.queryByLabelText(/language options/i)).not.toBeInTheDocument()
  })
})
