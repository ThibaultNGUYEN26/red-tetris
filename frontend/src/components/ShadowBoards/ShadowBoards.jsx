import './ShadowBoards.css'
import { useEffect, useRef, useState } from 'react'
import { socket } from '../../socket'

function ShadowBoards({ board, isMultiplayer, roomId, username }) {
  const [boards, setBoards] = useState([])
  const lastBoardSentRef = useRef(0)

  useEffect(() => {
    if (!isMultiplayer) return

    const handlePlayerBoard = ({ username: playerName, board: remoteBoard }) => {
      if (!playerName || playerName === username) return
      if (!Array.isArray(remoteBoard)) return
      setBoards((prev) => {
        const exists = prev.find((entry) => entry.username === playerName)
        if (exists) {
          return prev.map((entry) =>
            entry.username === playerName ? { username: playerName, board: remoteBoard } : entry
          )
        }
        return [...prev, { username: playerName, board: remoteBoard }]
      })
    }

    socket.on('playerBoard', handlePlayerBoard)
    return () => {
      socket.off('playerBoard', handlePlayerBoard)
    }
  }, [isMultiplayer, username])

  useEffect(() => {
    if (!isMultiplayer || !roomId || !username) return
    if (!Array.isArray(board)) return
    const now = Date.now()
    if (now - lastBoardSentRef.current < 120) return
    lastBoardSentRef.current = now
    socket.emit('playerBoard', { roomId: String(roomId), username, board })
  }, [board, isMultiplayer, roomId, username])

  if (!isMultiplayer) return null
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
