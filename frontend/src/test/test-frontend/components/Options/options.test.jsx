import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Options from '../../../../components/ModeMenuSelector/Options.jsx/Options.jsx'

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
    render(
      <Options
        onBack={vi.fn()}
        theme="dark"
        onThemeChange={vi.fn()}
        soundEnabled={false}
        onSoundChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /dark theme/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sound/i })).toHaveTextContent(/disabled/i)
  })
})
