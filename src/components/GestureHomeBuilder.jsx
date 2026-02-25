import React, { useRef, useEffect, useState } from 'react';

const GestureHomeBuilder = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [modelLoaded, setModelLoaded] = useState(false);

    // Configuration
    const GRID_SIZE = 40;
    const GRAB_START = 0.08;
    const GRAB_END = 0.12;
    const FRAME_HOLD = 3;
    const SMOOTHING = 0.75;

    // Premium Building Blocks with detailed styling
    const PALETTE = [
        {
            type: 'wall',
            color: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
            w: 120, h: 120, icon: '🏠',
            style: { borderRadius: '16px', border: '2px solid rgba(0,0,0,0.1)' }
        },
        {
            type: 'roof',
            color: 'linear-gradient(to bottom, #f87171 0%, #dc2626 100%)',
            w: 140, h: 60, icon: '▲',
            style: { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', borderRadius: '4px' }
        },
        {
            type: 'door',
            color: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)',
            w: 50, h: 90, icon: '🚪',
            style: { borderRadius: '8px 8px 2px 2px', borderLeft: '4px solid rgba(0,0,0,0.2)' }
        },
        {
            type: 'window',
            color: 'rgba(186, 230, 253, 0.8)',
            w: 60, h: 60, icon: '🪟',
            style: { borderRadius: '12px', border: '3px solid #fff', backdropFilter: 'blur(4px)' }
        },
        {
            type: 'tree',
            color: 'linear-gradient(to bottom, #22c55e 0%, #15803d 100%)',
            w: 100, h: 140, icon: '🌳',
            style: { borderRadius: '50% 50% 20% 20%' }
        },
        {
            type: 'sun',
            color: 'radial-gradient(circle, #fbbf24 0%, #f59e0b 70%, transparent 100%)',
            w: 80, h: 80, icon: '☀️',
            style: { borderRadius: '50%', boxShadow: '0 0 40px #f59e0b' }
        },
        {
            type: 'bush',
            color: 'linear-gradient(to bottom, #4ade80 0%, #16a34a 100%)',
            w: 70, h: 40, icon: '🌿',
            style: { borderRadius: '20px 20px 5px 5px' }
        }
    ];

    // Engine State
    const state = useRef({
        objects: [
            { id: 1, ...PALETTE[0], x: 60, y: 120 },
            { id: 2, ...PALETTE[1], x: 60, y: 300 },
            { id: 3, ...PALETTE[2], x: 200, y: 120 },
            { id: 4, ...PALETTE[3], x: 200, y: 300 },
            { id: 5, ...PALETTE[4], x: 320, y: 120 },
            { id: 6, ...PALETTE[5], x: 1100, y: 60 },
            { id: 7, ...PALETTE[6], x: 320, y: 300 },
        ],
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
            const engine = state.current;
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
                engine.cursor.x += (targetX - engine.cursor.x) * (1 - SMOOTHING);
                engine.cursor.y += (targetY - engine.cursor.y) * (1 - SMOOTHING);

                const { x: cx, y: cy } = engine.cursor;

                // Pinch Logic
                if (dist < GRAB_START) {
                    engine.releaseFrames = 0;
                    if (!engine.isGrabbing) {
                        engine.grabFrames++;
                        if (engine.grabFrames >= FRAME_HOLD) {
                            const obj = [...engine.objects].reverse().find(o =>
                                cx >= o.x && cx <= o.x + o.w &&
                                cy >= o.y && cy <= o.y + o.h
                            );
                            if (obj) {
                                engine.isGrabbing = true;
                                engine.activeId = obj.id;
                                engine.dragOffset = { x: cx - obj.x, y: cy - obj.y };
                                updateStatus('Holding ' + obj.type.toUpperCase(), '#4ade80');
                            }
                        }
                    }
                } else if (dist > GRAB_END) {
                    engine.grabFrames = 0;
                    if (engine.isGrabbing) {
                        engine.releaseFrames++;
                        if (engine.releaseFrames >= FRAME_HOLD) {
                            const obj = engine.objects.find(o => o.id === engine.activeId);
                            if (obj) {
                                obj.x = Math.round(obj.x / GRID_SIZE) * GRID_SIZE;
                                obj.y = Math.round(obj.y / GRID_SIZE) * GRID_SIZE;

                                const el = document.getElementById(`builder-obj-${obj.id}`);
                                if (el) {
                                    el.style.transform = `translate(${obj.x}px, ${obj.y}px) scale(1)`;
                                    el.classList.add('soft-drop');
                                    setTimeout(() => el.classList.remove('soft-drop'), 400);
                                }
                            }
                            engine.isGrabbing = false;
                            engine.activeId = null;
                            updateStatus('Ready to Build', '#f87171');
                        }
                    }
                }

                // Hover Detection
                if (!engine.isGrabbing) {
                    const obj = [...engine.objects].reverse().find(o =>
                        cx >= o.x && cx <= o.x + o.w &&
                        cy >= o.y && cy <= o.y + o.h
                    );
                    const newHoverId = obj ? obj.id : null;
                    if (newHoverId !== engine.hoverId) {
                        if (engine.hoverId) document.getElementById(`builder-obj-${engine.hoverId}`)?.classList.remove('hovered');
                        engine.hoverId = newHoverId;
                        if (newHoverId) document.getElementById(`builder-obj-${newHoverId}`)?.classList.add('hovered');
                    }
                }

                // Drag Update
                if (engine.isGrabbing && engine.activeId) {
                    const obj = engine.objects.find(o => o.id === engine.activeId);
                    obj.x = cx - engine.dragOffset.x;
                    obj.y = cy - engine.dragOffset.y;

                    const el = document.getElementById(`builder-obj-${obj.id}`);
                    if (el) {
                        el.style.transform = `translate(${obj.x}px, ${obj.y}px) scale(1.1)`;
                        el.style.zIndex = '1000';
                    }
                }

                // Landmarks
                canvasCtx.save();
                canvasCtx.translate(W, 0); canvasCtx.scale(-1, 1);
                const connections = window.HAND_CONNECTIONS || (window.Hands && window.Hands.HAND_CONNECTIONS);
                window.drawConnectors?.(canvasCtx, landmarks, connections, { color: 'rgba(255,255,255,0.15)', lineWidth: 1.5 });
                canvasCtx.restore();

                landmarks.forEach((p, i) => {
                    const px = (1 - p.x) * W; const py = p.y * H;
                    canvasCtx.beginPath();
                    canvasCtx.arc(px, py, (i === 4 || i === 8) ? 5 : 2, 0, Math.PI * 2);
                    canvasCtx.fillStyle = (i === 4 || i === 8) ? '#4ade80' : '#f87171';
                    canvasCtx.fill();
                });

                // HUD Cursor
                canvasCtx.beginPath();
                canvasCtx.arc(cx, cy, 20, 0, Math.PI * 2);
                canvasCtx.strokeStyle = engine.isGrabbing ? '#4ade80' : 'rgba(255,255,255,0.3)';
                canvasCtx.lineWidth = 2;
                canvasCtx.stroke();
            }
        });

        const updateStatus = (text, color) => {
            const ind = document.getElementById('builder-indicator');
            const txt = document.getElementById('builder-text');
            if (ind) ind.style.backgroundColor = color;
            if (txt) txt.innerText = text;
        };

        const camera = new window.Camera(videoRef.current, {
            onFrame: async () => await hands.send({ image: videoRef.current }),
            width: 1280, height: 720
        });

        camera.start().then(() => setModelLoaded(true));

        return () => {
            hands.close();
            camera.stop();
        };
    }, []);

    return (
        <div ref={containerRef} style={{
            width: '100vw', height: '100vh',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            position: 'relative', overflow: 'hidden', fontFamily: '"Outfit", sans-serif'
        }}>
            {/* Ground / Building Area */}
            <div style={{
                position: 'absolute', bottom: 0, width: '100%', height: '30vh',
                background: '#15803d',
                zIndex: 1, borderTop: '8px solid #166534',
                boxShadow: '0 -20px 50px rgba(0,0,0,0.3)'
            }}>
                <div style={{
                    width: '100%', height: '100%', opacity: 0.05,
                    backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
                }} />
            </div>

            {/* Subtle Video Background */}
            <video ref={videoRef} style={{
                position: 'absolute', width: '100%', height: '100%',
                objectFit: 'cover', transform: 'scaleX(-1)', opacity: 0.08,
                zIndex: 0
            }} />

            {/* Hand Landmark Canvas */}
            <canvas ref={canvasRef} style={{
                position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none'
            }} width={1280} height={720} />

            {/* UI Decorations */}
            <div style={{
                position: 'absolute', top: '150px', left: '450px', width: '300px', height: '100px',
                background: 'rgba(255,255,255,0.03)', borderRadius: '100% 100% 0 0', filter: 'blur(30px)', zIndex: 0
            }} />

            {/* Dashboard Sidebar */}
            <div style={{
                position: 'absolute', left: '30px', top: '30px', zIndex: 50,
                background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(16px)',
                padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
                width: '380px'
            }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#facc15' }}>
                    VIRTUAL <span style={{ color: '#fff' }}>BUILDER</span>
                </h1>
                <p style={{ margin: '4px 0 20px 0', opacity: 0.5, fontSize: '0.8rem', letterSpacing: '2px' }}>G-SERIES WORKSPACE v2.0</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '4px' }}>GESTURE</div>
                        <div style={{ fontWeight: 600, color: '#4ade80' }}>PINCH TO GRAB</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '4px' }}>PRECISION</div>
                        <div style={{ fontWeight: 600, color: '#60a5fa' }}>SNAP-GRID ON</div>
                    </div>
                </div>
            </div>

            {/* Building Workspace */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
                {state.current.objects.map(obj => (
                    <div
                        key={obj.id}
                        id={`builder-obj-${obj.id}`}
                        className="builder-block"
                        style={{
                            position: 'absolute', width: obj.w, height: obj.h,
                            background: obj.color, transform: `translate(${obj.x}px, ${obj.y}px)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            transition: 'border-color 0.3s, scale 0.3s, box-shadow 0.3s',
                            ...obj.style
                        }}
                    >
                        <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{obj.icon}</span>
                    </div>
                ))}
            </div>

            {/* HUD Status Bar */}
            <div style={{
                position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.9)', padding: '14px 34px', borderRadius: '100px',
                border: '1px solid rgba(255,255,255,0.15)', color: 'white', zIndex: 100,
                display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
                <div id="builder-indicator" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f87171', boxShadow: '0 0 10px currentColor' }} />
                <span id="builder-text" style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Ready to Build</span>
            </div>

            <style>{`
                .builder-block.hovered {
                    scale: 1.05;
                    box-shadow: 0 0 30px rgba(250, 204, 21, 0.4);
                    outline: 3px solid #facc15;
                }
                .soft-drop {
                    animation: soft-drop-anim 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes soft-drop-anim {
                    0% { scale: 0.9; }
                    50% { scale: 1.05; }
                    100% { scale: 1; }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default GestureHomeBuilder;
