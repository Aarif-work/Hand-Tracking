import React, { useRef, useEffect, useState } from 'react';

const GestureDragDrop = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [modelLoaded, setModelLoaded] = useState(false);

    // Constants for Stability
    const GRAB_START = 0.08;
    const GRAB_END = 0.12;
    const FRAME_HOLD_THRESHOLD = 3;
    const SMOOTHING = 0.8; // Factor between 0.7-0.85

    // State Refs (Avoiding React State for per-frame updates)
    const stateRef = useRef({
        isPinched: false,
        activeObjectId: null,
        dragOffset: { x: 0, y: 0 },
        grabFrameCount: 0,
        releaseFrameCount: 0,
        smoothedX: 0,
        smoothedY: 0,
        hoveredId: null
    });

    const objectsRef = useRef([
        { id: 1, x: 150, y: 150, color: '#FF6B6B', width: 160, height: 160, label: 'DRAG ME' },
        { id: 2, x: 400, y: 200, color: '#4ECDC4', width: 160, height: 160, label: 'STABLE GRAB' },
        { id: 3, x: 650, y: 250, color: '#FFE66D', width: 160, height: 160, label: 'PRECISION' },
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

        const updateUI = () => {
            if (!canvasRef.current) return;
            // This could be used for a separate RAF loop if needed, 
            // but we'll drive updates from onResults for latency.
        };

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

                // Calculate Distance
                const distance = Math.sqrt(
                    Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2)
                );

                // Calculate Target Position (Mirrored for UI)
                const targetX = (1 - index.x) * W;
                const targetY = index.y * H;

                // 1. Smoothing (Interpolation)
                state.smoothedX = state.smoothedX + (targetX - state.smoothedX) * (1 - SMOOTHING);
                state.smoothedY = state.smoothedY + (targetY - state.smoothedY) * (1 - SMOOTHING);

                const curX = state.smoothedX;
                const curY = state.smoothedY;

                // 2. Pinch Logic with Hysteresis & Frame Hold
                if (distance < GRAB_START) {
                    state.releaseFrameCount = 0;
                    if (!state.isPinched) {
                        state.grabFrameCount++;
                        if (state.grabFrameCount >= FRAME_HOLD_THRESHOLD) {
                            // Check collision before starting grab
                            const obj = objectsRef.current.find(o =>
                                curX >= o.x && curX <= o.x + o.width &&
                                curY >= o.y && curY <= o.y + o.height
                            );
                            if (obj) {
                                state.isPinched = true;
                                state.activeObjectId = obj.id;
                                state.dragOffset = { x: curX - obj.x, y: curY - obj.y };
                                document.getElementById('status-indicator').style.backgroundColor = '#2ecc71';
                                document.getElementById('status-text').innerText = 'OBJECT GRABBED';
                            }
                        }
                    }
                } else if (distance > GRAB_END) {
                    state.grabFrameCount = 0;
                    if (state.isPinched) {
                        state.releaseFrameCount++;
                        if (state.releaseFrameCount >= FRAME_HOLD_THRESHOLD) {
                            // Release Object
                            const el = document.getElementById(`draggable-obj-${state.activeObjectId}`);
                            if (el) {
                                el.style.transform = `translate(${objectsRef.current.find(o => o.id === state.activeObjectId).x}px, ${objectsRef.current.find(o => o.id === state.activeObjectId).y}px) scale(1)`;
                                el.style.zIndex = '10';
                                el.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
                            }
                            state.isPinched = false;
                            state.activeObjectId = null;
                            document.getElementById('status-indicator').style.backgroundColor = '#ff4757';
                            document.getElementById('status-text').innerText = 'READY TO GRAB';
                        }
                    }
                }

                // 3. Hover Detection
                if (!state.isPinched) {
                    const obj = objectsRef.current.find(o =>
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
                        el.style.transform = `translate(${obj.x}px, ${obj.y}px) scale(1.15)`;
                        el.style.zIndex = '100';
                        el.style.boxShadow = '0 30px 60px rgba(0,0,0,0.5)';
                    }
                }

                // 5. Visual Feedback - Draw Skeleton
                const connections = window.HAND_CONNECTIONS || (window.Hands && window.Hands.HAND_CONNECTIONS);
                if (window.drawConnectors && connections) {
                    canvasCtx.save();
                    // Mirror the context for drawConnectors to match the camera preview
                    canvasCtx.translate(W, 0);
                    canvasCtx.scale(-1, 1);
                    window.drawConnectors(canvasCtx, landmarks, connections, { color: 'rgba(255,255,255,0.3)', lineWidth: 2 });
                    canvasCtx.restore();
                }

                // Draw 21 points
                landmarks.forEach((pt, i) => {
                    const pxX = (1 - pt.x) * W;
                    const pxY = pt.y * H;
                    canvasCtx.beginPath();
                    canvasCtx.arc(pxX, pxY, (i === 4 || i === 8) ? 8 : 3, 0, 2 * Math.PI);
                    canvasCtx.fillStyle = (i === 4 || i === 8) ? '#2ecc71' : '#ff4757';
                    canvasCtx.fill();
                });

                // Precision Cursor
                canvasCtx.beginPath();
                canvasCtx.arc(curX, curY, 25, 0, 2 * Math.PI);
                canvasCtx.strokeStyle = state.isPinched ? '#2ecc71' : 'rgba(255,255,255,0.4)';
                canvasCtx.lineWidth = 2;
                canvasCtx.setLineDash([5, 5]);
                canvasCtx.stroke();
                canvasCtx.setLineDash([]);

            } else {
                // Clear state if hand lost
                state.grabFrameCount = 0;
                state.releaseFrameCount = 0;
                // We keep isPinched true for a few frames usually, but if hand is totally gone, release
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
            width: '100vw', height: '100vh', backgroundColor: '#0a0a0c',
            position: 'relative', overflow: 'hidden', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontFamily: '"Outfit", sans-serif'
        }}>
            {/* Mirrored Camera View */}
            <video ref={videoRef} style={{
                position: 'absolute', width: '100%', height: '100%',
                objectFit: 'cover', transform: 'scaleX(-1)', opacity: 0.25
            }} />

            {/* High-fidelity Canvas overlay */}
            <canvas ref={canvasRef} style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%', zIndex: 5, pointerEvents: 'none'
            }} width={1280} height={720} />

            {!modelLoaded && (
                <div style={{
                    position: 'absolute', zIndex: 200, color: 'white',
                    background: 'rgba(255,255,255,0.05)', padding: '30px 60px',
                    borderRadius: '30px', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center'
                }}>
                    <div className="pulse-loader" style={{
                        width: '40px', height: '40px', background: '#3498db',
                        borderRadius: '50%', margin: '0 auto 20px auto',
                        animation: 'pulse 1.5s infinite ease-in-out'
                    }} />
                    <p style={{ fontWeight: 600, fontSize: '1.2rem' }}>Calibrating Stability Models...</p>
                </div>
            )}

            {/* Draggable UI Layer */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {objectsRef.current.map(obj => (
                    <div
                        key={obj.id}
                        id={`draggable-obj-${obj.id}`}
                        style={{
                            position: 'absolute', width: obj.width, height: obj.height,
                            backgroundColor: obj.color, borderRadius: '40px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', color: '#1a1a1a', fontWeight: '700',
                            fontSize: '1.1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                            transform: `translate(${obj.x}px, ${obj.y}px)`,
                            zIndex: 10, border: '4px solid rgba(255,255,255,0.2)',
                            textAlign: 'center', padding: '20px', backdropFilter: 'blur(8px)',
                            transition: 'border-color 0.3s, scale 0.3s'
                        }}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
                            {obj.id === 1 ? '🎯' : obj.id === 2 ? '🔒' : '💎'}
                        </div>
                        {obj.label}
                    </div>
                ))}
            </div>

            {/* Professional HUD Status Indicator */}
            <div style={{
                position: 'absolute', bottom: '50px', padding: '15px 35px',
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)',
                borderRadius: '100px', color: 'white',
                border: '1px solid rgba(255,255,255,0.15)', zIndex: 150,
                display: 'flex', alignItems: 'center', gap: '15px',
                boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                transform: 'translateY(0)', transition: 'transform 0.3s ease'
            }}>
                <div id="status-indicator" style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    backgroundColor: '#ff4757', transition: 'background-color 0.3s',
                    boxShadow: '0 0 15px currentColor'
                }} />
                <span id="status-text" style={{
                    fontSize: '1rem', fontWeight: 600, letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>Ready to Grab</span>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(0.8); opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default GestureDragDrop;
