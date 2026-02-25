import React, { useRef, useEffect, useState } from 'react';

const HomeBuilder = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [modelLoaded, setModelLoaded] = useState(false);

    // Constants for Stability
    const GRAB_START = 0.08;
    const GRAB_END = 0.12;
    const FRAME_HOLD_THRESHOLD = 3;
    const SMOOTHING = 0.8;

    // Assets Configuration
    const ASSETS = [
        { type: 'wall', color: '#ecf0f1', width: 200, height: 160, icon: '🧱', label: 'Wall Structure' },
        { type: 'roof', color: '#e74c3c', width: 220, height: 100, icon: '🏠', label: 'Main Roof' },
        { type: 'door', color: '#d35400', width: 60, height: 100, icon: '🚪', label: 'Wooden Door' },
        { type: 'window', color: '#3498db', width: 60, height: 60, icon: '🪟', label: 'Office Window' },
        { type: 'tree', color: '#27ae60', width: 100, height: 150, icon: '🌳', label: 'Garden Tree' },
        { type: 'sun', color: '#f1c40f', width: 80, height: 80, icon: '☀️', label: 'Bright Sun' },
    ];

    // State Refs
    const stateRef = useRef({
        isPinched: false,
        activeObjectId: null,
        dragOffset: { x: 0, y: 0 },
        grabFrameCount: 0,
        releaseFrameCount: 0,
        smoothedX: 0,
        smoothedY: 0,
        hoveredId: null,
        nextId: 10 // Starting ID for placed objects
    });

    // Objects in the scene
    const objectsRef = useRef([
        { id: 1, type: 'wall', x: 100, y: 500, color: '#ecf0f1', width: 140, height: 120, label: 'Wall', icon: '🧱' },
        { id: 2, type: 'roof', x: 260, y: 500, color: '#e74c3c', width: 140, height: 80, label: 'Roof', icon: '🏠' },
        { id: 3, type: 'door', x: 420, y: 500, color: '#d35400', width: 60, height: 100, label: 'Door', icon: '🚪' },
        { id: 4, type: 'window', x: 500, y: 500, color: '#3498db', width: 60, height: 60, label: 'Window', icon: '🪟' },
        { id: 5, type: 'tree', x: 580, y: 500, color: '#27ae60', width: 100, height: 140, label: 'Tree', icon: '🌳' },
        { id: 6, type: 'sun', x: 700, y: 500, color: '#f1c40f', width: 80, height: 80, label: 'Sun', icon: '☀️' },
    ]);

    useEffect(() => {
        if (!window.Hands || !window.Camera) return;

        const hands = new window.Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.8,
            minTrackingConfidence: 0.8
        });

        hands.onResults((results) => {
            if (!canvasRef.current || !videoRef.current) return;

            const canvasCtx = canvasRef.current.getContext('2d');
            const { width: W, height: H } = canvasRef.current;
            const state = stateRef.current;

            canvasCtx.clearRect(0, 0, W, H);

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                const thumb = landmarks[4];
                const index = landmarks[8];

                const distance = Math.sqrt(
                    Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2)
                );

                const targetX = (1 - index.x) * W;
                const targetY = index.y * H;

                state.smoothedX = state.smoothedX + (targetX - state.smoothedX) * (1 - SMOOTHING);
                state.smoothedY = state.smoothedY + (targetY - state.smoothedY) * (1 - SMOOTHING);

                const curX = state.smoothedX;
                const curY = state.smoothedY;

                // 2. Pinch Logic
                if (distance < GRAB_START) {
                    state.releaseFrameCount = 0;
                    if (!state.isPinched) {
                        state.grabFrameCount++;
                        if (state.grabFrameCount >= FRAME_HOLD_THRESHOLD) {
                            const obj = [...objectsRef.current].reverse().find(o =>
                                curX >= o.x && curX <= o.x + o.width &&
                                curY >= o.y && curY <= o.y + o.height
                            );
                            if (obj) {
                                state.isPinched = true;
                                state.activeObjectId = obj.id;
                                state.dragOffset = { x: curX - obj.x, y: curY - obj.y };
                                const indicator = document.getElementById('status-indicator');
                                if (indicator) indicator.style.backgroundColor = '#2ecc71';
                                const statusText = document.getElementById('status-text');
                                if (statusText) statusText.innerText = `PLACING ${obj.type.toUpperCase()}`;
                            }
                        }
                    }
                } else if (distance > GRAB_END) {
                    state.grabFrameCount = 0;
                    if (state.isPinched) {
                        state.releaseFrameCount++;
                        if (state.releaseFrameCount >= FRAME_HOLD_THRESHOLD) {
                            const el = document.getElementById(`draggable-obj-${state.activeObjectId}`);
                            if (el) {
                                const obj = objectsRef.current.find(o => o.id === state.activeObjectId);
                                el.style.transform = `translate(${obj.x}px, ${obj.y}px) scale(1)`;
                                el.style.zIndex = '10';
                                el.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
                            }
                            state.isPinched = false;
                            state.activeObjectId = null;
                            const indicator = document.getElementById('status-indicator');
                            if (indicator) indicator.style.backgroundColor = '#ff4757';
                            const statusText = document.getElementById('status-text');
                            if (statusText) statusText.innerText = 'READY TO BUILD';
                        }
                    }
                }

                // 3. Hover Detection
                if (!state.isPinched) {
                    const obj = [...objectsRef.current].reverse().find(o =>
                        curX >= o.x && curX <= o.x + o.width &&
                        curY >= o.y && curY <= o.y + o.height
                    );
                    const newHoveredId = obj ? obj.id : null;
                    if (newHoveredId !== state.hoveredId) {
                        if (state.hoveredId) {
                            const prevEl = document.getElementById(`draggable-obj-${state.hoveredId}`);
                            if (prevEl) {
                                prevEl.style.borderColor = 'rgba(255,255,255,0.2)';
                                prevEl.style.transform = `translate(${objectsRef.current.find(o => o.id === state.hoveredId).x}px, ${objectsRef.current.find(o => o.id === state.hoveredId).y}px) scale(1)`;
                            }
                        }
                        state.hoveredId = newHoveredId;
                        if (newHoveredId) {
                            const nextEl = document.getElementById(`draggable-obj-${newHoveredId}`);
                            if (nextEl) {
                                nextEl.style.borderColor = 'rgba(255,255,255,0.8)';
                                nextEl.style.transform = `translate(${objectsRef.current.find(o => o.id === newHoveredId).x}px, ${objectsRef.current.find(o => o.id === newHoveredId).y}px) scale(1.05)`;
                            }
                        }
                    }
                }

                // 4. Drag Update
                if (state.isPinched && state.activeObjectId) {
                    const obj = objectsRef.current.find(o => o.id === state.activeObjectId);
                    obj.x = curX - state.dragOffset.x;
                    obj.y = curY - state.dragOffset.y;

                    const el = document.getElementById(`draggable-obj-${obj.id}`);
                    if (el) {
                        el.style.transform = `translate(${obj.x}px, ${obj.y}px) scale(1.1)`;
                        el.style.zIndex = '100';
                        el.style.boxShadow = '0 30px 60px rgba(0,0,0,0.5)';
                    }
                }

                // 5. Visual Feedback - Mirrored Skeleton
                const connections = window.HAND_CONNECTIONS || (window.Hands && window.Hands.HAND_CONNECTIONS);
                if (window.drawConnectors && connections) {
                    canvasCtx.save();
                    canvasCtx.translate(W, 0);
                    canvasCtx.scale(-1, 1);
                    window.drawConnectors(canvasCtx, landmarks, connections, { color: 'rgba(255,255,255,0.2)', lineWidth: 2 });
                    canvasCtx.restore();
                }

                landmarks.forEach((pt, i) => {
                    const pxX = (1 - pt.x) * W;
                    const pxY = pt.y * H;
                    canvasCtx.beginPath();
                    canvasCtx.arc(pxX, pxY, (i === 4 || i === 8) ? 6 : 2, 0, 2 * Math.PI);
                    canvasCtx.fillStyle = (i === 4 || i === 8) ? '#2ecc71' : '#ff4757';
                    canvasCtx.fill();
                });

                // Precision Cursor
                canvasCtx.beginPath();
                canvasCtx.arc(curX, curY, 20, 0, 2 * Math.PI);
                canvasCtx.strokeStyle = state.isPinched ? '#2ecc71' : 'rgba(255,255,255,0.3)';
                canvasCtx.lineWidth = 2;
                canvasCtx.stroke();
            }
        });

        const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
                await hands.send({ image: videoRef.current });
            },
            width: 1280,
            height: 720
        });

        camera.start().then(() => setModelLoaded(true));

        return () => {
            hands.close();
            camera.stop();
        };
    }, []);

    return (
        <div ref={containerRef} style={{
            width: '100vw', height: '100vh', backgroundColor: '#0f172a',
            position: 'relative', overflow: 'hidden', fontFamily: '"Outfit", sans-serif'
        }}>
            {/* Background Map / Foundation */}
            <div style={{
                position: 'absolute', bottom: 0, width: '100%', height: '40vh',
                background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
                borderTop: '2px solid rgba(255,255,255,0.05)',
                zIndex: 1
            }} />

            {/* Mirrored Camera View */}
            <video ref={videoRef} style={{
                position: 'absolute', width: '100%', height: '100%',
                objectFit: 'cover', transform: 'scaleX(-1)', opacity: 0.15,
                zIndex: 0
            }} />

            {/* Gesture Landmarks Canvas */}
            <canvas ref={canvasRef} style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none'
            }} width={1280} height={720} />

            {/* UI Header */}
            <div style={{
                position: 'absolute', top: '30px', left: '40px', zIndex: 20, color: 'white'
            }}>
                <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-1px' }}>
                    Home <span style={{ color: '#3b82f6' }}>Builder</span> AI
                </h1>
                <p style={{ opacity: 0.5, fontSize: '1rem' }}>Architectural Gesture Control Workspace</p>
            </div>

            {/* Build Objects Layer */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
                {objectsRef.current.map(obj => (
                    <div
                        key={obj.id}
                        id={`draggable-obj-${obj.id}`}
                        style={{
                            position: 'absolute', width: obj.width, height: obj.height,
                            backgroundColor: obj.color, borderRadius: obj.type === 'sun' || obj.type === 'tree' ? '50%' : '12px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', color: '#1e293b', fontWeight: '800',
                            fontSize: '0.9rem', boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                            transform: `translate(${obj.x}px, ${obj.y}px)`,
                            zIndex: 10, border: '3px solid rgba(255,255,255,0.1)',
                            textAlign: 'center', transition: 'border-color 0.2s, scale 0.2s',
                            clipPath: obj.type === 'roof' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none'
                        }}
                    >
                        <div style={{ fontSize: '1.8rem' }}>{obj.icon}</div>
                        {obj.type !== 'roof' && obj.type !== 'sun' && <span>{obj.label}</span>}
                    </div>
                ))}
            </div>

            {/* Inventory / Tutorial Sidebar */}
            <div style={{
                position: 'absolute', right: '40px', top: '100px', width: '260px',
                background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
                borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', zIndex: 20
            }}>
                <h2 style={{ fontSize: '1.1rem', margin: '0 0 15px 0', opacity: 0.8 }}>Controls</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🤌</div>
                        <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Pinch to Grab Part</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🏗️</div>
                        <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Move to Build Area</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>✋</div>
                        <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Release to Place</span>
                    </div>
                </div>
            </div>

            {/* Bottom Status HUD */}
            <div style={{
                position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
                padding: '12px 30px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)',
                borderRadius: '100px', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                zIndex: 100, display: 'flex', alignItems: 'center', gap: '15px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}>
                <div id="status-indicator" style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    backgroundColor: '#ff4757', transition: 'background-color 0.3s'
                }} />
                <span id="status-text" style={{
                    fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase'
                }}>Ready to Build</span>
            </div>

            {/* Assets Library Indicator (Visual) */}
            <div style={{
                position: 'absolute', bottom: '40px', left: '40px', color: 'white', opacity: 0.3, zIndex: 2
            }}>
                <h3 style={{ margin: 0, fontSize: '0.8rem' }}>AI FOUNDATION v1.0</h3>
            </div>

            {!modelLoaded && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1000,
                    background: '#0f172a', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', color: 'white'
                }}>
                    <div className="loader" style={{
                        width: '40px', height: '40px', border: '3px solid rgba(59, 130, 246, 0.2)',
                        borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ marginTop: '20px', fontWeight: 600, letterSpacing: '2px' }}>LOADING ARCHITECTURAL AI...</p>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default HomeBuilder;
