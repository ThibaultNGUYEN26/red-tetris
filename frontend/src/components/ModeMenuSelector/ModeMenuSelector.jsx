import './ModeMenuSelector.css'
import { useState } from 'react'
import Options from './Options.jsx/Options.jsx'
import Shop from '../Shop/Shop.jsx'
import { DEFAULT_LANGUAGE, getTranslation } from '../../i18n'

function ModeMenuSelector({
  theme,
  onThemeChange,
  onShowRooms,
  onShowSoloRoom,
  soundEnabled,
  onSoundChange,
  musicEnabled = soundEnabled,
  onMusicChange,
  selectedLanguage = DEFAULT_LANGUAGE,
  onLanguageChange,
  skin = 'classic',
  onSkinChange,
  bg = 'default',
  onBgChange,
  coins = 0,
  ownedSkins = ['classic'],
  onSkinBuy,
}) {
  const [showOptions, setShowOptions] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const text = getTranslation(selectedLanguage).menu

  const handleSolo = () => {
    onShowSoloRoom?.(true)
  }

  const handleMultiplayer = () => {
    onShowRooms(true)
  }

  return (
    <>
      <div className={`mode-card ${theme === 'dark' ? 'dark' : ''}`}>
        <h2>{text.heading}</h2>

        <div className="mode-buttons">
          <button
            className="mode-button"
            onClick={handleSolo}
          >
            <span className="mode-title">{text.soloTitle}</span>
            <span className="mode-description">{text.soloDescription}</span>
          </button>

          <button
            className="mode-button"
            onClick={handleMultiplayer}
          >
            <span className="mode-title">{text.multiplayerTitle}</span>
            <span className="mode-description">{text.multiplayerDescription}</span>
          </button>
        </div>

        <div className="mode-secondary-buttons">
          <button
            className="shop-button"
            onClick={() => setShowShop(true)}
          >
            {text.shop}
          </button>

          <button
            className="options-button"
            onClick={() => setShowOptions(true)}
          >
            {text.options}
          </button>
        </div>
      </div>

      {showOptions && (
        <Options
          onBack={() => setShowOptions(false)}
          theme={theme}
          onThemeChange={onThemeChange}
          soundEnabled={soundEnabled}
          onSoundChange={onSoundChange}
          musicEnabled={musicEnabled}
          onMusicChange={onMusicChange}
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
        />
      )}

      {showShop && (
        <Shop
          onBack={() => setShowShop(false)}
          theme={theme}
          selectedLanguage={selectedLanguage}
          skin={skin}
          onSkinChange={onSkinChange}
          bg={bg}
          onBgChange={onBgChange}
          coins={coins}
          ownedSkins={ownedSkins}
          onBuy={onSkinBuy}
        />
      )}
    </>
  )
}

export default ModeMenuSelector
