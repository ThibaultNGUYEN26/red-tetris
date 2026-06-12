import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Options from '../../../../components/ModeMenuSelector/Options.jsx/Options.jsx'

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}))

describe('Options Component', () => {
  it('renders theme and sound controls', () => {
    render(
      <Options
        onBack={vi.fn()}
        theme="light"
        onThemeChange={vi.fn()}
        soundEnabled
        onSoundChange={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: /options/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /light theme/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sound/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /guide/i })).toHaveAttribute('href', '/tutorial')
    expect(screen.getByRole('button', { name: /language/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/language options/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('toggles theme and sound via callbacks', () => {
    const onThemeChange = vi.fn()
    const onSoundChange = vi.fn()
    const onBack = vi.fn()

    render(
      <Options
        onBack={onBack}
        theme="light"
        onThemeChange={onThemeChange}
        soundEnabled
        onSoundChange={onSoundChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /light theme/i }))
    expect(onThemeChange).toHaveBeenCalledWith('dark')

    fireEvent.click(screen.getByRole('button', { name: /sound/i }))
    expect(onSoundChange).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalled()
  })

  it('renders dark theme labels when theme is dark', () => {
    const onThemeChange = vi.fn()

    render(
      <Options
        onBack={vi.fn()}
        theme="dark"
        onThemeChange={onThemeChange}
        soundEnabled={false}
        onSoundChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /dark theme/i }))
    expect(onThemeChange).toHaveBeenCalledWith('light')
    expect(screen.getByRole('button', { name: /sound/i })).toHaveTextContent(/disabled/i)
  })

  it('shows language choices after clicking language', () => {
    const onLanguageChange = vi.fn()

    render(
      <Options
        onBack={vi.fn()}
        theme="light"
        onThemeChange={vi.fn()}
        soundEnabled
        onSoundChange={vi.fn()}
        selectedLanguage="fr"
        onLanguageChange={onLanguageChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /language/i }))

    expect(screen.getByLabelText(/language options/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'French' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spanish' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Italian' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'German' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'French' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'German' }))
    expect(onLanguageChange).toHaveBeenCalledWith('de')
  })
})
