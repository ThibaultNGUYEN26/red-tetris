import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import GameOver from '../../../../components/GameOver/GameOver.jsx'

describe('GameOver Component', () => {
  it('renders nothing when game is not over', () => {
    const { container } = render(
      <GameOver
        winner={null}
        isEliminated={false}
        isGameOver={false}
        onBack={vi.fn()}
        username="Titi"
        isMultiplayer={false}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('shows Game Over title in solo or cooperative', () => {
    render(
      <GameOver
        winner="Titi"
        isEliminated
        isGameOver
        onBack={vi.fn()}
        username="Titi"
        isMultiplayer={true}
        gameMode="cooperative"
      />
    )

    expect(screen.getByRole('heading', { name: /game over/i })).toBeInTheDocument()
    expect(screen.getByText('Winner: Titi')).toBeInTheDocument()
  })

  it('renders French labels when French is selected', () => {
    render(
      <GameOver
        winner="Titi"
        isEliminated
        isGameOver
        onBack={vi.fn()}
        username="Titi"
        isMultiplayer={true}
        gameMode="cooperative"
        language="fr"
      />
    )

    expect(screen.getByRole('heading', { name: /partie terminée/i })).toBeInTheDocument()
    expect(screen.getByText('Vainqueur: Titi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retour au menu/i })).toBeInTheDocument()
  })

  it('falls back to English labels when the language is unsupported', () => {
    render(
      <GameOver
        winner="Titi"
        isEliminated
        isGameOver
        onBack={vi.fn()}
        username="Titi"
        isMultiplayer={true}
        gameMode="cooperative"
        language="zz"
      />
    )

    expect(screen.getByRole('heading', { name: /game over/i })).toBeInTheDocument()
    expect(screen.getByText('Winner: Titi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to menu/i })).toBeInTheDocument()
  })

  it('shows Game Over title in cooperative_roles too', () => {
    render(
      <GameOver
        winner={null}
        isEliminated
        isGameOver
        onBack={vi.fn()}
        username="Titi"
        isMultiplayer={true}
        gameMode="cooperative_roles"
      />
    )

    expect(screen.getByRole('heading', { name: /game over/i })).toBeInTheDocument()
  })

  it('shows win/lose title in multiplayer versus modes', () => {
    const { rerender } = render(
      <GameOver
        winner="Titi"
        isEliminated
        isGameOver
        onBack={vi.fn()}
        username="Titi"
        isMultiplayer={true}
        gameMode="classic"
      />
    )

    expect(screen.getByRole('heading', { name: /you won/i })).toBeInTheDocument()
    expect(screen.queryByText('Winner: Titi')).not.toBeInTheDocument()

    rerender(
      <GameOver
        winner="Other"
        isEliminated
        isGameOver
        onBack={vi.fn()}
        username="Titi"
        isMultiplayer={true}
        gameMode="classic"
      />
    )

    expect(screen.getByRole('heading', { name: /you lost/i })).toBeInTheDocument()
    expect(screen.queryByText('Winner: Other')).not.toBeInTheDocument()
  })

  it('shows play again and spectate when applicable', () => {
    const onPlayAgain = vi.fn()
    const onSpectate = vi.fn()

    render(
      <GameOver
        winner={null}
        isEliminated
        isGameOver
        onBack={vi.fn()}
        onPlayAgain={onPlayAgain}
        onSpectate={onSpectate}
        username="Titi"
        isMultiplayer={true}
        gameMode="classic"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /play again/i }))
    expect(onPlayAgain).toHaveBeenCalled()
  })

  it('shows spectate only when eliminated and game not over', () => {
    const onSpectate = vi.fn()

    render(
      <GameOver
        winner={null}
        isEliminated
        isGameOver={false}
        onBack={vi.fn()}
        onSpectate={onSpectate}
        username="Titi"
        isMultiplayer={true}
        gameMode="classic"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /spectate/i }))
    expect(onSpectate).toHaveBeenCalled()
  })

  it('calls onBack when back to menu is clicked', () => {
    const onBack = vi.fn()

    render(
      <GameOver
        winner="Titi"
        isEliminated
        isGameOver
        onBack={onBack}
        username="Titi"
        isMultiplayer={true}
        gameMode="classic"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /back to menu/i }))
    expect(onBack).toHaveBeenCalled()
  })

  it('renders the ranking with rewards, highlighting the current player', () => {
    render(
      <GameOver
        winner="Titi"
        isEliminated
        isGameOver
        onBack={vi.fn()}
        username="Titi"
        isMultiplayer={true}
        gameMode="classic"
        ranking={[
          { username: 'Titi', rank: 1, score: 1500 },
          { username: 'Riri', rank: 2, score: 800 },
          { username: 'Lulu', rank: 3, score: 200 },
        ]}
        rewards={{ Titi: 150, Riri: 50 }}
      />
    )

    // All ranking entries are rendered.
    expect(screen.getByText('Titi')).toBeInTheDocument()
    expect(screen.getByText('Riri')).toBeInTheDocument()
    expect(screen.getByText('Lulu')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()

    // Only players who earned > 0 coins show the coin badge.
    expect(screen.getByText('+150 🪙')).toBeInTheDocument()
    expect(screen.getByText('+50 🪙')).toBeInTheDocument()
    // Lulu is missing from rewards entirely (?? 0 fallback path) so no badge.
    expect(screen.queryByText('+0 🪙')).not.toBeInTheDocument()

    // The current player's row is marked with the is-me class.
    const titiRow = screen.getByText('Titi').closest('.game-over-rank-row')
    expect(titiRow).toHaveClass('is-me')
  })

  it('shows own coin reward outside the ranking in coop mode', () => {
    render(
      <GameOver
        winner={null}
        isEliminated
        isGameOver
        onBack={vi.fn()}
        username="Titi"
        isMultiplayer={true}
        gameMode="cooperative"
        ranking={[{ username: 'Titi', rank: 1, score: 500 }]}
        rewards={{ Titi: 40 }}
      />
    )

    // Coop hides the ranking but shows the standalone coin line.
    expect(screen.queryByText('#1')).not.toBeInTheDocument()
    expect(screen.getByText('+40 🪙')).toBeInTheDocument()
  })
})
