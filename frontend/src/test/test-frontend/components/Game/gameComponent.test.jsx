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
          Regarder
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
    vi.unstubAllGlobals()
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
    expect(screen.getByLabelText(/keyboard controls/i)).toHaveTextContent('Left / Right arrow')
    expect(screen.getByLabelText(/keyboard controls/i)).toHaveTextContent('Space')
    expect(screen.getByLabelText(/keyboard controls/i)).toHaveTextContent('Hard drop')
  })

  it('renders French in-game labels when French is selected', () => {
    render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer={false}
        soundEnabled
        onSoundChange={vi.fn()}
        language="fr"
      />
    )

    expect(screen.getByRole('grid', { name: /plateau de tetris/i })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: /pièce suivante/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /paramètres/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/contrôles au clavier/i)).toHaveTextContent('Chute instantanée')
  })

  it('falls back to English in-game labels when the language is unsupported', () => {
    render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer={false}
        soundEnabled
        onSoundChange={vi.fn()}
        language="zz"
      />
    )

    expect(screen.getByRole('grid', { name: /tetris board/i })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: /next piece/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/keyboard controls/i)).toHaveTextContent('Hard drop')
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

    fireEvent.click(screen.getByRole('button', { name: /sound: enabled/i }))
    expect(onSoundChange).toHaveBeenCalledWith(false)

    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /leave game/i })).toBeInTheDocument()
  })

  it('resumes and leaves a local game from the pause overlay', async () => {
    vi.useFakeTimers()
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
    expect(screen.getByRole('dialog')).toHaveTextContent('Pause')

    fireEvent.click(screen.getByRole('button', { name: /resume/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/game countdown/i)).toHaveTextContent('3')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3200)
    })

    fireEvent.click(screen.getByRole('button', { name: /options/i }))
    fireEvent.click(screen.getByRole('button', { name: /leave game/i }))

    expect(onBack).toHaveBeenCalled()
  })

  it('shows a start countdown and blocks input until it ends', async () => {
    vi.useFakeTimers()

    render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer
        soundEnabled={false}
        onSoundChange={vi.fn()}
      />
    )

    await act(async () => {
      getSocketHandler('gameStarted')?.({ roomId: '1', countdownMs: 3200 })
    })

    expect(screen.getByLabelText(/game countdown/i)).toHaveTextContent('3')

    socket.emit.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(socket.emit).not.toHaveBeenCalledWith('movePiece', expect.any(Object))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2400)
    })

    expect(screen.getByLabelText(/game countdown/i)).toHaveTextContent('Go')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })

    expect(screen.queryByLabelText(/game countdown/i)).not.toBeInTheDocument()
  })

  it('finishes a countdown whose step interval was already cleared', async () => {
    vi.useFakeTimers()
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue(0)

    render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer
        soundEnabled={false}
        onSoundChange={vi.fn()}
      />
    )

    await act(async () => {
      getSocketHandler('gameStarted')?.({ roomId: '1', countdownMs: 1 })
    })

    expect(screen.getByLabelText(/game countdown/i)).toHaveTextContent('3')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(screen.queryByLabelText(/game countdown/i)).not.toBeInTheDocument()
    expect(setIntervalSpy).toHaveBeenCalled()
  })

  it('clears countdown timers on unmount', async () => {
    vi.useFakeTimers()

    const { unmount } = render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer
        soundEnabled={false}
        onSoundChange={vi.fn()}
      />
    )

    await act(async () => {
      getSocketHandler('gameStarted')?.({ roomId: '1', countdownMs: 3200 })
    })

    expect(screen.getByLabelText(/game countdown/i)).toHaveTextContent('3')

    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3200)
    })

    expect(socket.off).toHaveBeenCalledWith('gameStarted', expect.any(Function))
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
      expect(screen.getByText('ROTATION')).toBeInTheDocument()
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
          holdType: 'o',
        }, {
          username: 'Riri',
          boardLocked: makeBoard(20, 10, 'z'),
        }],
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/1\D?234/)).toBeInTheDocument()
      expect(screen.getByRole('grid', { name: /next piece/i }).querySelectorAll('.cell-t')).toHaveLength(4)
      expect(screen.getByRole('grid', { name: /held piece/i }).querySelectorAll('.cell-o')).toHaveLength(4)
    })

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyUp(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyUp(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyUp(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: 'c' })
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: 'Enter' })

    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'left' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'right' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'drop' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'rotate' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'hold' })
    expect(socket.emit).toHaveBeenCalledWith('movePiece', { roomId: '1', action: 'hardDrop' })
  })

  it('keeps the board server-authoritative after local input', async () => {
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
    expect(cells()[12]).toHaveClass('cell-empty')
    expect(cells()[13]).toHaveClass('cell-i')
    expect(cells()[16]).toHaveClass('cell-i')

    await act(async () => {
      getSocketHandler('playerState')?.({
        roomId: '1',
        mode: 'classic',
        player: {
          username: 'Titi',
          board: makeBoardWithCells([
            [1, 2, 'i'],
            [1, 3, 'i'],
            [1, 4, 'i'],
            [1, 5, 'i'],
          ]),
          boardLocked,
          currentPiece: { type: 'i', rotation: 0, x: 2, y: 0 },
          score: 0,
          lines: 0,
          level: 1,
        },
      })
    })

    expect(cells()[12]).toHaveClass('cell-i')
    expect(cells()[16]).toHaveClass('cell-empty')
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

  it('scales held movement repeat speed with the current level', async () => {
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
          lines: 90,
          level: 10,
        }],
      })
    })

    socket.emit.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120)
    })

    expect(
      socket.emit.mock.calls.filter(
        ([event, payload]) =>
          event === 'movePiece' && payload?.roomId === '1' && payload?.action === 'left'
      )
    ).toHaveLength(2)

    fireEvent.keyUp(window, { key: 'ArrowLeft' })
    socket.emit.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowDown' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(40)
    })

    expect(
      socket.emit.mock.calls.filter(
        ([event, payload]) =>
          event === 'movePiece' && payload?.roomId === '1' && payload?.action === 'drop'
      )
    ).toHaveLength(2)

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

  it('does not move the visible piece until backend state updates', async () => {
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
    expect(cells[4]).toHaveClass('cell-t')
    expect(cells[3]).toHaveClass('cell-empty')
    expect(cells[13]).toHaveClass('cell-t')
    expect(cells[15]).toHaveClass('cell-t')
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
    expect(screen.getByRole('dialog')).toHaveTextContent('Game menu')
    fireEvent.click(screen.getByRole('button', { name: /resume/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /options/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Game menu')

    fireEvent.click(screen.getByRole('button', { name: /sound: disabled/i }))
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
      expect(screen.getByText('ROTATION')).toBeInTheDocument()
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
      expect(screen.getByText('PLACEMENT')).toBeInTheDocument()
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

  it('highlights the board on level up, tetris, and full board clear', async () => {
    const filledBoard = makeBoard()
    filledBoard[19][0] = 'i'

    render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer
        soundEnabled={false}
        onSoundChange={vi.fn()}
      />
    )

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: filledBoard,
          score: 100,
          lines: 0,
          level: 2,
        }],
      })
    })

    const boardElement = screen.getByRole('grid', { name: /tetris board/i })

    await waitFor(() => {
      expect(boardElement).toHaveClass('board-flash-level')
    })

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: filledBoard,
          score: 500,
          lines: 4,
          level: 2,
        }],
      })
    })

    await waitFor(() => {
      expect(boardElement).toHaveClass('board-flash-tetris')
    })

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: makeBoard(),
          score: 800,
          lines: 4,
          level: 2,
        }],
      })
    })

    await waitFor(() => {
      expect(boardElement).toHaveClass('board-flash-clear')
    })
  })

  it('clears pending board highlights when the animation ends or a new game starts', async () => {
    vi.useFakeTimers()
    const requestAnimationFrameMock = vi.fn((callback) => setTimeout(callback, 16))
    const cancelAnimationFrameMock = vi.fn((timerId) => clearTimeout(timerId))

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock)
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock)

    render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer
        soundEnabled={false}
        onSoundChange={vi.fn()}
      />
    )

    const boardElement = screen.getByRole('grid', { name: /tetris board/i })

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: makeBoard(),
          level: 2,
        }],
      })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })

    expect(boardElement).toHaveClass('board-flash-level')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(boardElement).not.toHaveClass('board-flash')

    requestAnimationFrameMock.mockClear()
    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: makeBoard(),
          level: 3,
        }],
      })
    })

    await act(async () => {})
    expect(requestAnimationFrameMock).toHaveBeenCalled()

    await act(async () => {
      getSocketHandler('gameStarted')?.()
    })

    expect(cancelAnimationFrameMock).toHaveBeenCalled()

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: makeBoard(),
          level: 4,
        }],
      })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })

    expect(boardElement).toHaveClass('board-flash-level')

    await act(async () => {
      getSocketHandler('gameStarted')?.()
    })

    expect(boardElement).not.toHaveClass('board-flash')
  })

  it('cancels a pending board flash animation frame on unmount', async () => {
    vi.useFakeTimers()
    const requestAnimationFrameMock = vi.fn(() => 123)
    const cancelAnimationFrameMock = vi.fn()

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock)
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock)

    const { unmount } = render(
      <Game
        theme="light"
        onBack={vi.fn()}
        roomId={1}
        username="Titi"
        isMultiplayer
        soundEnabled={false}
        onSoundChange={vi.fn()}
      />
    )

    await act(async () => {
      getSocketHandler('gameState')?.({
        mode: 'classic',
        players: [{
          username: 'Titi',
          board: makeBoard(),
          level: 2,
        }],
      })
    })

    expect(requestAnimationFrameMock).toHaveBeenCalled()

    unmount()

    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(123)
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
      expect(screen.getByRole('button', { name: /regarder/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /regarder/i }))

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

    fireEvent.click(screen.getByRole('button', { name: /regarder/i }))

    expect(container.querySelector('.game-screen.dark')).toBeTruthy()
    expect(screen.getByTestId('spectator-view')).toBeInTheDocument()
  })
})
