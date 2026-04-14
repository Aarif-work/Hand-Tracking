import React, { useEffect, useState } from 'react';
import { getTopScores } from '../services/leaderboard';

const Leaderboard = () => {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchScores = async () => {
            const topScores = await getTopScores();
            setScores(topScores);
            setLoading(false);
        };
        fetchScores();
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                Loading champions...
            </div>
        );
    }

    return (
        <div className="leaderboard" style={{
            background: 'white',
            borderRadius: '28px',
            padding: '1.5rem',
            boxShadow: '0 15px 50px rgba(0,0,0,0.06)',
            border: '1.5px solid #f1f5f9',
            width: '100%',
            maxWidth: '420px',
            margin: '0 auto',
            fontFamily: '"Outfit", sans-serif'
        }}>
            <h3 style={{
                fontSize: '1.6rem',
                fontWeight: 900,
                marginBottom: '2rem',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                color: '#1e293b'
            }}>
                <span style={{ fontSize: '1.8rem' }}>💎</span> Global Top 10
            </h3>

            {scores.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>No records yet. Be the first!</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {scores.map((score, index) => {
                        const isTop3 = index < 3;
                        const rankColors = ['#fbbf24', '#94a3b8', '#b45309'];
                        const rankBg = isTop3 ? '#fff7ed' : '#f8fafc';
                        const rankBorder = isTop3 ? '#ffedd5' : '#f1f5f9';

                        return (
                            <div key={score.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.8rem 1rem',
                                background: rankBg,
                                borderRadius: '16px',
                                border: `1.5px solid ${rankBorder}`,
                                transition: 'transform 0.2s ease',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                    <span style={{
                                        minWidth: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%',
                                        background: isTop3 ? rankColors[index] : '#e2e8f0',
                                        color: 'white',
                                        fontSize: '0.9rem',
                                        fontWeight: 800,
                                        boxShadow: isTop3 ? `0 4px 10px ${rankColors[index]}44` : 'none'
                                    }}>
                                        {index + 1}
                                    </span>
                                    <span style={{
                                        fontWeight: 700,
                                        color: '#1e293b',
                                        fontSize: '1.05rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {score.name}
                                    </span>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: '6px',
                                    flexShrink: 0
                                }}>
                                    <span style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 900,
                                        color: '#ff5a5f'
                                    }}>
                                        {score.time}
                                    </span>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        textTransform: 'lowercase'
                                    }}>
                                        seconds
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
