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

    expect(screen.getByRole('heading', { name: /partie terminée/i })).toBeInTheDocument()
    expect(screen.getByText('Vainqueur : Titi')).toBeInTheDocument()
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

    expect(screen.getByRole('heading', { name: /partie terminée/i })).toBeInTheDocument()
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

    expect(screen.getByRole('heading', { name: /vous avez gagné/i })).toBeInTheDocument()
    expect(screen.getByText('Vainqueur : Titi')).toBeInTheDocument()

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

    expect(screen.getByRole('heading', { name: /vous avez perdu/i })).toBeInTheDocument()
    expect(screen.getByText('Vainqueur : Other')).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: /rejouer/i }))
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

    fireEvent.click(screen.getByRole('button', { name: /regarder/i }))
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

    fireEvent.click(screen.getByRole('button', { name: /retour au menu/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
