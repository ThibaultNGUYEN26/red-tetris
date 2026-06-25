import './ShadowBoards.css'

function ShadowBoards({ boards, title = 'Opponents', boardLabel = 'board', showColors = false }) {
  if (!boards || boards.length === 0) return null

  const getSpectrumMap = (board) => {
    const rows = board.length
    const cols = board[0]?.length ?? 0
    const topByCol = Array.from({ length: cols }, () => null)

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const cell = board[r]?.[c]
        if (cell && cell !== 'empty') {
          topByCol[c] = r
          break
        }
      }
    }

    return board.map((row, r) =>
      row.map((_, c) => topByCol[c] !== null && r >= topByCol[c])
    )
  }

  return (
    <div className="shadow-boards">
      <h3>{title}</h3>
      <div className={`shadow-boards-grid count-${boards.length}`}>
        {boards.map((entry) => {
          const board = Array.isArray(entry.board) ? entry.board : []
          const spectrum = showColors ? null : getSpectrumMap(board)
          const rows = board.length
          const cols = board[0]?.length ?? 0
          const cellSize = rows > 20 || cols > 10 ? 4 : 9
          return (
            <div key={entry.username} className="shadow-board-card">
              <div className="shadow-board-name">{entry.username}</div>
              <div
                className="shadow-board-grid-inner"
                role="grid"
                aria-label={`${entry.username} ${boardLabel}`}
                style={{
                  gridTemplateColumns: `repeat(${cols}, var(--cell-size))`,
                  gridTemplateRows: `repeat(${rows}, var(--cell-size))`,
                  ['--shadow-cell-size']: `${cellSize}px`,
                }}
              >
                {board.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const cls = showColors
                      ? `cell cell-${cell}`
                      : `cell ${spectrum[rowIndex]?.[colIndex] ? 'cell-spectrum' : 'cell-empty'}`
                    return (
                      <div
                        key={`${entry.username}-${rowIndex}-${colIndex}`}
                        className={cls}
                      />
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ShadowBoards
