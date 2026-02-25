import React, { useState } from 'react'
import HandTracker from './components/HandTracker'
import GestureDragDrop from './components/GestureDragDrop'

function App() {
  const [view, setView] = useState('gestures') // Defaulting to gestures for the new feature

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
          onClick={() => setView('gestures')}
          style={buttonStyle(view === 'gestures')}
        >
          Gesture Drag & Drop
        </button>
      </div>

      {view === 'tracker' ? <HandTracker /> : <GestureDragDrop />}
    </div>
  )
}

const buttonStyle = (isActive) => ({
  padding: '10px 20px',
  borderRadius: '12px',
  border: 'none',
  backgroundColor: isActive ? '#3498db' : 'rgba(255, 255, 255, 0.1)',
  color: 'white',
  cursor: 'pointer',
  backdropFilter: 'blur(5px)',
  fontSize: '0.9rem',
  fontWeight: '600',
  transition: 'all 0.3s ease',
  boxShadow: isActive ? '0 5px 15px rgba(52, 152, 219, 0.4)' : 'none'
})

export default App
