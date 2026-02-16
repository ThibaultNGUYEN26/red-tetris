import './ShadowBoards.css'

function ShadowBoards({ boards = [] }) {
  if (!boards.length) return null

  const getSpectrumMap = (board) => {
    const rows = board?.length ?? 0
    const cols = board?.[0]?.length ?? 0
    const topByCol = Array.from({ length: cols }, () => null)

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const cell = board[r]?.[c]
        if (cell && cell !== 'empty' && cell !== 'ghost') {
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
      <h3>Opponents</h3>
      <div className={`shadow-boards-grid count-${boards.length}`}>
        {boards.map((entry) => {
          const spectrum = getSpectrumMap(entry.board)
          return (
          <div key={entry.username} className="shadow-board-card">
            <div className="shadow-board-name">{entry.username}</div>
            <div
              className="shadow-board-grid-inner"
              role="grid"
              aria-label={`${entry.username} board`}
            >
              {entry.board.map((row, rowIndex) =>
                row.map((_, colIndex) => {
                  const isSpectrum = spectrum[rowIndex]?.[colIndex]
                  return (
                    <div
                      key={`${entry.username}-${rowIndex}-${colIndex}`}
                      className={`cell ${isSpectrum ? 'cell-spectrum' : 'cell-empty'}`}
                    />
                  )
                })
              )}
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}

export default ShadowBoards
