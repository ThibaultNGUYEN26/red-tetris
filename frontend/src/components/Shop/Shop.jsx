import './Shop.css'
import { useState } from 'react'
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

const SKIN_PACKS = [
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
    colors: { I: '#00ffff', O: '#ddb800', T: '#ff00ff', S: '#39ff14', Z: '#ff073a', J: '#0d5eff', L: '#ff8c00' },
    bevel: false,
    neon: true,
    available: true,
  },
  {
    id: 'pastel',
    colors: { I: '#8ddcf5', O: '#fbd882', T: '#c99ef7', S: '#8fe08f', Z: '#f79090', J: '#96b4fa', L: '#ffc080' },
    bevel: false,
    available: true,
  },
  {
    id: 'ocean',
    colors: { I: '#38c5e8', O: '#2196b8', T: '#0d7fa0', S: '#3db8c8', Z: '#1a9ebf', J: '#0e6b94', L: '#4dd4e8' },
    bevel: false,
    available: true,
  },
  {
    id: 'fire',
    colors: { I: '#ffcc00', O: '#ff8800', T: '#ff3d00', S: '#ffaa00', Z: '#ff5500', J: '#cc1a00', L: '#ff6600' },
    bevel: false,
    available: true,
  },
]

function TetrominoBlock({ color, size, bevel, neon }) {
  const b = bevel ? Math.max(2, Math.floor(size / 4)) : 0
  return (
    <div
      style={{
        width: size,
        height: size,
        background: neon ? `${color}26` : color,
        outline: neon ? `2px solid ${color}` : 'none',
        outlineOffset: neon ? '-2px' : '0',
        boxShadow: neon
          ? 'none'
          : bevel
            ? `inset ${b}px ${b}px 0 rgba(255,255,255,0.55), inset -${b}px -${b}px 0 rgba(0,0,0,0.5)`
            : `inset 0 0 6px rgba(255,255,255,0.5)`,
      }}
    />
  )
}

function TetrominoShape({ piece, color, size = 10, bevel = false, neon = false }) {
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
            {cell ? <TetrominoBlock color={color} size={size} bevel={bevel} neon={neon} /> : null}
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
          <TetrominoShape piece={piece} color={pack.colors[piece]} size={size} bevel={pack.bevel} neon={pack.neon} />
        </div>
      ))}
    </div>
  )
}

function SkinPreviewPanel({ pack, text, theme, isEquipped, onEquip, onClose }) {
  return (
    <div className={`shop-preview-panel ${theme === 'dark' ? 'dark' : ''}`} aria-label={text.preview ?? 'Skin preview'}>
      <button className="shop-preview-close" onClick={onClose} aria-label="Close preview">×</button>
      <p className="shop-preview-pack-name">{text[`pack_${pack.id}`] ?? pack.id}</p>
      <div className="shop-preview-pieces">
        {PIECES.map((piece) => (
          <div key={piece} className="shop-preview-piece-row">
            <TetrominoShape piece={piece} color={pack.colors[piece]} size={18} bevel={pack.bevel} neon={pack.neon} />
          </div>
        ))}
      </div>
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

function PackCard({ pack, text, theme, isEquipped, isSelected, onEquip, onSelect, labelKey }) {
  return (
    <div
      className={`shop-pack-card ${theme === 'dark' ? 'dark' : ''}${isEquipped ? ' equipped' : ''}${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(pack.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(pack.id)}
      aria-pressed={isSelected}
    >
      <span className="shop-pack-name">{text[labelKey ?? `pack_${pack.id}`] ?? pack.id}</span>
      <PackPreview pack={pack} />
      {pack.available ? (
        <button
          className={`shop-equip-button${isEquipped ? ' equipped' : ''}`}
          onClick={(e) => { e.stopPropagation(); !isEquipped && onEquip(pack.id) }}
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
  const [previewId, setPreviewId] = useState(null)
  const [previewSection, setPreviewSection] = useState(null)

  const previewPack = previewSection === 'skin'
    ? SKIN_PACKS.find((p) => p.id === previewId)
    : null

  const hasPreview = Boolean(previewPack)

  const handleSelectSkin = (id) => {
    if (previewSection === 'skin' && previewId === id) {
      setPreviewId(null)
      setPreviewSection(null)
    } else {
      setPreviewId(id)
      setPreviewSection('skin')
    }
  }

  const handleClosePrev = () => {
    setPreviewId(null)
    setPreviewSection(null)
  }

  return (
    <>
      <div className="shop-overlay" onClick={onBack} />
      <div
        className={`shop-modal ${theme === 'dark' ? 'dark' : ''}${hasPreview ? ' has-preview' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-title"
      >
        <div className="shop-modal-header">
          <p className="shop-kicker">{text.kicker}</p>
          <h2 id="shop-title">{text.heading}</h2>
        </div>

        <div className={`shop-body${hasPreview ? ' with-preview' : ''}`}>
          <div className="shop-content">

            <div className="shop-section">
              <p className="shop-section-label">{text.sectionTetrominoes ?? 'Tetrominoes'}</p>
              <div className="shop-packs-grid">
                {SKIN_PACKS.map((pack) => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    text={text}
                    theme={theme}
                    isEquipped={skin === pack.id}
                    isSelected={previewSection === 'skin' && previewId === pack.id}
                    onEquip={onSkinChange}
                    onSelect={handleSelectSkin}
                  />
                ))}
              </div>
            </div>

          </div>

          {previewPack && (
            <SkinPreviewPanel
              pack={previewPack}
              text={text}
              theme={theme}
              isEquipped={skin === previewPack.id}
              onEquip={onSkinChange}
              onClose={handleClosePrev}
            />
          )}
        </div>

        <button className="shop-back-button" type="button" onClick={onBack}>
          {text.back}
        </button>
      </div>
    </>
  )
}

export default Shop
