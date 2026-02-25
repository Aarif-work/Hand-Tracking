import React, { useState } from 'react'
import HandTracker from './components/HandTracker'
import GestureTetris from './components/GestureTetris'

function App() {
  const [view, setView] = useState('tetris')

  return (
    <div className="App">
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={() => setView('tracker')}
          style={buttonStyle(view === 'tracker')}
        >
          Presence Tracker
        </button>
        <button
          onClick={() => setView('tetris')}
          style={buttonStyle(view === 'tetris')}
        >
          Gesture Tetris
        </button>
      </div>

      {view === 'tracker' ? <HandTracker /> : <GestureTetris />}
    </div>
  )
}

const buttonStyle = (isActive) => ({
  padding: '10px 20px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.4)',
  color: 'white',
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  fontSize: '0.8rem',
  fontWeight: '600',
  transition: 'all 0.3s ease',
  boxShadow: isActive ? '0 10px 20px rgba(0,0,0,0.2)' : 'none',
  letterSpacing: '1px',
  textTransform: 'uppercase'
})

export default App
