import React, { useState } from 'react'
import HandTracker from './components/HandTracker'
import GestureTetris from './components/GestureTetris'
import Dashboard from './components/Dashboard'
import PrivacyPolicy from './components/PrivacyPolicy'

function App() {
  const [view, setView] = useState('dashboard')

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard
            onStartTetris={() => setView('tetris')}
            onStartTracker={() => setView('tracker')}
            onShowPrivacy={() => setView('privacy')}
          />
        )
      case 'tetris':
        return <GestureTetris />
      case 'tracker':
        return <HandTracker />
      case 'privacy':
        return <PrivacyPolicy />
      default:
        return <Dashboard
          onStartTetris={() => setView('tetris')}
          onStartTracker={() => setView('tracker')}
          onShowPrivacy={() => setView('privacy')}
        />
    }
  }

  return (
    <div className="App" style={{
      background: 'var(--background)',
      minHeight: '100vh',
      overflowX: 'hidden',
      color: 'var(--text)'
    }}>
      {/* Navigation Layer */}
      {view !== 'dashboard' && (
        <button
          onClick={() => setView('dashboard')}
          className="animate-fade-in responsive-home-btn"
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 3000,
            padding: '0.6rem 1.2rem',
            color: 'var(--text)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'white',
            boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'var(--text)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <img src="/icon-192.png" alt="logo" style={{ width: '22px', height: '22px', borderRadius: '6px' }} />
          <span className="home-btn-text">Back to Home</span>
        </button>
      )}

      {renderView()}

      {/* Global Background Elements */}
      <div style={{
        position: 'fixed',
        top: '-10%',
        right: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(255, 90, 95, 0.05) 0%, transparent 70%)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-10%',
        left: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(255, 180, 0, 0.05) 0%, transparent 70%)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />
    </div>
  )
}

export default App

