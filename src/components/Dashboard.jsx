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
            <section className="animate-fade-in" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h1 className="gradient-text" style={{
                    fontSize: '4.5rem',
                    fontWeight: 800,
                    marginBottom: '1.5rem',
                    lineHeight: 1.1,
                    letterSpacing: '-2px'
                }}>
                    Motion Puzzle Studio
                </h1>
                <p style={{
                    fontSize: '1.2rem',
                    color: 'var(--text-dim)',
                    maxWidth: '600px',
                    margin: '0 auto 3.5rem auto',
                    lineHeight: 1.6,
                    fontWeight: 500
                }}>
                    Precision assembly at your fingertips. Grab the custom-engineered pieces and snap them into the master grid using natural hand gestures.
                </p>

                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                    <button
                        onClick={onStartTetris}
                        style={{
                            padding: '1.25rem 3.5rem',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: 'white',
                            cursor: 'pointer',
                            background: 'var(--primary)',
                            border: 'none',
                            borderRadius: '16px',
                            boxShadow: '0 8px 0 #d94a4e',
                            transition: 'all 0.1s',
                            transform: 'translateY(0)'
                        }}
                        onMouseDown={(e) => {
                            e.currentTarget.style.transform = 'translateY(4px)';
                            e.currentTarget.style.boxShadow = '0 4px 0 #d94a4e';
                        }}
                        onMouseUp={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 8px 0 #d94a4e';
                        }}
                    >
                        Enter Studio
                    </button>

                    <button
                        onClick={onStartTracker}
                        style={{
                            padding: '1.25rem 3.5rem',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: 'var(--text)',
                            cursor: 'pointer',
                            background: 'white',
                            border: '2px solid #e2e8f0',
                            borderRadius: '16px',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--text)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        }}
                    >
                        Direct Input Test
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
                        <GestureItem icon="🤏" action="Pinch to Grab" description="Join thumb & index finger over a puzzle piece" />
                        <GestureItem icon="🖱️" action="Drag & Position" description="Keep fingers pinched to move the object across the area" />
                        <GestureItem icon="✋" action="Release & Snap" description="Open your fingers over the target zone to lock it in" />
                        <GestureItem icon="✨" action="Puzzle Complete" description="Assemble all core pieces to finish the sequence" />
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
                            <div style={stepStyle}><span>1</span> Distinct finger visibility</div>
                            <div style={stepStyle}><span>2</span> Fluid hand movement ranges</div>
                            <div style={stepStyle}><span>3</span> Optimal sensor proximity (1-2m)</div>
                            <div style={stepStyle}><span>4</span> Real-time latency checks via Input Test</div>
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
            <div style={{ fontWeight: 700, color: 'white' }}>{action}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>{description}</div>
        </div>
    </li>
);

export default Dashboard;

