import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  default: ({ winner, isEliminated, isGameOver, onSpectate }) => (
    <div data-testid="game-over">
      <span data-testid="game-over-state">
        {JSON.stringify({ winner, isEliminated, isGameOver })}
      </span>
      {onSpectate && (
        <button type="button" onClick={onSpectate}>
          Spectate
        </button>
      )}
    </div>
  ),
}))

import Game from '../../../../components/Game/Game.jsx'

const makeBoard = (height = 20, width = 10, fill = 'empty') =>
  Array.from({ length: height }, () => Array(width).fill(fill))

const getSocketHandler = (event) =>
  socket.on.mock.calls.find(([registeredEvent]) => registeredEvent === event)?.[1]

describe('Game Component', () => {
  let audioInstances

  beforeEach(() => {
    vi.clearAllMocks()
    audioInstances = []
    class MockAudio {
      constructor() {
        this.currentTime = 0
        this.volume = 1
        this.loop = false
        this.preload = ''
        this.src = ''
        audioInstances.push(this)
      }
      play = vi.fn().mockResolvedValue()
      pause = vi.fn()
    }
    global.Audio = MockAudio
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it('shows the assigned role label in cooperative_roles mode', async () => {
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

    const gameStateHandler = socket.on.mock.calls.find(
      ([event]) => event === 'gameState'
    )?.[1]

    gameStateHandler?.({
      mode: 'cooperative_roles',
      players: [{
        username: 'Titi',
        cooperativeRole: 'rotate',
        board: Array.from({ length: 20 }, () => Array(10).fill('empty')),
        score: 0,
        lines: 0,
        level: 1,
        nextType: 'z',
      }, {
        username: 'Riri',
        cooperativeRole: 'place',
        board: Array.from({ length: 20 }, () => Array(10).fill('empty')),
        score: 0,
        lines: 0,
        level: 1,
        nextType: 'z',
      }],
    })

    await waitFor(() => {
      expect(screen.getByText('YOU ROTATE')).toBeInTheDocument()
    })
  })

  it('renders the cooperative status label on the dark theme screen', async () => {
    const { container } = render(
      <Game
        theme="dark"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer
        soundEnabled
        onSoundChange={vi.fn()}
      />
    )

    const gameStateHandler = socket.on.mock.calls.find(
      ([event]) => event === 'gameState'
    )?.[1]

    gameStateHandler?.({
      mode: 'cooperative',
      currentTurnUsername: 'Riri',
      players: [{
        username: 'Titi',
        board: Array.from({ length: 20 }, () => Array(10).fill('empty')),
        score: 0,
        lines: 0,
        level: 1,
        nextType: 'z',
      }, {
        username: 'Riri',
        board: Array.from({ length: 20 }, () => Array(10).fill('empty')),
        score: 0,
        lines: 0,
        level: 1,
        nextType: 'z',
      }],
    })

    await waitFor(() => {
      expect(screen.getByText('Playing: Riri')).toBeInTheDocument()
    })

    expect(container.querySelector('.game-screen.dark')).toBeTruthy()
    expect(container.querySelector('.turn-indicator')).toBeTruthy()
  })

  it('emits classic keyboard moves and renders next piece preview', async () => {
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

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: makeBoard(),
          score: 1234,
          lines: 4,
          level: 2,
          nextType: 't',
        }, {
          username: 'Riri',
          boardLocked: makeBoard(20, 10, 'z'),
        }],
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/1\D?234/)).toBeInTheDocument()
      expect(document.querySelectorAll('.next-grid .cell-t')).toHaveLength(4)
    })

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyUp(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyUp(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: ' ' })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'left' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'drop' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'rotate' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'hardDrop' })
  })

  it('renders authoritative playerState updates from the backend fast path', async () => {
    const updatedBoard = makeBoard()
    updatedBoard[0][4] = 't'
    updatedBoard[1][3] = 't'
    updatedBoard[1][4] = 't'
    updatedBoard[1][5] = 't'

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

    await act(async () => {
      getSocketHandler('playerState')?.({
        roomId: '1',
        mode: 'classic',
        currentTurnUsername: null,
        player: {
          username: 'Titi',
          board: updatedBoard,
          score: 50,
          lines: 1,
          level: 1,
          nextType: 'i',
        },
      })
    })

    await waitFor(() => {
      expect(document.querySelectorAll('.game-board .cell-t')).toHaveLength(4)
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(document.querySelectorAll('.next-grid .cell-i')).toHaveLength(4)
    })
  })

  it('keeps the visible piece authoritative until the backend updates it', async () => {
    const renderedBoard = makeBoard()
    renderedBoard[0][4] = 't'
    renderedBoard[1][3] = 't'
    renderedBoard[1][4] = 't'
    renderedBoard[1][5] = 't'

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

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: renderedBoard,
          boardLocked: makeBoard(),
          currentPiece: { type: 't', rotation: 0, x: 3, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
          nextType: 'i',
        }],
      })
    })

    await waitFor(() => {
      expect(document.querySelectorAll('.game-board .cell-t')).toHaveLength(4)
    })

    socket.emit.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    const cells = document.querySelectorAll('.game-board .cell')
    expect(cells[3]).toHaveClass('cell-empty')
    expect(cells[4]).toHaveClass('cell-t')
    expect(cells[12]).toHaveClass('cell-empty')
    expect(cells[13]).toHaveClass('cell-t')
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'left' })
  })

  it('applies mirror controls and opens the multiplayer menu', async () => {
    const onBack = vi.fn()
    const onSoundChange = vi.fn()
    socket.emit.mockImplementation((event, _payload, callback) => {
      if (event === 'playerLeave') callback?.()
    })

    render(
      <Game
        theme="light"
        onBack={onBack}
        roomId={1}
        username="Titi"
        isMultiplayer
        soundEnabled={false}
        onSoundChange={onSoundChange}
      />
    )

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'mirror',
        players: [{
          username: 'Titi',
          board: makeBoard(),
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument()
    })

    socket.emit.mockClear()

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyUp(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyUp(window, { key: ' ' })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'right' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'hardDrop' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'drop' })

    fireEvent.click(screen.getByRole('button', { name: /options/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Game Menu')

    fireEvent.click(screen.getByRole('button', { name: /sound: off/i }))
    expect(onSoundChange).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByRole('button', { name: /resume/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /options/i }))
    fireEvent.click(screen.getByRole('button', { name: /leave game/i }))
    expect(socket.emit).toHaveBeenCalledWith(
      'playerLeave',
      expect.objectContaining({ roomId: '1' }),
      expect.any(Function)
    )
    expect(onBack).toHaveBeenCalled()
  })

  it('blocks cooperative role moves that are not allowed', async () => {
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

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'cooperative_roles',
        players: [{
          username: 'Titi',
          cooperativeRole: 'rotate',
          board: makeBoard(),
        }],
      })
    })

    await waitFor(() => {
      expect(screen.getByText('YOU ROTATE')).toBeInTheDocument()
    })

    socket.emit.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })

    expect(socket.emit).not.toHaveBeenCalledWith(
      'movePiece',
      { roomId: '1', action: 'left' }
    )
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'rotate' })
  })

  it('plays winner and loser sounds on multiplayer game over', async () => {
    const { rerender } = render(
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

    await act(async () => {
      getSocketHandler('gameOver')?.({ winner: 'Titi' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('game-over-state')).toHaveTextContent('"isGameOver":true')
    })
    expect(audioInstances.at(-2).play).toHaveBeenCalled()

    rerender(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={2}
        username="Titi"
        isMultiplayer
        soundEnabled
        onSoundChange={vi.fn()}
      />
    )

    await act(async () => {
      getSocketHandler('gameOver')?.({ winner: 'Riri' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('game-over-state')).toHaveTextContent('"winner":"Riri"')
    })
    expect(audioInstances.at(-1).play).toHaveBeenCalled()
  })

  it('switches eliminated multiplayer players into spectator view', async () => {
    const onSpectate = vi.fn()

    render(
      <Game
        theme="light"
        onBack={vi.fn()}
        onSpectate={onSpectate}
        roomId={1}
        username="Titi"
        isMultiplayer
        soundEnabled
        onSoundChange={vi.fn()}
      />
    )

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: makeBoard(),
          isAlive: false,
        }, {
          username: 'Riri',
          board: makeBoard(),
        }],
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /spectate/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /spectate/i }))

    expect(onSpectate).toHaveBeenCalled()
    expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
  })
})
