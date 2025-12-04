import './ModeMenuSelector.css'

function ModeMenuSelector() {
  const handleSolo = () => {
    console.log('Solo mode selected')
    // Add your solo game logic here
  }

  const handleMultiplayer = () => {
    console.log('Multiplayer mode selected')
    // Add your multiplayer logic here
  }

  const handleOptions = () => {
    console.log('Options clicked')
    // Add your options logic here
  }

  return (
    <div className="mode-card">
      <h2>Select Game Mode</h2>
      
      <div className="mode-buttons">
        <button 
          className="mode-button"
          onClick={handleSolo}
        >
          <span className="mode-icon">👤</span>
          <span className="mode-title">Solo</span>
          <span className="mode-description">Play alone and beat your high score</span>
        </button>
        
        <button 
          className="mode-button"
          onClick={handleMultiplayer}
        >
          <span className="mode-icon">👥</span>
          <span className="mode-title">Multiplayer</span>
          <span className="mode-description">Compete with other players</span>
        </button>
      </div>

      <button 
        className="options-button"
        onClick={handleOptions}
      >
        ⚙️ Options
      </button>
    </div>
  )
}

export default ModeMenuSelector