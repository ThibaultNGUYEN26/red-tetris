import './UsernameMenu.css'
import { useState, useEffect, useRef } from 'react'

function UsernameMenu({ onSubmit, theme }) {
  const [username, setUsername] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    // Auto focus on the input when component mounts
    inputRef.current?.focus()
  }, [])

  const handleUsernameChange = (e) => {
    const value = e.target.value
    if (value.length <= 15) {
      setUsername(value)
    }
  }

  const handleSubmit = () => {
    if (username.trim().length > 0) {
      console.log('Username submitted:', username)
      onSubmit(username)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && username.trim().length > 0) {
      handleSubmit()
    }
  }

  return (
    <div className={`username-card ${theme === 'dark' ? 'dark' : ''}`}>
      <h2>Enter Your Username</h2>
      <input
        ref={inputRef}
        type="text"
        value={username}
        onChange={handleUsernameChange}
        onKeyPress={handleKeyPress}
        placeholder="Username"
        maxLength={15}
        className="username-input"
      />
      <p className="character-count">{username.length}/15</p>
      <button 
        className="submit-button"
        onClick={handleSubmit}
        disabled={username.trim().length === 0}
      >
        Let's Play!
      </button>
    </div>
  )
}

export default UsernameMenu
