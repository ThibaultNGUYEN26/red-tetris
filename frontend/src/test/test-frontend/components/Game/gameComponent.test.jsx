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

const makeBoardWithCells = (cells, height = 20, width = 10) => {
  const board = makeBoard(height, width)
  cells.forEach(([row, col, cell]) => {
    board[row][col] = cell
  })
  return board
}

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

  it('resumes and leaves a local game from the pause overlay', async () => {
    const onBack = vi.fn()

    render(
      <Game
        theme="light"
        onBack={onBack}
        username="Titi"
        isMultiplayer={false}
        soundEnabled={false}
        onSoundChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /options/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Paused')

    fireEvent.click(screen.getByRole('button', { name: /resume/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /options/i }))
    fireEvent.click(screen.getByRole('button', { name: /leave game/i }))

    expect(onBack).toHaveBeenCalled()
  })

  it('blocks keyboard moves without room context and while paused', async () => {
    const { rerender } = render(
      <Game
        theme="light"
        onBack={vi.fn()}
        username="Titi"
        isMultiplayer={false}
        soundEnabled
        onSoundChange={vi.fn()}
      />
    )

    socket.emit.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(socket.emit).not.toHaveBeenCalledWith('movePiece', expect.any(Object))

    rerender(
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

    fireEvent.keyDown(window, { key: 'Escape' })
    socket.emit.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(socket.emit).not.toHaveBeenCalledWith('movePiece', expect.any(Object))
  })

  it('infers multiplayer from a room id and supports giant board sizing', async () => {
    render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        soundEnabled
        onSoundChange={vi.fn()}
      />
    )

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'giant',
        players: [{
          username: 'Titi',
          board: makeBoard(30, 15),
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    await waitFor(() => {
      expect(document.querySelectorAll('.game-board .cell')).toHaveLength(450)
    })
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
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyUp(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyUp(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: 'Enter' })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'left' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'right' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'drop' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'rotate' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'hardDrop' })
  })

  it('predicts local movement immediately and reconciles with server state', async () => {
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

    const boardLocked = makeBoard()
    const authoritativeBoard = makeBoardWithCells([
      [1, 3, 'i'],
      [1, 4, 'i'],
      [1, 5, 'i'],
      [1, 6, 'i'],
      [19, 3, 'ghost'],
      [19, 4, 'ghost'],
      [19, 5, 'ghost'],
      [19, 6, 'ghost'],
    ])

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: authoritativeBoard,
          boardLocked,
          currentPiece: { type: 'i', rotation: 0, x: 3, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    const cells = () => screen.getByRole('grid', { name: /tetris board/i }).querySelectorAll('.cell')

    expect(cells()[12]).toHaveClass('cell-empty')
    expect(cells()[13]).toHaveClass('cell-i')
    expect(cells()[16]).toHaveClass('cell-i')

    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'left' })
    expect(cells()[12]).toHaveClass('cell-i')
    expect(cells()[16]).not.toHaveClass('cell-i')

    await act(async () => {
      getSocketHandler('playerState')?.({
        roomId: '1',
        mode: 'classic',
        player: {
          username: 'Titi',
          board: authoritativeBoard,
          boardLocked,
          currentPiece: { type: 'i', rotation: 0, x: 3, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
        },
      })
    })

    expect(cells()[12]).toHaveClass('cell-empty')
    expect(cells()[13]).toHaveClass('cell-i')
    expect(cells()[16]).toHaveClass('cell-i')
  })

  it('predicts local rotation immediately from authoritative piece data', async () => {
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

    const boardLocked = makeBoard()
    const authoritativeBoard = makeBoardWithCells([
      [0, 4, 't'],
      [1, 3, 't'],
      [1, 4, 't'],
      [1, 5, 't'],
    ])

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: authoritativeBoard,
          boardLocked,
          currentPiece: { type: 't', rotation: 0, x: 3, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    const cells = () => screen.getByRole('grid', { name: /tetris board/i }).querySelectorAll('.cell')

    expect(cells()[13]).toHaveClass('cell-t')
    expect(cells()[24]).toHaveClass('cell-empty')

    fireEvent.keyDown(window, { key: 'ArrowUp' })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'rotate' })
    expect(cells()[13]).toHaveClass('cell-empty')
    expect(cells()[24]).toHaveClass('cell-t')
  })

  it('predicts i-piece rotation with the i kick table', async () => {
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
          board: makeBoardWithCells([
            [1, 3, 'i'],
            [1, 4, 'i'],
            [1, 5, 'i'],
            [1, 6, 'i'],
          ]),
          boardLocked: makeBoard(),
          currentPiece: { type: 'i', rotation: 0, x: 3, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    const cells = () => screen.getByRole('grid', { name: /tetris board/i }).querySelectorAll('.cell')

    fireEvent.keyDown(window, { key: 'ArrowUp' })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'rotate' })
    expect(cells()[5]).toHaveClass('cell-i')
    expect(cells()[35]).toHaveClass('cell-i')
  })

  it('tries later rotation kicks when the first predicted kick is blocked', async () => {
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

    const boardLocked = makeBoardWithCells([[2, 4, 'z']])

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: makeBoardWithCells([
            [0, 4, 't'],
            [1, 3, 't'],
            [1, 4, 't'],
            [1, 5, 't'],
            [2, 4, 'z'],
          ]),
          boardLocked,
          currentPiece: { type: 't', rotation: 0, x: 3, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    const cells = () => screen.getByRole('grid', { name: /tetris board/i }).querySelectorAll('.cell')

    fireEvent.keyDown(window, { key: 'ArrowUp' })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'rotate' })
    expect(cells()[24]).toHaveClass('cell-z')
    expect(cells()[3]).toHaveClass('cell-t')
    expect(cells()[23]).toHaveClass('cell-t')
  })

  it('predicts local hard drops without making the client authoritative', async () => {
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

    const boardLocked = makeBoard()
    const authoritativeBoard = makeBoardWithCells([
      [1, 3, 'i'],
      [1, 4, 'i'],
      [1, 5, 'i'],
      [1, 6, 'i'],
      [19, 3, 'ghost'],
      [19, 4, 'ghost'],
      [19, 5, 'ghost'],
      [19, 6, 'ghost'],
    ])

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: authoritativeBoard,
          boardLocked,
          currentPiece: { type: 'i', rotation: 0, x: 3, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    const cells = () => screen.getByRole('grid', { name: /tetris board/i }).querySelectorAll('.cell')

    expect(cells()[13]).toHaveClass('cell-i')
    expect(cells()[193]).toHaveClass('cell-ghost')

    fireEvent.keyDown(window, { key: ' ' })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'hardDrop' })
    expect(cells()[13]).toHaveClass('cell-empty')
    expect(cells()[193]).toHaveClass('cell-i')

    await act(async () => {
      getSocketHandler('playerState')?.({
        roomId: '1',
        mode: 'classic',
        player: {
          username: 'Titi',
          board: authoritativeBoard,
          boardLocked,
          currentPiece: { type: 'i', rotation: 0, x: 3, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
        },
      })
    })

    expect(cells()[13]).toHaveClass('cell-i')
    expect(cells()[193]).toHaveClass('cell-ghost')
  })

  it('predicts right movement, soft drop, and o-piece rotation', async () => {
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
          board: makeBoardWithCells([
            [0, 1, 'o'],
            [0, 2, 'o'],
            [1, 1, 'o'],
            [1, 2, 'o'],
          ]),
          boardLocked: makeBoard(),
          currentPiece: { type: 'o', rotation: 0, x: 0, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    const cells = () => screen.getByRole('grid', { name: /tetris board/i }).querySelectorAll('.cell')

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(cells()[1]).toHaveClass('cell-empty')
    expect(cells()[3]).toHaveClass('cell-o')

    fireEvent.keyUp(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(cells()[3]).toHaveClass('cell-empty')
    expect(cells()[13]).toHaveClass('cell-o')

    fireEvent.keyUp(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'rotate' })
    expect(cells()[13]).toHaveClass('cell-o')
  })

  it('keeps the predicted piece in place when a local move is blocked', async () => {
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
          board: makeBoardWithCells([
            [1, 6, 'i'],
            [1, 7, 'i'],
            [1, 8, 'i'],
            [1, 9, 'i'],
          ]),
          boardLocked: makeBoard(),
          currentPiece: { type: 'i', rotation: 0, x: 6, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    const cells = () => screen.getByRole('grid', { name: /tetris board/i }).querySelectorAll('.cell')

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'right' })
    expect(cells()[16]).toHaveClass('cell-i')
    expect(cells()[19]).toHaveClass('cell-i')
  })

  it('predicts movement while part of the piece is above the visible board', async () => {
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
          board: makeBoardWithCells([
            [0, 3, 't'],
            [0, 4, 't'],
            [0, 5, 't'],
          ]),
          boardLocked: makeBoard(),
          currentPiece: { type: 't', rotation: 0, x: 3, y: -1 },
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    const cells = () => screen.getByRole('grid', { name: /tetris board/i }).querySelectorAll('.cell')

    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'left' })
    expect(cells()[2]).toHaveClass('cell-t')
    expect(cells()[5]).toHaveClass('cell-empty')
  })

  it('does not reveal the active piece when predicting invisible mode input', async () => {
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
        mode: 'invisible',
        players: [{
          username: 'Titi',
          board: makeBoardWithCells([
            [19, 3, 'ghost'],
            [19, 4, 'ghost'],
            [19, 5, 'ghost'],
            [19, 6, 'ghost'],
          ]),
          boardLocked: makeBoard(),
          currentPiece: { type: 'i', rotation: 0, x: 3, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(document.querySelectorAll('.game-board .cell-i')).toHaveLength(0)
    expect(document.querySelectorAll('.game-board .cell-ghost')).toHaveLength(4)
  })

  it('auto repeats horizontal moves and soft drops until key release', async () => {
    vi.useFakeTimers()
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
          score: 0,
          lines: 0,
          level: 1,
        }],
      })
    })

    socket.emit.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'right' })

    fireEvent.keyUp(window, { key: 'ArrowRight' })
    socket.emit.mockClear()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(80)
    })

    expect(socket.emit).not.toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'left' })

    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(70)
    })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'drop' })

    fireEvent.keyUp(window, { key: 'ArrowDown' })
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

  it('predicts visible piece movement from the latest authoritative backend view', async () => {
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
    expect(cells[3]).toHaveClass('cell-t')
    expect(cells[4]).toHaveClass('cell-empty')
    expect(cells[12]).toHaveClass('cell-t')
    expect(cells[15]).toHaveClass('cell-empty')
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
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyUp(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyUp(window, { key: ' ' })
    fireEvent.keyDown(window, { key: 'Enter', repeat: true })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'right' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'left' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'hardDrop' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'drop' })

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toHaveTextContent('Game Menu')
    fireEvent.click(screen.getByRole('button', { name: /resume/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

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

  it('blocks place-role rotation and out-of-turn cooperative moves', async () => {
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
      getSocketHandler('gameState')?.({
        mode: 'cooperative_roles',
        players: [{
          username: 'Titi',
          cooperativeRole: 'place',
          board: makeBoard(),
        }],
      })
    })

    await waitFor(() => {
      expect(screen.getByText('YOU PLACE')).toBeInTheDocument()
    })

    socket.emit.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(socket.emit).not.toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'rotate' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'left' })

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
      getSocketHandler('gameState')?.({
        mode: 'cooperative',
        currentTurnUsername: 'Riri',
        players: [{
          username: 'Titi',
          board: makeBoard(),
        }, {
          username: 'Riri',
          board: makeBoard(),
        }],
      })
    })

    socket.emit.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(socket.emit).not.toHaveBeenCalledWith('movePiece', { roomId: '2', action: 'left' })
  })

  it('renders solo state without opponent boards', async () => {
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

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: makeBoard(),
        }, {
          username: 'Riri',
          board: makeBoard(),
        }],
      })
    })

    expect(screen.getByTestId('shadow-boards')).toBeInTheDocument()
  })

  it('shows cooperative status fallbacks', async () => {
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
      getSocketHandler('gameState')?.({
        mode: 'cooperative',
        players: [{
          username: 'Titi',
          board: makeBoard(),
        }],
      })
    })

    expect(screen.getByText('Playing: ...')).toBeInTheDocument()

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'cooperative',
        currentTurnUsername: 'Titi',
        players: [{
          username: 'Titi',
          board: makeBoard(),
        }],
      })
    })

    expect(screen.getByText('YOUR TURN')).toBeInTheDocument()

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
      getSocketHandler('gameState')?.({
        mode: 'cooperative_roles',
        players: [{
          username: 'Titi',
          board: makeBoard(),
        }],
      })
    })

    expect(screen.getByText('ASSIGNING ROLE...')).toBeInTheDocument()
  })

  it('marks the player eliminated from playerState updates', async () => {
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
        mode: null,
        player: {
          username: 'Titi',
          board: makeBoard(),
          isAlive: false,
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('game-over-state')).toHaveTextContent('"isEliminated":true')
    })
  })

  it('uses fallback boards for playerState payloads without a board', async () => {
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

    await act(async () => {
      getSocketHandler('playerState')?.({
        roomId: '1',
        mode: 'classic',
        player: {
          username: 'Titi',
          isAlive: false,
        },
      })
    })

    expect(document.querySelectorAll('.game-board .cell')).toHaveLength(200)
  })

  it('ignores stale socket events while leaving or for other rooms', async () => {
    socket.emit.mockImplementation((event, _payload, callback) => {
      if (event === 'playerLeave') callback?.()
    })

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
      getSocketHandler('roomState')?.({ id: 99, game_mode: 'giant' })
      getSocketHandler('playerState')?.({
        roomId: '99',
        mode: 'classic',
        player: { username: 'Titi', board: makeBoard() },
      })
      getSocketHandler('playerState')?.({
        roomId: '1',
        mode: 'classic',
        player: { username: 'Riri', board: makeBoard() },
      })
      getSocketHandler('gameState')?.(null)
    })

    expect(document.querySelectorAll('.game-board .cell')).toHaveLength(200)

    fireEvent.click(screen.getByRole('button', { name: /options/i }))
    fireEvent.click(screen.getByRole('button', { name: /leave game/i }))

    await act(async () => {
      getSocketHandler('roomState')?.({ id: 1, game_mode: 'giant' })
      getSocketHandler('gameStarted')?.()
      getSocketHandler('gameState')?.({
        mode: 'giant',
        players: [{ username: 'Titi', board: makeBoard(30, 15) }],
      })
      getSocketHandler('playerState')?.({
        roomId: '1',
        mode: 'giant',
        player: { username: 'Titi', board: makeBoard(30, 15) },
      })
      getSocketHandler('gameOver')?.({ winner: 'Riri' })
    })

    expect(document.querySelectorAll('.game-board .cell')).toHaveLength(200)

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
  })

  it('plays clear sound when the board becomes empty after containing blocks', async () => {
    const filledBoard = makeBoard()
    filledBoard[19][0] = 'i'

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
          board: filledBoard,
        }],
      })
    })

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: makeBoard(),
        }],
      })
    })

    expect(audioInstances[4].play).toHaveBeenCalled()
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

  it('handles game over without a winner', async () => {
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
      getSocketHandler('gameOver')?.({})
    })

    expect(screen.getByTestId('game-over-state')).toHaveTextContent('"winner":null')
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

  it('renders eliminated spectator view with dark theme', async () => {
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

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: makeBoard(),
          isAlive: false,
        }],
      })
    })

    fireEvent.click(screen.getByRole('button', { name: /spectate/i }))

    expect(container.querySelector('.game-screen.dark')).toBeTruthy()
    expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
  })
})
