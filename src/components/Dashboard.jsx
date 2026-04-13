import React from 'react';

const Dashboard = ({ onStartTetris, onStartTracker, onShowPrivacy }) => {
    return (
        <div className="dashboard-container" style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '4rem 2rem',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '4rem',
            position: 'relative',
            zIndex: 1
        }}>
            {/* Hero Section */}
            <section className="animate-fade-in" style={{ textAlign: 'center', paddingTop: '2rem' }}>
                <h1 className="gradient-text" style={{
                    fontSize: '3.5rem',
                    fontWeight: 800,
                    marginBottom: '1rem',
                    lineHeight: 1.1,
                    letterSpacing: '-1.5px'
                }}>
                    Motion Puzzle
                </h1>
                <p style={{
                    fontSize: '1.05rem',
                    color: 'var(--text-dim)',
                    maxWidth: '450px',
                    margin: '0 auto 2.5rem auto',
                    lineHeight: 1.5,
                    fontWeight: 500
                }}>
                    A hands-free assembly experience.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                    <button
                        onClick={onStartTetris}
                        style={{
                            width: '100%',
                            maxWidth: '280px',
                            padding: '1.25rem',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: 'white',
                            cursor: 'pointer',
                            background: 'var(--primary)',
                            border: 'none',
                            borderRadius: '16px',
                            boxShadow: '0 6px 0 #d94a4e',
                            transition: 'all 0.1s'
                        }}
                    >
                        Start Game
                    </button>

                    <button
                        onClick={onStartTracker}
                        style={{
                            width: '100%',
                            maxWidth: '280px',
                            padding: '1.1rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'var(--text)',
                            background: 'white',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '16px',
                            cursor: 'pointer'
                        }}
                    >
                        Test Camera
                    </button>
                </div>
            </section>

            {/* Guide Section */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '3rem',
                marginTop: '2rem'
            }}>
                <div style={{
                    background: 'var(--surface)',
                    padding: '3rem',
                    borderRadius: '32px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
                }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--primary)' }}>👌</span> Assembly Directives
                    </h2>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <GestureItem icon="🤏" action="Pinch" description="Join thumb & index over piece" />
                        <GestureItem icon="🖱️" action="Drag" description="Move hand while pinched" />
                        <GestureItem icon="✋" action="Release" description="Open fingers to drop" />
                        <GestureItem icon="✨" action="Win" description="Fill the grid to complete" />
                    </ul>
                </div>

                <div style={{
                    background: 'var(--surface)',
                    padding: '3rem',
                    borderRadius: '32px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
                }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--secondary)' }}>🔧</span> Capture Protocol
                    </h2>
                    <div style={{ color: 'var(--text-dim)', lineHeight: 1.8 }}>
                        <p style={{ marginBottom: '1.5rem', fontWeight: 500 }}>Operational environment standards:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={stepStyle}><span>1</span> Clear framing & light</div>
                            <div style={stepStyle}><span>2</span> Static background</div>
                            <div style={stepStyle}><span>3</span> 1-2m from camera</div>
                            <div style={stepStyle}><span>4</span> Use Input Test to verify</div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Footer with Privacy Link */}
            <footer style={{
                marginTop: 'auto',
                textAlign: 'center',
                padding: '2rem 0',
                borderTop: '1px solid #e2e8f0',
                color: 'var(--text-dim)',
                fontSize: '0.9rem'
            }}>
                <div style={{ marginBottom: '0.75rem' }}>
                    Developed by <a href="https://aarif-work.github.io/html/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Mohamed Aarif</a>
                </div>
                <div style={{ marginBottom: '1rem', opacity: 0.8 }}>© 2026 Motion Puzzle Studio. Built for privacy.</div>
                <button
                    onClick={onShowPrivacy}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        fontSize: '0.8rem'
                    }}
                >
                    Privacy Policy
                </button>
            </footer>
        </div>
    );
};


const stepStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: 'white',
    padding: '0.75rem 1.25rem',
    borderRadius: '12px',
    fontSize: '0.95rem',
    border: '1px solid #e2e8f0',
    color: 'var(--text)'
};


const GestureItem = ({ icon, action, description }) => (
    <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{action}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>{description}</div>
        </div>
    </li>
);

export default Dashboard;

