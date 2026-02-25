import React, { useRef, useEffect, useState } from 'react';

const GestureTetris = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [modelLoaded, setModelLoaded] = useState(false);

    // Configuration
    const GRID_SIZE = 50; // Larger grid for Tetris blocks
    const GRAB_START = 0.08;
    const GRAB_END = 0.12;
    const FRAME_HOLD = 2;
    const SMOOTHING = 0.8;

    // Tetris Shape Definitions (Relative to Top-Left)
    // Each block is 50x50
    const SHAPES = [
        {
            type: 'T', color: '#4ade80', blocks: [[0, 0], [1, 0], [2, 0], [1, 1]], // Green T
            accent: '#16a34a', x: 200, y: 100
        },
        {
            type: 'L', color: '#f87171', blocks: [[0, 0], [0, 1], [0, 2], [1, 2]], // Red L
            accent: '#dc2626', x: 500, y: 100
        },
        {
            type: 'J', color: '#60a5fa', blocks: [[1, 0], [1, 1], [1, 2], [0, 2]], // Blue J
            accent: '#2563eb', x: 800, y: 100
        },
        {
            type: 'I', color: '#facc15', blocks: [[0, 0], [0, 1], [0, 2], [0, 3]], // Yellow I
            accent: '#ca8a04', x: 350, y: 350
        }
    ];

    // Engine State
    const engine = useRef({
        objects: SHAPES.map((s, i) => ({ ...s, id: i + 1, currentX: s.x, currentY: s.y })),
        activeId: null,
        hoverId: null,
        dragOffset: { x: 0, y: 0 },
        grabFrames: 0,
        releaseFrames: 0,
        isGrabbing: false,
        cursor: { x: 0, y: 0 },
    });

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
            if (!canvasRef.current) return;
            const state = engine.current;
            const canvasCtx = canvasRef.current.getContext('2d');
            const { width: W, height: H } = canvasRef.current;

            canvasCtx.clearRect(0, 0, W, H);

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                const thumb = landmarks[4];
                const index = landmarks[8];

                const dist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));
                const targetX = (1 - index.x) * W;
                const targetY = index.y * H;

                // Smoothing
                state.cursor.x += (targetX - state.cursor.x) * (1 - SMOOTHING);
                state.cursor.y += (targetY - state.cursor.y) * (1 - SMOOTHING);

                const { x: cx, y: cy } = state.cursor;

                // Pinch Tracking
                if (dist < GRAB_START) {
                    state.releaseFrames = 0;
                    if (!state.isGrabbing) {
                        state.grabFrames++;
                        if (state.grabFrames >= FRAME_HOLD) {
                            // Find object under cursor (checking individual blocks of each shape)
                            const obj = [...state.objects].reverse().find(o => {
                                return o.blocks.some(([bx, by]) => {
                                    const realX = o.currentX + bx * GRID_SIZE;
                                    const realY = o.currentY + by * GRID_SIZE;
                                    return cx >= realX && cx <= realX + GRID_SIZE &&
                                        cy >= realY && cy <= realY + GRID_SIZE;
                                });
                            });

                            if (obj) {
                                state.isGrabbing = true;
                                state.activeId = obj.id;
                                state.dragOffset = { x: cx - obj.currentX, y: cy - obj.currentY };
                                document.getElementById('tetris-status').innerText = 'LOCKED';
                            }
                        }
                    }
                } else if (dist > GRAB_END) {
                    state.grabFrames = 0;
                    if (state.isGrabbing) {
                        state.releaseFrames++;
                        if (state.releaseFrames >= FRAME_HOLD) {
                            const obj = state.objects.find(o => o.id === state.activeId);
                            if (obj) {
                                // Snap to Grid on Release
                                obj.currentX = Math.round(obj.currentX / GRID_SIZE) * GRID_SIZE;
                                obj.currentY = Math.round(obj.currentY / GRID_SIZE) * GRID_SIZE;

                                const el = document.getElementById(`tetris-shape-${obj.id}`);
                                if (el) {
                                    el.style.transform = `translate(${obj.currentX}px, ${obj.currentY}px) scale(1)`;
                                    el.style.zIndex = '10';
                                }
                            }
                            state.isGrabbing = false;
                            state.activeId = null;
                            document.getElementById('tetris-status').innerText = 'SCANNING';
                        }
                    }
                }

                // Dragging Logic
                if (state.isGrabbing && state.activeId) {
                    const obj = state.objects.find(o => o.id === state.activeId);
                    obj.currentX = cx - state.dragOffset.x;
                    obj.currentY = cy - state.dragOffset.y;

                    const el = document.getElementById(`tetris-shape-${obj.id}`);
                    if (el) {
                        el.style.transform = `translate(${obj.currentX}px, ${obj.currentY}px) scale(1.05)`;
                        el.style.zIndex = '1000';
                    }
                }

                // GLOW FEED
                canvasCtx.save();
                const glowGrd = canvasCtx.createRadialGradient(cx, cy, 10, cx, cy, 100);
                glowGrd.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
                glowGrd.addColorStop(1, 'transparent');
                canvasCtx.fillStyle = glowGrd;
                canvasCtx.beginPath();
                canvasCtx.arc(cx, cy, 100, 0, Math.PI * 2);
                canvasCtx.fill();
                canvasCtx.restore();

                // LANDMARKS
                canvasCtx.save();
                canvasCtx.translate(W, 0); canvasCtx.scale(-1, 1);
                window.drawConnectors?.(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: 'rgba(255,255,255,0.2)', lineWidth: 1 });
                canvasCtx.restore();

                landmarks.forEach((p, i) => {
                    const px = (1 - p.x) * W; const py = p.y * H;
                    canvasCtx.beginPath();
                    canvasCtx.arc(px, py, (i === 4 || i === 8) ? 6 : 2, 0, Math.PI * 2);
                    canvasCtx.fillStyle = (i === 4 || i === 8) ? '#4ade80' : '#fff';
                    canvasCtx.fill();
                });
            }
        });

        const camera = new window.Camera(videoRef.current, {
            onFrame: async () => await hands.send({ image: videoRef.current }),
            width: 1280, height: 720
        });

        camera.start().then(() => setModelLoaded(true));
        return () => { hands.close(); camera.stop(); };
    }, []);

    return (
        <div ref={containerRef} style={{
            width: '100vw', height: '100vh',
            background: '#0f172a',
            position: 'relative', overflow: 'hidden', fontFamily: '"Outfit", sans-serif'
        }}>
            {/* Background Shelf (Image inspired) */}
            <div style={{
                position: 'absolute', bottom: 0, width: '100%', height: '80px',
                background: '#fbbf24', borderTop: '4px solid #d97706', zIndex: 1
            }} />

            {/* Clear Cam Feed */}
            <video ref={videoRef} style={{
                position: 'absolute', width: '100%', height: '100%',
                objectFit: 'cover', transform: 'scaleX(-1)', opacity: 0.2,
                zIndex: 0
            }} />

            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }} width={1280} height={720} />

            {/* Tetris Blocks Layer */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
                {engine.current.objects.map(shape => (
                    <div
                        key={shape.id}
                        id={`tetris-shape-${shape.id}`}
                        style={{
                            position: 'absolute',
                            transform: `translate(${shape.currentX}px, ${shape.currentY}px)`,
                            pointerEvents: 'none'
                        }}
                    >
                        {shape.blocks.map(([bx, by], idx) => (
                            <div
                                key={idx}
                                className="tetris-block"
                                style={{
                                    position: 'absolute',
                                    width: GRID_SIZE - 2,
                                    height: GRID_SIZE - 2,
                                    left: bx * GRID_SIZE,
                                    top: by * GRID_SIZE,
                                    backgroundColor: shape.color,
                                    borderRadius: '8px',
                                    boxSizing: 'border-box',
                                    border: `2px solid ${shape.accent}`,
                                    boxShadow: `inset 4px 4px 0 rgba(255,255,255,0.4), inset -4px -4px 0 rgba(0,0,0,0.1)`,
                                    backgroundImage: `linear-gradient(135deg, transparent 45%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.05) 55%, transparent 55%)`,
                                    backgroundSize: '10px 10px' // Wooden texture attempt
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>

            {/* HUD */}
            <div style={{
                position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
                padding: '10px 30px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', zIndex: 100, display: 'flex', gap: '20px', alignItems: 'center'
            }}>
                <span id="tetris-status" style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '4px' }}>SCANNING</span>
            </div>

            <style>{`
                .tetris-block:after {
                    content: ''; position: absolute; inset: 0;
                    border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.2);
                }
                .soft-drop { animation: drop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes drop { 0% { scale: 0.9; } 100% { scale: 1; } }
            `}</style>
        </div>
    );
};

export default GestureTetris;
