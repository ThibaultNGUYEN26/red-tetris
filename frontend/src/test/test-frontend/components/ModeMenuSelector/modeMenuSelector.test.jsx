import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ModeMenuSelector from '../../../../components/ModeMenuSelector/ModeMenuSelector.jsx'
vi.mock('../../../../components/ModeMenuSelector/Options.jsx/Options.jsx', () => ({
  default: ({ onBack }) => (
    <div data-testid="options">
      <button onClick={onBack}>Back</button>
    </div>
  ),
}))

vi.mock('../../../../components/Shop/Shop.jsx', () => ({
  default: ({ onBack }) => (
    <div data-testid="shop">
      <button onClick={onBack}>Back</button>
    </div>
  ),
}))

describe('ModeMenuSelector Component', () => {
  const defaultProps = {
    theme: 'light',
    onThemeChange: vi.fn(),
    onShowRooms: vi.fn(),
    onShowSoloRoom: vi.fn(),
    soundEnabled: true,
    onSoundChange: vi.fn(),
    musicEnabled: true,
    onMusicChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('renders buttons for solo, multiplayer, and options', () => {
    render(<ModeMenuSelector {...defaultProps} />)

    expect(screen.getByRole('heading', { name: /select game mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /multiplayer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument()
  })

  it('renders French labels when French is selected', () => {
    render(<ModeMenuSelector {...defaultProps} selectedLanguage="fr" />)

    expect(screen.getByRole('heading', { name: /sélection du mode de jeu/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /multijoueur/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /paramètres/i })).toBeInTheDocument()
  })

  it('falls back to English labels when the language is unsupported', () => {
    render(<ModeMenuSelector {...defaultProps} selectedLanguage="zz" />)

    expect(screen.getByRole('heading', { name: /select game mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /multiplayer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument()
  })

  it('applies dark theme class', () => {
    const { container } = render(<ModeMenuSelector {...defaultProps} theme="dark" />)

    expect(container.querySelector('.mode-card.dark')).toBeInTheDocument()
  })

  it('opens options view and returns to menu', () => {
    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /options/i }))
    expect(screen.getByTestId('options')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument()
  })

  it('notifies parent to open rooms on multiplayer', () => {
    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))

    expect(defaultProps.onShowRooms).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument()
  })

  it('notifies parent to open solo room flow', () => {
    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /solo/i }))

    expect(defaultProps.onShowSoloRoom).toHaveBeenCalledWith(true)
  })

  it('opens shop view and returns to menu', () => {
    render(<ModeMenuSelector {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /shop/i }))
    expect(screen.getByTestId('shop')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.queryByTestId('shop')).not.toBeInTheDocument()
  })
})
