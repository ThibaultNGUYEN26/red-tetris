import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { socket } from '../../../../socket'

vi.mock('../../../../socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}))

vi.mock('../../../../components/TetriminosClouds/TetriminosClouds', () => ({
  default: () => <div data-testid="tetriminos-clouds" />,
}))

vi.mock('../../../../components/ShadowBoards/ShadowBoards', () => ({
  default: () => <div data-testid="shadow-boards" />,
}))

vi.mock('../../../../components/SpectatorView/SpectatorView.jsx', () => ({
  default: () => <div data-testid="spectator-view" />,
}))

vi.mock('../../../../components/GameOver/GameOver', () => ({
  default: () => <div data-testid="game-over" />,
}))

import Game from '../../../../components/Game/Game.jsx'

describe('Game Component', () => {
  beforeEach(() => {
    class MockAudio {
      constructor() {
        this.currentTime = 0
        this.volume = 1
        this.loop = false
        this.preload = ''
        this.src = ''
      }
      play = vi.fn().mockResolvedValue()
      pause = vi.fn()
    }
    global.Audio = MockAudio
  })

  it('renders board, next preview, and options button', () => {
    render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer={false}
        soundEnabled
        onSoundChange={vi.fn()}
      />
    )

    expect(screen.getByRole('grid', { name: /tetris board/i })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: /next piece/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument()
  })

  it('shows pause overlay on Escape and allows sound toggle', async () => {
    const onSoundChange = vi.fn()

    render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer={false}
        soundEnabled
        onSoundChange={onSoundChange}
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /sound: on/i }))
    expect(onSoundChange).toHaveBeenCalledWith(false)

    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /leave game/i })).toBeInTheDocument()
  })

  it('tracks the DB-backed room mode before a new game starts', async () => {
    render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer
        soundEnabled
        onSoundChange={vi.fn()}
      />
    )

    const roomStateHandler = socket.on.mock.calls.find(
      ([event]) => event === 'roomState'
    )?.[1]
    const gameStartedHandler = socket.on.mock.calls.find(
      ([event]) => event === 'gameStarted'
    )?.[1]
    const gameStateHandler = socket.on.mock.calls.find(
      ([event]) => event === 'gameState'
    )?.[1]

    roomStateHandler?.({
      id: 1,
      game_mode: 'classic',
    })

    gameStartedHandler?.({ roomId: '1' })

    gameStateHandler?.({
      mode: 'classic',
      players: [{
        username: 'Titi',
        board: Array.from({ length: 20 }, () => Array(10).fill('empty')),
        score: 0,
        lines: 0,
        level: 1,
        nextType: 'z',
      }],
    })

    await waitFor(() => {
      expect(screen.getByRole('grid', { name: /tetris board/i })).toBeInTheDocument()
    })
  })
})
