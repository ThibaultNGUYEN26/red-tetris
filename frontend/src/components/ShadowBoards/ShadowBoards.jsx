import './ShadowBoards.css'

function ShadowBoards({ boards = [] }) {
  if (!boards.length) return null

  return (
    <div className="shadow-boards">
      <h3>Opponents</h3>
      <div className="shadow-boards-grid">
        {boards.map((entry) => (
          <div key={entry.username} className="shadow-board-card">
            <div className="shadow-board-name">{entry.username}</div>
            <div
              className="shadow-board-grid-inner"
              role="grid"
              aria-label={`${entry.username} board`}
            >
              {entry.board.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`${entry.username}-${rowIndex}-${colIndex}`}
                    className={`cell cell-${cell}`}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ShadowBoards
