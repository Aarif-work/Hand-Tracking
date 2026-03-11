import React, { useState } from 'react'
import HandTracker from './components/HandTracker'
import GestureTetris from './components/GestureTetris'
import GestureInstaFeed from './components/GestureInstaFeed'
import GestureReelsTouchSnap from './components/GestureReelsTouchSnap'

function App() {
  const [view, setView] = useState('reels') // Start with the new Reels view

  const views = ['tracker', 'tetris', 'insta', 'reels']

  const handleNavigate = (direction) => {
    const currentIndex = views.indexOf(view)
    if (direction === 'next') {
      const nextIndex = (currentIndex + 1) % views.length
      setView(views[nextIndex])
    } else {
      const prevIndex = (currentIndex - 1 + views.length) % views.length
      setView(views[prevIndex])
    }
  }

  return (
    <div className="App" style={{ background: '#000', minHeight: '100vh', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={() => setView('tracker')}
          style={buttonStyle(view === 'tracker')}
        >
          Tracker
        </button>
        <button
          onClick={() => setView('tetris')}
          style={buttonStyle(view === 'tetris')}
        >
          Tetris
        </button>
        <button
          onClick={() => setView('insta')}
          style={buttonStyle(view === 'insta')}
        >
          Feed
        </button>
        <button
          onClick={() => setView('reels')}
          style={buttonStyle(view === 'reels')}
        >
          Reels
        </button>
      </div>

      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        {view === 'tracker' && <HandTracker />}
        {view === 'tetris' && <GestureTetris />}
        {view === 'insta' && <GestureInstaFeed onNavigate={handleNavigate} />}
        {view === 'reels' && <GestureReelsTouchSnap onNavigate={handleNavigate} />}
      </div>
    </div>
  )
}

const buttonStyle = (isActive) => ({
  padding: '8px 16px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.5)' : 'rgba(0, 0, 0, 0.4)',
  color: 'white',
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  fontSize: '0.75rem',
  fontWeight: '600',
  transition: 'all 0.3s ease',
  boxShadow: isActive ? '0 0 20px rgba(59, 130, 246, 0.3)' : 'none',
  letterSpacing: '1px',
  textTransform: 'uppercase'
})

export default App
