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
  { id: 'classic', price: 0,     available: true },
  { id: 'plain',   price: 250,   available: true },
  { id: 'retro',   price: 500,   available: true },
  { id: 'pastel',  price: 1250,  available: true },
  { id: 'bubble',  price: 1750,  available: true },
  { id: 'ocean',   price: 2500,  available: true },
  { id: 'neon',    price: 5000,  available: true },
  { id: 'fire',    price: 10000, available: true },
  { id: 'arcane',  price: 20000, available: true },
]

function TetrominoShape({ piece, size = 10, skinId = 'classic' }) {
  const shape = SHAPES[piece]
  const cols = shape[0].length
  return (
    <div className={`game-screen skin-${skinId}`} style={{ display: 'contents' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${size}px)`,
          gridTemplateRows: `repeat(${shape.length}, ${size}px)`,
          gap: '1px',
          '--cell-size': `${size}px`,
        }}
      >
        {shape.flatMap((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} style={{ width: size, height: size }}>
              {cell ? <div className={`cell cell-${piece.toLowerCase()}`} style={{ width: size, height: size }} /> : null}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function PackPreview({ pack, size = 9 }) {
  return (
    <div className="shop-pack-preview">
      {PIECES.map((piece) => (
        <div key={piece} className="shop-pack-preview-piece">
          <TetrominoShape piece={piece} size={size} skinId={pack.id} />
        </div>
      ))}
    </div>
  )
}

function SkinPreviewPanel({ pack, text, theme, isOwned, isEquipped, canAfford, onEquip, onBuy, onClose }) {
  const [buying, setBuying] = useState(false)

  const handleBuy = async () => {
    if (buying) return
    setBuying(true)
    await onBuy(pack.id)
    setBuying(false)
  }

  return (
    <div className={`shop-preview-panel ${theme === 'dark' ? 'dark' : ''}`} aria-label={text.preview ?? 'Skin preview'}>
      <button className="shop-preview-close" onClick={onClose} aria-label="Close preview">×</button>
      <p className="shop-preview-pack-name">{text[`pack_${pack.id}`] ?? pack.id}</p>
      <div className="shop-preview-pieces">
        {PIECES.map((piece) => (
          <div key={piece} className="shop-preview-piece-row">
            <TetrominoShape piece={piece} size={18} skinId={pack.id} />
          </div>
        ))}
      </div>
      {pack.available ? (
        isOwned ? (
          <button
            className={`shop-equip-button${isEquipped ? ' equipped' : ''}`}
            onClick={() => !isEquipped && onEquip(pack.id)}
            disabled={isEquipped}
          >
            {isEquipped ? text.equipped : text.equip}
          </button>
        ) : (
          <button
            className={`shop-equip-button shop-buy-button${!canAfford ? ' cannot-afford' : ''}`}
            onClick={handleBuy}
            disabled={!canAfford || buying}
          >
            🪙 {pack.price.toLocaleString()}
          </button>
        )
      ) : (
        <span className="shop-coming-soon">{text.comingSoon}</span>
      )}
    </div>
  )
}

function PackCard({ pack, text, theme, isOwned, isEquipped, canAfford, onEquip, onBuy, onSelect, isSelected }) {
  const [buying, setBuying] = useState(false)

  const handleBuy = async (e) => {
    e.stopPropagation()
    if (buying) return
    setBuying(true)
    await onBuy(pack.id)
    setBuying(false)
  }

  return (
    <div
      className={`shop-pack-card ${theme === 'dark' ? 'dark' : ''}${isEquipped ? ' equipped' : ''}${isSelected ? ' selected' : ''}${!isOwned && pack.price > 0 ? ' locked' : ''}`}
      onClick={() => onSelect(pack.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(pack.id)}
      aria-pressed={isSelected}
    >
      <span className="shop-pack-name">{text[`pack_${pack.id}`] ?? pack.id}</span>
      <PackPreview pack={pack} />
      {pack.available ? (
        isOwned ? (
          <button
            className={`shop-equip-button${isEquipped ? ' equipped' : ''}`}
            onClick={(e) => { e.stopPropagation(); !isEquipped && onEquip(pack.id) }}
            disabled={isEquipped}
          >
            {isEquipped ? text.equipped : text.equip}
          </button>
        ) : (
          <button
            className={`shop-equip-button shop-buy-button${!canAfford ? ' cannot-afford' : ''}`}
            onClick={handleBuy}
            disabled={!canAfford || buying}
          >
            🪙 {pack.price.toLocaleString()}
          </button>
        )
      ) : (
        <span className="shop-coming-soon">{text.comingSoon}</span>
      )}
    </div>
  )
}

function Shop({ onBack, theme, selectedLanguage = DEFAULT_LANGUAGE, skin = 'classic', onSkinChange, coins = 0, ownedSkins = ['classic'], onBuy }) {
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
          <span className="shop-coins-balance">🪙 {coins.toLocaleString()}</span>
        </div>

        <div className={`shop-body${hasPreview ? ' with-preview' : ''}`}>
          <div className="shop-content">
            <div className="shop-section">
              <p className="shop-section-label">{text.sectionTetrominoes}</p>
              <div className="shop-packs-grid">
                {SKIN_PACKS.map((pack) => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    text={text}
                    theme={theme}
                    isOwned={ownedSkins.includes(pack.id)}
                    isEquipped={skin === pack.id}
                    canAfford={coins >= pack.price}
                    onEquip={onSkinChange}
                    onBuy={onBuy}
                    onSelect={handleSelectSkin}
                    isSelected={previewSection === 'skin' && previewId === pack.id}
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
              isOwned={ownedSkins.includes(previewPack.id)}
              isEquipped={skin === previewPack.id}
              canAfford={coins >= previewPack.price}
              onEquip={onSkinChange}
              onBuy={onBuy}
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
