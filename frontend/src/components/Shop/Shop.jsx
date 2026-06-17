import './Shop.css'
import { DEFAULT_LANGUAGE, getTranslation } from '../../i18n'

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
}

const PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

const PACKS = [
  {
    id: 'classic',
    colors: { I: '#4dd7ff', O: '#ffd24d', T: '#b66bff', S: '#57d98c', Z: '#ff6b6b', J: '#6fa8ff', L: '#ffb347' },
    bevel: false,
    available: true,
  },
  {
    id: 'retro',
    colors: { I: '#00b7ff', O: '#ffdd00', T: '#aa00ff', S: '#00cc44', Z: '#ff2200', J: '#0044ff', L: '#ff8800' },
    bevel: true,
    available: true,
  },
  {
    id: 'neon',
    colors: { I: '#00ffff', O: '#ffff00', T: '#ff00ff', S: '#39ff14', Z: '#ff073a', J: '#0d5eff', L: '#ff8c00' },
    bevel: false,
    available: false,
  },
  {
    id: 'pastel',
    colors: { I: '#b2edf7', O: '#fde8b0', T: '#dbbfff', S: '#c4f0c4', Z: '#ffc4c4', J: '#c4d4ff', L: '#ffdcb4' },
    bevel: false,
    available: false,
  },
  {
    id: 'ocean',
    colors: { I: '#a8d8ea', O: '#54b3d6', T: '#2a9fc0', S: '#0a8ca8', Z: '#7ec8e3', J: '#006994', L: '#4dd0e1' },
    bevel: false,
    available: false,
  },
  {
    id: 'fire',
    colors: { I: '#ffbb00', O: '#ff7700', T: '#ff3300', S: '#ff9000', Z: '#ff5500', J: '#cc0000', L: '#ff2200' },
    bevel: false,
    available: false,
  },
]

function TetrominoBlock({ color, size, bevel }) {
  const b = bevel ? Math.max(2, Math.floor(size / 4)) : 0
  return (
    <div
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: bevel
          ? `inset ${b}px ${b}px 0 rgba(255,255,255,0.55), inset -${b}px -${b}px 0 rgba(0,0,0,0.5)`
          : `inset 0 0 6px rgba(255,255,255,0.5)`,
      }}
    />
  )
}

function TetrominoShape({ piece, color, size = 10, bevel = false }) {
  const shape = SHAPES[piece]
  const cols = shape[0].length
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gridTemplateRows: `repeat(${shape.length}, ${size}px)`,
        gap: '1px',
      }}
    >
      {shape.flatMap((row, r) =>
        row.map((cell, c) => (
          <div key={`${r}-${c}`} style={{ width: size, height: size }}>
            {cell ? <TetrominoBlock color={color} size={size} bevel={bevel} /> : null}
          </div>
        ))
      )}
    </div>
  )
}

function PackPreview({ pack, size = 9 }) {
  return (
    <div className="shop-pack-preview">
      {PIECES.map((piece) => (
        <div key={piece} className="shop-pack-preview-piece">
          <TetrominoShape piece={piece} color={pack.colors[piece]} size={size} bevel={pack.bevel} />
        </div>
      ))}
    </div>
  )
}

function PackCard({ pack, text, theme, isEquipped, onEquip }) {
  return (
    <div className={`shop-pack-card ${theme === 'dark' ? 'dark' : ''}${isEquipped ? ' equipped' : ''}`}>
      <span className="shop-pack-name">{text[`pack_${pack.id}`] ?? pack.id}</span>
      <PackPreview pack={pack} />
      {pack.available ? (
        <button
          className={`shop-equip-button${isEquipped ? ' equipped' : ''}`}
          onClick={() => !isEquipped && onEquip(pack.id)}
          disabled={isEquipped}
        >
          {isEquipped ? text.equipped : text.equip}
        </button>
      ) : (
        <span className="shop-coming-soon">{text.comingSoon}</span>
      )}
    </div>
  )
}

function Shop({ onBack, theme, selectedLanguage = DEFAULT_LANGUAGE, skin = 'classic', onSkinChange }) {
  const text = getTranslation(selectedLanguage).shop

  return (
    <>
      <div className="shop-overlay" onClick={onBack} />
      <div
        className={`shop-modal ${theme === 'dark' ? 'dark' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-title"
      >
        <div className="shop-modal-header">
          <p className="shop-kicker">{text.kicker}</p>
          <h2 id="shop-title">{text.heading}</h2>
        </div>

        <div className="shop-content">
          <div className="shop-packs-grid">
            {PACKS.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                text={text}
                theme={theme}
                isEquipped={skin === pack.id}
                onEquip={onSkinChange}
              />
            ))}
          </div>
        </div>

        <button className="shop-back-button" type="button" onClick={onBack}>
          {text.back}
        </button>
      </div>
    </>
  )
}

export default Shop
